async function loadContributions() {
  try {
    const contributions = await apiRequest('/contributions');

    if (!Array.isArray(contributions)) {
      return;
    }

    const contributionsContainer = document.getElementById(
      'contributionsContainer'
    );

    const totalContributionsElement =
      document.getElementById('totalContributions');

    let total = 0;

    contributions.forEach((item) => {
      total += Number(item.amount);
    });

    if (totalContributionsElement) {
      totalContributionsElement.innerText = formatCurrency(total);
    }

    if (!contributionsContainer) return;

    let html = '';

    contributions.forEach((item) => {
      html += `
        <div class="panel-body">

          <h3>
            ${item.full_name}
          </h3>

          <p>
            Amount:
            ${formatCurrency(item.amount)}
          </p>

          <p>
            Month:
            ${item.contribution_month}
            ${item.contribution_year}
          </p>

          <p>
            Payment Date:
            ${formatDate(item.payment_date)}
          </p>

        </div>
      `;
    });

    contributionsContainer.innerHTML = html;
  } catch (error) {
    console.log(error);
  }
}

// Global used by inline dashboard Save button
async function recordContribution() {
  const memberId = document.getElementById('memberSelect')?.value;
  const amount = Number(document.getElementById('amount')?.value || 0);
  const month = Number(document.getElementById('month')?.value || 0);
  const year = Number(document.getElementById('year')?.value || 0);

  if (!memberId || !amount || !month || !year) {
    alert('All contribution fields are required');
    return;
  }

  try {
    const res = await apiRequest('/contributions', 'POST', {
      member_id: memberId,
      amount,
      contribution_month: month,
      contribution_year: year,
    });

    alert(res.message || 'Contribution recorded');
    loadContributions();
    // re-render chart if present
    if (typeof renderContributionChart === 'function') {
      renderContributionChart();
    }
  } catch (err) {
    console.error(err);
    alert(err.message || 'Failed to record contribution');
  }
}

window.recordContribution = recordContribution;
