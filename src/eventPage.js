/*
 * This code uses event pages, a special webextension thingy documented here:
 * https://developer.chrome.com/extensions/event_pages
 */

var client = require("./client.js")

"use strict";

var check_interval = 5;
var max_check_interval = 10;
var heartbeat_interval = 1;
var heartbeat_pulsetime = heartbeat_interval + max_check_interval;

var last_heartbeat_data = null;
var last_heartbeat_time = null;

function heartbeat(videoData) {
  //console.log(JSON.stringify(tab));
  var now = new Date();
  var data = videoData;
  // First heartbeat on startup
  if (last_heartbeat_time === null){
    //console.log("aw-watcher-web: First");
    client.sendHeartbeat(now, data, heartbeat_pulsetime);
    last_heartbeat_data = data;
    last_heartbeat_time = now;
  }
  // Any tab data has changed, finish previous event and insert new event
  else if (JSON.stringify(last_heartbeat_data) != JSON.stringify(data)){
    //console.log("aw-watcher-web: Change");
    // client.sendHeartbeat(new Date(now-1), last_heartbeat_data, heartbeat_pulsetime);
    client.sendHeartbeat(now, data, heartbeat_pulsetime);
    last_heartbeat_data = data;
    last_heartbeat_time = now;
  }
  // If heartbeat interval has been exceeded
  else if (new Date(last_heartbeat_time.getTime()+(heartbeat_interval*1000)) < now){
    //console.log("aw-watcher-web: Update");
    client.sendHeartbeat(now, data, heartbeat_pulsetime);
    last_heartbeat_time = now;
  }
}

/*
 * Heartbeat tab change
 */

function videoDataUpdate(videoData) {
  heartbeat(videoData);
}


/*
 * Start/stop logic
 */

function startWatcher() {
  console.log("Starting watcher");
  client.setup();
}

function stopWatcher() {
  console.log("Stopping watcher");
}

/*
 * Listen for events from popup.js
 */

let lastVideoDataSource = null;
let lastVideoDataDate = Date.now() - 2000;
let lastDeniedVideoDataSource = null;
let lastDeniedVideoDataDate = 0;

function messageReceived(request, sender, sendResponse) {
  const { type, data, source } = request;
  if (type === "changeEnabled") {
    if (data.enabled != undefined) {
      chrome.storage.local.set({"enabled": data.enabled});
      if (data.enabled) {
        startWatcher();
      } else {
        stopWatcher();
      }
    }
  } if (type === "changeAllowedHostnames") {
    chrome.storage.local.set({"allowedHostnames": data.allowedHostnames});
    if (data.allowedHostnames !== "") {
      stopWatcher();
      startWatcher();
    } else {
      stopWatcher();
    }
  } if (type === "changeHostname") {
    chrome.storage.local.set({"hostname": data.hostname});
    if (data.hostname !== "") {
      stopWatcher();
      startWatcher();
    } else {
      stopWatcher();
    }
  } else if (type === "videoData") {
    // console.log(`Got videoData event from ${source} ${Date.now() - lastVideoDataDate}ms after last accepted videoData event. Last videoData event source: ${lastVideoDataSource}`);
    if (source === lastVideoDataSource) {
      lastVideoDataDate = Date.now();
      sendResponse({ code: (Date.now() - lastDeniedVideoDataDate > 500) ? 1 : 2, extra: lastDeniedVideoDataSource }); // 1 = accepted, 2 = accepted, but competitor was denied
      videoDataUpdate(data);
    } else if ((Date.now() - lastVideoDataDate) > 2000) {
      lastVideoDataDate = Date.now();
      lastVideoDataSource = source;
      sendResponse({ code: (Date.now() - lastDeniedVideoDataDate > 500) ? 1 : 2, extra: lastDeniedVideoDataSource }); // 1 = accepted, 2 = accepted, but competitor was denied
      videoDataUpdate(data);
    } else {
      lastDeniedVideoDataDate = Date.now();
      sendResponse({ code: 0 }); // 0 = denied
    }
  }
}

function startListener() {
  chrome.storage.local.get(["enabled"], function(obj) {
    if (obj.enabled == undefined) {
      chrome.storage.local.set({"enabled": true});
    }
  });
  chrome.runtime.onMessage.addListener(messageReceived);
}

/*
 * Init
 */

(function() {
  startListener();
  startWatcher();
})();
