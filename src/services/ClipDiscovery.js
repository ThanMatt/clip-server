import dgram from "dgram"
import os from "os"
import { SettingsManager } from "../settings"
import { getServerIp } from "../utils/getServerIp"

export class ClipDiscoveryService {
  constructor(serverPort, deviceName = os.hostname()) {
    this.MULTICAST_ADDR = "239.255.255.250"
    this.DISCOVERY_PORT = 1900
    this.serverPort = serverPort
    this.deviceName = deviceName
    this.activeServers = new Map() // :: Store discovered servers
    this.settingsManager = new SettingsManager()
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true })
    this.setupSocket()
  }

  setupSocket() {
    this.socket.on("error", (err) => {
      console.error(`Discovery service error:\n${err.stack}`)
    })

    this.socket.on("message", (msg, rinfo) => {
      try {
        const message = msg.toString()

        if (message.includes('"service":"CLIP"')) {
          const data = JSON.parse(msg.toString())

          if (data.service === "CLIP" && data.type === "announcement") {
            this.handleServerAnnouncement(data, rinfo)
          }
        }
      } catch (err) {
        console.error("Error parsing discovery message:", err)
      }
    })

    this.socket.on("listening", () => {
      this.socket.setBroadcast(true)
      this.socket.setMulticastTTL(128)
      this.socket.addMembership(this.MULTICAST_ADDR)
      console.log(`Discovery service listening on port ${this.DISCOVERY_PORT}`)
    })
  }

  async start() {
    // :: Initialize settings
    await this.settingsManager.load()

    this.socket.bind(this.DISCOVERY_PORT)

    // :: Start broadcasting presence
    this.broadcastPresence()

    // :: Set up periodic broadcasting
    this.broadcastInterval = setInterval(() => this.broadcastPresence(), 10000)

    // :: Set up server cleanup
    this.cleanupInterval = setInterval(() => this.cleanupServers(), 30000)
  }

  stop() {
    if (this.broadcastInterval) clearInterval(this.broadcastInterval)
    if (this.cleanupInterval) clearInterval(this.cleanupInterval)
    this.socket.close()
  }

  async setDiscoverable(discoverable) {
    await this.settingsManager.setDiscoverable(discoverable)
    if (discoverable) {
      this.broadcastPresence()
    }
    return discoverable
  }

  getDiscoverable() {
    return this.settingsManager.getDiscoverable()
  }

  getSettings() {
    return this.settingsManager.getSettings()
  }

  broadcastPresence() {
    if (!this.getDiscoverable()) return

    const announcement = {
      service: "CLIP",
      type: "announcement",
      deviceName: this.deviceName,
      port: this.serverPort,
      timestamp: Date.now()
    }

    const message = Buffer.from(JSON.stringify(announcement))
    this.socket.send(message, 0, message.length, this.DISCOVERY_PORT, this.MULTICAST_ADDR)
  }

  handleServerAnnouncement(data, rinfo) {
    // :: Don't store our own announcements
    if (rinfo.address === this.getLocalIP()) return

    const serverId = `${rinfo.address}:${data.port}`
    this.activeServers.set(serverId, {
      id: serverId,
      ip: rinfo.address,
      port: data.port,
      deviceName: data.deviceName,
      lastSeen: Date.now()
    })

    // :: Emit server list update if callback is set
    if (this.onServersUpdated) {
      this.onServersUpdated(Array.from(this.activeServers.values()))
    }
  }

  cleanupServers() {
    const now = Date.now()
    for (const [serverId, server] of this.activeServers.entries()) {
      // :: Remove servers not seen in the last 30 seconds
      if (now - server.lastSeen > 30000) {
        this.activeServers.delete(serverId)
      }
    }

    // :: Emit server list update if callback is set
    if (this.onServersUpdated) {
      this.onServersUpdated(Array.from(this.activeServers.values()))
    }
  }

  getLocalIP() {
    return getServerIp()
  }

  getActiveServers() {
    return Array.from(this.activeServers.values())
  }

  // :: Set callback for server list updates
  setServersUpdatedCallback(callback) {
    this.onServersUpdated = callback
  }
}
