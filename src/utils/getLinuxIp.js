export default function getLinuxIp(interfaces) {
  const wifiInterfaceNames = ["wlp37s0"]

  for (const name of wifiInterfaceNames) {
    console.log(interfaces, wifiInterfaceNames)
    if (interfaces[name]) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address
        }
      }
    }
  }
}
