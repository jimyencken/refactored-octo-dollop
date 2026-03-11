// State
let currentConversationId = null;
let notifPollInterval = null;

// --- Theme ---
function getPreferredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.body.classList.add('theme-transitioning');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // Update icons
    document.getElementById('theme-icon-light').style.display = theme === 'dark' ? 'block' : 'none';
    document.getElementById('theme-icon-dark').style.display = theme === 'dark' ? 'none' : 'block';
    // Update meta theme color
    const meta = document.getElementById('meta-theme');
    if (meta) meta.content = theme === 'dark' ? '#0f172a' : '#2563eb';
    setTimeout(() => document.body.classList.remove('theme-transitioning'), 350);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

// --- Navigation ---
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    event.currentTarget.classList.add('active');

    if (name === 'contacts') loadContacts();
    else if (name === 'reminders') loadReminders();
    else if (name === 'messages') loadMessages();
    else if (name === 'notifications') loadNotifications();
    else if (name === 'chat') loadConversations();
}

// --- API helpers ---
async function api(path, opts = {}) {
    const resp = await fetch('/api' + path, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
    });
    if (resp.status === 204) return null;
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Request failed');
    }
    return resp.json();
}

// --- Modals ---
function openModal(id) {
    document.getElementById(id).classList.add('active');
    if (id === 'message-modal') populateContactSelect();
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// --- Contacts ---
async function loadContacts(type) {
    const q = type && type !== 'all' ? '?relationship_type=' + type : '';
    const contacts = await api('/contacts' + q);
    const list = document.getElementById('contacts-list');
    if (!contacts.length) {
        list.innerHTML = '<div class="empty-state"><p>No contacts yet. Add your first contact!</p></div>';
        return;
    }
    list.innerHTML = contacts.map(c => `
        <div class="card">
            <div class="card-title">${esc(c.name)}</div>
            <div class="card-meta">
                <span class="badge badge-${c.relationship_type === 'business' ? 'draft' : 'sent'}">${c.relationship_type}</span>
                ${c.company ? ' &middot; ' + esc(c.company) : ''}
                ${c.email ? ' &middot; ' + esc(c.email) : ''}
            </div>
            ${c.notes ? '<div class="card-body">' + esc(c.notes) + '</div>' : ''}
            <div class="card-actions">
                <button class="btn btn-sm" onclick="markContacted(${c.id})">Mark Contacted</button>
                <button class="btn btn-sm btn-danger" onclick="deleteContact(${c.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterContacts(type, btn) {
    btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadContacts(type);
}

async function createContact(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    if (data.follow_up_frequency_days) data.follow_up_frequency_days = parseInt(data.follow_up_frequency_days);
    else delete data.follow_up_frequency_days;
    Object.keys(data).forEach(k => { if (!data[k]) delete data[k]; });
    await api('/contacts', { method: 'POST', body: JSON.stringify(data) });
    closeModal('contact-modal');
    e.target.reset();
    loadContacts();
    return false;
}

async function markContacted(id) { await api(`/contacts/${id}/mark-contacted`, { method: 'POST' }); loadContacts(); }
async function deleteContact(id) { if (confirm('Delete this contact?')) { await api(`/contacts/${id}`, { method: 'DELETE' }); loadContacts(); } }

// --- Reminders ---
async function loadReminders(status) {
    const q = status ? '?status=' + status : '';
    const reminders = await api('/reminders' + q);
    const list = document.getElementById('reminders-list');
    if (!reminders.length) {
        list.innerHTML = '<div class="empty-state"><p>No reminders. Create one to get started!</p></div>';
        return;
    }
    list.innerHTML = reminders.map(r => `
        <div class="card">
            <div class="card-title">${esc(r.title)}</div>
            <div class="card-meta">
                <span class="badge badge-${r.status}">${r.status}</span>
                &middot; Due: ${new Date(r.due_at).toLocaleString()}
                ${r.recurrence_rule ? ' &middot; Repeats ' + r.recurrence_rule : ''}
            </div>
            ${r.description ? '<div class="card-body">' + esc(r.description) + '</div>' : ''}
            <div class="card-actions">
                ${r.status === 'pending' || r.status === 'triggered' ? `
                    <button class="btn btn-sm" onclick="snoozeReminder(${r.id})">Snooze 15m</button>
                    <button class="btn btn-sm" onclick="dismissReminder(${r.id})">Dismiss</button>
                ` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteReminder(${r.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterReminders(status, btn) {
    btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadReminders(status);
}

async function createReminder(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    if (!data.recurrence_rule) delete data.recurrence_rule;
    if (data.due_at) data.due_at = new Date(data.due_at).toISOString();
    await api('/reminders', { method: 'POST', body: JSON.stringify(data) });
    closeModal('reminder-modal');
    e.target.reset();
    loadReminders();
    return false;
}

async function snoozeReminder(id) { await api(`/reminders/${id}/snooze?minutes=15`, { method: 'POST' }); loadReminders(); }
async function dismissReminder(id) { await api(`/reminders/${id}/dismiss`, { method: 'POST' }); loadReminders(); }
async function deleteReminder(id) { if (confirm('Delete this reminder?')) { await api(`/reminders/${id}`, { method: 'DELETE' }); loadReminders(); } }

// --- Messages ---
async function loadMessages(status) {
    const q = status ? '?status=' + status : '';
    const messages = await api('/messages' + q);
    const list = document.getElementById('messages-list');
    if (!messages.length) {
        list.innerHTML = '<div class="empty-state"><p>No messages yet. Draft your first message!</p></div>';
        return;
    }
    list.innerHTML = messages.map(m => `
        <div class="card">
            <div class="card-title">${esc(m.subject || '(No subject)')}</div>
            <div class="card-meta">
                <span class="badge badge-${m.status}">${m.status}</span>
                &middot; ${m.channel} &middot; ${new Date(m.created_at).toLocaleDateString()}
            </div>
            <div class="card-body">${esc(m.body).substring(0, 200)}${m.body.length > 200 ? '...' : ''}</div>
            <div class="card-actions">
                ${m.status === 'draft' ? `<button class="btn btn-sm btn-primary" onclick="markMessageSent(${m.id})">Mark Sent</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteMessage(${m.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterMessages(status, btn) {
    btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadMessages(status);
}

async function populateContactSelect() {
    const contacts = await api('/contacts');
    const sel = document.getElementById('msg-contact-select');
    sel.innerHTML = '<option value="">Select a contact...</option>' +
        contacts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

async function createMessage(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.contact_id = parseInt(data.contact_id);
    await api('/messages', { method: 'POST', body: JSON.stringify(data) });
    closeModal('message-modal');
    e.target.reset();
    loadMessages();
    return false;
}

async function aiDraft() {
    const form = document.querySelector('#message-modal form');
    const contactId = form.contact_id.value;
    const subject = form.subject.value;
    if (!contactId) { alert('Please select a contact first'); return; }
    const data = {
        contact_id: parseInt(contactId),
        context: subject || 'general follow-up',
        tone: 'professional',
        channel: form.channel.value,
    };
    const msg = await api('/messages/draft-assist', { method: 'POST', body: JSON.stringify(data) });
    form.body.value = msg.body;
    form.subject.value = msg.subject || form.subject.value;
}

async function markMessageSent(id) { await api(`/messages/${id}/mark-sent`, { method: 'POST' }); loadMessages(); }
async function deleteMessage(id) { if (confirm('Delete this message?')) { await api(`/messages/${id}`, { method: 'DELETE' }); loadMessages(); } }

// --- Chat ---
async function loadConversations() {
    const convs = await api('/chat/conversations');
    const sidebar = document.getElementById('chat-sidebar');
    if (!convs.length) {
        sidebar.innerHTML = '<div class="chat-sidebar-item active" onclick="newConversation()">+ New chat</div>';
        return;
    }
    sidebar.innerHTML = convs.slice(0, 8).map(c => `
        <div class="chat-sidebar-item ${c.id === currentConversationId ? 'active' : ''}" onclick="loadConversation(${c.id})">
            ${esc((c.title || 'Untitled').substring(0, 30))}
        </div>
    `).join('') + '<div class="chat-sidebar-item" onclick="newConversation()">+ New</div>';
}

async function loadConversation(id) {
    currentConversationId = id;
    const conv = await api('/chat/conversations/' + id);
    const history = document.getElementById('chat-history');
    history.innerHTML = conv.turns.map(t => `
        <div class="chat-bubble ${t.role}">${esc(t.content)}</div>
    `).join('');
    history.scrollTop = history.scrollHeight;
    loadConversations();
}

function newConversation() {
    currentConversationId = null;
    document.getElementById('chat-history').innerHTML = `
        <div class="chat-bubble assistant">Hello! How can I help you today?</div>
    `;
    loadConversations();
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    const history = document.getElementById('chat-history');
    history.innerHTML += `<div class="chat-bubble user">${esc(msg)}</div>`;
    history.innerHTML += `<div class="chat-bubble assistant" id="typing"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
    history.scrollTop = history.scrollHeight;

    try {
        const resp = await api('/chat/send', {
            method: 'POST',
            body: JSON.stringify({ message: msg, conversation_id: currentConversationId }),
        });
        currentConversationId = resp.conversation_id;
        const typing = document.getElementById('typing');
        if (typing) typing.remove();
        history.innerHTML += `<div class="chat-bubble assistant">${esc(resp.reply)}</div>`;
        history.scrollTop = history.scrollHeight;
        loadConversations();
    } catch (e) {
        const typing = document.getElementById('typing');
        if (typing) { typing.innerHTML = 'Error: ' + esc(e.message); }
    }
}

document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

// --- Notifications ---
async function loadNotifications() {
    const notifs = await api('/notifications');
    const list = document.getElementById('notifications-list');
    if (!notifs.length) {
        list.innerHTML = '<div class="empty-state"><p>No notifications yet.</p></div>';
        return;
    }
    list.innerHTML = notifs.map(n => `
        <div class="card" onclick="markNotifRead(${n.id})" style="cursor:pointer">
            <div class="notification-item">
                <div class="notification-dot ${n.is_read ? 'read' : ''}"></div>
                <div>
                    <div class="card-title">${esc(n.title)}</div>
                    <div class="card-meta">${n.notification_type} &middot; ${new Date(n.created_at).toLocaleString()}</div>
                    <div class="card-body">${esc(n.body)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

async function pollNotifications() {
    try {
        const data = await api('/notifications/unread-count');
        const badge = document.getElementById('notif-badge');
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) { /* ignore poll errors */ }
}

async function markNotifRead(id) { await api(`/notifications/${id}/read`, { method: 'POST' }); loadNotifications(); pollNotifications(); }
async function markAllRead() { await api('/notifications/read-all', { method: 'POST' }); loadNotifications(); pollNotifications(); }

// --- Push Notifications ---
async function initPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const reg = await navigator.serviceWorker.register('/static/js/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            const resp = await fetch('/api/notifications/vapid-key');
            if (!resp.ok) return;
            const { key } = await resp.json();
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(key),
            });
        }
        const key = sub.toJSON();
        await api('/notifications/push-subscription', {
            method: 'POST',
            body: JSON.stringify({
                endpoint: sub.endpoint,
                p256dh_key: key.keys.p256dh,
                auth_key: key.keys.auth,
            }),
        });
    } catch (e) { console.log('Push setup skipped:', e.message); }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// --- Utility ---
function esc(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());
    loadConversations();
    pollNotifications();
    notifPollInterval = setInterval(pollNotifications, 30000);
    initPush();
});
