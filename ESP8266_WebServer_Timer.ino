#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include "my_littlefs_lib.h"

const char* ssid = "Climbing_WiFi";
const char* password = "climbclimb";
ESP8266WebServer server(80);
DNSServer dnsServer;

const int switchPin = D2;
bool timerRunning = false;

enum ResetState {
  NORMAL,
  READY,
  LOCKED
};
ResetState resetState = NORMAL;

void setup() {
  Serial.begin(115200);
  pinMode(switchPin, INPUT_PULLUP);

  WiFi.softAP(ssid, password);
  Serial.printf("\nAccess Point \"%s\" started\n", ssid);

  Serial.printf("IP address:\t%s\n", WiFi.softAPIP().toString().c_str());

  if (!LittleFS.begin()) {
    Serial.println("An Error has occurred while mounting LittleFS");
    return;
  }

  dnsServer.start(53, "*", WiFi.softAPIP());

  // Handle static file requests
 server.on("/",             HTTP_GET, []() { handleFileRequest("/index.html");  });
 server.on("/climber.png",  HTTP_GET, []() { handleFileRequest("/climber.png"); });
 server.on("/trash.svg",    HTTP_GET, []() { handleFileRequest("/trash.svg");   });
 server.on("/pencil.svg",   HTTP_GET, []() { handleFileRequest("/pencil.svg");  });
 server.on("/style.css",    HTTP_GET, []() { handleFileRequest("/style.css");   });
 server.on("/script.js",    HTTP_GET, []() { handleFileRequest("/script.js");   });

  // Handle other specific routes
  server.on("/startStop",     HTTP_GET, handleStartStop);
  server.on("/reset",         HTTP_GET, handleReset);
  server.on("/timerStatus",   HTTP_GET, handleTimerStatus);
  server.on("/fileList",      HTTP_GET, handleFileList);
  server.on("/fileSave",      HTTP_POST,handleFileSave);
  server.on("/fileLoad",      HTTP_GET, handleFileLoad); //handleFileLoad);
  server.on("/fileDownload",  HTTP_GET, handleFileDownload);
  server.on("/time",          HTTP_POST,handleTimeSet);
  
  server.onNotFound([]() { handleFileRequest("/index.html"); });
  server.begin();
  Serial.println("HTTP server started...");
}

void loop() {
  dnsServer.processNextRequest();
  server.handleClient();

  bool currentSwitchState = digitalRead(switchPin);
  unsigned long currentTime = millis();
  unsigned long lastSwitchPressTime = 0;
  const unsigned long debounceDuration = 200;

  if (currentSwitchState == LOW && resetState != READY) {
    // Switch pressed
    if (timerRunning) {
      timerRunning = false;
      resetState = NORMAL;
      lastSwitchPressTime = currentTime;
      Serial.println("Timer: Stopped by SWITCH");
    } else {
      resetState = READY;
      Serial.println("Timer: Reset Ready");
    }
  }
}

void handleStartStop() {
  if (resetState == NORMAL) {
    timerRunning = !timerRunning;
    server.send(200, "application/json", "{\"success\":true,\"running\":" + String(timerRunning ? "true" : "false") + "}");
    Serial.print("Timer: ");
    Serial.println(String(timerRunning ? "RUNNING" : "STOPPED"));
  } else {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Cannot start/stop timer\"}");
    Serial.println("Timer: CANNOT Start/Stop");
  }
}

void handleReset() {
  if (resetState == READY || resetState == NORMAL) {
    timerRunning = false;
    resetState = NORMAL;
    server.send(200, "application/json", "{\"success\":true}");
    Serial.println("Timer: RESET");
  } else {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Cannot reset timer\"}");
  }
}

void handleTimerStatus() {
  String json = "{\"running\":" + String(timerRunning ? "true" : "false") + ",";
  json += "\"startDisabled\":" + String((resetState != NORMAL) ? "true" : "false") + ",";
  json += "\"startLabel\":\"" + String((resetState != NORMAL) ? "Climber Pressed" : (timerRunning ? "Stop" : "Start")) + "\",";
  json += "\"resetState\":\"" + String(resetState == READY ? "READY" : (resetState == LOCKED ? "LOCKED" : "NORMAL")) + "\",";
  json += "\"resetLabel\":\"" + String(resetState == READY ? "Reset Ready" : (resetState == LOCKED ? "Reset Locked" : "Reset")) + "\"}";
  server.send(200, "application/json", json);
}

// Implement other functions like handleFileList, handleFileSave, handleFileLoad, and handleTimeSet as needed
