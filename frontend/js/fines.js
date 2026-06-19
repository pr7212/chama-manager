async function loadMemberOutstandingFines(memberId) {
  try {
    console.log('[Fines Module] Loading fines for member:', memberId);

    // TODO: implement API call later
    // const fines = await apiRequest(`/fines/${memberId}`);
    // return fines;
  } catch (error) {
    console.log('Error loading member fines:', error);
  }
}
// ...existing code...

async function repayLoan(knex, loanId, paymentAmount) {
  return await knex.transaction(async (trx) => {
    // lock the loan row to prevent concurrent balance calculations/updates
    const loan = await trx('loans').where({ id: loanId }).forUpdate().first();

    if (!loan) {
      throw new Error('Loan not found');
    }

    const currentBalance = Number(loan.balance);
    const payment = Number(paymentAmount);
    if (payment <= 0) {
      throw new Error('Invalid payment amount');
    }

    const newBalance = currentBalance - payment;

    // perform any domain validation here (e.g., not negative, caps, events)
    await trx('loans')
      .where({ id: loanId })
      .update({ balance: newBalance, updated_at: trx.fn.now() });

    await trx('repayments').insert({
      loan_id: loanId,
      amount: payment,
      created_at: new Date(),
    });

    return { loanId, oldBalance: currentBalance, newBalance };
  });
}

// ...existing code...
