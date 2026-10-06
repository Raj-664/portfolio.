/* ============================================================
   Emamuddin Mallick — Admin panel JS
   ============================================================ */
(function () {
  'use strict';

  const API_BASE = (window.API_BASE || '').replace(/\/$/, '');
  let csrf = null;
  let projects = [];
  let certificates = [];
  let skills = [];
  let experiences = [];

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

  /* ---------- Password visibility ---------- */
  document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
    const input = document.getElementById(toggle.dataset.passwordToggle);
    if (!input) return;

    toggle.addEventListener('click', () => {
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      toggle.classList.toggle('is-visible', !isVisible);
      toggle.setAttribute('aria-pressed', String(!isVisible));
      toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
      toggle.setAttribute('title', isVisible ? 'Show password' : 'Hide password');
    });
  });

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
     FORGOT PASSWORD PAGE
     ============================================================ */
  const forgotForm = document.getElementById('forgot-password-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const status = document.getElementById('forgot-status');
      const btn = document.getElementById('forgot-btn');

      const username = document.getElementById('forgot-username').value.trim();
      const recoveryKey = document.getElementById('recovery-key').value;
      const nextPassword = document.getElementById('forgot-new-password').value;
      const confirmPassword = document.getElementById('forgot-confirm-password').value;

      status.textContent = '';
      status.className = 'form-status';

      if (!username || !recoveryKey || !nextPassword || !confirmPassword) {
        showStatus(status, 'Please complete all fields.', true);
        return;
      }

      if (nextPassword.length < 8) {
        showStatus(status, 'New password must be at least 8 characters.', true);
        return;
      }

      if (nextPassword !== confirmPassword) {
        showStatus(status, 'New passwords do not match.', true);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Resetting...';

      try {
        const res = await fetch(API_BASE + '/api/admin/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            recovery_key: recoveryKey,
            new_password: nextPassword
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Password reset failed.');

        showStatus(status, data.message || 'Password reset successfully. Redirecting to login...');
        forgotForm.reset();
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 900);
      } catch (err) {
        showStatus(status, err.message || 'Password reset failed. Please try again.', true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Reset Password';
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
  const titles = {
    dashboard: 'Dashboard',
    projects: 'Projects',
    skills: 'Skills',
    experience: 'Experience',
    certificates: 'Certificates',
    resume: 'Resume',
    account: 'Account'
  };

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
    const projectStat = document.getElementById('stat-projects');
    const techStat = document.getElementById('stat-technologies');
    const certStat = document.getElementById('stat-certificates');

    if (projectStat) projectStat.textContent = projects.length;

    const technologySet = new Set();
    projects.forEach((project) => {
      (project.technologies || []).forEach((technology) => {
        const value = String(technology || '').trim();
        if (value) technologySet.add(value.toLowerCase());
      });
    });
    if (techStat) techStat.textContent = technologySet.size;
    if (certStat) certStat.textContent = certificates.length;

    const recentP = document.getElementById('recent-projects');
    const recentC = document.getElementById('recent-certificates');

    if (recentP) {
      recentP.innerHTML = projects.slice(0, 5).map((p) =>
        `<li><span class="dash-item-title">${escapeHtml(p.title)}</span><span class="dash-item-meta">${escapeHtml(p.category || '')}</span></li>`
      ).join('') || '<li class="empty-note">No projects yet.</li>';
    }

    if (recentC) {
      recentC.innerHTML = certificates.slice(0, 5).map((c) =>
        `<li><span class="dash-item-title">${escapeHtml(c.title)}</span><span class="dash-item-meta">${escapeHtml(c.date || '')}</span></li>`
      ).join('') || '<li class="empty-note">No certificates yet.</li>';
    }
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

  /* ---------- Skills table ---------- */
  function renderSkillsTable() {
    const body = document.getElementById('skills-table-body');
    const empty = document.getElementById('skills-table-empty');
    if (!body || !empty) return;

    body.innerHTML = skills.map((skill) => `
      <tr>
        <td class="table-title">${escapeHtml(skill.name || skill.title || '')}</td>
        <td>${escapeHtml(skill.category || '—')}</td>
        <td>${escapeHtml(skill.level || '—')}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-edit-skill="${skill.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete-skill="${skill.id}">Delete</button>
          </div>
        </td>
      </tr>`).join('');
    empty.hidden = skills.length > 0;
  }

  /* ---------- Experience table ---------- */
  function renderExperienceTable() {
    const body = document.getElementById('experience-table-body');
    const empty = document.getElementById('experience-table-empty');
    if (!body || !empty) return;

    body.innerHTML = experiences.map((item) => {
      const period = [item.start_date || item.start, item.end_date || item.end]
        .filter(Boolean)
        .join(' — ');

      return `
      <tr>
        <td class="table-title">${escapeHtml(item.role || item.title || '')}</td>
        <td>${escapeHtml(item.company || '—')}</td>
        <td>${escapeHtml(period || '—')}</td>
        <td class="col-actions">
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-edit-experience="${item.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete-experience="${item.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    empty.hidden = experiences.length > 0;
  }

  async function loadOptionalCollection(url) {
    try {
      const res = await apiFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.warn(`Could not load ${url}:`, err);
      return [];
    }
  }

  async function loadAll() {
    try {
      const [pRes, cRes, sData, eData] = await Promise.all([
        apiFetch('/api/projects'),
        apiFetch('/api/certificates'),
        loadOptionalCollection('/api/skills'),
        loadOptionalCollection('/api/experience')
      ]);

      if (!pRes.ok) throw new Error('Could not load projects.');
      if (!cRes.ok) throw new Error('Could not load certificates.');

      projects = await pRes.json();
      certificates = await cRes.json();
      skills = sData;
      experiences = eData;
    } catch (err) {
      console.error('Load failed:', err);
    }

    renderDashboard();
    renderProjectsTable();
    renderCertsTable();
    renderSkillsTable();
    renderExperienceTable();
    await loadResumeInfo();
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

  /* ---------- Skills add/edit ---------- */
  const skillForm = document.getElementById('skill-form');
  const skillModalTitle = document.getElementById('skill-modal-title');

  if (skillForm) {
    document.getElementById('add-skill-btn').addEventListener('click', () => {
      skillForm.reset();
      document.getElementById('skill-id').value = '';
      document.getElementById('skill-form-status').textContent = '';
      document.getElementById('skill-form-status').className = 'form-status';
      skillModalTitle.textContent = 'Add Skill';
      document.getElementById('skill-submit').textContent = 'Save Skill';
      openModal('skill-modal');
    });

    document.getElementById('skills-table-body').addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-skill]');
      if (!editBtn) return;

      const skill = skills.find((x) => x.id === Number(editBtn.dataset.editSkill));
      if (!skill) return;

      skillForm.reset();
      document.getElementById('skill-id').value = skill.id;
      document.getElementById('s-name').value = skill.name || skill.title || '';
      document.getElementById('s-category').value = skill.category || '';
      document.getElementById('s-level').value = skill.level || '';
      document.getElementById('skill-form-status').textContent = '';
      document.getElementById('skill-form-status').className = 'form-status';
      skillModalTitle.textContent = 'Edit Skill';
      document.getElementById('skill-submit').textContent = 'Update Skill';
      openModal('skill-modal');
    });

    skillForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('skill-form-status');
      status.textContent = '';
      status.className = 'form-status';

      const id = document.getElementById('skill-id').value;
      const name = document.getElementById('s-name').value.trim();
      if (!name) {
        showStatus(status, 'Skill name is required.', true);
        return;
      }

      const payload = {
        name,
        category: document.getElementById('s-category').value.trim(),
        level: document.getElementById('s-level').value.trim()
      };

      const submitBtn = document.getElementById('skill-submit');
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';

      try {
        const res = await apiFetch(id ? `/api/skills/${id}` : '/api/skills', {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Save failed.');

        closeModal('skill-modal');
        await loadAll();
      } catch (err) {
        showStatus(status, err.message || 'Save failed. Please try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }

  /* ---------- Experience add/edit ---------- */
  const experienceForm = document.getElementById('experience-form');
  const experienceModalTitle = document.getElementById('experience-modal-title');

  if (experienceForm) {
    document.getElementById('add-experience-btn').addEventListener('click', () => {
      experienceForm.reset();
      document.getElementById('experience-id').value = '';
      document.getElementById('experience-form-status').textContent = '';
      document.getElementById('experience-form-status').className = 'form-status';
      experienceModalTitle.textContent = 'Add Experience';
      document.getElementById('experience-submit').textContent = 'Save Experience';
      openModal('experience-modal');
    });

    document.getElementById('experience-table-body').addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-experience]');
      if (!editBtn) return;

      const item = experiences.find((x) => x.id === Number(editBtn.dataset.editExperience));
      if (!item) return;

      experienceForm.reset();
      document.getElementById('experience-id').value = item.id;
      document.getElementById('e-role').value = item.role || item.title || '';
      document.getElementById('e-company').value = item.company || '';
      document.getElementById('e-start').value = item.start_date || item.start || '';
      document.getElementById('e-end').value = item.end_date || item.end || '';
      document.getElementById('e-description').value = item.description || '';
      document.getElementById('experience-form-status').textContent = '';
      document.getElementById('experience-form-status').className = 'form-status';
      experienceModalTitle.textContent = 'Edit Experience';
      document.getElementById('experience-submit').textContent = 'Update Experience';
      openModal('experience-modal');
    });

    experienceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('experience-form-status');
      status.textContent = '';
      status.className = 'form-status';

      const id = document.getElementById('experience-id').value;
      const role = document.getElementById('e-role').value.trim();
      const company = document.getElementById('e-company').value.trim();

      if (!role || !company) {
        showStatus(status, 'Role and company are required.', true);
        return;
      }

      const payload = {
        role,
        company,
        start_date: document.getElementById('e-start').value.trim(),
        end_date: document.getElementById('e-end').value.trim(),
        description: document.getElementById('e-description').value.trim()
      };

      const submitBtn = document.getElementById('experience-submit');
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';

      try {
        const res = await apiFetch(id ? `/api/experience/${id}` : '/api/experience', {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Save failed.');

        closeModal('experience-modal');
        await loadAll();
      } catch (err) {
        showStatus(status, err.message || 'Save failed. Please try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }

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

  /* ---------- Resume ---------- */
  async function loadResumeInfo() {
    const nameEl = document.getElementById('resume-current-name');
    if (!nameEl) return;

    try {
      const res = await apiFetch('/api/admin/resume');
      if (!res.ok) {
        nameEl.textContent = 'Upload your latest resume PDF. The newest uploaded resume will be used by the public portfolio.';
        return;
      }

      const data = await res.json();
      if (data.filename || data.url) {
        nameEl.textContent = `Current resume: ${data.filename || 'Uploaded resume'}`;
      }
    } catch (err) {
      console.warn('Could not load resume information:', err);
    }
  }

  const updateResumeBtn = document.getElementById('update-resume-btn');
  const resumeForm = document.getElementById('resume-form');

  if (updateResumeBtn && resumeForm) {
    updateResumeBtn.addEventListener('click', () => {
      resumeForm.reset();
      const status = document.getElementById('resume-form-status');
      status.textContent = '';
      status.className = 'form-status';
      openModal('resume-modal');
    });

    resumeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const status = document.getElementById('resume-form-status');
      const fileInput = document.getElementById('resume-file');
      const file = fileInput.files && fileInput.files[0];

      status.textContent = '';
      status.className = 'form-status';

      if (!file) {
        showStatus(status, 'Please select a resume PDF.', true);
        return;
      }

      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showStatus(status, 'Only PDF resumes are allowed.', true);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        showStatus(status, 'Resume must be 10 MB or smaller.', true);
        return;
      }

      const fd = new FormData();
      fd.append('resume', file);

      const submitBtn = document.getElementById('resume-submit');
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Uploading...';

      try {
        const res = await apiFetch('/api/admin/resume', {
          method: 'POST',
          body: fd
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Resume upload failed.');

        closeModal('resume-modal');
        showStatus(document.getElementById('resume-status'), data.message || 'Resume updated successfully.');
        await loadResumeInfo();
      } catch (err) {
        showStatus(status, err.message || 'Resume upload failed. Please try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }

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


  document.getElementById('skills-table-body').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete-skill]');
    if (!del) return;
    const skill = skills.find((x) => x.id === Number(del.dataset.deleteSkill));
    if (!skill) return;

    const name = skill.name || skill.title || 'this skill';
    askDelete('Delete Skill', `Delete "${name}"? This cannot be undone.`, () => {
      return apiFetch(`/api/skills/${skill.id}`, { method: 'DELETE' });
    });
  });

  document.getElementById('experience-table-body').addEventListener('click', (e) => {
    const del = e.target.closest('[data-delete-experience]');
    if (!del) return;
    const item = experiences.find((x) => x.id === Number(del.dataset.deleteExperience));
    if (!item) return;

    const role = item.role || item.title || 'this experience';
    askDelete('Delete Experience', `Delete "${role}"? This cannot be undone.`, () => {
      return apiFetch(`/api/experience/${item.id}`, { method: 'DELETE' });
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
