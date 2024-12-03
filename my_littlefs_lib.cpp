#include "my_littlefs_lib.h"

// Function to handle & Format Time
String formatTime(time_t rawtime) {
  struct tm* timeinfo;
  static char buffer[20];  // Reduced buffer size to save memory
  timeinfo = localtime(&rawtime);
  strftime(buffer, sizeof(buffer), "%b %d %Y %H:%M:%S", timeinfo);
  return String(buffer);
}

// Functions to access SimpleFS Flash Partition on ESP8266

// Mapping of Mime-Types
String getMimeType(const String& path) {
  if (path.endsWith(".html")) return "text/html";
  else if (path.endsWith(".css")) return "text/css";
  else if (path.endsWith(".js")) return "application/javascript";
  else if (path.endsWith(".csv")) return "text/csv";
  else if (path.endsWith(".png")) return "image/png";
  else if (path.endsWith(".svg")) return "image/svg+xml";
  else if (path.endsWith(".ico")) return "image/x-icon";
  return "text/plain";
}

// Get File & Type (READ with TYPE)
void handleFileRequest(const String& path) {
  const String contentType = getMimeType(path);
  Serial.print("File Request: ");
  Serial.print(String(path));
  Serial.print(" [matched type: ");
  Serial.print(String(contentType));
  Serial.print("]");

  if (LittleFS.exists(path)) {
    File file = LittleFS.open(path, "r");
    server.streamFile(file, contentType);
    // Serial.print("File Request: STREAMING > ");
    // Serial.println(String(path));
    file.close();
    Serial.println(" -- SUCCESS");
  } else {
    server.send(404, "text/plain", "File Not Found");
    Serial.println("-- FAILED: NOT FOUND");
  }
}
// ##########################################
// FILE LIST Files on ESP8266 Storage (DIR) -
// usage: /fileList?ext=csv&action=[load] OR [download]  --> EXT:List only CSV files. ACTION: load OR download CSV file
// ##########################################
String handleFileList() {

  // Check if an File Extension is provided in URL (eg. "/fileList?ext=.csv" ) - otherwise ext="" will list all files
  String extension = server.arg("ext");  // Default "ext" = "", will list all files. suggest "ext=.csv"
  String action = "fileDownload"; // Option to LOAD or DOWNLOAD the selected file - Default action: Download selected file

  Serial.printf("File List 00: DEFAULT= ACTION: %s - EXT: %s \n", action, extension);

  if (server.arg("action") == "load") {
    action = "fileLoad";                // Select a CSV file to LOAD into Results TABLE
  } else {
    action = "fileDownload";            // Select a CSV file to DOWNLOAD to the Smartphone
  }

  Serial.printf("File List 01: ACTION: %s\n", action);
  String output = "<table border='1'><tr><th><small>Name</small></th><th><small>Size KB</small></th><th><small>Modified</small></th></tr>";

  // Serial.print("File List: *.");
  // Serial.println(String(extension));

  for (Dir dir = LittleFS.openDir("/"); dir.next();) {
    String fileName = dir.fileName();

    // If an extension is provided, check if the file has that extension
    if (extension != "" && !fileName.endsWith(extension)) {
      continue;  // Skip this file if it doesn't match the extension
    }
    time_t rawtime = dir.fileTime();
    String formattedTime = formatTime(rawtime);

    // Convert file size to KB
    float fileSizeKB = dir.fileSize() / 1024.0;
    String formattedSize = String(fileSizeKB, 2);  // Two decimal places

    Serial.printf("File Load 02: Found file:%s\t%s kB\t%s\n", filename, formattedSize, formattedTime);

    output += "<tr><td><small><b><a href='/" + action + "?filename=" + fileName + "'>" + fileName + "</a></b></small></td><td><small>" + formattedSize + " </small></td><td><small>" + formattedTime + "</small></td></tr>";
  }
  output += "</table>";
  server.send(200, "text/html", output);
  Serial.print("File List 03: HTML output for Files with Extension: ");
  Serial.println(extension);
  Serial.println(String(output));
  return output;
}

