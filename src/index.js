import { getServerIp } from "./utils/getServerIp"
import express from "express"
import morgan from "morgan"
import cors from "cors"
import { ClipDiscoveryService } from "./services/ClipDiscovery"
import routes from "./routes"
import { SettingsManager } from "./settings"
import path from "path"

require("dotenv").config()

const app = express()
const port = Number(process.env.SERVER_PORT) || 4000 // You can choose any port that's open

export const discoveryService = new ClipDiscoveryService(port)
export const settingsManager = new SettingsManager()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan("combined"))
app.use(cors())

app.use("/api", routes(discoveryService, settingsManager))
app.use(express.static(path.join(__dirname, "../../clip-client/dist")))

app.listen(port, () => {
  const ipAddress = getServerIp()
  console.log(`Server running on ${ipAddress}:${port}`)
  console.log(`Client running on ${process.env.CLIENT_URL ?? "http://localhost:3000"}`)

  discoveryService.start()
})

// :: Serve React app for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../clip-client/dist/index.html"))
})

// :: Handle graceful shutdown
process.on("SIGINT", () => {
  discoveryService.stop()
  process.exit()
})
