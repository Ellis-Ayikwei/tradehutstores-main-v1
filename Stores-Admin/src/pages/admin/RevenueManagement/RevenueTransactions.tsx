import PaymentsLedger from './PaymentsLedger';

/** /admin/revenue/transactions — see PaymentsLedger for why the legacy RevenueManagement page is no longer used here. */
const RevenueTransactions = () => <PaymentsLedger view="transactions" />;

export default RevenueTransactions;
