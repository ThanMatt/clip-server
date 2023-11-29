import os from "os";
export default function getServerIp() {
  const interfaces = os.networkInterfaces();
  // The name of the WiFi interface can vary. Common names include 'Wi-Fi' and 'wlan0'.
  const wifiInterfaceName = "Wi-Fi"; // Change this to match your WiFi interface name

  if (interfaces[wifiInterfaceName]) {
    for (const iface of interfaces[wifiInterfaceName]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1"; // Fall
}
