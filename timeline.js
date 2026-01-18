function setupTimeline() {
  const SELECTORS = {
    navLinks: '.nav-link',
    timelineList: 'ol.timeline'
  };

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

  function getIconSvg(icon) {
    if (icon === 'edit') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path fill="currentColor" d="M12.9 6.858l4.242 4.243L7.242 21H3v-4.243l9.9-9.9zm1.414-1.414l2.121-2.122a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414l-2.122 2.121-4.242-4.242z"/></svg>';
    }
    if (icon === 'comment') {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z" /><path fill="currentColor" d="M6.455 19L2 22.5V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.455zM7 10v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z" /></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path fill="currentColor" d="M12 13H4v-2h8V4l8 8-8 8z"/></svg>';
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderTimelineItem(item) {
    const iconClass = item.iconStyle === 'filled' ? 'filled-icon' : 'faded-icon';
    const extraClass = item.extraClass ? ` ${item.extraClass}` : '';

    if (item.type === 'comment') {
      const repliesCount = Number(item.repliesCount || 0);
      const repliesText = repliesCount ? `Show ${repliesCount} replies` : 'Show replies';
      return `
          <li class="timeline-item${extraClass}">
            <span class="timeline-item-icon ${iconClass}" aria-hidden="true">
              ${getIconSvg(item.icon)}
            </span>
            <div class="timeline-item-wrapper">
              <div class="timeline-item-description">
                <i class="avatar small">
                  <img src="${escapeAttr(item.author?.avatar || '')}" alt="Avatar of ${escapeAttr(item.author?.name || '')}" />
                </i>
                <span><a href="${escapeAttr(item.author?.url || '#')}" target="_blank" rel="noopener noreferrer">${item.author?.name || ''}</a> commented on <time datetime="${escapeAttr(item.date?.iso || '')}">${item.date?.label || ''}</time></span>
              </div>
              <div class="comment">
                ${item.commentHtml || ''}
              </div>
              <button class="show-replies" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M15 11l4 4l-4 4m4 -4h-11a4 4 0 0 1 0 -8h1" />
                </svg>
                ${repliesText}
              </button>
            </div>
          </li>
      `;
    }

    const extraText = item.extraText ? ` ${item.extraText}` : '';
    return `
          <li class="timeline-item${extraClass}">
            <span class="timeline-item-icon ${iconClass}" aria-hidden="true">
              ${getIconSvg(item.icon)}
            </span>
            <div class="timeline-item-description">
              <i class="avatar small">
                <img src="${escapeAttr(item.author?.avatar || '')}" alt="Avatar of ${escapeAttr(item.author?.name || '')}" />
              </i>
              <span><a href="${escapeAttr(item.author?.url || '#')}" target="_blank" rel="noopener noreferrer">${item.author?.name || ''}</a> ${item.action || ''} <a href="#" class="version-link" data-version="${escapeAttr(item.versionId || '')}">${item.versionLabel || ''}</a>${extraText} on <time datetime="${escapeAttr(item.date?.iso || '')}">${item.date?.label || ''}</time></span>
            </div>
          </li>
    `;
  }

  function renderTimelineFromModels() {
    const list = document.querySelector(SELECTORS.timelineList);
    if (!list) return Promise.resolve();

    return loadModelsData()
      .then((models) => {
        const items = Array.isArray(models?.timeline) ? models.timeline : [];
        list.innerHTML = items.map(renderTimelineItem).join('');
      })
      .catch((err) => {
        console.error(err);
      });
  }

  renderTimelineFromModels();
}
