'use client'

import { useEffect, useState } from 'react'
import AuthKitContext from 'react-auth-kit/AuthContext'
import ReactAuthKitProvider from 'react-auth-kit/AuthProvider'
import createStore from 'react-auth-kit/createStore'
import createRefresh from 'react-auth-kit/createRefresh'
import authAxiosInstance from '@/lib/authAxiosInstance'

interface IUserData {
    id: string
    name: string
    email: string
    uuid?: string
}

// Mirrors Stores-BE/backend/settings.py ACCESS_TOKEN_LIFETIME_MINUTES.
const ACCESS_TOKEN_TTL_MINUTES = 30
/** Minutes — react-auth-kit schedules refresh at interval * 60 * 1000 ms */
const PROACTIVE_REFRESH_INTERVAL_MINUTES = 20

const store = createStore<IUserData>({
    authName: '_auth',
    authType: 'cookie',
    cookieDomain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    cookieSecure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
    refresh: createRefresh({
        interval: PROACTIVE_REFRESH_INTERVAL_MINUTES,
        refreshApiCallback: async () => {
            try {
                const response = await authAxiosInstance.post('refresh_token/')
                const raw =
                    response.headers['authorization'] ?? response.headers['Authorization']
                const nextRefresh =
                    response.headers['x-refresh-token'] ?? response.headers['X-Refresh-Token']
                if (!raw || typeof raw !== 'string') {
                    return { isSuccess: false, newAuthToken: '' }
                }
                const token = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`
                return {
                    isSuccess: true,
                    newAuthToken: token,
                    newAuthTokenType: 'Bearer',
                    newAuthTokenExpireIn: ACCESS_TOKEN_TTL_MINUTES,
                    ...(typeof nextRefresh === 'string' && nextRefresh
                        ? { newRefreshToken: nextRefresh }
                        : {}),
                }
            } catch {
                return { isSuccess: false, newAuthToken: '' }
            }
        },
    }),
})

// react-auth-kit puts one long-lived token object in context and mutates it on sign-in, sign-out
// and refresh, so useIsAuthenticated / useAuthUser callers never re-render on their own. Every
// change is re-published below under a new wrapper object, which makes React re-render them.
// The token object offers no unsubscribe, so it is subscribed once here and fans out.
const authListeners = new Set<() => void>()
// The library's context is typed for an unknown user shape; the cast drops IUserData, nothing else.
const contextTokenObject = store.tokenObject as unknown as NonNullable<React.ContextType<typeof AuthKitContext>>
store.tokenObject.subscribe(() => authListeners.forEach((notify) => notify()))

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [tokenObject, setTokenObject] = useState(contextTokenObject)

    useEffect(() => {
        // The wrapper inherits everything from the real token object; only its identity is new.
        const publish = () => setTokenObject(Object.create(contextTokenObject) as typeof contextTokenObject)
        authListeners.add(publish)
        return () => {
            authListeners.delete(publish)
        }
    }, [])

    return (
        <ReactAuthKitProvider store={store}>
            <AuthKitContext.Provider value={tokenObject}>{children}</AuthKitContext.Provider>
        </ReactAuthKitProvider>
    )
}

// Export store for use in axios interceptors and other non-component contexts
export { store }