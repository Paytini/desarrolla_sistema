// Vercel Blob assets in this app are uploaded with access: "private", so they can
// only be rendered through the authenticated proxy at /api/upload/signature-proxy.
export function blobProxyUrl(url: string): string {
  return url.includes("vercel-storage.com")
    ? `/api/upload/signature-proxy?url=${encodeURIComponent(url)}`
    : url
}
