const extensionId = chrome.runtime.id;

chrome.storage.local.get(["allowedHostnames"], function(obj) {
    const allowedHostnames = obj.allowedHostnames.split(",");
    if (this && this.location && allowedHostnames.indexOf(this.location.hostname) !== -1) {
        document.addEventListener('ActivityWatchMusareEvent', function (event) {
            const { type, data, source } = event.detail;
    
            if (type === "ping") {
                document.dispatchEvent(new CustomEvent('ActivityWatchMusareEvent', { detail: { type: "pong" } }));
            }
    
            if (type === "videoData") {
                chrome.runtime.sendMessage(extensionId, { type: "videoData", data, source }, response => {
                    if (response.code === 0) {
                        document.dispatchEvent(new CustomEvent('ActivityWatchMusareEvent', { detail: { type: "denied" } }));
                    } else if (response.code === 2) {
                        document.dispatchEvent(new CustomEvent('ActivityWatchMusareEvent', { detail: { type: "competitor", competitor: response.extra } }));
                    }
                });
            }
        });
    }
});
