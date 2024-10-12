# 🚀 ESP8266 Web Server Timer Project

## Overview

Welcome to the **ESP8266 Web Server Project**! This is a fun and exciting project designed for **electronic hobbyists** who want to delve into the world of **web development** on **ESP8266** boards. By combining the power of **Arduino** and **ESP8266**, we've created a user-friendly **captive web portal** that provides a seamless experience for displaying information and interacting with your board.

## Features

- **Soft Access Point (AP)**: The ESP8266 board starts a soft AP for easy connectivity.
- **LittleFS Filesystem**: Uses LittleFS to manage and serve web files.
- **Captive Web Portal**: Provides a friendly web interface for users to interact with.
- **Web Timer**: Times multiple events, stored in a table.
- **ESP8266 Stop Button**: Start the timer from a web page (e.g., smartphone) and stop it physically upon reaching the destination (e.g., climbing, running, self-timing).
- **RAM Partition**: Manages storing & loading results directly on the ESP8266 partition.
- **Responsive Web Interface**: Fully customizable and fits most smartphones or computers.
- **Public and Open Source**: Available for everyone to enhance and improve!

## Components

- **ESP8266_WebServer.ino**: The main Arduino sketch.
- **my_littlefs_lib.cpp & my_littlefs_lib.h**: Custom libraries for handling LittleFS operations.
- **index.html**: The main web page served by the server.
- **style.css**: Stylesheet to make the web interface look sleek.
- **script.js**: JavaScript to add interactivity to the web page.

## Getting Started

1. **Clone this repository**: `git clone https://github.com/your-username/ESP8266_WebServer_Project.git`
2. **Upload the sketch**: Compile and upload `ESP8266_WebServer.ino` to your ESP8266 board.
3. **Connect to the Soft AP**: Connect to the Wi-Fi network broadcasted by the ESP8266.
4. **Open the web portal**: Visit the captive web portal using your web browser.

## Contributing

We welcome contributions from everyone! Feel free to **fork** the repository, **submit pull requests**, or simply suggest improvements through **issues**. Let's make this project even more awesome together! 🎉
