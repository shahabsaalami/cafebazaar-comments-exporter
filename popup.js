const filenameInput = document.querySelector("#filename");
const startButton = document.querySelector("#start");
const statusBox = document.querySelector("#status");

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}

function defaultName(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const appId = decodeURIComponent(parts.at(-1) || "app");
    return `cafebazaar-${appId}-comments`;
  } catch {
    return "cafebazaar-comments";
  }
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.url) filenameInput.value = defaultName(tab.url);
});

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  setStatus("در حال آماده‌سازی صفحه…");
  const filename = filenameInput.value.trim() || "cafebazaar-comments";
  try {
    const response = await chrome.runtime.sendMessage({ type: "START_EXPORT", filename });
    if (!response?.ok) {
      setStatus(response?.error || "شروع استخراج ممکن نشد.", true);
      startButton.disabled = false;
      return;
    }
    setStatus("در حال خواندن دیدگاه‌ها…");
  } catch {
    setStatus("ارتباط با صفحه برقرار نشد. صفحه را تازه‌سازی و دوباره امتحان کنید.", true);
    startButton.disabled = false;
  }
});

chrome.runtime.onMessage.addListener(message => {
  if (message.type !== "EXPORT_STATUS") return;
  if (message.state === "progress") setStatus(`در حال بارگذاری دیدگاه‌ها… (${message.count} مورد)`);
  if (message.state === "done") {
    setStatus(`${message.count} دیدگاه در فایل CSV ذخیره شد.`);
    startButton.disabled = false;
  }
  if (message.state === "error") {
    setStatus(message.message, true);
    startButton.disabled = false;
  }
});
