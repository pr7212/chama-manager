window.Auth.requireAuth();

const memberForm = document.getElementById('memberForm');
const saveMemberBtn = document.getElementById('saveMemberBtn');
const formStatus = document.getElementById('formStatus');
const membersTableBody = document.getElementById('membersTableBody');
const emptyState = document.getElementById('emptyState');
const memberSearch = document.getElementById('memberSearch');
const refreshMembersBtn = document.getElementById('refreshMembersBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userBadge = document.getElementById('userBadge');

let members = [];

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[character]));

const setUserBadge = () => {
  const user = window.Auth.getCurrentUser();

  if (!user) {
    userBadge.innerHTML = '<strong>Signed in</strong><span>Chama account</span>';
    return;
  }

  userBadge.innerHTML = `
    <strong>${escapeHtml(user.full_name || 'Chama user')}</strong>
    <span>${escapeHtml(user.phone || user.role || 'Member')}</span>
  `;
};

const setStatus = (message, type = '') => {
  formStatus.textContent = message;
  formStatus.className = `status-message ${type}`;
};

const getVisibleMembers = () => {
  const term = memberSearch.value.trim().toLowerCase();

  if (!term) {
    return members;
  }

  return members.filter((member) => (
    member.full_name.toLowerCase().includes(term)
    || member.phone.toLowerCase().includes(term)
    || (member.national_id || '').toLowerCase().includes(term)
    || (member.email || '').toLowerCase().includes(term)
    || member.role.toLowerCase().includes(term)
    || member.status.toLowerCase().includes(term)
  ));
};

const renderMembers = () => {
  const visibleMembers = getVisibleMembers();
  emptyState.hidden = visibleMembers.length > 0;

  membersTableBody.innerHTML = visibleMembers.map((member) => `
    <tr>
      <td><strong>${escapeHtml(member.full_name)}</strong></td>
      <td>${escapeHtml(member.phone)}</td>
      <td>${escapeHtml(member.national_id || '-')}</td>
      <td>${escapeHtml(member.email || '-')}</td>
      <td>${escapeHtml(member.role)}</td>
      <td><span class="badge ${escapeHtml(member.status.toLowerCase())}">${escapeHtml(member.status)}</span></td>
    </tr>
  `).join('');
};

const loadMembers = async () => {
  try {
    setStatus('Loading members...');
    const response = await window.Auth.authFetch('/api/members');

    if (!response) {
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || 'Unable to load members', 'error');
      return;
    }

    members = data.members || [];
    renderMembers();
    setStatus('');
  } catch (error) {
    console.log(error);
    setStatus('Unable to load members', 'error');
  }
};

const addMember = async (event) => {
  event.preventDefault();

  const formData = new FormData(memberForm);
  const payload = {
    full_name: formData.get('full_name').trim(),
    phone: formData.get('phone').trim(),
    national_id: formData.get('national_id').trim(),
    email: formData.get('email').trim(),
    role: formData.get('role'),
    status: formData.get('status'),
  };

  saveMemberBtn.disabled = true;
  saveMemberBtn.textContent = 'Saving...';
  setStatus('Saving member...');

  try {
    const response = await window.Auth.authFetch('/api/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response) {
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || 'Unable to save member', 'error');
      return;
    }

    memberForm.reset();
    members = [data.member, ...members];
    renderMembers();
    setStatus(data.message, 'success');
  } catch (error) {
    console.log(error);
    setStatus('Unable to connect to the server', 'error');
  } finally {
    saveMemberBtn.disabled = false;
    saveMemberBtn.textContent = 'Save member';
  }
};

memberForm.addEventListener('submit', addMember);
memberSearch.addEventListener('input', renderMembers);
refreshMembersBtn.addEventListener('click', loadMembers);
logoutBtn.addEventListener('click', window.Auth.logout);

setUserBadge();
loadMembers();
