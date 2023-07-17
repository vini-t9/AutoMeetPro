class GoogleMeetHelper {
  constructor() {
    this.recordingInterval = null;
    this.admitInterval = null;
  }

  getCallingScreen() {
    const e = document.querySelector("c-wiz");
    return e && e.dataset && e.dataset.unresolvedMeetingId ? e : null;
  }

  isInCall() {
    const callingScreen = this.getCallingScreen();
    return !!(
      callingScreen && callingScreen.getAttribute("__is_owner") === "true"
    );
  }

  isRecording() {
    const recordingElement = document.querySelector(
      "[data-auto-ack-recording]"
    );
    if (!recordingElement) return false;
    const parentNode = recordingElement.parentNode;
    if (!parentNode) return false;
    const targetElement = parentNode.querySelector(
      "div > div[jsaction][jscontroller][style] > div > div > div[jsaction][jscontroller][data-auto-collapse] > div"
    );
    const iconElement = targetElement?.querySelector("i.google-material-icons");
    return iconElement?.innerText === "radio_button_checked";
  }

  async startRecording() {
    if (!this.getCallingScreen()) {
      return { canRecord: false };
    }
    if (this.isRecording()) {
      return { canRecord: false };
    }
    const showMoreButton = await this.waitForElement([
      'div[jsshadow][role="button"][data-tab-id="10"]',
      'button[data-panel-id="10"]',
    ]);
    if (!showMoreButton) {
      return { canRecord: false };
    }
    showMoreButton.click();
    await wait(750);
    const recordActivityButton = await this.waitForElement(
      'li[data-tool-id="6"]'
    );
    if (!recordActivityButton) {
      return {
        canRecord: false,
        errorType: "START_RECORDING_BUTTON_NOT_FOUND",
      };
    }
    recordActivityButton.click();
    const startRecordingButton = await this.waitForElement(
      'div[data-sub-panel-id="6"] > * button:last-child'
    );
    if (!startRecordingButton) {
      return { canRecord: false };
    }
    startRecordingButton.click();
    const confirmButton = await this.waitForElement([
      'p > div > div[role="button"]',
      'div[role="dialog"][jsshadow] > div[jsname]:nth-last-child(2) > * div[role="button"]:last-child',
      '[data-mdc-dialog-action="ok"]',
      "div.VfPpkd-T0kwCb > button:nth-child(2)",
    ]);
    if (confirmButton) {
      confirmButton.click();
      await wait(500);
      const closeButton = document.querySelectorAll(".google-material-icons");
      const closeIcon = Array.from(closeButton).find(
        (e) => e.innerText === "close"
      );
      closeIcon && closeIcon.click();
      return { canRecord: true };
    } else {
      return { canRecord: false };
    }
  }

  async waitForElement(selector, parent = document, attempts = 50) {
    const elements = Array.isArray(selector) ? selector.join(", ") : selector;
    const element = parent.querySelector(elements);

    if (!element && attempts > 0) {
      await wait(100);
      return this.waitForElement(elements, parent, attempts - 1);
    } else {
      return element;
    }
  }

  startRecordingInterval() {
    this.recordingInterval = setInterval(() => {
      if (!this.isInCall()) {
        console.log("Not in call");
        return;
      } else if (this.isRecording()) {
        console.log("Already recording");
        return;
      } else {
        this.startRecording().then((result) => {
          if (result.canRecord) {
            console.log("Recording started automatically.");
          } else {
            console.log("Recording could not be started automatically.");
          }
        });
      }
    }, 5000);
  }

  stopRecordingInterval() {
    clearInterval(this.recordingInterval);
  }

  startAdmitInterval() {
    const autoAdmit = async () => {
      const admitButtons = document.querySelectorAll("span[jsname][class]");
      for (let element of admitButtons) {
        if (element.innerText !== "Admit All") continue;
        console.log(
          "There is someone waiting to join this meeting, automatically admitting them..."
        );
        element.click();
        await wait(500);
      }
    };

    const runAutoAdmit = async () => {
      await autoAdmit();
      this.admitTimeout = setTimeout(runAutoAdmit, 2000);
    };

    runAutoAdmit();
  }

  stopAdmitInterval() {
    clearTimeout(this.admitTimeout);
  }
}

function wait(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const googleMeetHelper = new GoogleMeetHelper();

// Start recording automatically and listen for messages from background.js
function startRecordingAutomatically() {
  googleMeetHelper.startRecordingInterval();
  googleMeetHelper.startAdmitInterval();
  console.log("Google Meet Automation extension enabled.");
}

function stopRecordingAutomatically() {
  googleMeetHelper.stopRecordingInterval();
  googleMeetHelper.stopAdmitInterval();
  console.log("Google Meet Automation extension disabled.");
}

// Event listener for page load
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "toggleCLinimeet") {
    chrome.storage.sync.get("enabledCLinimeet", (data) => {
      if (data.enabledCLinimeet) {
        startRecordingAutomatically();
      } else {
        stopRecordingAutomatically();
      }
    });
  }
});

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "toggleCLinimeet") {
    chrome.storage.sync.get("enabledCLinimeet", (data) => {
      if (data.enabledCLinimeet) {
        startRecordingAutomatically();
      } else {
        stopRecordingAutomatically();
      }
    });
  }
});

// Send a message to content script in all Google Meet tabs
function toggleCLinimeet() {
  chrome.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { message: "toggleCLinimeet" });
    });
  });
}

// Enable/disable extension on click
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.sync.get("enabledCLinimeet", (data) => {
    const enabled = !data.enabledCLinimeet;
    chrome.storage.sync.set({ enabledCLinimeet: enabled }, () => {
      toggleCLinimeet();
    });
  });
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Google Meet Automation extension installed.");
  chrome.storage.sync.set({ enabledCLinimeet: true }, () => {
    toggleCLinimeet();
  });
});
