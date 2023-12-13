/**
 * @param {*} interfaces
 * @returns {string}
 */
export default function getMacIp(interfaces) {
  const wifiInterfaceName = ["en0", "en1"];

  for (const name of wifiInterfaceName) {
    const wifiInterface = interfaces[name];

    if (wifiInterface) {
      for (const iface of wifiInterface) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return "127.0.0.1";
}
