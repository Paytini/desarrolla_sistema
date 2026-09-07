import { describe, expect, it } from "vitest"
import { storageProxyUrl } from "./storage-proxy"

describe("storageProxyUrl", () => {
  it("routes Supabase Storage URLs through the authenticated proxy", () => {
    const url = "https://abc.supabase.co/storage/v1/object/portal-files/logos/1/2.png"
    expect(storageProxyUrl(url)).toBe(
      `/api/upload/signature-proxy?url=${encodeURIComponent(url)}`,
    )
  })

  it("leaves non-Storage URLs untouched", () => {
    expect(storageProxyUrl("https://example.com/logo.png")).toBe("https://example.com/logo.png")
    expect(storageProxyUrl("")).toBe("")
  })

  it("does not read SUPABASE_URL (works in a browser bundle)", () => {
    const previous = process.env.SUPABASE_URL
    delete process.env.SUPABASE_URL
    try {
      expect(() =>
        storageProxyUrl("https://abc.supabase.co/storage/v1/object/portal-files/x.png"),
      ).not.toThrow()
    } finally {
      if (previous !== undefined) process.env.SUPABASE_URL = previous
    }
  })
})
