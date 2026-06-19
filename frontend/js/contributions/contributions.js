const CONTRIBUTION_MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function normalizeContributionMonth(value) {
  const raw = String(value || '').trim().toLowerCase();
  const parsed = CONTRIBUTION_MONTHS[raw] || Number(raw);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed
    : null;
}

async function loadContributionMembers() {
  const memberSelect = document.getElementById('memberSelect');

  if (!memberSelect) return;

  try {
    const data = await apiRequest('/members');
    const members = Array.isArray(data) ? data : data?.members || [];

    memberSelect.innerHTML = [
      '<option value="">Select Member</option>',
      ...members.map(
        (member) => `<option value="${member.id}">${member.full_name}</option>`
      ),
    ].join('');
  } catch (error) {
    console.log(error);
  }
}

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
async function recordContribution(event) {
  if (event) {
    event.preventDefault();
  }

  const memberId = document.getElementById('memberSelect')?.value;
  const amount = Number(document.getElementById('amount')?.value || 0);
  const month = normalizeContributionMonth(document.getElementById('month')?.value);
  const year = Number(document.getElementById('year')?.value || 0);

  if (!memberId || !amount || month === null || !year) {
    alert('All contribution fields are required. Use a month from 1 to 12.');
    return;
  }

  try {
    const res = await apiRequest('/contributions', 'POST', {
      member_id: memberId,
      amount,
      contribution_month: month,
      contribution_year: year,
    });

    alert(res?.message || 'Contribution recorded');

    const contributionForm = document.getElementById('contributionForm');
    if (typeof contributionForm?.reset === 'function') {
      contributionForm.reset();
    }

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

const contributionForm = document.getElementById('contributionForm');

if (contributionForm?.tagName === 'FORM') {
  contributionForm.addEventListener('submit', recordContribution);
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn && typeof window.Auth?.logout === 'function') {
  logoutBtn.addEventListener('click', window.Auth.logout);
}

const canLoadContributionsPage =
  contributionForm?.tagName === 'FORM' &&
  (typeof requireAuth === 'function'
    ? requireAuth()
    : typeof window.Auth?.requireAuth === 'function'
      ? window.Auth.requireAuth()
      : !!localStorage.getItem('token'));

if (canLoadContributionsPage) {
  loadContributionMembers();
  loadContributions();
}