import { bridgeListCourses } from "@/lib/wordpress-bridge"
import { unstable_cache } from "next/cache"

const getCachedCatalog = unstable_cache(
  async () => bridgeListCourses(),
  ["wordpress-course-catalog"],
  {
    revalidate: 60 * 10,
  }
)

export async function getWordPressCourseCatalog() {
  return getCachedCatalog()
}
