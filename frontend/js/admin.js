/* ============================================================
   Emamuddin Mallick — Admin panel JS
   ============================================================ */
(function () {
  'use strict';

  const API_BASE = (window.API_BASE || '').replace(/\/$/, '');
  let csrf = null;
  let projects = [];
  let certificates = [];

  const isLoginPage = !!document.getElementById('login-form');

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function apiFetch(url, opts) {
    const options = opts || {};
    options.headers = options.headers || {};
    options.headers['X-CSRF-Token'] = csrf || '';
    if (options.body && !(options.body instanceof FormData) && options.body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
    }
    return fetch(API_BASE + url, options);
  }

  function showStatus(el, message, isError) {
    if (!el) return;
    el.textContent = message;
    el.className = 'form-status ' + (isError ? 'error' : 'success');
  }

  /* ============================================================
     LOGIN PAGE
     ============================================================ */
  if (isLoginPage) {
    const form = document.getElementById('login-form');
    const btn = document.getElementById('login-btn');
    const status = document.getElementById('login-status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      status.className = 'form-status';

      const username = form.username.value.trim();
      const password = form.password.value;

      if (!username || !password) {
        showStatus(status, 'Please enter your username and password.', true);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Signing in...';

      try {
        const res = await fetch(API_BASE + '/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');
        window.location.href = '/admin';
      } catch (err) {
        showStatus(status, err.message || 'Login failed. Please try again.', true);
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
    return;
  }

  /* ============================================================
     ADMIN DASHBOARD
     ============================================================ */
  const adminUser = document.getElementById('admin-user');

  async function checkSession() {
    try {
      const res = await fetch(API_BASE + '/api/admin/me');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return false;
      }
      const data = await res.json();
      csrf = data.csrf;
      if (adminUser) adminUser.textContent = data.username;
      return true;
    } catch (err) {
      console.error('Session check failed:', err);
      window.location.href = '/admin/login';
      return false;
    }
  }

  /* ---------- Tabs ---------- */
  const titles = { dashboard: 'Dashboard', projects: 'Projects', certificates: 'Certificates', account: 'Account' };

  document.querySelectorAll('.admin-nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-link').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      document.getElementById('page-title').textContent = titles[tab];
      document.getElementById('admin-side').classList.remove('open');
    });
  });

  const burger = document.getElementById('admin-burger');
  if (burger) {
    burger.addEventListener('click', () => {
      document.getElementById('admin-side').classList.toggle('open');
    });
  }

  /* ---------- Modals ---------- */
  function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.getElementById(id).setAttribute('aria-hidden', 'false');
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.getElementById(id).setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal(el.dataset.close));
  });
  document.querySelectorAll('.admin-modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    document.getElementById('stat-projects').textContent = projects.length;
    document.getElementById('stat-certificates').textContent = certificates.length;

    const recentP = document.getElementById('recent-projects');
    const recentC = document.getElementById('recent-certificates');

    recentP.innerHTML = projects.slice(0, 5).map((p) =>
      `<li><span class="dash-item-title">${escapeHtml(p.title)}</span><span class="dash-item-meta">${escapeHtml(p.category || '')}</span></li>`
    ).join('') || '<li class="empty-note">No projects yet.</li>';

    recentC.innerHTML = certificates.slice(0, 5).map((c) =>
      `<li><span class="dash-item-title">${escapeHtml(c.title)}</span><span class="dash-item-meta">${escapeHtml(c.date || '')}</span></li>`
    ).join('') || '<li class="empty-note">No certificates yet.</li>';
  }

  /* ---------- Projects table ---------- */
  function renderProjectsTable() {
    const body = document.getElementById('projects-table-body');
    const empty = document.getElementById('projects-table-empty');
    body.innerHTML = projects.map((p) => `
      <tr>
        <td class="table-title">${escapeHtml(p.title)}</td>
        <td>${escapeHtml(p.category || '—')}</td>
        <td class="table-tech">${(p.technologies || []).map((t) => `<span class="tag-mini">${escapeHtml(t)}</span>`).join('') || '—'}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-edit-project="${p.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete-project="${p.id}">Delete</button>
          </div>
        </td>
      </tr>`).join('');
    empty.hidden = projects.length > 0;
  }

  /* ---------- Certificates table ---------- */
  function renderCertsTable() {
    const body = document.getElementById('certs-table-body');
    const empty = document.getElementById('certs-table-empty');
    body.innerHTML = certificates.map((c) => `
      <tr>
        <td class="table-title">${escapeHtml(c.title)}</td>
        <td>${escapeHtml(c.organization || '—')}</td>
        <td>${escapeHtml(c.date || '—')}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-edit-cert="${c.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete-cert="${c.id}">Delete</button>
          </div>
        </td>
      </tr>`).join('');
    empty.hidden = certificates.length > 0;
  }

  async function loadAll() {
    try {
      const [pRes, cRes] = await Promise.all([
        apiFetch('/api/projects'),
        apiFetch('/api/certificates'),
      ]);
      projects = await pRes.json();
      certificates = await cRes.json();
    } catch (err) {
      console.error('Load failed:', err);
    }
    renderDashboard();
    renderProjectsTable();
    renderCertsTable();
  }

  /* ---------- Project add/edit ---------- */
  const projectForm = document.getElementById('project-form');
  const projectModalTitle = document.getElementById('project-modal-title');

  document.getElementById('add-project-btn').addEventListener('click', () => {
    projectForm.reset();
    document.getElementById('project-id').value = '';
    document.getElementById('project-form-status').textContent = '';
    document.getElementById('project-form-status').className = 'form-status';
    projectModalTitle.textContent = 'Add Project';
    document.getElementById('project-submit').textContent = 'Save Project';
    openModal('project-modal');
  });

  document.getElementById('projects-table-body').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-project]');
    if (editBtn) {
      const p = projects.find((x) => x.id === Number(editBtn.dataset.editProject));
      if (!p) return;
      document.getElementById('project-form').reset();
      document.getElementById('project-id').value = p.id;
      document.getElementById('p-title').value = p.title;
      document.getElementById('p-description').value = p.description || '';
      document.getElementById('p-category').value = p.category || '';
      document.getElementById('p-technologies').value = (p.technologies || []).join(', ');
      document.getElementById('p-github').value = p.github_url || '';
      document.getElementById('p-demo').value = p.demo_url || '';
      document.getElementById('project-form-status').textContent = '';
      document.getElementById('project-form-status').className = 'form-status';
      projectModalTitle.textContent = 'Edit Project';
      document.getElementById('project-submit').textContent = 'Update Project';
      openModal('project-modal');
    }
  });

  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('project-form-status');
    showStatus(status, '', true);
    status.textContent = '';

    const id = document.getElementById('project-id').value;
    const title = document.getElementById('p-title').value.trim();
    if (!title) {
      showStatus(status, 'Title is required.', true);
      return;
    }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', document.getElementById('p-description').value.trim());
    fd.append('category', document.getElementById('p-category').value.trim());
    fd.append('technologies', document.getElementById('p-technologies').value.trim());
    fd.append('github_url', document.getElementById('p-github').value.trim());
    fd.append('demo_url', document.getElementById('p-demo').value.trim());
    const fileInput = document.getElementById('p-image');
    if (fileInput.files && fileInput.files[0]) fd.append('image', fileInput.files[0]);

    const submitBtn = document.getElementById('project-submit');
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';

    try {
      const res = await apiFetch(id ? `/api/projects/${id}` : '/api/projects', {
        method: id ? 'PUT' : 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      closeModal('project-modal');
      await loadAll();
    } catch (err) {
      showStatus(status, err.message || 'Save failed. Please try again.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  /* ---------- Certificate add/edit ---------- */
  const certForm = document.getElementById('cert-form');
  const certModalTitle = document.getElementById('cert-modal-title');

  document.getElementById('add-cert-btn').addEventListener('click', () => {
    certForm.reset();
    document.getElementById('cert-id').value = '';
    document.getElementById('cert-form-status').textContent = '';
    document.getElementById('cert-form-status').className = 'form-status';
    certModalTitle.textContent = 'Add Certificate';
    document.getElementById('cert-submit').textContent = 'Save Certificate';
    openModal('cert-modal');
  });

  document.getElementById('certs-table-body').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-cert]');
    if (editBtn) {
      const c = certificates.find((x) => x.id === Number(editBtn.dataset.editCert));
      if (!c) return;
      certForm.reset();
      document.getElementById('cert-id').value = c.id;
      document.getElementById('c-title').value = c.title;
      document.getElementById('c-org').value = c.organization || '';
      document.getElementById('c-date').value = c.date || '';
      document.getElementById('cert-form-status').textContent = '';
      document.getElementById('cert-form-status').className = 'form-status';
      certModalTitle.textContent = 'Edit Certificate';
      document.getElementById('cert-submit').textContent = 'Update Certificate';
      openModal('cert-modal');
    }
  });

  certForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('cert-form-status');
    status.textContent = '';
    status.className = 'form-status';

    const id = document.getElementById('cert-id').value;
    const title = document.getElementById('c-title').value.trim();
    if (!title) {
      showStatus(status, 'Title is required.', true);
      return;
    }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('organization', document.getElementById('c-org').value.trim());
    fd.append('date', document.getElementById('c-date').value.trim());
    const fileInput = document.getElementById('c-file');
    if (fileInput.files && fileInput.files[0]) fd.append('file', fileInput.files[0]);

    const submitBtn = document.getElementById('cert-submit');
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';

    try {
      const res = await apiFetch(id ? `/api/certificates/${id}` : '/api/certificates', {
        method: id ? 'PUT' : 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      closeModal('cert-modal');
      await loadAll();
    } catch (err) {
      showStatus(status, err.message || 'Save failed. Please try again.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  /* ---------- Delete with confirm ---------- */
  let confirmAction = null;
  const confirmModal = document.getElementById('confirm-modal');
  const confirmBtn = document.getElementById('confirm-btn');
  const confirmText = document.getElementById('confirm-text');
  const confirmTitle = document.getElementById('confirm-title');

  function askDelete(title, text, action) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmAction = action;
    openModal('confirm-modal');
  }

  document.getElementById('projects-table-body').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete-project]');
    if (!del) return;
    const p = projects.find((x) => x.id === Number(del.dataset.deleteProject));
    if (!p) return;
    askDelete('Delete Project', `Delete "${p.title}"? This cannot be undone.`, () => {
      return apiFetch(`/api/projects/${p.id}`, { method: 'DELETE' });
    });
  });

  document.getElementById('certs-table-body').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete-cert]');
    if (!del) return;
    const c = certificates.find((x) => x.id === Number(del.dataset.deleteCert));
    if (!c) return;
    askDelete('Delete Certificate', `Delete "${c.title}"? This cannot be undone.`, () => {
      return apiFetch(`/api/certificates/${c.id}`, { method: 'DELETE' });
    });
  });

  confirmBtn.addEventListener('click', async () => {
    if (!confirmAction) return;
    confirmBtn.disabled = true;
    try {
      const res = await confirmAction();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed.');
      closeModal('confirm-modal');
      await loadAll();
    } catch (err) {
      confirmText.textContent = err.message || 'Delete failed.';
      confirmBtn.textContent = 'Try Again';
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete';
      confirmAction = null;
    }
  });

  /* ---------- Change password ---------- */
  const pwForm = document.getElementById('change-password-form');
  if (pwForm) {
    pwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('pw-status');
      status.textContent = '';
      status.className = 'form-status';

      const current = document.getElementById('current-password').value;
      const next = document.getElementById('new-password').value;
      const confirm = document.getElementById('confirm-password').value;

      if (next.length < 8) {
        showStatus(status, 'New password must be at least 8 characters.', true);
        return;
      }
      if (next !== confirm) {
        showStatus(status, 'New passwords do not match.', true);
        return;
      }

      const btn = pwForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const res = await apiFetch('/api/admin/change-password', {
          method: 'POST',
          body: JSON.stringify({ current_password: current, new_password: next }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Password change failed.');
        showStatus(status, 'Password updated successfully.');
        pwForm.reset();
      } catch (err) {
        showStatus(status, err.message || 'Password change failed.', true);
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- Logout ---------- */
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
    } catch (err) { /* ignore */ }
    window.location.href = '/admin/login';
  });

  /* ---------- Init ---------- */
  (async () => {
    const ok = await checkSession();
    if (ok) await loadAll();
  })();
})();
