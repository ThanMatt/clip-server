import express from "express"
import clipboardy from "clipboardy"
import notifier from "node-notifier"
import open from "open"
import { exec } from "child_process"
import { isYoutubeUrl } from "./utils/isYoutubeUrl"
import { isRedditUrl } from "./utils/isRedditUrl"
import { generateUrlScheme } from "./utils/generateUrlScheme"
import path from "path"
import fs from "fs"

import multer from "multer"
const router = express.Router()

const TIMEOUT = 30000
let pollingRequest = null
let currentSession = null

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

export default function (discoveryService) {
  router.get("/", (req, res) => {
    return res.status(200).json({
      success: true
    })
  })

  router.get("/servers", (req, res) => {
    const servers = discoveryService.getActiveServers()
    return res.json({ servers })
  })

  router.post("/text", (req, res) => {
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
  router.get("/poll", (req, res) => {
    pollingRequest = { res }

    currentSession = setTimeout(() => {
      if (currentSession) {
        currentSession = null
        return res.status(400).json({ success: false })
      }
    }, TIMEOUT)
  })

  router.get("/client", (req, res) => {
    // :: Open client application
    open(process.env.CLIENT_URL ?? "http://localhost:3000")
    res.status(200).json({ success: true })
  })

  router.post("/content", (req, res) => {
    const { content } = req.body
    let urlScheme = null

    console.log("Payload received")

    if (pollingRequest) {
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
    } else {
      return res.status(200).json({ content })
    }
    return res.status(200).json({ success: true })
  })

  router.post("/image", upload.single("file"), (req, res) => {
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
  return router
}
