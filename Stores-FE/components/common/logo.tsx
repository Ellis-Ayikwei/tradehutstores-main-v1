'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
    ShoppingCart, 
    User, 
    Bell,
    MapPin,
    ChevronDown,
    Globe,
    Sun,
    Moon
} from 'lucide-react'
import { Badge } from 'antd'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useTheme } from '@/contexts/ThemeContext'
import Image from 'next/image'

const Logo = () =>{
    const { theme, toggleTheme } = useTheme()

    console.log("the theme context", theme)

const dark = theme && theme.toLowerCase().trim() === 'dark';

    return(
        <Link href="/" className="flex items-center space-x-2 group">
        <div className="relative">
            <div className="relative ">
                <Image src={dark ? '/assets/images/logos/ths.png' : '/assets/images/logos/ths-light.png' } alt="TradeHut" width={100} height={50} />
            </div>
        </div>
        
    </Link>
    )
}

export default Logo