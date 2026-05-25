let contributionChart = null;

async function renderContributionChart() {
  const contributions = await apiRequest('/contributions');

  const labels = contributions.map((item) => item.contribution_month);

  const amounts = contributions.map((item) => Number(item.amount));

  const ctx = document.getElementById('contributionChart');

  if (!ctx) return;

  if (contributionChart) {
    contributionChart.destroy();
  }

  contributionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Contributions',
          data: amounts,
        },
      ],
    },
  });
}

if (requireAuth()) {
  loadMembers();
  loadContributions();
  loadLoans();
  renderContributionChart();
}
