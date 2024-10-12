#include "my_littlefs_lib.h"

// Function to handle & Format Time
String formatTime(time_t rawtime) {
  struct tm * timeinfo;
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
  else if (path.endsWith(".js"))  return "application/javascript";
  else if (path.endsWith(".png")) return "image/png";
  else if (path.endsWith(".svg")) return "image/svg+xml";
  else if (path.endsWith(".ico")) return "image/x-icon";
  return "text/plain";
}

// Get File & Type (READ with TYPE)
void handleFileRequest(const String &path)
{
  const String contentType = getMimeType(path);
  Serial.print("File Request: ");
  Serial.print(String(path));
  Serial.print(" [matched type: ");
  Serial.print(String(contentType));
  Serial.print("]");

  if (LittleFS.exists(path))
  {
    File file = LittleFS.open(path, "r");
    server.streamFile(file, contentType);
    // Serial.print("File Request: STREAMING > ");
    // Serial.println(String(path));
    file.close();
    Serial.println(" -- SUCCESS");
  }
  else
  {
    server.send(404, "text/plain", "File Not Found");
    Serial.println("-- FAILED: NOT FOUND");
  }
}

// List Files on ESP8266 Storage (DIR) - usage: /fileListe?ext=csv --> List CSV files. DEFAULT: List all files

String handleFileList() {

  // Check if an File Extension is provided in URL (eg. "/fileList?ext=csv" ) - otherwise ext="" will list all files
  String extension = server.arg("ext");
  String output = "<table border='1'><tr><th><small>Name</small></th><th><small>Size KB</small></th><th><small>Modified</small></th></tr>";

  for (Dir dir = LittleFS.openDir("/"); dir.next();)
  {
    String fileName = dir.fileName();

    // If an extension is provided, check if the file has that extension
    if (extension != "" && !fileName.endsWith(extension)) {
      continue; // Skip this file if it doesn't match the extension
    }
    time_t rawtime = dir.fileTime();
    String formattedTime = formatTime(rawtime);

    // Convert file size to KB
    float fileSizeKB = dir.fileSize() / 1024.0;
    String formattedSize = String(fileSizeKB, 2); // Two decimal places

    // output += "<tr><td><small><b>" + fileName + "</b></small></td><td><small>" + formattedSize + " </small></td><td><small>" + formattedTime + "</small></td></tr>";
    output += "<tr><td><small><b><a href='/fileDownload?filename=" + fileName + "'>" + fileName + "</a></b></small></td><td><small>" + formattedSize + " </small></td><td><small>" + formattedTime + "</small></td></tr>";
  }
  output += "</table>";
  server.send(200, "text/html", output);
  Serial.print("File List with Extension: ");
  Serial.println(extension);
  Serial.println(String(output));
  return output;
}

// Get TIMESTAMP from PHONE/CLIENT (before SAVING FILES)
void handleTimeSet()
{
  if (server.hasArg("plain"))
  {
    int y, m, d, h, min, s;
    if (sscanf(server.arg("plain").c_str(), "%d-%d-%dT%d:%d:%d", &y, &m, &d, &h, &min, &s) == 6)
    {
      struct tm t = {s, min, h, d, m - 1, y - 1900};
      time_t ts = mktime(&t);
      if (ts != -1)
      {
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
  }
  else
  {
    server.send(400, "text/plain", "No time data received");
    Serial.println("Time Set: No time data received");
  }
}

// Save File from Phone UI to ESP8266 storage
void handleFileSave()
{
  // Check if FILENAME is provided as PARAMETER
  String filename;
  if (server.hasArg("filename")) {
    filename = "/" + server.arg("filename");
  } else {
    filename = "/results.csv";
  }
  Serial.print("Uploading file: ");
  Serial.print(filename);
  Serial.print(" to ESP8266 --> ");
  
  // Check DATA to SAVE
  if (server.hasArg("plain"))
  {
    String data = server.arg("plain");

    // Initialize LittleFS
    if (!LittleFS.begin())
    {
      Serial.println("File Save: An error has occurred while mounting LittleFS");
      return;
    }

    // Open the file for writing
    File file = LittleFS.open(filename, "w");
    if (!file)
    {
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
    server.send(200, "text/plain", "Saved successfully");
    Serial.println("File Saved successfully");
  }
  else
  {
    server.send(400, "text/plain", "File Save: No data received");
  }
}

// LOAD RESULTS from ESP8266 storage
void handleFileLoad()
{
  // Check if FILENAME is provided as PARAMETER
  String filename;
  if (server.hasArg("filename")) {
    filename = "/" + server.arg("filename");
  } else {
    filename = "/results.csv";
  }
  Serial.print("Loading file: ");
  Serial.print(filename);
  Serial.print(" from ESP8266 --> ");

  if (LittleFS.begin())
  {
    File file = LittleFS.open(filename, "r");
    if (!file)
    {
      server.send(500, "text/plain", "Failed to open " + filename);
      Serial.println("FAILED to open");
      return;
    }
    server.streamFile(file, "text/csv");
      Serial.println("SUCCESS Loading File");
      file.close();
  }
  else
  {
    server.send(500, "text/plain", "Failed to mount file system");
    Serial.println("File Read: FAILED Mounting File System");
  }
}

// DOWNLOAD a FILE FROM ESP8266 Storage

void handleFileDownload() {
  String filename = server.arg("filename");
  String mimetype = getMimeType(filename);
  if (filename == "") {
    server.send(400, "text/plain", "File name is required");
    Serial.println("File Download: File name is required");
    return;
  }

  if (!LittleFS.exists("/" + filename)) {
    server.send(404, "text/plain", "File not found");
    Serial.printf("File Download: File /%s not found\n", filename);
    return;
  }

  File file = LittleFS.open("/" + filename, "r");
  if (!file) {
    server.send(500, "text/plain", "Failed to open file");
    Serial.printf("File Download: Failed to open file /%s\n", filename);
    return;
  }

  // server.sendHeader("Content-Type", "application/octet-stream");
  server.sendHeader("Content-Type", mimetype);
  server.sendHeader("Content-Disposition", "attachment; filename=" + filename);
  server.sendHeader("Connection", "close");

  size_t fileSize = file.size();
  server.sendHeader("Content-Length", String(fileSize));

  // size_t sent = server.streamFile(file, "application/octet-stream");
  size_t sent = server.streamFile(file, mimetype);

  file.close();

  if (sent != fileSize) {
    Serial.println("File Download: Error sending file: /" + filename);
  }
}
