"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---- Types ----
interface Contact { id: number; name: string; email: string | null; phone: string | null; company: string | null; relationship_type: string; notes: string | null; last_contact_date: string | null; follow_up_frequency_days: number | null; created_at: string; }
interface Reminder { id: number; title: string; description: string | null; due_at: string; recurrence_rule: string | null; status: string; contact_id: number | null; created_at: string; }
interface Msg { id: number; contact_id: number; subject: string | null; body: string; channel: string; status: string; scheduled_send_at: string | null; created_at: string; updated_at: string; }
interface Conv { id: number; title: string | null; created_at: string; updated_at: string; }
interface Turn { id: number; role: string; content: string; created_at: string; }
interface Notif { id: number; title: string; body: string; notification_type: string; is_read: boolean; action_url: string | null; created_at: string; }

// ---- API helper ----
async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const resp = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (resp.status === 204) return null as T;
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return resp.json();
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

export default function Home() {
  const [page, setPage] = useState("chat");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Chat state
  const [convs, setConvs] = useState<Conv[]>([]);
  const [currentConvId, setCurrentConvId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "Hello! I'm your productivity assistant. How can I help?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Data state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modal state
  const [modal, setModal] = useState<string | null>(null);

  // Filter state
  const [contactFilter, setContactFilter] = useState("all");
  const [reminderFilter, setReminderFilter] = useState("");
  const [messageFilter, setMessageFilter] = useState("");

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const pref = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(pref as "light" | "dark");
    document.documentElement.setAttribute("data-theme", pref);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  // Loaders
  const loadConvs = useCallback(async () => {
    setConvs(await api<Conv[]>("/chat/conversations"));
  }, []);

  const loadContacts = useCallback(async (type?: string) => {
    const q = type && type !== "all" ? "?relationship_type=" + type : "";
    setContacts(await api<Contact[]>("/contacts" + q));
  }, []);

  const loadReminders = useCallback(async (status?: string) => {
    const q = status ? "?status=" + status : "";
    setReminders(await api<Reminder[]>("/reminders" + q));
  }, []);

  const loadMessages = useCallback(async (status?: string) => {
    const q = status ? "?status=" + status : "";
    setMessages(await api<Msg[]>("/messages" + q));
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifications(await api<Notif[]>("/notifications"));
  }, []);

  const pollUnread = useCallback(async () => {
    try {
      const data = await api<{ count: number }>("/notifications/unread-count");
      setUnreadCount(data.count);
    } catch { /* ignore */ }
  }, []);

  // Init
  useEffect(() => {
    loadConvs();
    pollUnread();
    const iv = setInterval(pollUnread, 30000);
    return () => clearInterval(iv);
  }, [loadConvs, pollUnread]);

  // Scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages, sending]);

  // Page switch
  const showPage = (name: string) => {
    setPage(name);
    if (name === "contacts") loadContacts(contactFilter);
    else if (name === "reminders") loadReminders(reminderFilter);
    else if (name === "messages") loadMessages(messageFilter);
    else if (name === "notifications") loadNotifications();
    else if (name === "chat") loadConvs();
  };

  // Chat
  const sendChat = async () => {
    if (!chatInput.trim() || sending) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const resp = await api<{ conversation_id: number; reply: string }>("/chat/send", {
        method: "POST",
        body: JSON.stringify({ message: msg, conversation_id: currentConvId }),
      });
      setCurrentConvId(resp.conversation_id);
      setChatMessages((prev) => [...prev, { role: "assistant", content: resp.reply }]);
      loadConvs();
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error: " + (e as Error).message }]);
    }
    setSending(false);
  };

  const loadConversation = async (id: number) => {
    setCurrentConvId(id);
    const conv = await api<{ turns: Turn[] }>("/chat/conversations/" + id);
    setChatMessages(conv.turns.map((t) => ({ role: t.role, content: t.content })));
    loadConvs();
  };

  const newConversation = () => {
    setCurrentConvId(null);
    setChatMessages([{ role: "assistant", content: "Hello! How can I help you today?" }]);
  };

  // Form handlers
  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (v) data[k] = k === "follow_up_frequency_days" ? Number(v) : v; });
    await api("/contacts", { method: "POST", body: JSON.stringify(data) });
    setModal(null);
    (e.target as HTMLFormElement).reset();
    loadContacts(contactFilter);
  };

  const handleReminderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (v) data[k] = v; });
    if (data.due_at) data.due_at = new Date(data.due_at as string).toISOString();
    if (!data.recurrence_rule) delete data.recurrence_rule;
    await api("/reminders", { method: "POST", body: JSON.stringify(data) });
    setModal(null);
    (e.target as HTMLFormElement).reset();
    loadReminders(reminderFilter);
  };

  const handleMessageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (v) data[k] = v; });
    data.contact_id = Number(data.contact_id);
    await api("/messages", { method: "POST", body: JSON.stringify(data) });
    setModal(null);
    (e.target as HTMLFormElement).reset();
    loadMessages(messageFilter);
  };

  // Contact select for message modal
  const [contactOptions, setContactOptions] = useState<Contact[]>([]);
  useEffect(() => {
    if (modal === "message") {
      api<Contact[]>("/contacts").then(setContactOptions);
    }
  }, [modal]);

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          <h1>Productivity Assistant</h1>
          <div className="subtitle"><span className="status-dot online" /> Ready</div>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </header>

      <div className="app-container">
        {/* Chat */}
        <div className={`page ${page === "chat" ? "active" : ""}`}>
          <div className="chat-container">
            <div className="chat-sidebar">
              {convs.slice(0, 8).map((c) => (
                <div key={c.id} className={`chat-sidebar-item ${c.id === currentConvId ? "active" : ""}`}
                  onClick={() => loadConversation(c.id)}>
                  {(c.title || "Untitled").slice(0, 30)}
                </div>
              ))}
              <div className="chat-sidebar-item" onClick={newConversation}>+ New</div>
            </div>
            <div className="chat-history" ref={chatRef}>
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>{m.content}</div>
              ))}
              {sending && (
                <div className="chat-bubble assistant">
                  <div className="typing-dots"><span /><span /><span /></div>
                </div>
              )}
            </div>
            <div className="chat-input-row">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Type a message..."
                autoComplete="off"
              />
              <button onClick={sendChat}>Send</button>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className={`page ${page === "contacts" ? "active" : ""}`}>
          <div className="section-header">
            <h2>Contacts</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setModal("contact")}>+ Add</button>
          </div>
          <div className="tabs">
            {["all", "business", "personal", "family"].map((t) => (
              <button key={t} className={`tab ${contactFilter === t ? "active" : ""}`}
                onClick={() => { setContactFilter(t); loadContacts(t); }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {!contacts.length ? (
            <div className="empty-state"><p>No contacts yet. Add your first contact!</p></div>
          ) : contacts.map((c) => (
            <div key={c.id} className="card">
              <div className="card-title">{c.name}</div>
              <div className="card-meta">
                <span className={`badge badge-${c.relationship_type === "business" ? "draft" : "sent"}`}>{c.relationship_type}</span>
                {c.company && <> &middot; {c.company}</>}
                {c.email && <> &middot; {c.email}</>}
              </div>
              {c.notes && <div className="card-body">{c.notes}</div>}
              <div className="card-actions">
                <button className="btn btn-sm" onClick={async () => { await api(`/contacts/${c.id}/mark-contacted`, { method: "POST" }); loadContacts(contactFilter); }}>Mark Contacted</button>
                <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm("Delete?")) { await api(`/contacts/${c.id}`, { method: "DELETE" }); loadContacts(contactFilter); } }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Reminders */}
        <div className={`page ${page === "reminders" ? "active" : ""}`}>
          <div className="section-header">
            <h2>Reminders</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setModal("reminder")}>+ Add</button>
          </div>
          <div className="tabs">
            {[["", "All"], ["pending", "Pending"], ["triggered", "Triggered"]].map(([v, l]) => (
              <button key={v} className={`tab ${reminderFilter === v ? "active" : ""}`}
                onClick={() => { setReminderFilter(v); loadReminders(v); }}>
                {l}
              </button>
            ))}
          </div>
          {!reminders.length ? (
            <div className="empty-state"><p>No reminders. Create one to get started!</p></div>
          ) : reminders.map((r) => (
            <div key={r.id} className="card">
              <div className="card-title">{r.title}</div>
              <div className="card-meta">
                <span className={`badge badge-${r.status}`}>{r.status}</span>
                {" "}&middot; Due: {new Date(r.due_at).toLocaleString()}
                {r.recurrence_rule && <> &middot; Repeats {r.recurrence_rule}</>}
              </div>
              {r.description && <div className="card-body">{r.description}</div>}
              <div className="card-actions">
                {(r.status === "pending" || r.status === "triggered") && (
                  <>
                    <button className="btn btn-sm" onClick={async () => { await api(`/reminders/${r.id}/snooze?minutes=15`, { method: "POST" }); loadReminders(reminderFilter); }}>Snooze 15m</button>
                    <button className="btn btn-sm" onClick={async () => { await api(`/reminders/${r.id}/dismiss`, { method: "POST" }); loadReminders(reminderFilter); }}>Dismiss</button>
                  </>
                )}
                <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm("Delete?")) { await api(`/reminders/${r.id}`, { method: "DELETE" }); loadReminders(reminderFilter); } }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div className={`page ${page === "messages" ? "active" : ""}`}>
          <div className="section-header">
            <h2>Messages</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setModal("message")}>+ Draft</button>
          </div>
          <div className="tabs">
            {[["", "All"], ["draft", "Drafts"], ["sent", "Sent"]].map(([v, l]) => (
              <button key={v} className={`tab ${messageFilter === v ? "active" : ""}`}
                onClick={() => { setMessageFilter(v); loadMessages(v); }}>
                {l}
              </button>
            ))}
          </div>
          {!messages.length ? (
            <div className="empty-state"><p>No messages yet. Draft your first message!</p></div>
          ) : messages.map((m) => (
            <div key={m.id} className="card">
              <div className="card-title">{m.subject || "(No subject)"}</div>
              <div className="card-meta">
                <span className={`badge badge-${m.status}`}>{m.status}</span>
                {" "}&middot; {m.channel} &middot; {new Date(m.created_at).toLocaleDateString()}
              </div>
              <div className="card-body">{m.body.substring(0, 200)}{m.body.length > 200 ? "..." : ""}</div>
              <div className="card-actions">
                {m.status === "draft" && (
                  <button className="btn btn-sm btn-primary" onClick={async () => { await api(`/messages/${m.id}/mark-sent`, { method: "POST" }); loadMessages(messageFilter); }}>Mark Sent</button>
                )}
                <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm("Delete?")) { await api(`/messages/${m.id}`, { method: "DELETE" }); loadMessages(messageFilter); } }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className={`page ${page === "notifications" ? "active" : ""}`}>
          <div className="section-header">
            <h2>Notifications</h2>
            <button className="btn btn-sm" onClick={async () => { await api("/notifications/read-all", { method: "POST" }); loadNotifications(); pollUnread(); }}>Mark all read</button>
          </div>
          {!notifications.length ? (
            <div className="empty-state"><p>No notifications yet.</p></div>
          ) : notifications.map((n) => (
            <div key={n.id} className="card" style={{ cursor: "pointer" }}
              onClick={async () => { await api(`/notifications/${n.id}/read`, { method: "POST" }); loadNotifications(); pollUnread(); }}>
              <div className="notification-item">
                <div className={`notification-dot ${n.is_read ? "read" : ""}`} />
                <div>
                  <div className="card-title">{n.title}</div>
                  <div className="card-meta">{n.notification_type} &middot; {new Date(n.created_at).toLocaleString()}</div>
                  <div className="card-body">{n.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { name: "chat", label: "Chat", icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> },
          { name: "contacts", label: "Contacts", icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
          { name: "reminders", label: "Reminders", icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></> },
          { name: "messages", label: "Messages", icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></> },
          { name: "notifications", label: "Alerts", icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></> },
        ].map((tab) => (
          <button key={tab.name} className={`nav-item ${page === tab.name ? "active" : ""}`} onClick={() => showPage(tab.name)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{tab.icon}</svg>
            {tab.label}
            {tab.name === "notifications" && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Contact Modal */}
      {modal === "contact" && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Add Contact</h2>
              <button className="modal-close" onClick={() => setModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleContactSubmit}>
              <div className="form-group"><label>Name</label><input name="name" required placeholder="Full name" /></div>
              <div className="form-group"><label>Email</label><input name="email" type="email" placeholder="email@example.com" /></div>
              <div className="form-group"><label>Phone</label><input name="phone" type="tel" placeholder="+1 (555) 000-0000" /></div>
              <div className="form-group"><label>Company</label><input name="company" placeholder="Company name" /></div>
              <div className="form-group">
                <label>Relationship</label>
                <select name="relationship_type" defaultValue="business">
                  <option value="business">Business</option>
                  <option value="personal">Personal</option>
                  <option value="family">Family</option>
                  <option value="acquaintance">Acquaintance</option>
                </select>
              </div>
              <div className="form-group"><label>Follow-up every (days)</label><input name="follow_up_frequency_days" type="number" min="1" placeholder="e.g. 7" /></div>
              <div className="form-group"><label>Notes</label><textarea name="notes" placeholder="Add any notes..." /></div>
              <button type="submit" className="btn btn-primary btn-block">Save Contact</button>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {modal === "reminder" && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Add Reminder</h2>
              <button className="modal-close" onClick={() => setModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleReminderSubmit}>
              <div className="form-group"><label>Title</label><input name="title" required placeholder="What to remember..." /></div>
              <div className="form-group"><label>Description</label><textarea name="description" placeholder="Details (optional)" /></div>
              <div className="form-group"><label>Due Date & Time</label><input name="due_at" type="datetime-local" required /></div>
              <div className="form-group">
                <label>Recurrence</label>
                <select name="recurrence_rule" defaultValue="">
                  <option value="">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Reminder</button>
            </form>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {modal === "message" && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content">
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Draft Message</h2>
              <button className="modal-close" onClick={() => setModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleMessageSubmit}>
              <div className="form-group">
                <label>Contact</label>
                <select name="contact_id" required>
                  <option value="">Select a contact...</option>
                  {contactOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label>Subject</label><input name="subject" placeholder="Message subject" /></div>
              <div className="form-group">
                <label>Channel</label>
                <select name="channel" defaultValue="email">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="chat">Chat</option>
                </select>
              </div>
              <div className="form-group"><label>Message</label><textarea name="body" required rows={5} placeholder="Write your message..." /></div>
              <button type="submit" className="btn btn-primary btn-block">Save Draft</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
