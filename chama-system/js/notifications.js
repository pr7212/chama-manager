async function loadNotifications() {
  const notifList = document.getElementById('notificationsList');

  const notifBadge = document.getElementById('notifBadge');

  const notifEmpty = document.getElementById('notificationsEmpty');

  if (!notifList) return;

  notifList.innerHTML = '';

  notifBadge?.classList.add('hidden');

  try {
    const response = await window.Auth.authFetch('/notifications');

    if (!response) return;

    const notifs = await response.json();

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

            ${
              time
                ? `<div class="text-gray-500 text-xs mt-1">
                    ${escapeHtml(time)}
                  </div>`
                : ''
            }

          </li>
        `;
    });

    notifList.innerHTML = items.join('');

    notifBadge.textContent = String(notifs.length);

    notifBadge.classList.remove('hidden');
  } catch (err) {
    console.error('loadNotifications failed:', err);
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

if (typeof window.Auth?.requireAuth === 'function') {
  if (window.Auth.requireAuth()) {
    loadNotifications();
  }
}
