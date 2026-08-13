/* ============================================================
   Emamuddin Mallick — Portfolio JS
   ============================================================ */
(function () {
  'use strict';

  const API_BASE = (window.API_BASE || '').replace(/\/$/, '');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, '&#96;');
  }

  /* ---------- Navbar scroll state ---------- */
  const navbar = document.getElementById('navbar');
  const onScrollNav = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- Side menu (hamburger) ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const sideMenu = document.getElementById('side-menu');
  const sideOverlay = document.getElementById('side-overlay');
  const sideClose = document.getElementById('side-close');

  function openMenu() {
    sideMenu.classList.add('open');
    sideOverlay.classList.add('open');
    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    sideMenu.setAttribute('aria-hidden', 'false');
    sideOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    sideMenu.classList.remove('open');
    sideOverlay.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    sideMenu.setAttribute('aria-hidden', 'true');
    sideOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', () => {
    sideMenu.classList.contains('open') ? closeMenu() : openMenu();
  });
  sideClose.addEventListener('click', closeMenu);
  sideOverlay.addEventListener('click', closeMenu);
  sideMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- Active nav link highlighting ---------- */
  const sections = document.querySelectorAll('main section[id]');
  const navAnchors = Array.from(document.querySelectorAll('#nav-links a[href^="#"]'));

  const spy = () => {
    const pos = window.scrollY + 140;
    let current = '';
    sections.forEach((sec) => {
      if (pos >= sec.offsetTop) current = sec.id;
    });
    navAnchors.forEach((a) => {
      const on = a.getAttribute('href') === '#' + current;
      a.classList.toggle('active', on);
    });
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
    window.__revealIO = io;
  }

  /* ---------- Rotating skill circle ---------- */
  const skills = [
    'Python', 'Flask', 'SQL', 'HTML', 'CSS', 'JavaScript',
    'Git', 'GitHub', 'REST API', 'MySQL', 'Java', 'C'
  ];
  const skillText = document.getElementById('skillCenterText');
  let skillIndex = 0;

  if (skillText) {
    if (reduceMotion) {
      skillText.textContent = skills[0];
    } else {
      setInterval(() => {
        skillText.classList.add('is-fading');
        setTimeout(() => {
          skillIndex = (skillIndex + 1) % skills.length;
          skillText.textContent = skills[skillIndex];
          requestAnimationFrame(() => skillText.classList.remove('is-fading'));
        }, 320);
      }, 2400);
    }
  }

  /* ---------- Projects ---------- */
  const projectsGrid = document.getElementById('projects-grid');
  const projectsEmpty = document.getElementById('projects-empty');
  const filtersBar = document.getElementById('project-filters');
  const projectModal = document.getElementById('project-modal');
  const modalContent = document.getElementById('modal-content');
  let allProjects = [];

  const PDF_ICON =
    '<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/><path d="M9 11h2"/></svg>';

  function projectCardHTML(p) {
    const tags = (p.technologies || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('');
    const image = p.image_url
      ? `<div class="project-img" style="background-image:url('${escapeAttr(p.image_url)}')">`
      : `<div class="project-img placeholder"><span>${escapeHtml((p.title || 'P').charAt(0))}</span>`;
    const cat = p.category ? `<span class="project-cat">${escapeHtml(p.category)}</span>` : '';
    const github = p.github_url
      ? `<a href="${escapeAttr(p.github_url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">GitHub</a>`
      : '';
    const demo = p.demo_url
      ? `<a href="${escapeAttr(p.demo_url)}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">Live Demo</a>`
      : '';
    const details = `<button type="button" class="btn btn-sm btn-ghost" data-project-id="${p.id}">Details</button>`;

    return `
      <article class="project-card reveal" data-category="${escapeAttr(p.category || '')}">
        ${image}
          ${cat}
        </div>
        <div class="project-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="project-desc">${escapeHtml(p.description || '')}</p>
          <div class="project-tags">${tags}</div>
          <div class="project-actions">${github}${demo}${details}</div>
        </div>
      </article>`;
  }

  function observeReveals() {
    if (reduceMotion || !window.__revealIO) return;
    document.querySelectorAll('.reveal:not(.visible)').forEach((el) => window.__revealIO.observe(el));
  }

  function renderProjects() {
    if (!projectsGrid) return;
    projectsGrid.innerHTML = allProjects.map(projectCardHTML).join('');
    projectsEmpty.hidden = allProjects.length > 0;
    observeReveals();
  }

  function renderFilters() {
    if (!filtersBar) return;
    const cats = ['All', ...new Set(allProjects.map((p) => p.category).filter(Boolean))];
    filtersBar.innerHTML = cats
      .map((c, i) => `<button type="button" class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${escapeAttr(c)}">${escapeHtml(c)}</button>`)
      .join('');

    filtersBar.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        filtersBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        document.querySelectorAll('.project-card').forEach((card) => {
          const match = f === 'All' || card.dataset.category === f;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  }

  async function loadProjects() {
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (!res.ok) throw new Error('Failed to load projects');
      allProjects = await res.json();
    } catch (err) {
      console.error('Projects load error:', err);
      allProjects = [];
      if (projectsEmpty) projectsEmpty.textContent = 'Projects could not be loaded right now.';
    }
    renderProjects();
    renderFilters();
  }

  /* ---------- Project details modal ---------- */
  function openModal(project) {
    if (!project) return;
    const tags = (project.technologies || []).map((t) => `<span class="project-tags-item">${escapeHtml(t)}</span>`).join('');

    modalContent.innerHTML = `
      <div class="modal-body">
        <span class="modal-cat">${escapeHtml(project.category || 'Project')}</span>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description || 'No description available.')}</p>
        <div class="project-tags">${tags}</div>
        <div class="modal-actions">
          ${project.github_url ? `<a href="${escapeAttr(project.github_url)}" target="_blank" rel="noopener" class="btn btn-outline">GitHub Repository</a>` : ''}
          ${project.demo_url ? `<a href="${escapeAttr(project.demo_url)}" target="_blank" rel="noopener" class="btn btn-primary">Live Demo</a>` : ''}
        </div>
      </div>`;
    projectModal.classList.add('open');
    projectModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    projectModal.classList.remove('open');
    projectModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  projectsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-project-id]');
    if (!btn) return;
    const id = Number(btn.dataset.projectId);
    const project = allProjects.find((p) => p.id === id);
    openModal(project);
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* ---------- Certificates ---------- */
  const certGrid = document.getElementById('cert-grid');
  const certEmpty = document.getElementById('cert-empty');

  function certCardHTML(c) {
    const isPdf = (c.file_url || '').toLowerCase().endsWith('.pdf');
    const preview = isPdf
      ? `<div class="cert-preview pdf"><div class="cert-pdf-badge">${PDF_ICON}<span>PDF Certificate</span></div></div>`
      : `<div class="cert-preview" style="background-image:url('${escapeAttr(c.file_url)}')"></div>`;

    return `
      <article class="cert-card reveal">
        ${preview}
        <div class="cert-body">
          <h3>${escapeHtml(c.title)}</h3>
          <span class="cert-org">${escapeHtml(c.organization || '')}</span>
          <span class="cert-date">${escapeHtml(c.date || '')}</span>
          <div class="cert-actions">
            <a href="${escapeAttr(c.file_url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">View Certificate</a>
            <a href="${escapeAttr(c.file_url)}" download class="btn btn-sm btn-primary">Download</a>
          </div>
        </div>
      </article>`;
  }

  async function loadCertificates() {
    if (!certGrid) return;
    try {
      const res = await fetch(`${API_BASE}/api/certificates`);
      if (!res.ok) throw new Error('Failed to load certificates');
      const certs = await res.json();
      certGrid.innerHTML = certs.map(certCardHTML).join('');
      certEmpty.hidden = certs.length > 0;
      observeReveals();
    } catch (err) {
      console.error('Certificates load error:', err);
      certGrid.innerHTML = '';
      certEmpty.hidden = false;
      certEmpty.textContent = 'Certificates could not be loaded right now.';
    }
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Contact form ---------- */
  const form = document.getElementById('contact-form');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.textContent = '';
      statusEl.className = 'form-status';

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const subject = form.subject.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !subject || !message) {
        statusEl.textContent = 'Please fill in all fields.';
        statusEl.classList.add('error');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        statusEl.textContent = 'Please enter a valid email address.';
        statusEl.classList.add('error');
        return;
      }

      const original = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const res = await fetch(`${API_BASE}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong.');
        statusEl.textContent = 'Thanks! Your message has been sent.';
        statusEl.classList.add('success');
        form.reset();
      } catch (err) {
        statusEl.textContent = err.message || 'Failed to send. Please try again or email me directly.';
        statusEl.classList.add('error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }

  /* ---------- Init ---------- */
  loadProjects();
  loadCertificates();
})();