// Get TIMESTAMP from PHONE/CLIENT (before SAVING FILES)
void handleTimeSet() {
  if (server.hasArg("plain")) {
    int y, m, d, h, min, s;
    if (sscanf(server.arg("plain").c_str(), "%d-%d-%dT%d:%d:%d", &y, &m, &d, &h, &min, &s) == 6) {
      struct tm t = { s, min, h, d, m - 1, y - 1900 };
      time_t ts = mktime(&t);
      if (ts != -1) {
        struct timeval tv;
        tv.tv_sec = ts;
        tv.tv_usec = 0;
        settimeofday(&tv, nullptr);
        server.send(200, "text/plain", "Time set successfully");
        Serial.println("Time set successfully");
        return;
      }
    }
    server.send(400, "text/plain", "Invalid time format");
    Serial.println("Time Set: Failed to parse time received");
  } else {
    server.send(400, "text/plain", "No time data received");
    Serial.println("Time Set: No time data received");
  }
}

// ##########################################
// FILE SAVE - SAVE from Phone UI to ESP8266 storage
// ##########################################
void handleFileSave() {
  // Check if FILENAME is provided as PARAMETER
  String filename;
  if (server.hasArg("filename")) {
    filename = "/" + server.arg("filename");
  } else {
    filename = "/results.csv";
  }

  const String contentType = getMimeType(filename);

  // Serial.print("File Save: ");
  // Serial.print(filename);
  Serial.printf("File Save: %s [match type: %s] to ESP8266\n", filename.c_str(), contentType);
  // Serial.print(" to ESP8266 --> ");

  // Check DATA to SAVE
  if (server.hasArg("plain")) {
    String data = server.arg("plain");

    // Initialize LittleFS
    if (!LittleFS.begin()) {
      Serial.println("File Save: An error has occurred while mounting LittleFS");
      return;
    }

    // Open the file for writing
    File file = LittleFS.open(filename, "w");
    if (!file) {
      Serial.print("File Save: Failed to open file [");
      Serial.print(filename);
      Serial.println("] for writing");
      server.send(500, "text/plain", "Failed to open results.csv file for writing");
      return;
    }

    // Write the content to the file
    file.print(data);

    // Close the file
    file.close();
    server.send(200, contentType, "Saved successfully");
    Serial.println("File Saved successfully");
  } else {
    server.send(400, "text/plain", "File Save: No data received");
  }
}

// ##########################
// FILE LOAD - LOAD RESULTS from ESP8266 storage (SEND file to Phone to Load in UI Table)
// ##########################
void handleFileLoad() {
  // Check if FILENAME is provided as PARAMETER
  String filename = "/results.csv";  //default filename if none provided

  Serial.println("File Load 00: ALL ARGUMENTS");
  for (int i = 0; i < server.args(); i++) {
    Serial.printf("%s=%s\n", server.argName(i).c_str(), server.arg(i).c_str());
  }

  Serial.printf("File Load 00: ACTION=\n", server.arg("action"));
  Serial.printf("File Load 01: DEFAULT NAME %s (from ESP8266 to Table)\n", filename);

  if (server.hasArg("filename")) {
    filename = "/" + server.arg("filename");
  } else {
    filename = "/results.csv";
  }
  if (filename.isEmpty()) {
    filename = "/results.csv";
  }
  Serial.printf("File Load 02: Filename ARG=  %s\n", server.arg("filename"));
  Serial.printf("File Load 03: Filename used: %s\n", filename);

  String mimetype = getMimeType(filename);

  if (filename.isEmpty()) {
    server.send(400, "text/plain", "File name is required");
    Serial.println("File Load 04: File name is required");
    return;
  }

  if (mimetype.isEmpty()) {
    server.send(400, "text/plain", "Mimetype is required");
    Serial.println("File Load 05: Mimetype is required");
    return;
  }

  Serial.printf("File Load 06: %s [matched type: %s]\n", filename, mimetype);
  // Serial.print(filename);
  // Serial.print(" from ESP8266 --> ");

  if (LittleFS.begin()) {
    File file = LittleFS.open(filename, "r");
    if (!file) {
      server.send(500, "text/plain", "Failed to open " + filename);
      Serial.printf("File Load 06: FAILED to open %s\n", filename);
      return;
    }

    // Get file size
    size_t fileSize = file.size();

    Serial.printf("File Download 07: Sending Content-Length - %.2f kB\n", file.size() / 1024.0);

    // Set content type and disposition headers
    server.sendHeader("Content-Type", mimetype);
    server.sendHeader("Content-Disposition", "attachment; filename=" + filename);

    // Use streamFile to send the entire file at once
    server.streamFile(file, mimetype);

    file.close();

    Serial.printf("File Load 08: %s (Size: %u bytes)\n", filename, fileSize);
  } else {
    Serial.println("An Error has occurred while mounting LittleFS");
  }
}

