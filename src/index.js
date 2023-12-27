import clipboardy from "clipboardy"
import open from "open"
import notifier from "node-notifier"
import getServerIp from "./utils/getServerIp"
import express from "express"
import morgan from "morgan"
import multer from "multer"
import path from "path"
import { exec } from "child_process"
import fs from "fs"

const app = express()
const port = 3000 // You can choose any port that's open
let isPolling = false
let TIMEOUT = 5_000 // :: 30 seconds
let responseFromHost = null

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan("combined"))

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const filePath = `uploads/`
    fs.mkdirSync(filePath, { recursive: true })
    callback(null, filePath)
  },
  filename: (req, file, callback) => {
    const fileName = file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    callback(null, file.originalname)
  }
})
const upload = multer({ storage })

app.get("/", (req, res) => {
  return res.json({
    success: true
  })
})

app.post("/text", (req, res) => {
  const { content } = req.body
  const deviceName = req.body.device_name ?? "Device"

  console.log(`Data received from ${deviceName}: ${req.body}`)

  clipboardy.writeSync(content)

  notifier.notify({
    title: `New content from ${deviceName}`,
    message: `Content: ${content}`
  })

  if (content.startsWith("https") || content.startsWith("http")) {
    console.log("Link detected, opening the url in your default browser!")
    open(content)
  }
  console.log("Notification sent!")
  return res.json({ success: true })
})

// :: Long polling
app.get("/poll", (req, res) => {
  isPolling = true
  let response = null

  setTimeout(async () => {
    console.log("waiting")
    if (!isPolling) {
      response = responseFromHost
      return res.json({ content: response })
    }
  }, TIMEOUT)
})

app.post("/content", (req, res) => {
  const { content } = req.body

  responseFromHost = content
  isPolling = false
  return res.json({ success: true })
})

app.post("/image", upload.single("file"), (req, res) => {
  const deviceName = req.body.device_name ?? "Device"
  if (req.file) {
    console.log(`File from ${deviceName} has been uploaded successfully: ${req.file}`)

    const imagePath = `uploads/${req.file.originalname}`
    console.log(imagePath)

    let command
    switch (process.platform) {
      case "win32":
        command = `Powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('${imagePath}'))"`
        break
      case "darwin":
        command = `osascript -e 'tell application "Finder" to set the clipboard to ( POSIX file "${imagePath}" )'`
        break
      case "linux":
        command = `xclip -selection clipboard -t image/png -i ${imagePath}`
        break
      default:
        return res.status(500).send("Unsupported OS")
    }

    exec(command, (error) => {
      if (error) {
        console.error(error)
        return res.status(500).json({ success: false })
      }
      return res.status(200).json({ success: true })
    })
  } else {
    console.log(`No file from ${deviceName} uploaded`)
    res.status(400).json({ success: false })
  }
})

app.listen(port, () => {
  const ipAddress = getServerIp()
  console.log(`Server running on ${ipAddress}:${port}`)
})
