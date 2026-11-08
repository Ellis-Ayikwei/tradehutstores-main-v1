import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { THEME_BOOT_SCRIPT, THEME_COLOR_LIGHT } from '@/lib/theme.config'
import StoreProvider from '@/providers/StoreProvider'
import AuthProvider from '@/providers/AuthProvider'
import { AuthModalProvider } from '@/providers/AuthModalProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Seller Central | TradeHut',
    description: 'Manage your TradeHut store: listings, orders and store settings.',
    robots: { index: false, follow: false },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="theme-color" content={THEME_COLOR_LIGHT} />
                {/* Blocking, synchronous: applies the stored theme (default light) before first paint. */}
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <ThemeProvider>
                    <StoreProvider>
                        <AuthProvider>
                            <AuthModalProvider>{children}</AuthModalProvider>
                        </AuthProvider>
                    </StoreProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
