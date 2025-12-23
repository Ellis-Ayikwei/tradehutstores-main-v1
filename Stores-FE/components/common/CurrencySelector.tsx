'use client'

import { Select } from 'antd'
import { Globe } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

const { Option } = Select

const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
]

export default function CurrencySelector() {
    const { currency, setCurrency } = useCurrency()

    return (
        <Select
            value={currency}
            onChange={setCurrency}
            style={{ width: 120 }}
            suffixIcon={<Globe className="h-4 w-4" />}
        >
            {currencies.map((curr) => (
                <Option key={curr.code} value={curr.code}>
                    <div className="flex items-center justify-between">
                        <span>{curr.code}</span>
                        <span className="text-gray-500">{curr.symbol}</span>
                    </div>
                </Option>
            ))}
        </Select>
    )
}