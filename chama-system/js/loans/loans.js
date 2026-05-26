async function loadLoans() {
  try {
    const loans = await apiRequest('/loans');

    if (!Array.isArray(loans)) {
      return;
    }

    const loansContainer = document.getElementById('loansContainer');

    const activeLoansElement = document.getElementById('activeLoans');

    let activeCount = 0;

    loans.forEach((loan) => {
      if (loan.status === 'active') {
        activeCount++;
      }
    });

    if (activeLoansElement) {
      activeLoansElement.innerText = activeCount;
    }

    if (!loansContainer) return;

    let html = '';

    loans.forEach((loan) => {
      html += `
        <div class="panel-body">

          <h3>
            ${loan.full_name}
          </h3>

          <p>
            Loan:
            ${formatCurrency(loan.amount)}
          </p>

          <p>
            Interest:
            ${loan.interest_rate}%
          </p>

          <p>
            Total:
            ${formatCurrency(loan.total_amount)}
          </p>

          <p>
            Paid:
            ${formatCurrency(loan.amount_paid)}
          </p>

          <p>
            Balance:
            ${formatCurrency(loan.remaining_balance)}
          </p>

          <p>
            Status:
            ${loan.status}
          </p>

        </div>
      `;
    });

    loansContainer.innerHTML = html;
  } catch (error) {
    console.log(error);
  }
}
