const express = require("express");
const app = express();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cart item нэмэх endpoint
app.post("/cart/add", (req, res) => {
  res.json({ ok: true, items: 1 });
});

// Report endpoint дээр 200–400ms орчим зориудаар delay үүсгэнэ
app.get("/report", async (req, res) => {
  await sleep(200 + Math.random() * 200);
  res.json({ rows: 20000 });
});

// Reliability test хийхийн тулд ойролцоогоор 5%-ийн failure үүсгэнэ
app.post("/pay", (req, res) => {
  if (Math.random() < 0.05) {
    return res.status(500).json({ error: "gateway timeout" });
  }

  res.json({ paid: true });
});

app.listen(3000, () => {
  console.log("API: http://localhost:3000");
});
