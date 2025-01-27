import { getServerIp } from "./utils/getServerIp"
import express from "express"
import morgan from "morgan"
import cors from "cors"
import { ClipDiscoveryService } from "./services/ClipDiscovery"
import routes from "./routes"

require("dotenv").config()

const app = express()
const port = Number(process.env.SERVER_PORT) || 4000 // You can choose any port that's open

export const discoveryService = new ClipDiscoveryService(port)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan("combined"))
app.use(cors())

app.use("/", routes(discoveryService))

app.listen(port, () => {
  const ipAddress = getServerIp()
  console.log(`Server running on ${ipAddress}:${port}`)
  console.log(`Client running on ${process.env.CLIENT_URL ?? "http://localhost:3000"}`)

  discoveryService.start()
})

// :: Handle graceful shutdown
process.on("SIGINT", () => {
  discoveryService.stop()
  process.exit()
})
