/**
 * app.js — Maham To-Do Frontend
 * Handles auth (login/register), JWT storage, and full task CRUD.
 */

const API = '';  // same-origin; Express serves both API and static files

// ── Utility helpers ──────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('maham_token');
}

function setToken(token) {
  localStorage.setItem('maham_token', token);
}

function setUser(user) {
  localStorage.setItem('maham_user', JSON.stringify(user));
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('maham_user')); }
  catch { return null; }
}

function clearSession() {
  localStorage.removeItem('maham_token');
  localStorage.removeItem('maham_user');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add('hidden');
}

function setLoading(submitBtnId, loading) {
  const btn = document.getElementById(submitBtnId);
  if (!btn) return;
  const text   = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (text) text.style.opacity = loading ? '0.5' : '1';
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

// ── Screen routing ───────────────────────────────────────────────────────────

function showScreen(name) {
  document.getElementById('auth-screen').classList.toggle('hidden', name !== 'auth');
  document.getElementById('dashboard-screen').classList.toggle('hidden', name !== 'dashboard');
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden', isLogin);
  hideError('login-error');
  hideError('register-error');
}

// ── Auth handlers ────────────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('login-error');
  setLoading('login-submit', true);

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { ok, data } = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setLoading('login-submit', false);

  if (!ok) {
    showError('login-error', data.error || 'Login failed. Please try again.');
    return;
  }

  setToken(data.token);
  setUser(data.user);
  enterDashboard();
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('register-error');
  setLoading('register-submit', true);

  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  const { ok, data } = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });

  setLoading('register-submit', false);

  if (!ok) {
    showError('register-error', data.error || 'Registration failed. Please try again.');
    return;
  }

  setToken(data.token);
  setUser(data.user);
  enterDashboard();
});

function logout() {
  clearSession();
  showScreen('auth');
  switchTab('login');
}

// ── Dashboard ────────────────────────────────────────────────────────────────

async function enterDashboard() {
  const user = getUser();
  const greetingEl = document.getElementById('dash-username');
  if (greetingEl && user) {
    greetingEl.textContent = `Hey, ${user.username} 👋`;
  }
  showScreen('dashboard');
  await loadTasks();
}

// ── Task rendering ───────────────────────────────────────────────────────────

let tasks = [];

async function loadTasks() {
  const { ok, data } = await apiFetch('/api/tasks');
  if (!ok) {
    if (data.status === 401) { logout(); return; }
    return;
  }
  tasks = data;
  renderTasks();
}

function renderTasks() {
  const list     = document.getElementById('task-list');
  const empty    = document.getElementById('empty-state');
  const total    = tasks.length;
  const done     = tasks.filter(t => t.completed).length;
  const remaining = total - done;

  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-done').textContent      = done;
  document.getElementById('stat-remaining').textContent = remaining;

  list.innerHTML = '';

  if (total === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tasks.forEach(task => {
    const item = buildTaskElement(task);
    list.appendChild(item);
  });
}

function buildTaskElement(task) {
  const item = document.createElement('div');
  item.className = `task-item${task.completed ? ' done' : ''}`;
  item.dataset.id = task.id;
  item.setAttribute('role', 'listitem');

  // Checkbox
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'task-check';
  check.checked = task.completed;
  check.id = `check-${task.id}`;
  check.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`);
  check.addEventListener('change', () => toggleTask(task.id, check.checked));

  // Title
  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;

  // Actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'task-btn edit';
  editBtn.textContent = 'Edit';
  editBtn.setAttribute('aria-label', `Edit task: ${task.title}`);
  editBtn.addEventListener('click', () => startEdit(task, item, title, actions));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-btn delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.setAttribute('aria-label', `Delete task: ${task.title}`);
  deleteBtn.addEventListener('click', () => deleteTask(task.id, item));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  item.appendChild(check);
  item.appendChild(title);
  item.appendChild(actions);

  return item;
}

// ── Task CRUD ────────────────────────────────────────────────────────────────

document.getElementById('add-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError('add-task-error');

  const input = document.getElementById('new-task-input');
  const title = input.value.trim();
  if (!title) return;

  const btn = document.getElementById('add-task-btn');
  btn.disabled = true;

  const { ok, data } = await apiFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

  btn.disabled = false;

  if (!ok) {
    showError('add-task-error', data.error || 'Failed to add task.');
    return;
  }

  tasks.unshift(data);
  input.value = '';
  renderTasks();
});

async function toggleTask(id, completed) {
  const { ok, data } = await apiFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ completed }),
  });

  if (!ok) { await loadTasks(); return; }

  const index = tasks.findIndex(t => t.id === id);
  if (index !== -1) tasks[index] = data;
  renderTasks();
}

async function deleteTask(id, itemEl) {
  // Animate out
  itemEl.style.transition = 'all 0.25s ease';
  itemEl.style.opacity = '0';
  itemEl.style.transform = 'translateX(20px)';
  await new Promise(r => setTimeout(r, 250));

  const { ok } = await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (ok) {
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
  } else {
    itemEl.style.opacity = '';
    itemEl.style.transform = '';
  }
}

function startEdit(task, itemEl, titleEl, actionsEl) {
  // Swap title span for input
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.value = task.title;
  editInput.maxLength = 200;
  editInput.setAttribute('aria-label', 'Edit task title');

  itemEl.replaceChild(editInput, titleEl);

  // Swap actions for save button
  const saveBtn = document.createElement('button');
  saveBtn.className = 'task-btn save';
  saveBtn.textContent = 'Save';
  saveBtn.setAttribute('aria-label', 'Save task edit');

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'task-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.setAttribute('aria-label', 'Cancel task edit');

  actionsEl.innerHTML = '';
  actionsEl.appendChild(saveBtn);
  actionsEl.appendChild(cancelBtn);
  actionsEl.style.opacity = '1';

  editInput.focus();
  editInput.select();

  async function saveEdit() {
    const newTitle = editInput.value.trim();
    if (!newTitle) return;

    saveBtn.disabled = true;
    const { ok, data } = await apiFetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: newTitle }),
    });

    if (ok) {
      const index = tasks.findIndex(t => t.id === task.id);
      if (index !== -1) tasks[index] = data;
      renderTasks();
    } else {
      saveBtn.disabled = false;
    }
  }

  saveBtn.addEventListener('click', saveEdit);
  cancelBtn.addEventListener('click', () => renderTasks());
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') renderTasks();
  });
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

(function init() {
  const token = getToken();
  if (token) {
    enterDashboard();
  } else {
    showScreen('auth');
  }
})();
