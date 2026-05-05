'use client'

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store'
import { getWishlist } from '@/store/wishListSlice'

/** Load wishlist once when a user session exists (mirrors cart guest vs authed split). */
export default function WishlistHydrator() {
  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {
    if (typeof window === 'undefined') return
    dispatch(getWishlist())
  }, [dispatch])
  return null
}
