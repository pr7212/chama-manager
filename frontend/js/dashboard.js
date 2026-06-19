let contributionChart = null;

async function renderContributionChart() {
  try {
    const contributions = await apiRequest('/contributions');

    if (!Array.isArray(contributions) || contributions.length === 0) {
      return;
    }

    const labels = contributions.map(
      (item) => item.contribution_month || 'Unknown'
    );

    const amounts = contributions.map((item) => Number(item.amount) || 0);

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
            label: 'Contributions (KES)',
            data: amounts,
            backgroundColor: '#2563eb',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  } catch (error) {
    console.log(error);
  }
}

const canLoadDashboard =
  typeof requireAuth === 'function' ? requireAuth() : !!localStorage.getItem('token');

if (canLoadDashboard) {
  loadMembers();
  loadLoans();

  loadContributions().then(() => renderContributionChart());
}
