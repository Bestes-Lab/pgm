(() => {
  const SELECTORS = {
    header: '.site-header',
    nav: '.nav',
    navToggle: '.nav-toggle',
    navList: '#nav-list',
    navLinks: '.nav-link',
    animateTargets: '[data-animate]',
    year: '#year',
    repliesDrawer: '#replies-drawer',
    repliesBody: '#replies-body',
    repliesClose: '[data-replies-close]',
    repliesTriggers: '.show-replies',
    mainSections: 'main > section',
    footer: '.site-footer'
  };

  function getHeaderOffset() {
    const header = document.querySelector(SELECTORS.header);
    if (!header) return 0;
    return header.getBoundingClientRect().height;
  }

  function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const headerOffset = getHeaderOffset();
    const top = window.scrollY + target.getBoundingClientRect().top - headerOffset + 1;

    window.scrollTo({
      top,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  }

  function setupHeroSpotlight() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (prefersReducedMotion()) return;

    const bg = hero.querySelector('.hero-bg');
    if (!bg) return;

    const heroInner = hero.querySelector('.hero-inner');
    let lastSpotlit = null;

    const splitElementToChars = (el) => {
      if (!el) return null;
      if (el.dataset && el.dataset.splitChars === 'true') {
        return Array.from(el.querySelectorAll('.hero-char'));
      }

      const original = el.textContent ?? '';
      if (el.dataset) {
        el.dataset.originalText = original;
        el.dataset.splitChars = 'true';
      }

      el.textContent = '';
      const chars = Array.from(original);
      chars.forEach((ch) => {
        const span = document.createElement('span');
        span.className = 'hero-char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        el.appendChild(span);
      });

      return Array.from(el.querySelectorAll('.hero-char'));
    };

    const getChars = () => {
      if (!heroInner) return [];
      const targets = heroInner.querySelectorAll(
        '.hero-title, .hero-slogan, .eyebrow, .hero-actions .btn > span, .hero-meta .meta-chip > span'
      );
      const list = [];
      targets.forEach((el) => {
        const chars = splitElementToChars(el);
        if (chars && chars.length) list.push(...chars);
      });
      return list;
    };

    let heroChars = getChars();
    const lastSpotlitChars = new Set();

    const circleIntersectsRect = (cx, cy, r, rect) => {
      const closestX = Math.max(rect.left, Math.min(cx, rect.right));
      const closestY = Math.max(rect.top, Math.min(cy, rect.bottom));
      const dx = cx - closestX;
      const dy = cy - closestY;
      return dx * dx + dy * dy <= r * r;
    };

    const readSpotlightRadius = () => {
      const styles = window.getComputedStyle(bg);
      const radiusRaw = styles.getPropertyValue('--spotlight-radius').trim();
      const scaleRaw = styles.getPropertyValue('--spotlight-bold-scale').trim();
      const radius = Number.parseFloat(radiusRaw) || 240;
      const scale = Number.parseFloat(scaleRaw) || 1;
      return radius * scale;
    };

    let radiusPx = readSpotlightRadius();
    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;

    const applyCharSpotlight = (clientX, clientY) => {
      if (!heroChars || heroChars.length === 0) {
        heroChars = getChars();
      }

      if (!heroChars || heroChars.length === 0) return;

      const keep = new Set();
      heroChars.forEach((span) => {
        const rect = span.getBoundingClientRect();
        if (circleIntersectsRect(clientX, clientY, radiusPx, rect)) {
          keep.add(span);
          if (!lastSpotlitChars.has(span)) {
            span.classList.add('hero-char-spotlit');
          }
        }
      });

      lastSpotlitChars.forEach((span) => {
        if (!keep.has(span)) {
          span.classList.remove('hero-char-spotlit');
          lastSpotlitChars.delete(span);
        }
      });

      keep.forEach((span) => lastSpotlitChars.add(span));
    };

    const update = (clientX, clientY) => {
      const rect = bg.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      bg.style.setProperty('--hx', `${x}px`);
      bg.style.setProperty('--hy', `${y}px`);

      if (heroChars && heroChars.length) {
        pendingX = clientX;
        pendingY = clientY;
        if (!rafId) {
          rafId = window.requestAnimationFrame(() => {
            rafId = 0;
            applyCharSpotlight(pendingX, pendingY);
          });
        }
        return;
      }

      if (!heroInner) return;

      const stack = document.elementsFromPoint(clientX, clientY);
      const target = stack.find((el) => {
        if (!(el instanceof HTMLElement)) return false;
        if (!heroInner.contains(el)) return false;
        return el.matches('h1, h2, h3, p, a, span');
      }) || null;

      if (lastSpotlit && lastSpotlit !== target) {
        lastSpotlit.classList.remove('hero-text-spotlit');
      }
      if (target && target !== lastSpotlit) {
        target.classList.add('hero-text-spotlit');
      }
      lastSpotlit = target;
    };

    hero.addEventListener('mousemove', (e) => update(e.clientX, e.clientY));
    hero.addEventListener('mouseenter', (e) => update(e.clientX, e.clientY));
    window.addEventListener('resize', () => {
      radiusPx = readSpotlightRadius();
    });
    hero.addEventListener('mouseleave', () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }

      lastSpotlitChars.forEach((span) => {
        span.classList.remove('hero-char-spotlit');
      });
      lastSpotlitChars.clear();

      if (lastSpotlit) {
        lastSpotlit.classList.remove('hero-text-spotlit');
        lastSpotlit = null;
      }
    });
  }

  function setupFootnoteTooltips() {
    const closeAll = () => {
      document.querySelectorAll('.footnote-tooltip.is-open').forEach((tip) => {
        tip.classList.remove('is-open');
        tip.hidden = true;
      });
      document.querySelectorAll('.footnote-trigger[aria-expanded="true"]').forEach((btn) => {
        btn.setAttribute('aria-expanded', 'false');
      });
    };

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const btn = t.closest('.footnote-trigger');
      if (!btn) {
        if (t.closest('.footnote-tooltip')) return;
        closeAll();
        return;
      }

      const wrap = btn.closest('.footnote-wrap');
      const tip = wrap?.querySelector('.footnote-tooltip');
      if (!tip) return;

      e.preventDefault();
      e.stopPropagation();

      const willOpen = btn.getAttribute('aria-expanded') !== 'true';
      closeAll();

      if (willOpen) {
        btn.setAttribute('aria-expanded', 'true');
        tip.hidden = false;
        requestAnimationFrame(() => {
          tip.classList.add('is-open');
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  function setupProgressSpotlight() {
    const bars = document.querySelectorAll('.progress');
    if (bars.length === 0) return;

    const update = (bar, clientX, clientY) => {
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      bar.style.setProperty('--mx', `${x}px`);
      bar.style.setProperty('--my', `${y}px`);
    };

    bars.forEach((bar) => {
      bar.addEventListener('mousemove', (e) => update(bar, e.clientX, e.clientY));
      bar.addEventListener('mouseenter', (e) => update(bar, e.clientX, e.clientY));
      bar.addEventListener('mouseleave', () => {
        bar.style.setProperty('--mx', '50%');
        bar.style.setProperty('--my', '50%');
      });
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function setActiveNav(sectionId) {
    const links = document.querySelectorAll(SELECTORS.navLinks);
    links.forEach((a) => {
      const isActive = a.dataset.section === sectionId;
      a.classList.toggle('active', isActive);
      if (isActive) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  function setupSmoothScroll() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const id = href.slice(1);
      const section = document.getElementById(id);
      if (!section) return;

      e.preventDefault();
      setActiveNav(id);
      scrollToSection(id);
      closeMobileNav();
    });

    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest('[data-scroll-to]');
      if (!trigger) return;

      const id = trigger.getAttribute('data-scroll-to');
      if (!id) return;

      e.preventDefault();
      setActiveNav(id);
      scrollToSection(id);
      closeMobileNav();
    });
  }

  function closeMobileNav() {
    const list = document.querySelector(SELECTORS.navList);
    const toggle = document.querySelector(SELECTORS.navToggle);
    if (!list || !toggle) return;

    list.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function setupMobileNav() {
    const toggle = document.querySelector(SELECTORS.navToggle);
    const list = document.querySelector(SELECTORS.navList);
    if (!toggle || !list) return;

    toggle.addEventListener('click', () => {
      const isOpen = list.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileNav();
    });

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(SELECTORS.nav)) return;
      if (list.classList.contains('open')) closeMobileNav();
    });
  }

  function setupActiveSectionTracking() {
    const sections = Array.from(document.querySelectorAll('main section[id]:not(#version-details)'));
    if (sections.length === 0) return;

    const fallback = () => {
      const headerOffset = getHeaderOffset();
      const y = window.scrollY + headerOffset + 4;
      let best = sections[0];

      for (const s of sections) {
        const top = s.offsetTop;
        if (top <= y) best = s;
      }

      setActiveNav(best.id);
    };

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        fallback();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    fallback();

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));

        if (visible.length > 0) {
          setActiveNav(visible[0].target.id);
        }
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5],
        rootMargin: `-${Math.round(getHeaderOffset())}px 0px -60% 0px`
      }
    );

    sections.forEach((s) => observer.observe(s));

    window.addEventListener(
      'resize',
      () => {
        observer.disconnect();
        sections.forEach((s) => observer.observe(s));
        fallback();
      },
      { passive: true }
    );
  }

  function setupFadeInAnimations() {
    const targets = document.querySelectorAll(SELECTORS.animateTargets);
    if (targets.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );

    targets.forEach((el) => io.observe(el));
  }

  function setupFeatureCardSpotlight() {
    const cards = document.querySelectorAll('.feature-card, .stat-card');
    if (cards.length === 0) return;

    let lastPointerDownAt = 0;

    const update = (card, clientX, clientY) => {
      const rect = card.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
    };

    cards.forEach((card) => {
      const isFeatureCard = card.classList.contains('feature-card');
      card.addEventListener('mousemove', (e) => update(card, e.clientX, e.clientY));
      card.addEventListener('mouseenter', (e) => update(card, e.clientX, e.clientY));
      if (isFeatureCard) {
        card.addEventListener('pointerdown', (e) => {
          lastPointerDownAt = Date.now();
          update(card, e.clientX, e.clientY);
        });
        card.addEventListener('focus', () => {
          if (Date.now() - lastPointerDownAt < 350) return;
          card.style.setProperty('--mx', '50%');
          card.style.setProperty('--my', '40%');
        });
      }
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '40%');
      });
    });
  }

  function setupYear() {
    const el = document.querySelector(SELECTORS.year);
    if (!el) return;
    el.textContent = String(new Date().getFullYear());
  }

  function detectColorScheme() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
    };

    apply();

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(apply);
    }
  }

  function setupModals() {
    const triggers = document.querySelectorAll('[data-modal-trigger]');
    if (triggers.length === 0) return;

    const openModal = (modalId) => {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      modal.hidden = false;
      requestAnimationFrame(() => {
        modal.classList.add('is-open');
      });
      document.body.classList.add('is-modal-open');
      
      const closeBtn = modal.querySelector('.modal-close');
      (closeBtn || modal).focus();
    };

    const closeModal = (modal) => {
      if (!modal) return;
      modal.classList.remove('is-open');
      document.body.classList.remove('is-modal-open');

      setTimeout(() => {
        modal.hidden = true;
      }, 210);
    };

    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const modalId = trigger.getAttribute('data-modal-trigger');
        openModal(modalId);
      });
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close')) {
          closeModal(modal);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.is-open').forEach(closeModal);
      }
    });
  }

  function setupRepliesDrawer() {
    const drawer = document.querySelector(SELECTORS.repliesDrawer);
    if (!drawer) return;

    const panel = drawer.querySelector('.replies-panel');
    const body = drawer.querySelector(SELECTORS.repliesBody);

    let lastTrigger = null;
    let pendingTimer = 0;

    const renderLoading = () => {
      if (!body) return;
      body.innerHTML = `
        <div class="replies-state">
          <h3 class="replies-state-title">Loading…</h3>
          <p class="replies-state-text">Loading pgm@Replies…</p>
          <p class="replies-state-sub">pgmEngine@v0.3.1</p>
        </div>
      `;
    };

    const renderPermissionError = () => {
      if (!body) return;
      body.innerHTML = `
        <div class="replies-state">
          <h3 class="replies-state-title">Permission Error</h3>
          <p class="replies-state-text">pgmEngine에 의해 차단된 접근입니다</p>
          <p class="replies-state-sub">pgmEngine@v0.3.1</p>
        </div>
      `;
    };

    const open = (triggerEl) => {
      if (!drawer.hidden) return;
      lastTrigger = triggerEl || null;
      drawer.hidden = false;
      requestAnimationFrame(() => {
        drawer.classList.add('is-open');
      });
      document.body.classList.add('is-replies-open', 'is-modal-open');
      renderLoading();

      if (pendingTimer) window.clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(() => {
        renderPermissionError();
      }, 850);

      const closeBtn = drawer.querySelector(SELECTORS.repliesClose);
      window.setTimeout(() => {
        (closeBtn instanceof HTMLElement ? closeBtn : panel)?.focus?.();
      }, 0);
    };

    const close = () => {
      if (pendingTimer) {
        window.clearTimeout(pendingTimer);
        pendingTimer = 0;
      }

      drawer.classList.remove('is-open');
      document.body.classList.remove('is-replies-open');

      window.setTimeout(() => {
        drawer.hidden = true;
        if (lastTrigger instanceof HTMLElement) lastTrigger.focus();
        lastTrigger = null;
      }, 210);
    };

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const trigger = t.closest(SELECTORS.repliesTriggers);
      if (trigger) {
        e.preventDefault();
        open(trigger);
        return;
      }

      const closeEl = t.closest(SELECTORS.repliesClose);
      if (closeEl && drawer.contains(closeEl)) {
        e.preventDefault();
        close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!drawer.hidden && e.key === 'Escape') close();
    });
  }

  function init() {
    setupYear();
    detectColorScheme();
    setupSmoothScroll();
    setupMobileNav();
    setupActiveSectionTracking();
    setupFadeInAnimations();
    setupFeatureCardSpotlight();
    setupProgressSpotlight();
    setupFootnoteTooltips();
    setupHeroSpotlight();
    setupRepliesDrawer();
    setupModals();
    if (typeof setupVersionDetails === 'function') {
      setupVersionDetails();
    }
    if (typeof setupTimeline === 'function') {
      setupTimeline();
    }

    const initialHash = window.location.hash;
    if (initialHash && initialHash.startsWith('#')) {
      const id = initialHash.slice(1);
      if (document.getElementById(id)) {
        setTimeout(() => scrollToSection(id), 0);
      }
    }
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
