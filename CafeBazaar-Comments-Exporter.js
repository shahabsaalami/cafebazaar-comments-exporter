
(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  // دریافت پکیج نیم از انتهای URL
  const pathParts = window.location.pathname
    .split("/")
    .filter(Boolean);

  const packageName = decodeURIComponent(
    pathParts[pathParts.length - 1] || "unknown"
  );

  const defaultFileName = `cafebazaar-${packageName}.comments.csv`;

  // دریافت نام فایل از کاربر قبل از شروع
  const inputFileName = prompt(
    "نام فایل خروجی CSV را وارد کنید:",
    defaultFileName
  );

  // اگر کاربر Cancel بزند، عملیات متوقف می‌شود
  if (inputFileName === null) {
    console.log("عملیات توسط کاربر لغو شد.");
    return;
  }

  const fileName = (
    inputFileName.trim() || defaultFileName
  )
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\.csv$/i, "") + ".csv";

  // برای دریافت همه نظرات Infinity بگذارید
  const MAX_CLICKS = Infinity;
  let clicks = 0;

  while (clicks < MAX_CLICKS) {
    const button = document.querySelector(
      "button.AppCommentsList__loadmore"
    );

    if (!button) break;

    const oldCount = document.querySelectorAll(".AppComment").length;

    button.scrollIntoView({ block: "center" });
    button.click();

    let loaded = false;

    for (let i = 0; i < 80; i++) {
      await sleep(250);

      const newCount =
        document.querySelectorAll(".AppComment").length;

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
      console.warn(
        "بارگذاری متوقف شد؛ احتمالاً محدودیت شبکه وجود دارد."
      );
      break;
    }

    clicks++;
    await sleep(700);
  }

  const comments = [
    ...document.querySelectorAll(".AppComment")
  ].map(card => {
    const ratingStyle =
      card.querySelector(".rating__fill")
        ?.getAttribute("style") || "";

    const percent = Number(
      ratingStyle.match(/width:\s*([\d.]+)%/)?.[1] || 0
    );

    return {
      id: card.id,
      username:
        card.querySelector(".AppComment__username")
          ?.textContent.trim() || "",
      rating: Math.round(percent / 20),
      date:
        card.querySelector(
          ".AppComment__meta > div:last-child"
        )?.textContent.trim() || "",
      text:
        card.querySelector(".AppComment__body")
          ?.textContent.trim() || "",
      likes: card.getAttribute("likes") || "0",
      votes: card.getAttribute("total") || "0"
    };
  });

  const columns = [
    "id",
    "username",
    "rating",
    "date",
    "text",
    "likes",
    "votes"
  ];

  const escapeCsv = value =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;

  const csv =
    "\uFEFF" +
    [
      columns.join(","),
      ...comments.map(comment =>
        columns.map(column => escapeCsv(comment[column])).join(",")
      )
    ].join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

  console.log(
    `${comments.length} نظر استخراج شد. فایل: ${fileName}`
  );
})();
