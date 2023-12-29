/**
 *
 * @param {string} url
 */
export default function isYoutubeUrl(url) {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
  return regex.test(url)
}
