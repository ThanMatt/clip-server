/**
 *
 * @param {string} url
 * @param {'youtube'} scheme
 */
export default function generateUrlScheme(url, scheme) {
  const updatedUrl = url.replace(/^(https?:\/\/)/, "")
  return `${scheme}://${updatedUrl}`
}
