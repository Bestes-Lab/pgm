function getModelsCacheKey() {
  if (typeof window === 'undefined') return '';
  if (window.__PGM_CACHE_KEY__) return String(window.__PGM_CACHE_KEY__);
  try {
    const params = new URLSearchParams(window.location.search);
    return String(params.get('v') || params.get('ver') || params.get('cache') || '');
  } catch (_) {
    return '';
  }
}

function getModelsBaseUrl() {
  if (typeof window === 'undefined') return '';
  const fromWindow = window.__PGM_BASE_URL__;
  if (typeof fromWindow === 'string' && fromWindow.trim()) return fromWindow.trim().replace(/\/+$/, '');
  const meta = document.querySelector('meta[name="pgm-base-url"]');
  const content = meta?.getAttribute('content');
  if (typeof content === 'string' && content.trim()) return content.trim().replace(/\/+$/, '');
  return '';
}

function loadModelsData() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.__PGM_MODELS_DATA_PROMISE__) return window.__PGM_MODELS_DATA_PROMISE__;

  const v = getModelsCacheKey();
  const baseUrl = getModelsBaseUrl();
  const url = `${baseUrl}/models.json` + (v ? `?v=${encodeURIComponent(v)}` : '');

  window.__PGM_MODELS_DATA_PROMISE__ = fetch(url, { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${url}`);
      return r.json();
    })
    .catch((err) => {
      window.__PGM_MODELS_DATA_PROMISE__ = null;
      throw err;
    });

  return window.__PGM_MODELS_DATA_PROMISE__;
}

function setupVersionDetails() {
  const SELECTORS = {
    versionDetails: '#version-details',
    versionLinks: '.version-link',
    versionClose: '#close-version-details',
    versionTitle: '#version-details-title',
    versionContent: '#version-details-content',
    mainSections: 'main > section:not(#version-details)',
    footer: '.site-footer'
  };

  const versionDetailsSection = document.querySelector(SELECTORS.versionDetails);
  if (!versionDetailsSection) return;

  const closeBtn = document.querySelector(SELECTORS.versionClose);
  const titleEl = document.querySelector(SELECTORS.versionTitle);
  const contentEl = document.querySelector(SELECTORS.versionContent);
  const mainSections = document.querySelectorAll(SELECTORS.mainSections);
  const footer = document.querySelector(SELECTORS.footer);

  const showMainSections = (shouldShow) => {
    mainSections.forEach(s => s.hidden = !shouldShow);
  };

  const createPerformanceTable = (performanceData) => {
    if (!performanceData) return '';

    const rows = Object.entries(performanceData).map(([subject, score]) => `
      <tr>
        <th scope="row">${subject}</th>
        <td class="bench-score">${score}</td>
        <td class="bench-bar">
          <div class="progress" role="progressbar" aria-label="${subject} score" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100">
            <span class="progress-fill" style="--p: ${score}%;"></span>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div class="table-wrap" role="region" aria-label="Benchmark table" tabindex="0">
        <table class="bench-table">
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Score</th>
              <th scope="col" class="bench-bar-col">Progress</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  const openVersionDetails = (data) => {
    if (!data || !titleEl || !contentEl) return;

    const statusClass = data.status.toLowerCase().replace(/\s+/g, '-');
    const badge = `<span class="badge ${statusClass}">${data.status}</span>`;
    titleEl.innerHTML = `${data.title}<br>${badge}`;
    contentEl.innerHTML = data.content + createPerformanceTable(data.performance);

    if (footer) footer.hidden = true;
    showMainSections(false);
    versionDetailsSection.hidden = false;

    document.body.classList.add('is-version-details-open');
    versionDetailsSection.classList.remove('is-open');
    requestAnimationFrame(() => {
      versionDetailsSection.classList.add('is-open');
    });

    versionDetailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    versionDetailsSection.querySelector('[data-animate]')?.classList.add('in-view');
  };

  const closeVersionDetails = () => {
    versionDetailsSection.classList.remove('is-open');
    document.body.classList.remove('is-version-details-open');

    setTimeout(() => {
      versionDetailsSection.hidden = true;
      if (footer) footer.hidden = false;
      showMainSections(true);
      const timeline = document.querySelector('#timeline');
      if (timeline) {
        timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 220);
  };

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const link = t.closest(SELECTORS.versionLinks);
    if (!link) return;

    e.preventDefault();

    const versionId = link.getAttribute('data-version');
    if (!versionId) return;

    loadModelsData()
      .then((models) => {
        const data = models?.versions?.[versionId];
        if (!data) return;
        openVersionDetails(data);
      })
      .catch((err) => {
        console.error(err);
      });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeVersionDetails);
  }
}