//   // Sending Headers (usefull ? needs file size / length ?)
//   server.sendHeader("Content-Type", mimetype);
//   server.sendHeader("Connection", "close");

//   size_t fileSize = file.size();
//   server.sendHeader("Content-Length", String(fileSize));
//   // server.sendHeader("Content-Disposition", "attachment; filename=" + filename);

//   // Sending File
//   server.streamFile(file, mimetype);

//   Serial.printf("SUCCESS Loading File %s\n", filename.c_str());
//   file.close();
// }
// else
// {
//   server.send(500, "text/plain", "Failed to mount file system");
//   Serial.println("File Read: FAILED Mounting File System");
// }
//}

// #####################################
// FILE DOWNLOAD - DOWNLOAD a FILE FROM ESP8266 Storage
// #####################################

void handleFileDownload() {
  Serial.println("File Download 01: Get Filename");
  String filename = server.arg("filename");
  Serial.println(filename.c_str());
  Serial.println("File Download 02: Get Mimetype");

  String mimetype = getMimeType(filename);
  Serial.println(mimetype.c_str());
  Serial.printf("File Download 03: %s [matched type: %s]\n", filename.c_str(), mimetype.c_str());

  if (filename.isEmpty()) {
    server.send(400, "text/plain", "File name is required");
    Serial.println("File Download: File name is required");
    return;
  }

  if (mimetype.isEmpty()) {
    server.send(400, "text/plain", "Mimetype is required");
    Serial.println("File Download: Mimetype is required");
    return;
  }

  if (!LittleFS.exists("/" + filename)) {
    server.send(404, "text/plain", "File not found");
    Serial.printf("File Download: File /%s not found\n", filename);
    return;
  }

  Serial.printf("File Download 04: Opening File '%s' in READ ONLY\n", filename.c_str());

  // File Not Found / Cannot Open
  File file = LittleFS.open("/" + filename, "r");
  if (!file) {
    server.send(500, "text/plain", "Failed to open file");
    Serial.printf("File Download: Failed to open file /%s\n", filename);
    return;
  }

  Serial.println("File Download 05: Server SEND HEADER");
  // server.sendHeader("Content-Type", "application/octet-stream");
  server.sendHeader("Content-Type", mimetype);
  server.sendHeader("Content-Disposition", "attachment; filename=" + filename);
  server.sendHeader("Connection", "close");

  Serial.println("File Download 06: Getting File SIZE");
  size_t fileSize = file.size();
  Serial.printf("File Download 07: Sending Content-Length - %.2f kB\n", file.size() / 1024.0);

  server.sendHeader("Content-Length", String(fileSize));
  Serial.println("File Download 08: Streaming File");

  // size_t sent = server.streamFile(file, "application/octet-stream");
  size_t sent = server.streamFile(file, mimetype);

  Serial.println("File Download 09: Closing File");

  file.close();

  Serial.println("File Download 10: Checking Error on File Sent");

  if (sent != fileSize) {
    Serial.println("File Download: Error sending file: /" + filename);
  } else {
    Serial.printf("File Download: %s -- SUCCESS\n, filename");
  }
}
