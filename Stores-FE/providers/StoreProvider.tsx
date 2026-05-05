'use client'

import { Provider } from 'react-redux'
import { store } from '@/store'
import WishlistHydrator from '@/providers/WishlistHydrator'

export default function StoreProvider({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <Provider store={store}>
            <WishlistHydrator />
            {children}
        </Provider>
    )
}