function setLoading(button, text) {
  if (!button) return;

  button.dataset.originalText = button.innerText;

  button.innerText = text;

  button.disabled = true;
}

function clearLoading(button) {
  if (!button) return;

  button.innerText = button.dataset.originalText || 'Save';

  button.disabled = false;
}

const memberForm = document.getElementById('memberForm');

if (memberForm) {
  memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const full_name = document.getElementById('full_name').value.trim();

    const phone = document.getElementById('phone').value.trim();

    const national_id = document.getElementById('national_id').value.trim();

    const button = memberForm.querySelector('button');

    if (!full_name || !phone || !national_id) {
      alert('All fields are required');

      return;
    }

    setLoading(button, 'Saving...');

    try {
      const data = await apiRequest('/members', 'POST', {
        full_name,
        phone,
        national_id,
      });

      alert(data.message || 'Member saved');

      memberForm.reset();

      loadMembers();
    } catch (error) {
      console.log(error);
    } finally {
      clearLoading(button);
    }
  });
}

// Backwards-compatible global used by dashboard inline button
async function addMember() {
  const full_name = document.getElementById('full_name')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const national_id = document.getElementById('national_id')?.value.trim();

  if (!full_name || !phone || !national_id) {
    alert('All fields are required');
    return;
  }

  try {
    const data = await apiRequest('/members', 'POST', {
      full_name,
      phone,
      national_id,
    });
    alert(data.message || 'Member saved');
    document.getElementById('memberForm')?.reset();
    loadMembers();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Failed to save member');
  }
}

window.addMember = addMember;

async function loadMembers() {
  try {
    const data = await apiRequest('/members');

    const members = data.members || [];

    const membersContainer = document.getElementById('membersContainer');

    const totalMembers = document.getElementById('totalMembers');

    const memberSelect = document.getElementById('memberSelect');

    if (totalMembers) {
      totalMembers.innerText = members.length;
    }

    if (memberSelect) {
      let options = `
        <option value="">
          Select Member
        </option>
      `;

      members.forEach((member) => {
        options += `
          <option value="${member.id}">
            ${member.full_name}
          </option>
        `;
      });

      memberSelect.innerHTML = options;
    }

    if (!membersContainer) return;

    let html = '';

    members.forEach((member) => {
      html += `
        <div class="panel-body">

          <h3>
            ${member.full_name}
          </h3>

          <p>
            ${member.phone}
          </p>

          <p>
            ID:
            ${member.national_id || ''}
          </p>

          <div class="form-actions">

            <button
              onclick="downloadPDF(${member.id})"
              class="primary-button"
            >
              Statement
            </button>

          </div>

        </div>
      `;
    });

    membersContainer.innerHTML = html;
  } catch (error) {
    console.log(error);
  }
}

async function downloadPDF(memberId) {
  try {
    const response = await fetch(`${API_URL}/statements/pdf/${memberId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `statement_${memberId}.pdf`;

    a.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.log(error);
  }
}
