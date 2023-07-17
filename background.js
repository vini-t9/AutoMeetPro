chrome.runtime.onInstalled.addListener(() => {
  console.log("Google Meet Automation extension installed.");
  //set default value to true
  chrome.storage.sync.set({ enabledCLinimeet: true }, () => {});
});

//enable disable extension on click
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.sync.get("enabledCLinimeet", (data) => {
    if (data.enabledCLinimeet) {
      chrome.storage.sync.set({ enabledCLinimeet: false }, () => {});
    } else {
      chrome.storage.sync.set({ enabledCLinimeet: true }, () => {});
    }
  });
  //send message to content.js
  chrome.tabs.sendMessage(tab.id, { message: "toggleCLinimeet" });
});
