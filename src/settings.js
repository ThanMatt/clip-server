import fs from "fs/promises"
import path from "path"
import { getServerIp } from "./utils/getServerIp"

export class SettingsManager {
  constructor() {
    this.settingsPath = path.join(process.cwd(), "settings.json")
    this.settings = {
      isDiscoverable: true,
      serverIp: getServerIp(),
      serverPort: Number(process.env.SERVER_PORT)
    }
  }

  async load() {
    try {
      const data = await fs.readFile(this.settingsPath, "utf8")
      this.settings = JSON.parse(data)
    } catch (error) {
      // :: If file doesn't exist, create it with default settings
      await this.save()
    }
    return this.settings
  }

  async save() {
    await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2))
  }

  async setDiscoverable(isDiscoverable) {
    this.settings.isDiscoverable = isDiscoverable
    await this.save()
    return isDiscoverable
  }

  getDiscoverable() {
    return this.settings.isDiscoverable
  }

  getSettings() {
    return this.settings
  }
}
