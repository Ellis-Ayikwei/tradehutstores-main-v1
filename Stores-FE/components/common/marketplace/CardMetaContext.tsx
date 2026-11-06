'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Whether cards should keep their reserved 16px rating/meta row even when a card has nothing to show.
 * Default true (every card in a row has the same height). A grid or row that knows none of its products
 * has a rating or meta line sets this to false so the cards drop the empty strip together.
 */
const CardMetaContext = createContext<boolean>(true)

export function CardMetaProvider({ reserve, children }: { reserve: boolean; children: ReactNode }) {
    return <CardMetaContext.Provider value={reserve}>{children}</CardMetaContext.Provider>
}

export function useReserveCardMeta(): boolean {
    return useContext(CardMetaContext)
}
