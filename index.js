import http from "http";
import notifier from "node-notifier";
import clipboardy from "clipboardy";
import open from "open";
import getServerIp from "./utils/getServerIp.js";
import express from "express";
import morgan from "morgan";

const app = express();
const port = 3000; // You can choose any port that's open

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  // morgan(":method :url :status :res[content-length] - :response-time ms")
  morgan("combined")
);

app.get("/", (req, res) => {
  return res.json({
    success: true,
  });
});

app.post("/text", (req, res) => {
  const { content } = req.body;
  const deviceName = req.body.device_name ?? "Device";

  console.log("Data received from iPhone:", req.body);

  clipboardy.writeSync(content);

  notifier.notify({
    title: `New content from ${deviceName}`,
    message: `Content: ${content}`,
  });

  if (content.startsWith("https") || content.startsWith("http")) {
    console.log("Link detected, opening the url in your default browser!");
    open(content);
  }
  console.log("Notification sent!");
  return res.json({ success: true });
});

// const server = http.createServer((req, res) => {
//   if (req.method === "POST") {
//     let body = "";
//     req.on("data", (chunk) => {
//       body += chunk.toString();
//     });
//     req.on("end", () => {
//       const parsedBody = JSON.parse(body);
//       res.end("Content received");
//     });
//   }
// });

app.listen(port, () => {
  const ipAddress = getServerIp();
  console.log(`Server running on ${ipAddress}:${port}`);
});
