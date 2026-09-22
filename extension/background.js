// Maana Chrome Extension Background Service Worker (Manifest V3)

const DEFAULT_BACKEND_URL = "http://localhost:5173";
const DEFAULT_TOKEN = "maana_dev_token_001";
const DEBOUNCE_MS = 600;

let debounceTimer = null;
let lastDispatchedUrl = "";

// Initialize settings
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["backendUrl", "userToken", "isPaused", "recentEvents"]);
  if (!existing.backendUrl) {
    await chrome.storage.local.set({ backendUrl: DEFAULT_BACKEND_URL });
  }
  if (!existing.userToken) {
    await chrome.storage.local.set({ userToken: DEFAULT_TOKEN });
  }
  if (existing.isPaused === undefined) {
    await chrome.storage.local.set({ isPaused: false });
  }
  if (!existing.recentEvents) {
    await chrome.storage.local.set({ recentEvents: [] });
  }

  // Set idle detection to 60 seconds
  if (chrome.idle) {
    chrome.idle.setDetectionInterval(60);
  }
  console.log("[Maana Background] Service worker initialized.");
});

// Sanitizes URL by stripping sensitive credentials / query tokens
function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    // Remove query params matching common secret keys
    const sensitiveKeys = ["token", "auth", "key", "password", "secret", "access_token", "api_key", "session"];
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        parsed.searchParams.set(key, "[redacted]");
      }
    }
    return {
      cleanUrl: parsed.toString(),
      domain: parsed.hostname.replace(/^www\./, ""),
    };
  } catch {
    return {
      cleanUrl: rawUrl,
      domain: "unknown",
    };
  }
}

// Emits an observation event to the backend and updates local ring-buffer
async function emitObservationEvent(eventType, tabInfo, extraPayload = {}) {
  const settings = await chrome.storage.local.get(["backendUrl", "userToken", "isPaused", "recentEvents"]);
  if (settings.isPaused) {
    console.log("[Maana] Tracking is paused by user.");
    return;
  }

  const { cleanUrl, domain } = sanitizeUrl(tabInfo.url || "");

  // Ignore internal chrome:// and extension:// URLs
  if (cleanUrl.startsWith("chrome://") || cleanUrl.startsWith("chrome-extension://") || cleanUrl.startsWith("about:")) {
    return;
  }

  const eventPayload = {
    source: "browser",
    type: eventType,
    timestamp: Date.now(),
    domain,
    url: cleanUrl,
    title: tabInfo.title || domain,
    tabId: tabInfo.id,
    payload: {
      ...extraPayload,
      incognito: tabInfo.incognito || false,
    },
  };

  // 1. Update local ring buffer (keep last 20 events)
  const recentEvents = settings.recentEvents || [];
  recentEvents.unshift({
    type: eventType,
    domain,
    title: eventPayload.title,
    timestamp: eventPayload.timestamp,
  });
  if (recentEvents.length > 20) {
    recentEvents.pop();
  }
  await chrome.storage.local.set({ recentEvents });

  // 2. Transmit to backend
  const backendUrl = settings.backendUrl || DEFAULT_BACKEND_URL;
  const token = settings.userToken || DEFAULT_TOKEN;

  try {
    const res = await fetch(`${backendUrl}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(eventPayload),
    });

    if (res.ok) {
      const data = await res.json();
      console.log("[Maana Event Sent]", eventType, domain, data);
    } else {
      console.warn("[Maana Backend Warning]", res.status, res.statusText);
    }
  } catch (err) {
    // Graceful offline fallback
    console.debug("[Maana Backend Connection Notice]", err.message);
  }
}

// 1. Tab Activation (Switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab && tab.url) {
        lastDispatchedUrl = tab.url;
        await emitObservationEvent("TAB_ACTIVE", tab);
      }
    } catch (e) {
      // Tab might have been closed immediately
    }
  }, DEBOUNCE_MS);
});

// 2. Tab Navigation / URL change
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.url || changeInfo.title)) {
    if (changeInfo.url && changeInfo.url === lastDispatchedUrl) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      lastDispatchedUrl = tab.url || "";
      await emitObservationEvent("NAVIGATED", tab);
    }, DEBOUNCE_MS);
  }
});

// 3. Idle / Active State detection
if (chrome.idle) {
  chrome.idle.onStateChanged.addListener(async (state) => {
    console.log("[Maana Idle State]", state);
    if (state === "idle" || state === "locked") {
      await emitObservationEvent("IDLE_STARTED", { url: "", title: "Idle Period", id: 0 }, { state });
    } else if (state === "active") {
      await emitObservationEvent("IDLE_ENDED", { url: "", title: "Active Resumed", id: 0 }, { state });
    }
  });
}

// 4. Content Script Messages (e.g. YouTube video transitions)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "YOUTUBE_VIDEO_CHANGED" && sender.tab) {
    emitObservationEvent("VIDEO_CHANGED", {
      ...sender.tab,
      url: message.url || sender.tab.url,
      title: message.title || sender.tab.title,
    }, { videoId: message.videoId });
    sendResponse({ received: true });
  }
  return true;
});
