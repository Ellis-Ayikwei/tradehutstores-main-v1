let GHCedis = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GHC',
});

const Ghc = (amount: any) => {
    return GHCedis.format(amount);
};

export default Ghc;
