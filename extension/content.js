// Maana Content Script for YouTube & Media Transition Detection

(function () {
  let lastVideoId = "";

  function extractVideoId(url) {
    try {
      const u = new URL(url);
      return u.searchParams.get("v") || "";
    } catch {
      return "";
    }
  }

  function reportVideoTransition() {
    const currentUrl = window.location.href;
    const videoId = extractVideoId(currentUrl);

    if (videoId && videoId !== lastVideoId) {
      lastVideoId = videoId;
      // Extract clean video title without YouTube branding suffix
      const title = document.title.replace(/ - YouTube$/, "").trim();

      chrome.runtime.sendMessage({
        type: "YOUTUBE_VIDEO_CHANGED",
        videoId,
        title,
        url: currentUrl,
      });
    }
  }

  // Listen to YouTube's SPA navigation lifecycle event
  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(reportVideoTransition, 600);
  });

  // Fallback check on initial document load
  if (document.readyState === "complete") {
    setTimeout(reportVideoTransition, 800);
  } else {
    window.addEventListener("load", () => {
      setTimeout(reportVideoTransition, 800);
    });
  }
})();
