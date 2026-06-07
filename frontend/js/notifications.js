async function loadNotifications() {
  const notifList = document.getElementById('notificationsList');
  const notifBadge = document.getElementById('notifBadge');
  const notifEmpty = document.getElementById('notificationsEmpty');

  if (!notifList) return;

  notifList.innerHTML = '';
  notifBadge?.classList.add('hidden');

  try {
    // Work with either auth system:
    // - dashboard uses js/auth/auth.js → plain authFetch() global doesn't exist,
    //   but apiRequest() from api.js does
    // - members.html uses js/auth.js → window.Auth.authFetch exists
    let response;

    if (typeof window.Auth?.authFetch === 'function') {
      response = await window.Auth.authFetch('/notifications');
    } else if (typeof apiRequest === 'function') {
      const data = await apiRequest('/notifications');
      renderNotifications(data, notifList, notifBadge, notifEmpty);
      return;
    } else {
      console.warn('No auth fetch available for notifications');
      return;
    }

    if (!response) return;

    const notifs = await response.json();
    renderNotifications(notifs, notifList, notifBadge, notifEmpty);
  } catch (err) {
    console.error('loadNotifications failed:', err);
  }
}

function renderNotifications(notifs, notifList, notifBadge, notifEmpty) {
  if (!Array.isArray(notifs) || notifs.length === 0) {
    notifEmpty?.classList.remove('hidden');
    return;
  }

  notifEmpty?.classList.add('hidden');

  const items = notifs.slice(0, 10).map((n) => {
    const title = n.title || 'Notification';
    const msg = n.message || '';
    const time = n.created_at ? new Date(n.created_at).toLocaleString() : '';

    return `
      <li class="bg-gray-50 border border-gray-200 rounded p-3">
        <div class="font-semibold text-gray-900 text-sm">
          ${escapeHtml(title)}
        </div>
        <div class="text-gray-700 text-sm mt-1">
          ${escapeHtml(msg)}
        </div>
        ${time ? `<div class="text-gray-500 text-xs mt-1">${escapeHtml(time)}</div>` : ''}
      </li>
    `;
  });

  notifList.innerHTML = items.join('');

  const unreadCount = notifs.filter((n) => !n.read_at).length;
  if (notifBadge && unreadCount > 0) {
    notifBadge.textContent = String(unreadCount);
    notifBadge.classList.remove('hidden');
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Works with either auth system
if (typeof requireAuth === 'function' && requireAuth()) {
  loadNotifications();
} else if (
  typeof window.Auth?.requireAuth === 'function' &&
  window.Auth.requireAuth()
) {
  loadNotifications();
}
