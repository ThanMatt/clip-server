/**
 *
 * @param {string} url
 * @param {'youtube'} scheme
 */
export function generateUrlScheme(url, scheme) {
  const updatedUrl = url.replace(/^(https?:\/\/)/, "")
  return `${scheme}://${updatedUrl}`
}
