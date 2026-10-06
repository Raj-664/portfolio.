/* ============================================================
   Emamuddin Mallick — Portfolio JS
   ============================================================ */
(function () {
  'use strict';

  const API_BASE =
    window.PORTFOLIO_API_BASE ||
    (location.protocol === 'file:' || /:5500$/.test(location.host)
      ? 'http://127.0.0.1:5000'
      : location.origin);
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
    { name: 'Python', sub: 'Programming · Backend · Web' },
    { name: 'SQL', sub: 'Database · Queries · Data' },
    { name: 'DSA', sub: 'Data Structures · Algorithms · Problem Solving' },
    { name: 'JavaScript', sub: 'Frontend · Web · Interactive' },
    { name: 'API', sub: 'REST API · Flask · Backend' },
    { name: 'PHP', sub: 'Backend · Web · MySQL' },
    { name: 'GitHub', sub: 'Git · Code · Collaboration' }
  ];
  const skillText = document.getElementById('skillCenterText');
  const skillSub = document.querySelector('.skill-center-sub');
  let skillIndex = 0;

  if (skillText) {
    const showSkill = (skill) => {
      skillText.textContent = skill.name;
      if (skillSub) skillSub.textContent = skill.sub;
    };

    showSkill(skills[0]);

    setInterval(() => {
      skillText.classList.add('is-sliding-out');
      if (skillSub) skillSub.classList.add('is-sliding-out');

      setTimeout(() => {
        skillIndex = (skillIndex + 1) % skills.length;
        showSkill(skills[skillIndex]);

        skillText.classList.remove('is-sliding-out');
        if (skillSub) skillSub.classList.remove('is-sliding-out');
        skillText.classList.add('is-sliding-in');
        if (skillSub) skillSub.classList.add('is-sliding-in');

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            skillText.classList.remove('is-sliding-in');
            if (skillSub) skillSub.classList.remove('is-sliding-in');
          });
        });
      }, 350);
    }, 2400);
  }

  /* Public skills are rendered by index.html from the Skills API. */

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


  /* ---------- AI Assistant Chatbot ---------- */
  const aiChat = document.getElementById('ai-chat');
  const aiChatToggle = document.getElementById('ai-chat-toggle');
  const aiChatClose = document.getElementById('ai-chat-close');
  const aiChatPanel = document.getElementById('ai-chat-panel');
  const aiChatMessages = document.getElementById('ai-chat-messages');
  const aiChatForm = document.getElementById('ai-chat-form');
  const aiChatInput = document.getElementById('ai-chat-input');
  const aiChatQuick = document.getElementById('ai-chat-quick');

  function setChatOpen(open) {
    if (!aiChat || !aiChatToggle || !aiChatPanel) return;
    aiChat.classList.toggle('open', open);
    aiChatToggle.setAttribute('aria-expanded', String(open));
    aiChatPanel.setAttribute('aria-hidden', String(!open));
    if (open && aiChatInput) setTimeout(() => aiChatInput.focus(), 180);
  }

  /* ---------- Professional AI response rendering ---------- */
  function installAssistantMarkdownStyles() {
    if (document.getElementById('ai-assistant-pro-styles')) return;
    const style = document.createElement('style');
    style.id = 'ai-assistant-pro-styles';
    style.textContent = `
      .ai-chat-bubble.ai-markdown { line-height: 1.62; }
      .ai-chat-bubble.ai-markdown p { margin: 0 0 .72em; }
      .ai-chat-bubble.ai-markdown p:last-child { margin-bottom: 0; }
      .ai-chat-bubble.ai-markdown h1,
      .ai-chat-bubble.ai-markdown h2,
      .ai-chat-bubble.ai-markdown h3 { margin: .15em 0 .55em; line-height: 1.3; font-size: 1em; }
      .ai-chat-bubble.ai-markdown ul,
      .ai-chat-bubble.ai-markdown ol { margin: .35em 0 .75em 1.25em; padding: 0; }
      .ai-chat-bubble.ai-markdown li { margin: .25em 0; }
      .ai-chat-bubble.ai-markdown code { padding: .12em .35em; border-radius: 5px; font-size: .9em; background: rgba(255,255,255,.09); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
      .ai-chat-bubble.ai-markdown pre { margin: .7em 0; padding: .75em; overflow-x: auto; border-radius: 9px; background: rgba(0,0,0,.28); border: 1px solid rgba(255,255,255,.10); }
      .ai-chat-bubble.ai-markdown pre code { padding: 0; background: transparent; white-space: pre; display: block; }
      .ai-chat-bubble.ai-markdown a { text-decoration: underline; word-break: break-word; }
      .ai-chat-bubble.ai-markdown blockquote { margin: .6em 0; padding-left: .8em; border-left: 3px solid currentColor; opacity: .9; }
    `;
    document.head.appendChild(style);
  }

  function renderAssistantMarkdown(source) {
    installAssistantMarkdownStyles();
    const text = String(source == null ? '' : source).replace(/\r\n?/g, '\n').trim();
    let safe = escapeHtml(text);
    const codeBlocks = [];
    safe = safe.replace(/```([\w+#.-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const index = codeBlocks.length;
      codeBlocks.push(`<pre><code>${code.trimEnd()}</code></pre>`);
      return `@@AICODE${index}@@`;
    });
    const lines = safe.split('\n');
    const out = [];
    let paragraph = [];
    let listType = null;
    const inline = (value) => {
      let s = value;
      const inlineCode = [];
      s = s.replace(/`([^`\n]+)`/g, (_, code) => { const i = inlineCode.length; inlineCode.push(`<code>${code}</code>`); return `@@AICINLINE${i}@@`; });
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
      s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
      s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
      return s.replace(/@@AICINLINE(\d+)@@/g, (_, i) => inlineCode[Number(i)] || '');
    };
    const flushParagraph = () => { if (!paragraph.length) return; out.push(`<p>${inline(paragraph.join('<br>'))}</p>`); paragraph = []; };
    const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) { flushParagraph(); closeList(); return; }
      const codeMatch = trimmed.match(/^@@AICODE(\d+)@@$/);
      if (codeMatch) { flushParagraph(); closeList(); out.push(codeBlocks[Number(codeMatch[1])] || ''); return; }
      const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (heading) { flushParagraph(); closeList(); const level = Math.min(3, heading[0].match(/^#+/)[0].length); out.push(`<h${level}>${inline(heading[1])}</h${level}>`); return; }
      const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bullet) { flushParagraph(); if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; } out.push(`<li>${inline(bullet[1])}</li>`); return; }
      const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) { flushParagraph(); if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; } out.push(`<li>${inline(numbered[1])}</li>`); return; }
      if (trimmed.startsWith('> ')) { flushParagraph(); closeList(); out.push(`<blockquote>${inline(trimmed.slice(2))}</blockquote>`); return; }
      closeList(); paragraph.push(trimmed);
    });
    flushParagraph(); closeList();
    return out.join('') || '<p>I could not generate a response.</p>';
  }

  function addChatMessage(text, type) {
    if (!aiChatMessages) return;
    const row = document.createElement('div');
    row.className = `ai-chat-message ${type}`;
    const bubble = document.createElement('div');
    bubble.className = `ai-chat-bubble${type === 'bot' ? ' ai-markdown' : ''}`;
    if (type === 'bot') bubble.innerHTML = renderAssistantMarkdown(text);
    else bubble.textContent = text;
    row.appendChild(bubble);
    aiChatMessages.appendChild(row);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  }

  function demoAssistantReply(message) {
    const q = String(message || '').toLowerCase();

    if (q.includes('project')) {
      return 'Emamuddin has built AI, web and examination projects. You can open the Projects section to see the current projects, technologies, GitHub links and live demos.';
    }
    if (q.includes('skill') || q.includes('technology') || q.includes('tech')) {
      return 'The portfolio currently covers programming, frontend, backend, database and tools. The Skills section is connected to the portfolio API, so your admin updates can appear there.';
    }
    if (q.includes('education') || q.includes('mca') || q.includes('bca')) {
      return 'Emamuddin is pursuing an MCA at Techno India University and completed a BCA at Burdwan Raj College.';
    }
    if (q.includes('experience') || q.includes('internship') || q.includes('work')) {
      return 'You can find the current work experience in the Experience section of the portfolio.';
    }
    if (q.includes('contact') || q.includes('email') || q.includes('hire')) {
      return 'You can contact Emamuddin through the Contact section, email, LinkedIn or GitHub.';
    }

    return 'I can help visitors learn about Emamuddin, including projects, skills, education and experience. Try one of the quick questions below.';
  }

  let assistantInteractionId = null;
  let assistantBusy = false;

  async function handleChatMessage(message) {
    const clean = String(message || '').trim();
    if (!clean || assistantBusy) return;

    addChatMessage(clean, 'user');
    assistantBusy = true;

    const sendButton = aiChatForm ? aiChatForm.querySelector('button[type="submit"]') : null;
    if (sendButton) sendButton.disabled = true;

    const thinkingRow = document.createElement('div');
    thinkingRow.className = 'ai-chat-message bot';
    thinkingRow.innerHTML = '<div class="ai-chat-bubble ai-markdown"><p>Thinking…</p></div>';
    if (aiChatMessages) {
      aiChatMessages.appendChild(thinkingRow);
      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }

    try {
      const res = await fetch(`${API_BASE}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          previous_interaction_id: assistantInteractionId
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Assistant is unavailable right now.');
      }

      assistantInteractionId = data.interaction_id || assistantInteractionId;

      if (thinkingRow.parentNode) thinkingRow.remove();
      addChatMessage(data.reply || 'I could not generate a response.', 'bot');
    } catch (err) {
      if (thinkingRow.parentNode) thinkingRow.remove();
      console.error('AI assistant error:', err);

      // Keep a useful local fallback if the AI service is not configured.
      addChatMessage(
        err.message || demoAssistantReply(clean),
        'bot'
      );
    } finally {
      assistantBusy = false;
      if (sendButton) sendButton.disabled = false;
    }
  }

  if (aiChatToggle) {
    aiChatToggle.addEventListener('click', () => {
      const isOpen = aiChat && aiChat.classList.contains('open');
      setChatOpen(!isOpen);
    });
  }

  if (aiChatClose) aiChatClose.addEventListener('click', () => setChatOpen(false));

  if (aiChatForm) {
    aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = aiChatInput ? aiChatInput.value.trim() : '';
      if (!message) return;
      if (aiChatInput) aiChatInput.value = '';
      handleChatMessage(message);
    });
  }

  if (aiChatQuick) {
    aiChatQuick.querySelectorAll('[data-chat-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        handleChatMessage(button.dataset.chatPrompt || '');
      });
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aiChat && aiChat.classList.contains('open')) {
      setChatOpen(false);
    }
  });

  /* ---------- Init ---------- */
  loadProjects();
  loadCertificates();
})();
