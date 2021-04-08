"use strict";

var AWClient = require("../aw-client-js/out/aw-client.js").AWClient;
var ua_parser = require("ua-parser-js");
var retry = require("p-retry") // See aw-watcher-web issue #41

function emitNotification(title, message) {
  chrome.notifications.create({
    "type": "basic",
    "iconUrl": chrome.extension.getURL("media/logo/logo-128.png"),
    "title": title,
    "message": message,
  });
}

function logHttpError(error) {
  // No response property for network errors
  if (error.response) {
    console.error("Status code: " + error.response.status + ", response: " + error.response.data.message);
  } else {
    console.error("Unexpected error: " + error);
  }
}

var client = {
  testing: null,
  awc: null,
  lastSyncSuccess: true,
  allowedHostnames: null,
  hostname: null,

  setup: function() {
    console.log("Setting up client");
    // Check if in dev mode
    chrome.management.getSelf(function(info) {
      client.testing = info.installType === "development";
      client.testing = false;
      console.log("testing: " + client.testing);

      client.awc = new AWClient("aw-client-musare", {testing: client.testing});

      // Needed in order to show testing information in popup
      chrome.storage.local.set({"testing": client.testing, "baseURL": client.awc.baseURL});

      chrome.storage.local.get(["allowedHostnames", "hostname"], function(obj) {
        client.allowedHostnames = obj.allowedHostnames;
        client.hostname = obj.hostname;
        chrome.storage.local.set({"bucketId": client.getBucketId()});
        client.createBucket();
      });
    });
  },

  getBucketId: function() {
    return "aw-watcher-musare";
  },

  updateSyncStatus: function(){
    chrome.storage.local.set({
      "lastSyncSuccess": client.lastSyncSuccess,
      "lastSync": new Date().toISOString()
    });
  },

  createBucket: function(){
    if (this.testing === null) {
      console.log("Not creating bucket, testing is null!");
      return;
    }
    
    if (this.allowedHostnames === "" || this.allowedHostnames === null || this.allowedHostnames === undefined) {
      console.log("Not creating bucket, allowed hostnames is not set!");
      return;
    }
    if (this.hostname === "" || this.hostname === null || this.hostname === undefined) {
      console.log("Not creating bucket, hostname is not set!");
      return;
    }

    var bucket_id = this.getBucketId();
    var eventtype = "musare.song.playing";

    function attempt() {
      return client.awc.ensureBucket(bucket_id, eventtype, client.hostname)
        .catch( (err) => {
          console.error("Failed to create bucket, retrying...");
          logHttpError(err);
          return Promise.reject(err);
        }
      );
    }

    retry(attempt, { forever: true });
  },

  sendHeartbeat: function(timestamp, data, pulsetime) {
    if (this.testing === null)
      return;

    if (this.allowedHostnames === "" || this.allowedHostnames === null || this.allowedHostnames === undefined) {
      console.log("Not sending heartbeat, allowed hostnames is not set!");
      emitNotification(
        "Unable to send event to server",
        "Allowed hostnames is not set. Please set the allowed hostnames."
      );
      return;
    }
    if (this.hostname === "" || this.hostname === null || this.hostname === undefined) {
        console.log("Not sending heartbeat, hostname is not set!");
        emitNotification(
          "Unable to send event to server",
          "Hostname is not set. Please set the hostname."
        );
        return;
    }

    var payload = {
        "data": data,
        "duration": 0.0,
        "timestamp": timestamp.toISOString(),
    };

    var attempt = () => {
      return this.awc.heartbeat(this.getBucketId(), pulsetime, payload);
    }

    retry(attempt, { retries: 3 }).then(
      (res) => {
        if (!client.lastSyncSuccess) {
          emitNotification(
            "Now connected again",
            "Connection to ActivityWatch server established again"
          );
        }
        client.lastSyncSuccess = true;
        client.updateSyncStatus();
      }, (err) => {
        if(client.lastSyncSuccess) {
          emitNotification(
            "Unable to send event to server",
            "Please ensure that ActivityWatch is running"
          );
        }
        client.lastSyncSuccess = false;
        client.updateSyncStatus();
        logHttpError(err);
      }
    );
  }
};

module.exports = client;
