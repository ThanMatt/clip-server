import { exec } from "child_process"

export function copyToClipboard(text) {
  const command =
    process.platform === "win32"
      ? `echo ${text.trim()} | clip`
      : process.platform === "darwin"
        ? `echo "${text}" | pbcopy`
        : `echo "${text}" | xsel -ib`

  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
