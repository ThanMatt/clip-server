import os from "os"
import getMacIp from "./getMacIp.js"

export function getServerIp() {
  const platform = os.platform()
  const interfaces = os.networkInterfaces()

  // :: Handle MacOS specifically
  if (platform === "darwin") {
    return getMacIp(interfaces)
  }

  // :: For both Linux and Windows
  const validInterfaces = []

  // :: Collect all valid (non-internal, IPv4) interfaces
  for (const [name, nets] of Object.entries(interfaces)) {
    for (const net of nets) {
      // Skip internal interfaces and non-IPv4
      if (!net.internal && net.family === "IPv4") {
        validInterfaces.push({
          name,
          address: net.address,
          // Common wireless interface patterns
          isWireless: name.toLowerCase().match(/^(wlan|wifi|wi-fi|wireless|wlp|wlo)/i) !== null
        })
      }
    }
  }

  // :: First, try to find a wireless interface
  const wirelessInterface = validInterfaces.find((iface) => iface.isWireless)
  if (wirelessInterface) {
    return wirelessInterface.address
  }

  // :: If no wireless interface, look for any valid interface that's not localhost
  const validInterface = validInterfaces.find(
    (iface) => !iface.address.startsWith("127.") && !iface.address.startsWith("169.254.") // Exclude link-local addresses
  )

  if (validInterface) {
    return validInterface.address
  }

  // :: Log available interfaces for debugging
  console.log(
    "Available network interfaces:",
    validInterfaces.map((iface) => ({
      name: iface.name,
      address: iface.address,
      isWireless: iface.isWireless
    }))
  )

  return "127.0.0.1" // :: Fallback to localhost if no suitable interface found
}
