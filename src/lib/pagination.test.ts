import { describe, expect, it } from "vitest"
import { paginate } from "./pagination"

describe("paginate", () => {
  it("slices items for the requested page", () => {
    const result = paginate([1, 2, 3, 4, 5], 2, 2)
    expect(result.items).toEqual([3, 4])
    expect(result.currentPage).toBe(2)
    expect(result.totalPages).toBe(3)
    expect(result.totalResults).toBe(5)
  })

  it("clamps a page number below 1 up to page 1", () => {
    const result = paginate([1, 2, 3], 0, 2)
    expect(result.currentPage).toBe(1)
    expect(result.items).toEqual([1, 2])
  })

  it("clamps a page number past the end down to the last page", () => {
    const result = paginate([1, 2, 3], 99, 2)
    expect(result.currentPage).toBe(2)
    expect(result.items).toEqual([3])
  })

  it("returns page 1 of 1 for an empty list instead of dividing by zero", () => {
    const result = paginate([], 1, 10)
    expect(result.totalPages).toBe(1)
    expect(result.currentPage).toBe(1)
    expect(result.items).toEqual([])
  })
})
