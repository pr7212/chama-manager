const calculateLoanTotals = (
    amount,
    interest_rate
) => {

    const interestAmount =
        (amount * interest_rate) / 100;

    const total_amount =
        Number(amount) +
        Number(interestAmount);

    return {
        total_amount,
        remaining_balance: total_amount
    };

};

module.exports = {
    calculateLoanTotals
};
