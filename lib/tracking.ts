const APP_URL = process.env.APP_URL

export function injectTrackingPixel(html: string, sendQueueId: string): string {
  const pixelUrl = `${APP_URL}/api/track/open?sid=${sendQueueId}`
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelTag}</body>`)
  }

  return html + pixelTag
}

export function rewriteLinks(html: string, sendQueueId: string): string {
  // Match <a ...href="..."> tags, capturing the href value
  return html.replace(/(<a\s[^>]*href=")([^"]*)"([^>]*>)/gi, (match, before, url, after) => {
    // Skip mailto: and anchor # links
    if (url.startsWith('mailto:') || url.startsWith('#')) {
      return match
    }

    const trackingUrl = `${APP_URL}/api/track/click?sid=${sendQueueId}&url=${encodeURIComponent(url)}`
    return `${before}${trackingUrl}"${after}`
  })
}
