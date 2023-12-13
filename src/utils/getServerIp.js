import os from "os";
import getMacIp from "./getMacIp.js";
export default function getServerIp() {
  const platform = os.platform();
  const interfaces = os.networkInterfaces();
  // The name of the WiFi interface can vary. Common names include 'Wi-Fi' and 'wlan0'.
  let wifiInterfaceName;

  console.log(platform);
  // :: Mac
  if (platform === "darwin") {
    return getMacIp(interfaces);
  } else {
    wifiInterfaceName = "Wi-Fi"; // Change this to match your WiFi interface name
    if (interfaces[wifiInterfaceName]) {
      console.log(wifiInterfaceName);
      for (const iface of interfaces[wifiInterfaceName]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  }

  return "127.0.0.1"; // Fall
}
