import http from "http";
import notifier from "node-notifier";
import clipboardy from "clipboardy";
import open from "open";
import getServerIp from "./utils/getServerIp.js";
import express from "express";
import morgan from "morgan";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const app = express();
const port = 3000; // You can choose any port that's open

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "uploads/");
  },
  filename: (req, file, callback) => {
    const fileName =
      file.fieldname + "-" + Date.now() + path.extname(file.originalname);
    callback(null, file.originalname);
  },
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  return res.json({
    success: true,
  });
});

app.post("/text", (req, res) => {
  const { content } = req.body;
  const deviceName = req.body.device_name ?? "Device";

  console.log(`Data received from ${deviceName}: ${req.body}`);

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

app.post("/image", upload.single("file"), (req, res) => {
  const deviceName = req.body.device_name ?? "Device";
  if (req.file) {
    console.log(
      `File from ${deviceName} has been uploaded successfully: ${req.file}`
    );

    const imagePath = `uploads/${req.file.originalname}`;
    console.log(imagePath);

    let command;
    switch (process.platform) {
      case "win32":
        command = `Powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('${imagePath}'))"`;
        break;
      case "darwin":
        command = `osascript -e 'tell application "Finder" to set the clipboard to ( POSIX file "${imagePath}" )'`;
        break;
      case "linux":
        command = `xclip -selection clipboard -t image/png -i ${imagePath}`;
        break;
      default:
        return res.status(500).send("Unsupported OS");
      case "win32":
        command = "";
    }

    exec(command, (error) => {
      if (error) {
        console.error(`Error: ${error}`);
        return res.status(500).json({ success: false });
      }
      return res.status(200).json({ success: true });
    });
  } else {
    console.log(`No file from ${deviceName} uploaded`);
    res.status(400).json({ success: false });
  }
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
