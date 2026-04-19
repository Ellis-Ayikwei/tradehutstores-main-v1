import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import StoreProvider from '@/providers/StoreProvider'
import AuthProvider from '@/providers/AuthProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { CurrencyProvider } from '@/contexts/CurrencyContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'TradeHut - Buy Your One Stop Shop',
    description: 'TradeHut - Buy Your One Stop Shop',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <ThemeProvider>
                    <StoreProvider>
                        <AuthProvider>
                            <CurrencyProvider>
                                {children}
                            </CurrencyProvider>
                        </AuthProvider>
                    </StoreProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}