import React from 'react';
import { IconX, IconRefresh, IconArrowsExchange, IconEdit, IconExternalLink } from '@tabler/icons-react';

interface PaymentDetailModalProps {
    payment: any;
    onClose: () => void;
    onPoll: (paymentId: string) => void;
    onRefund: (payment: any) => void;
    onOverride: (payment: any) => void;
    onRetry?: (payment: any) => void;
    onDelete: (paymentId: string) => void;
    isPolling?: boolean;
    isRetrying?: boolean;
    isDeleting?: boolean;
    formatCurrency: (n: number) => string;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-4">{label}</span>
        <span className="text-sm text-gray-900 dark:text-gray-100 text-right break-all">{value}</span>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100">{title}</h4>
        <div className="space-y-2">{children}</div>
    </div>
);

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ payment, onClose, onPoll, onRefund, onOverride, onRetry, onDelete, isPolling, isRetrying, isDeleting, formatCurrency }) => {
    const canRefund = payment?.status === 'completed';
    const canRetry = payment?.status === 'failed' || payment?.status === 'cancelled' || payment?.status === 'pending';

    const formatDateTime = (value?: string) => {
        if (!value) return '—';
        try {
            const d = new Date(value);
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }).format(d);
        } catch {
            return value;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-3xl shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Details</h3>
                        <p className="text-xs text-gray-500 mt-0.5">ID: {payment?.id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <IconX className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Section title="Summary">
                            <Row label="Status" value={<span className="capitalize">{payment?.status}</span>} />
                            <Row label="Type" value={<span className="capitalize">{payment?.payment_type}</span>} />
                            <Row label="Amount" value={formatCurrency(parseFloat(payment?.amount || '0'))} />
                            <Row label="Currency" value={payment?.currency} />
                            <Row label="Request" value={payment?.request} />
                            <Row label="Payment Method" value={payment?.payment_method || 'N/A'} />
                        </Section>

                        <Section title="Stripe / Transaction">
                            <Row label="Payment Intent" value={payment?.stripe_payment_intent_id || '—'} />
                            <Row label="Charge ID" value={payment?.stripe_charge_id || '—'} />
                            <Row label="Refund ID" value={payment?.stripe_refund_id || '—'} />
                            <Row label="Transaction ID" value={payment?.transaction_id || '—'} />
                        </Section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Section title="Timestamps">
                            <Row label="Created" value={formatDateTime(payment?.created_at)} />
                            <Row label="Updated" value={formatDateTime(payment?.updated_at)} />
                            <Row label="Completed" value={formatDateTime(payment?.completed_at)} />
                            <Row label="Failed" value={formatDateTime(payment?.failed_at)} />
                            <Row label="Refunded" value={formatDateTime(payment?.refunded_at)} />
                        </Section>

                        <Section title="Descriptions">
                            <Row label="Description" value={payment?.description || '—'} />
                            <Row label="Refund Reason" value={payment?.refund_reason || '—'} />
                            <Row label="Failure Reason" value={payment?.failure_reason || '—'} />
                        </Section>
                    </div>

                    <Section title="Metadata">
                        <div className="text-xs p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                            <pre className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">{JSON.stringify(payment?.metadata || {}, null, 2)}</pre>
                        </div>
                    </Section>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={() => onPoll(payment?.id)} disabled={isPolling} className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${isPolling ? 'bg-blue-200 text-blue-600 border-blue-200 cursor-not-allowed' : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'}`}>
                        {isPolling ? (
                            <span className="flex items-center"><span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></span>Polling...</span>
                        ) : (
                            <><IconRefresh className="w-4 h-4 mr-1" /> Poll</>
                        )}
                    </button>
                    {canRefund && (
                        <button onClick={() => onRefund(payment)} className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md">
                            <IconArrowsExchange className="w-4 h-4 mr-1" /> Refund
                        </button>
                    )}
                    <button onClick={() => onOverride(payment)} className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md">
                        <IconEdit className="w-4 h-4 mr-1" /> Override
                    </button>
                    {onRetry && canRetry && (
                        <button onClick={() => onRetry(payment)} disabled={isRetrying} className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md ${isRetrying ? 'bg-purple-200 text-purple-700 border-purple-200 cursor-not-allowed' : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'}`}>
                            {isRetrying ? (
                                <span className="flex items-center"><span className="inline-block w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin mr-1"></span>Opening...</span>
                            ) : (
                                <><IconExternalLink className="w-4 h-4 mr-1" /> Retry Checkout</>
                            )}
                        </button>
                    )}
                    <button onClick={() => onDelete(payment?.id)} disabled={isDeleting} className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${isDeleting ? 'bg-red-300 text-white border-red-300 cursor-not-allowed' : 'text-white bg-red-600 hover:bg-red-700 border-red-700'}`}>
                        {isDeleting ? (
                            <span className="flex items-center"><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span>Deleting...</span>
                        ) : (
                            'Delete'
                        )}
                    </button>
                    <div className="ml-auto">
                        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentDetailModal;


