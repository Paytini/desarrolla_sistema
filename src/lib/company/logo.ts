import sharp from "sharp"
import { uploadPrivateFile } from "@/lib/supabase-storage"

export const COMPANY_LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
export const COMPANY_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024

export async function uploadCompanyLogo(companyId: string, file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const pngBuffer = await sharp(Buffer.from(arrayBuffer))
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()

  const filename = `logos/${companyId}/${Date.now()}.png`
  return uploadPrivateFile(filename, pngBuffer, "image/png")
}
