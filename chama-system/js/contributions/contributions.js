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
