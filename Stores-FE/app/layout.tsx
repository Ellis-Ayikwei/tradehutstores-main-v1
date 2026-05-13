import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import '@/styles/globals.css'
import StoreProvider from '@/providers/StoreProvider'
import AuthProvider from '@/providers/AuthProvider'
import { AuthModalProvider } from '@/providers/AuthModalProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { StoreConfigProvider } from '@/contexts/StoreConfigContext'
import { ShipToProvider } from '@/contexts/ShipToContext'

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
                <Script id="theme-boot" strategy="beforeInteractive">
                    {`(function(){try{var t=localStorage.getItem('theme');var r=document.documentElement;r.classList.remove('light','dark');if(t==='dark'){r.classList.add('dark');return;}if(t==='light'){r.classList.add('light');return;}if(window.matchMedia('(prefers-color-scheme: dark)').matches)r.classList.add('dark');else r.classList.add('light');}catch(e){}})();`}
                </Script>
                <ThemeProvider>
                    <StoreProvider>
                        <AuthProvider>
                            <AuthModalProvider>
                                <StoreConfigProvider>
                                    <CurrencyProvider>
                                        <ShipToProvider>
                                            {children}
                                        </ShipToProvider>
                                    </CurrencyProvider>
                                </StoreConfigProvider>
                            </AuthModalProvider>
                        </AuthProvider>
                    </StoreProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}