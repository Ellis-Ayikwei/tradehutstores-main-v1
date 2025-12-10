import React, { useState } from 'react';

interface PaymentAmountInputProps {
    initialAmount?: number;
    onAmountChange: (amount: number) => void;
}

const PaymentAmountInput: React.FC<PaymentAmountInputProps> = ({ initialAmount = 0, onAmountChange }) => {
    const [amount, setAmount] = useState<string>(initialAmount.toString());

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Only allow numbers and decimal point
        if (/^\d*\.?\d*$/.test(value)) {
            setAmount(value);
            const numericValue = parseFloat(value) || 0;
            onAmountChange(numericValue);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Payment Amount</label>
            <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">USD</span>
                </div>
            </div>
        </div>
    );
};

export default PaymentAmountInput;
