chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "START_EXPORT") return;

  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error("صفحهٔ فعالی پیدا نشد.");

    const url = new URL(tab.url);
    if (url.protocol !== "https:" || !/(^|\.)cafebazaar\.ir$/i.test(url.hostname)) {
      throw new Error("این اکستنشن را از صفحهٔ اپ در cafebazaar.ir اجرا کنید.");
    }

    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tab.id, {
      type: "START_EXPORT",
      filename: String(message.filename || "cafebazaar-comments")
    });
    sendResponse({ ok: true });
  })().catch(error => sendResponse({ ok: false, error: error.message || "خطای نامشخص" }));

  return true;
});
