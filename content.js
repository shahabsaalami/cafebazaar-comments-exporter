(() => {
  if (window.__cafeBazaarCommentExporterInstalled) return;
  window.__cafeBazaarCommentExporterInstalled = true;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const notify = message => chrome.runtime.sendMessage({ type: "EXPORT_STATUS", ...message }).catch(() => {});
  let isRunning = false;

  chrome.runtime.onMessage.addListener(message => {
    if (message.type !== "START_EXPORT" || isRunning) return;
    isRunning = true;
    exportComments(message.filename).catch(error => {
      notify({ state: "error", message: error.message || "استخراج دیدگاه‌ها ناموفق بود." });
    }).finally(() => { isRunning = false; });
  });

  async function exportComments(inputName) {
    const cleanName = String(inputName || "cafebazaar-comments")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\.csv$/i, "")
      .trim() || "cafebazaar-comments";

    let clicks = 0;
    while (true) {
      const button = document.querySelector("button.AppCommentsList__loadmore");
      if (!button || button.disabled) break;

      const oldCount = document.querySelectorAll(".AppComment").length;
      button.scrollIntoView({ block: "center" });
      button.click();

      let loaded = false;
      for (let i = 0; i < 80; i++) {
        await sleep(250);
        const newCount = document.querySelectorAll(".AppComment").length;
        if (newCount > oldCount) {
          loaded = true;
          break;
        }
        if (!document.querySelector("button.AppCommentsList__loadmore")) {
          loaded = true;
          break;
        }
      }

      if (!loaded) {
        notify({ state: "error", message: "بارگذاری دیدگاه‌ها متوقف شد؛ احتمالاً شبکه کند یا محدود شده است." });
        return;
      }
      clicks++;
      notify({ state: "progress", count: document.querySelectorAll(".AppComment").length });
      await sleep(700);
    }

    const cards = [...document.querySelectorAll(".AppComment")];
    if (!cards.length) throw new Error("دیدگاهی پیدا نشد. صفحهٔ اپ را باز کنید و مطمئن شوید بخش دیدگاه‌ها نمایش داده شده است.");

    const comments = cards.map(card => {
      const ratingStyle = card.querySelector(".rating__fill")?.getAttribute("style") || "";
      const percent = Number(ratingStyle.match(/width:\s*([\d.]+)%/)?.[1] || 0);
      return {
        id: card.id,
        username: card.querySelector(".AppComment__username")?.textContent.trim() || "",
        rating: Math.round(percent / 20),
        date: card.querySelector(".AppComment__meta > div:last-child")?.textContent.trim() || "",
        text: card.querySelector(".AppComment__body")?.textContent.trim() || "",
        likes: card.getAttribute("likes") || "0",
        votes: card.getAttribute("total") || "0"
      };
    });

    const columns = ["id", "username", "rating", "date", "text", "likes", "votes"];
    const escapeCsv = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = "\uFEFF" + [
      columns.join(","),
      ...comments.map(comment => columns.map(column => escapeCsv(comment[column])).join(","))
    ].join("\r\n");

    const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${cleanName}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    notify({ state: "done", count: comments.length });
  }
})();
