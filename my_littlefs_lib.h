#ifndef MYLITTLEFSLIB_H
#define MYLITTLEFSLIB_H
#include <LittleFS.h>
#include <ESP8266WebServer.h>
#include <time.h>         // For Serial Log & File Timestamp

extern ESP8266WebServer server;

// void handleFileRequest(const String &path, const String &contentType);
extern void handleFileRequest(const String &path);
extern String getMimeType(const String& path);

void handleFileSave();
String handleFileList();
void handleFileLoad();
void handleFileDownload();
void handleTimeSet();

#endif
