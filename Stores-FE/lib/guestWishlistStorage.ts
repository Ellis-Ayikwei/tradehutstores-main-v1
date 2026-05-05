/** Persist wishlist product UUIDs for anonymous users; merged to API after login/signup. */

export const GUEST_WISHLIST_STORAGE_KEY = 'tradehut_guest_wishlist_v1'

export const GUEST_WISHLIST_ITEM_PREFIX = 'guest:'

export function readGuestWishlistProductIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map(String).filter(Boolean))]
  } catch {
    return []
  }
}

function writeGuestWishlistProductIds(ids: string[]): void {
  localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(ids))
}

export function addGuestWishlistProductId(productId: string): string[] {
  const id = String(productId).trim()
  if (!id) return readGuestWishlistProductIds()
  const cur = readGuestWishlistProductIds()
  if (cur.includes(id)) return cur
  const next = [id, ...cur]
  writeGuestWishlistProductIds(next)
  return next
}

export function removeGuestWishlistProductId(productId: string): string[] {
  const id = String(productId)
  const next = readGuestWishlistProductIds().filter((x) => x !== id)
  writeGuestWishlistProductIds(next)
  return next
}

export function clearGuestWishlistStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY)
}

export function guestWishlistRowId(productId: string): string {
  return `${GUEST_WISHLIST_ITEM_PREFIX}${productId}`
}

export function isGuestWishlistRowId(wishlistItemId: string): boolean {
  return wishlistItemId.startsWith(GUEST_WISHLIST_ITEM_PREFIX)
}

export function productIdFromGuestWishlistRowId(wishlistItemId: string): string {
  return wishlistItemId.slice(GUEST_WISHLIST_ITEM_PREFIX.length)
}
