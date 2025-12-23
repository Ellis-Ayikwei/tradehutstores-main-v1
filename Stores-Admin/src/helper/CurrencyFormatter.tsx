let PoundFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
});

const Pound = (amount: any) => {
    return PoundFormatter.format(amount);
};

export default Pound;
