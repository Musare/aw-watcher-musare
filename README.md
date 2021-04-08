# aw-watcher-musare

An extension for Musare forked from https://github.com/ActivityWatch/aw-watcher-web - modified to get song events from a Musare instance and passing it on to ActivityWatch.

## Basic overview

### Building

(on Linux)  
1. `npm install`  
2. `make build`  

### Using for the first time

1. Once the extension is installed, open the extension popup by clicking on the icon (top right in most browsers).  
2. Fill in a list of hostnames that the extension should work on (e.g. localhost,3. musare.com, etc.) seperated with a comma.  
3. In the hostname field, put in the hostname of your computer.  

### How it works

- Musare's frontend and this extension will communicate via events on the document of the webpage.  
- Musare's frontend will send a ping event, the extension will respond with a pong event, letting the frontend know everything is working correctly.  
- Musare's frontend on the station page and edit song modal will send videoData objects to the extension, including the frontend's UUID (random UUID generated each page reload).  
- This extension will only accept videoData if no other frontend submitted any videoData in the last few seconds. If it did, it will block the request and let the blocked frontend know it was blocked. It will also let the not-blocked frontend know that a different frontend is trying and failing to send videoData events to the extension.  
- The videoData events, when they're not blocked, will be sent to ActivityWatch.  
