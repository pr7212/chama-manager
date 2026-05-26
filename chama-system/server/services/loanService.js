const calculateLoanTotals = (amount, interest_rate) => {
  const principal = Number(amount);
  const rate = Number(interest_rate);

  if (!Number.isFinite(principal) || !Number.isFinite(rate)) {
    throw new Error('Invalid loan calculation inputs');
  }

  const interestAmount = (principal * rate) / 100;

  const total_amount = principal + interestAmount;

  return {
    total_amount,
    remaining_balance: total_amount,
  };
};

module.exports = {
  calculateLoanTotals,
};
