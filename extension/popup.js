// Maana Extension Popup Logic

function formatTimeAgo(timestamp) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

async function renderPopup() {
  const data = await chrome.storage.local.get(["userToken", "isPaused", "recentEvents"]);

  const tokenInput = document.getElementById("tokenInput");
  const statusPill = document.getElementById("statusPill");
  const statusText = document.getElementById("statusText");
  const pauseToggleBtn = document.getElementById("pauseToggleBtn");
  const eventList = document.getElementById("eventList");

  if (tokenInput && data.userToken) {
    tokenInput.value = data.userToken;
  }

  // Update Status Pill & Pause Button
  if (data.isPaused) {
    statusPill.className = "status-pill paused";
    statusText.textContent = "Paused";
    pauseToggleBtn.textContent = "Resume Tracking";
    pauseToggleBtn.style.color = "#34d399";
  } else {
    statusPill.className = "status-pill";
    statusText.textContent = "Active Tracking";
    pauseToggleBtn.textContent = "Pause Tracking";
    pauseToggleBtn.style.color = "#e4e4e7";
  }

  // Render Recent Events Stream
  const events = data.recentEvents || [];
  if (events.length === 0) {
    eventList.innerHTML = `
      <div style="text-align: center; color: #71717a; padding: 12px 0;">
        Waiting for tab activity...
      </div>
    `;
  } else {
    eventList.innerHTML = events
      .slice(0, 5)
      .map(
        (ev) => `
        <div class="event-item">
          <div class="event-top">
            <span class="event-type">${ev.type}</span>
            <span class="event-time">${formatTimeAgo(ev.timestamp)}</span>
          </div>
          <div class="event-title" title="${ev.title || ''}">
            ${ev.domain ? `[${ev.domain}] ` : ""}${ev.title || "Untitled"}
          </div>
        </div>
      `
      )
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderPopup();

  // Save Token
  document.getElementById("saveTokenBtn").addEventListener("click", async () => {
    const val = document.getElementById("tokenInput").value.trim();
    if (val) {
      await chrome.storage.local.set({ userToken: val });
      const btn = document.getElementById("saveTokenBtn");
      btn.textContent = "Saved ✓";
      setTimeout(() => {
        btn.textContent = "Connect Session";
      }, 1500);
    }
  });

  // Toggle Pause
  document.getElementById("pauseToggleBtn").addEventListener("click", async () => {
    const data = await chrome.storage.local.get(["isPaused"]);
    const newPaused = !data.isPaused;
    await chrome.storage.local.set({ isPaused: newPaused });
    await renderPopup();
  });

  // Open Web Cockpit
  document.getElementById("openCockpitLink").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:5173" });
  });

  // React to storage updates live
  chrome.storage.onChanged.addListener(() => {
    renderPopup();
  });
});
