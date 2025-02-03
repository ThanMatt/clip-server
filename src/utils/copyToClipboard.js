import { exec } from "child_process"
import clipboardy from "clipboardy"

export function copyToClipboard(text) {
  const command =
    process.platform === "win32"
      ? `echo ${text.trim()} | clip`
      : process.platform === "darwin"
        ? `echo "${text}" | pbcopy`
        : clipboardy.writeSync(text)

  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
