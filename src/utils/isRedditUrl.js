/**
 *
 * @param {string} url
 */
export default function isRedditUrl(url) {
  const regex = /^(https?:\/\/)?(www\.)?(reddit\.com|old\.reddit\.com)\/.+/
  return regex.test(url)
}
