# 🚀 ESP8266 Web Server Timer Project

## Overview

Welcome to the **ESP8266 Web Server Project**! This is a simple "Smart Timer" with a Push Button. The Timer provides a Responsive Web Interface and Wi-Fi Acceess Point. This allows for someone to remotely START the timer (from a smartphone, etc.), and STOP the timer when reaching the Push Button.
This Project was initially built for Climbers: starting the timer from Web Interface before climbing, and stopping it by hitting the Push Button when reaching to the top. The project is designed for **electronic hobbyists** to get familira with a tiny **fullstack IoT**, on inexpensive **ESP8266** boards. All web design can be tweaked and adapted for other sports & usage. Timer stores & displays all results, with extra capabilities such as: sorting, exporting. 

## Features

- **Soft Access Point (AP)**: The ESP8266 board starts a soft AP for easy connectivity.
- **LittleFS Filesystem**: Uses LittleFS to manage web files (css, js) and store timer results.
- **Captive Web Portal**: Provides a redirection to friendly web interface once connected to Access Point.
- **Web Timer**: Times multiple events, stored in a table, with filtering and exporting capabilities
- **ESP8266 Stop Button**: Start the timer from a web page (e.g., smartphone) and stop it physically upon reaching the destination (e.g., climbing, running, self-timing).
- **RAM Partition**: Manages storing & loading results directly on the ESP8266 partition, even after power-off
- **Responsive Web Interface**: Fully customizable and fits most smartphones or computers.
- **Public and Open Source**: Available for everyone to enjoy, enhance & improve!

## Components

- **ESP8266_WebServer.ino**: The main Arduino sketch.
- **my_littlefs_lib.cpp & my_littlefs_lib.h**: Custom libraries for handling LittleFS operations.
- **index.html**: The main web page served by the server.
- **style.css**: Stylesheet to make the web interface look sleek.
- **script.js**: JavaScript to add interactivity to the web page.

## Getting Started

1. **Clone this repository**: `git clone https://github.com/your-username/ESP8266_WebServer_Project.git`
2. **Upload the sketch**: Compile and upload `ESP8266_WebServer.ino` to your ESP8266 board.
3. **Connect to the Soft AP**: Connect to the Wi-Fi network broadcasted by the ESP8266 (pwd: 'climbclimb')
4. **Open the web portal**: Visit the captive web portal using your web browser.

## Contributing

We welcome contributions from everyone! Feel free to **fork** the repository, **submit pull requests**, or simply suggest improvements through **issues**. Let's make this project even more awesome together! 🎉
