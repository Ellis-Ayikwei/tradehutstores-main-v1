import React from 'react';

interface PaymentForModal {
    id: string;
    amount: string;
}

interface RefundModalProps {
    selectedPayment: PaymentForModal;
    refundAmount: string;
    refundReason: string;
    onClose: () => void;
    onAmountChange: (v: string) => void;
    onReasonChange: (v: string) => void;
    onSubmit: () => void;
    formatCurrency: (n: number) => string;
}

const RefundModal: React.FC<RefundModalProps> = ({ selectedPayment, refundAmount, refundReason, onClose, onAmountChange, onReasonChange, onSubmit, formatCurrency }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Payment ID</label>
                        <p className="text-sm text-gray-600">{selectedPayment.id}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Original Amount</label>
                        <p className="text-sm text-gray-600">{formatCurrency(parseFloat(selectedPayment.amount))}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Refund Amount (£)</label>
                        <input type="number" value={refundAmount} onChange={(e) => onAmountChange(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="0.00" max={selectedPayment.amount} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Refund Reason</label>
                        <textarea value={refundReason} onChange={(e) => onReasonChange(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" rows={3} placeholder="Reason for refund..." />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={onSubmit} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" disabled={!refundAmount || !refundReason}>Process Refund</button>
                </div>
            </div>
        </div>
    );
};

export default RefundModal;


