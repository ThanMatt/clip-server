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
import cors from "cors"
import isYoutubeUrl from "./utils/isYoutubeUrl"
import generateUrlScheme from "./utils/generateUrlScheme"
import { v4 as uuidv4 } from "uuid"
import isRedditUrl from "./utils/isRedditUrl"
import { ClipDiscoveryService } from "./services/ClipDiscovery"

require("dotenv").config()

const app = express()
const port = Number(process.env.SERVER_PORT) ?? 4000 // You can choose any port that's open
let TIMEOUT = 30_000 // :: 30 seconds
let pollingRequest = {} // :: Store current response object from /poll
let currentSession = null

const discoveryService = new ClipDiscoveryService(port)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan("combined"))
app.use(cors())

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
  return res.status(200).json({
    success: true
  })
})

app.get("/servers", (req, res) => {
  const servers = discoveryService.getActiveServers()
  return res.json({ servers })
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
  return res.status(200).json({ success: true })
})

// :: Long polling
app.get("/poll", (req, res) => {
  pollingRequest = { res }

  currentSession = setTimeout(() => {
    if (currentSession) {
      currentSession = null
      return res.status(400).json({ success: false })
    }
  }, TIMEOUT)
})

app.get("/client", (req, res) => {
  // :: Open client application
  open(process.env.CLIENT_URL ?? "http://localhost:3000")
  res.status(200).json({ success: true })
})

app.post("/content", (req, res) => {
  const { content } = req.body
  let urlScheme = null

  if (currentSession) {
    console.log("Payload received")

    console.log("Payload: ", content)
    if (isYoutubeUrl(content)) {
      urlScheme = generateUrlScheme(content, "youtube")
    } else if (isRedditUrl(content)) {
      urlScheme = generateUrlScheme(content, "reddit")
    }
    console.log("url scheme: ", urlScheme)
    clearTimeout(currentSession)
    currentSession = null
    if (!content) pollingRequest.res.status(200).json({ success: false })
    pollingRequest.res.status(200).json({ content, ...(urlScheme && { urlScheme }) })
    return res.status(200).json({ success: true })
  }

  return res.status(400).json({ success: false, message: "No current session found" })
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
  console.log(`Client running on ${process.env.CLIENT_URL ?? "http://localhost:3000"}`)

  discoveryService.start()

  discoveryService.setServersUpdatedCallback((servers) => {
    console.log("Available CLIP Servers: ", servers)
  })
})

// :: Handle graceful shutdown
process.on("SIGINT", () => {
  discoveryService.stop()
  process.exit()
})
