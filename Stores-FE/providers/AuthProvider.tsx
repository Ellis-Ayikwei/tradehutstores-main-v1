'use client'

import ReactAuthKitProvider from 'react-auth-kit/AuthProvider'
import createStore from 'react-auth-kit/createStore'

interface IUserData {
    id: string
    name: string
    email: string
    uuid?: string
}

const store = createStore<IUserData>({
    authName: '_auth',
    authType: 'cookie',
    cookieDomain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    cookieSecure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
})

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <ReactAuthKitProvider store={store}>
            {children}
        </ReactAuthKitProvider>
    )
}

// Export store for use in axios interceptors and other non-component contexts
export { store }