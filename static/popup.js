"use strict";

function renderStatus() {
  chrome.storage.local.get(["lastSync", "lastSyncSuccess", "testing", "baseURL", "enabled", "allowedHostnames", "hostname"], function(obj) {
    // Enabled checkbox
    document.getElementById('status-enabled-checkbox').checked = obj.enabled;

    // Allowed hostnames input
    document.getElementById('allowed-hostnames-input').value = (!obj.allowedHostnames) ? "" : obj.allowedHostnames;

    // Hostname input
    document.getElementById('hostname-input').value = (!obj.hostname) ? "" : obj.hostname;

    // Connected
    let connectedColor = obj.lastSyncSuccess ? "#00AA00" : "#FF0000";
    let connectedCharacter = obj.lastSyncSuccess ? "✔" : "✖";
    let element = document.getElementById('status-connected-icon');
    element.innerHTML = connectedCharacter;
    element.style = "color: " + connectedColor + ";";

    // Testing
    if (obj.testing == true) {
      let element = document.getElementById('testing-notice');
      element.innerHTML = "Extension is running in testing mode";
      element.style = "color: #F60; font-size: 1.2em;";
    }

    // Last sync
    let lastSyncString = obj.lastSync ? new Date(obj.lastSync).toLocaleString() : "never";
    document.getElementById('status-last-sync').innerHTML = lastSyncString;

    // Set webUI button link
    document.getElementById('webui-link').href = obj.baseURL;
  });
}

function domListeners() {
  let enabled_checkbox = document.getElementById('status-enabled-checkbox');
  enabled_checkbox.addEventListener("change", (obj) => {
    let enabled = obj.srcElement.checked;
    chrome.runtime.sendMessage({type: "changeEnabled", data: { enabled }}, function(response) {});
  });

  let allowed_hostnames_input = document.getElementById('allowed-hostnames-input');
  allowed_hostnames_input.addEventListener("keyup", (obj) => {
	if (obj.keyCode === 13) { // Enter key
	  let allowedHostnames = obj.srcElement.value;
      chrome.runtime.sendMessage({type: "changeAllowedHostnames", data: { allowedHostnames }}, function(response) {
		  console.log("Done!");
		  setTimeout(function() {
			  renderStatus();
		  }, 1000);
	  });
	}
  });
  
  let hostname_input = document.getElementById('hostname-input');
  hostname_input.addEventListener("keyup", (obj) => {
    if (obj.keyCode === 13) { // Enter key
      let hostname = obj.srcElement.value;
        chrome.runtime.sendMessage({type: "changeHostname", data: { hostname }}, function(response) {
        console.log("Done!");
        setTimeout(function() {
          renderStatus();
        }, 1000);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  renderStatus();
  domListeners();
})

