const STORAGE_FAVORITES_KEY = 'arcadevault_favorites_v1';
const STORAGE_CUSTOM_GAMES_KEY = 'arcadevault_custom_games_v1';

const state = {
  baseGames: [],
  customGames: [],
  favorites: new Set(loadFavorites()),
  activeCategory: 'All',
  searchQuery: '',
  activeGameId: null,
  isTheater: false,
};

const dom = {
  navLinks: Array.from(document.querySelectorAll('[data-nav-category]')),
  filterTabs: Array.from(document.querySelectorAll('[data-category]')),
  searchInput: document.getElementById('game-search'),
  gamesGrid: document.getElementById('games-grid'),
  catalogCountLabel: document.getElementById('catalog-count-label'),
  catalogEmpty: document.getElementById('catalog-empty'),
  catalogError: document.getElementById('catalog-error'),
  catalogErrorMsg: document.getElementById('catalog-error-msg'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  retryLoadBtn: document.getElementById('retry-load-btn'),

  heroSection: document.getElementById('hero-section'),
  heroPlayFeatured: document.getElementById('hero-play-featured'),
  heroFeaturedLaunch: document.getElementById('hero-featured-launch'),
  heroFeaturedImg: document.getElementById('hero-featured-img'),
  heroFeaturedTitle: document.getElementById('hero-featured-title'),
  heroFeaturedMeta: document.getElementById('hero-featured-meta'),
  randomGameBtn: document.getElementById('random-game-btn'),

  playerStage: document.getElementById('player-stage'),
  stageTitle: document.getElementById('stage-game-title'),
  stageMeta: document.getElementById('stage-game-meta'),
  stageControlsText: document.getElementById('stage-controls-text'),
  stageViewport: document.getElementById('stage-viewport'),
  iframeMount: document.getElementById('iframe-mount'),
  stageFavoriteBtn: document.getElementById('stage-favorite-btn'),
  stageReloadBtn: document.getElementById('stage-reload-btn'),
  stageTheaterBtn: document.getElementById('stage-theater-btn'),
  stageFullscreenBtn: document.getElementById('stage-fullscreen-btn'),
  stageCloseBtn: document.getElementById('stage-close-btn'),
  stageQuickSwitch: document.getElementById('stage-quick-switch'),

  openAddModalBtn: document.getElementById('open-add-modal-btn'),
  addGameDialog: document.getElementById('add-game-dialog'),
  addGameForm: document.getElementById('add-game-form'),
  closeAddDialogBtn: document.getElementById('close-add-dialog'),
  cancelAddDialogBtn: document.getElementById('cancel-add-dialog'),
  newGameTitle: document.getElementById('new-game-title'),
  newGameCategory: document.getElementById('new-game-category'),
  newGameIframe: document.getElementById('new-game-iframe'),
  newGameControls: document.getElementById('new-game-controls'),
  newGameDesc: document.getElementById('new-game-desc'),
  addGameError: document.getElementById('add-game-error'),

  openJsonBtn: document.getElementById('open-json-btn'),
  footerJsonBtn: document.getElementById('footer-json-btn'),
  jsonDialog: document.getElementById('json-dialog'),
  closeJsonDialogBtn: document.getElementById('close-json-dialog'),
  jsonPreviewCode: document.getElementById('json-preview-code'),
  copyJsonBtn: document.getElementById('copy-json-btn'),
  downloadJsonBtn: document.getElementById('download-json-btn'),
};

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify([...state.favorites]));
  } catch {
    // Ignore storage quota errors
  }
}

function loadCustomGames() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_GAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomGames() {
  try {
    localStorage.setItem(STORAGE_CUSTOM_GAMES_KEY, JSON.stringify(state.customGames));
  } catch {
    // Ignore storage quota errors
  }
}

function getAllGames() {
  return [...state.baseGames, ...state.customGames];
}

function sanitizeIframeSrc(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Parses an <iframe> HTML string stored in games.json and builds a safe,
 * validated iframe DOM element ready for mounting.
 */
function buildSafeIframeFromJson(game) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(game.iframe || '', 'text/html');
  const parsedFrame = doc.querySelector('iframe');

  const rawSrc = parsedFrame ? parsedFrame.getAttribute('src') : game.iframeSrc || '';
  const safeSrc = sanitizeIframeSrc(rawSrc);

  if (!safeSrc) {
    return null;
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'active-game-iframe';
  iframe.className = 'game-iframe';
  iframe.src = safeSrc;
  iframe.title = (parsedFrame && parsedFrame.getAttribute('title')) || game.title;
  iframe.setAttribute('allow', (parsedFrame && parsedFrame.getAttribute('allow')) || 'fullscreen');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  return iframe;
}

function setActiveCategory(category) {
  state.activeCategory = category;

  dom.navLinks.forEach((btn) => {
    const isMatch = btn.dataset.navCategory === category;
    btn.classList.toggle('is-active', isMatch);
  });

  dom.filterTabs.forEach((tab) => {
    const isMatch = tab.dataset.category === category;
    tab.classList.toggle('is-active', isMatch);
    tab.setAttribute('aria-selected', String(isMatch));
  });

  renderCatalog();
}

function getFilteredGames() {
  const query = state.searchQuery.trim().toLowerCase();
  return getAllGames().filter((game) => {
    const matchesCategory =
      state.activeCategory === 'All'
        ? true
        : state.activeCategory === 'Favorites'
          ? state.favorites.has(game.id)
          : game.category === state.activeCategory;

    if (!matchesCategory) return false;
    if (!query) return true;

    const haystack = `${game.title} ${game.category} ${game.description || ''}`.toLowerCase();
    return haystack.includes(query);
  });
}

function createCardThumbFallback(game) {
  const fallback = document.createElement('div');
  fallback.className = 'card-thumb-fallback';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '36');
  svg.setAttribute('height', '36');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<rect x="2" y="6" width="20" height="12" rx="4"></rect><path d="M6 12h4"></path><path d="M8 10v4"></path><circle cx="15.5" cy="11" r="1"></circle><circle cx="17.5" cy="13" r="1"></circle>';

  const label = document.createElement('span');
  label.textContent = game.title;

  fallback.append(svg, label);
  return fallback;
}

function renderCatalog() {
  const allGames = getAllGames();
  const filtered = getFilteredGames();
  dom.gamesGrid.innerHTML = '';

  const totalCount = allGames.length;
  dom.catalogCountLabel.textContent =
    filtered.length === totalCount
      ? `${totalCount} ${totalCount === 1 ? 'game' : 'games'} stored in JSON catalog`
      : `Showing ${filtered.length} of ${totalCount} games`;

  if (filtered.length === 0) {
    dom.catalogEmpty.hidden = false;
    return;
  }

  dom.catalogEmpty.hidden = true;

  const fragment = document.createDocumentFragment();
  filtered.forEach((game) => {
    const isPlaying = state.activeGameId === game.id;
    const isFav = state.favorites.has(game.id);

    const card = document.createElement('article');
    card.className = `game-card${isPlaying ? ' is-playing' : ''}`;

    const thumbBtn = document.createElement('button');
    thumbBtn.type = 'button';
    thumbBtn.className = 'card-thumb-btn';
    thumbBtn.setAttribute('aria-label', `Play ${game.title}`);
    thumbBtn.addEventListener('click', () => launchGame(game.id));

    if (game.thumbnail) {
      const img = document.createElement('img');
      img.className = 'card-thumb-img';
      img.src = game.thumbnail;
      img.alt = `${game.title} game artwork`;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        img.replaceWith(createCardThumbFallback(game));
      });
      thumbBtn.appendChild(img);
    } else {
      thumbBtn.appendChild(createCardThumbFallback(game));
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = game.title;
    titleRow.appendChild(title);

    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const metaParts = [game.category, game.players || '1 Player'];
    if (game.isCustom) {
      metaParts.push('Custom Iframe');
    }
    meta.textContent = metaParts.join(' · ');

    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = game.description || 'Ready to play inside an isolated browser iframe.';

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = `${isPlaying ? 'btn-secondary' : 'btn-primary'} card-play-btn`;
    playBtn.textContent = isPlaying ? 'Playing Now' : 'Play Game';
    playBtn.addEventListener('click', () => launchGame(game.id));

    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'icon-btn';
    favBtn.setAttribute('aria-pressed', String(isFav));
    favBtn.setAttribute('aria-label', isFav ? `Remove ${game.title} from favorites` : `Save ${game.title} to favorites`);
    favBtn.innerHTML = isFav
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';
    favBtn.addEventListener('click', () => toggleFavorite(game.id));

    actions.append(playBtn, favBtn);

    if (game.isCustom) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'icon-btn';
      removeBtn.setAttribute('aria-label', `Remove custom game ${game.title}`);
      removeBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>';
      removeBtn.addEventListener('click', () => removeCustomGame(game.id));
      actions.appendChild(removeBtn);
    }

    body.append(titleRow, meta, desc, actions);
    card.append(thumbBtn, body);
    fragment.appendChild(card);
  });

  dom.gamesGrid.appendChild(fragment);
}

function updateHeroFeatured() {
  const games = getAllGames();
  const featured = games.find((g) => g.featured) || games[0];
  if (!featured) return;

  dom.heroFeaturedTitle.textContent = featured.title;
  dom.heroFeaturedMeta.textContent = `${featured.category} · ${featured.players || '1 Player'}`;
  dom.heroPlayFeatured.textContent = `Play Featured: ${featured.title}`;
  if (featured.thumbnail) {
    dom.heroFeaturedImg.src = featured.thumbnail;
    dom.heroFeaturedImg.alt = `${featured.title} featured game artwork`;
  }

  dom.heroPlayFeatured.onclick = () => launchGame(featured.id);
  dom.heroFeaturedLaunch.onclick = () => launchGame(featured.id);
}

function renderStageQuickSwitch() {
  dom.stageQuickSwitch.innerHTML = '';
  const games = getAllGames();
  games.forEach((game) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `quick-switch-btn${game.id === state.activeGameId ? ' is-current' : ''}`;
    btn.textContent = game.title;
    btn.addEventListener('click', () => launchGame(game.id));
    dom.stageQuickSwitch.appendChild(btn);
  });
}

function syncStageFavoriteButton() {
  if (!state.activeGameId) return;
  const isFav = state.favorites.has(state.activeGameId);
  dom.stageFavoriteBtn.setAttribute('aria-pressed', String(isFav));
  dom.stageFavoriteBtn.textContent = isFav ? 'Saved Favorite' : 'Save Favorite';
}

function launchGame(gameId) {
  const game = getAllGames().find((g) => g.id === gameId);
  if (!game) return;

  const iframe = buildSafeIframeFromJson(game);
  if (!iframe) {
    return;
  }

  state.activeGameId = game.id;
  dom.stageTitle.textContent = game.title;
  dom.stageMeta.textContent = `${game.category} · ${game.players || '1 Player'}`;
  dom.stageControlsText.textContent = game.controls || 'Keyboard or Mouse';

  dom.iframeMount.innerHTML = '';
  dom.iframeMount.appendChild(iframe);

  dom.heroSection.hidden = true;
  dom.playerStage.hidden = false;

  syncStageFavoriteButton();
  renderStageQuickSwitch();
  renderCatalog();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  iframe.addEventListener('load', () => {
    try {
      iframe.focus();
    } catch {
      // Ignore cross-origin focus blocks
    }
  });
}

function closeStage() {
  state.activeGameId = null;
  setTheaterMode(false);
  dom.iframeMount.innerHTML = '';
  dom.playerStage.hidden = true;
  dom.heroSection.hidden = false;
  renderCatalog();
}

function reloadActiveGame() {
  if (!state.activeGameId) return;
  const game = getAllGames().find((g) => g.id === state.activeGameId);
  if (!game) return;
  const iframe = buildSafeIframeFromJson(game);
  if (!iframe) return;
  dom.iframeMount.innerHTML = '';
  dom.iframeMount.appendChild(iframe);
}

function setTheaterMode(enabled) {
  state.isTheater = enabled;
  dom.playerStage.classList.toggle('is-theater', enabled);
  dom.stageTheaterBtn.setAttribute('aria-pressed', String(enabled));
  dom.stageTheaterBtn.textContent = enabled ? 'Exit Theater' : 'Theater View';
}

function toggleFavorite(gameId) {
  if (state.favorites.has(gameId)) {
    state.favorites.delete(gameId);
  } else {
    state.favorites.add(gameId);
  }
  saveFavorites();
  syncStageFavoriteButton();
  renderCatalog();
}

function removeCustomGame(gameId) {
  state.customGames = state.customGames.filter((g) => g.id !== gameId);
  saveCustomGames();
  if (state.activeGameId === gameId) {
    closeStage();
  }
  renderCatalog();
}

function openJsonModal() {
  const combined = getAllGames().map(({ isCustom: _ignored, ...rest }) => rest);
  dom.jsonPreviewCode.textContent = JSON.stringify(combined, null, 2);
  dom.copyJsonBtn.textContent = 'Copy JSON';
  dom.jsonDialog.showModal();
}

async function fetchGamesCatalog() {
  dom.catalogError.hidden = true;
  try {
    const response = await fetch('/games.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('games.json must contain a JSON array');
    }
    state.baseGames = data;
    state.customGames = loadCustomGames();
    updateHeroFeatured();
    renderCatalog();
  } catch (err) {
    dom.catalogCountLabel.textContent = 'Catalog unavailable';
    dom.catalogErrorMsg.textContent = `Could not load /games.json (${err instanceof Error ? err.message : 'Network error'}).`;
    dom.catalogError.hidden = false;
  }
}

function wireEvents() {
  dom.navLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveCategory(btn.dataset.navCategory || 'All');
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    });
  });

  dom.filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActiveCategory(tab.dataset.category || 'All');
    });
  });

  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderCatalog();
  });

  dom.resetFiltersBtn.addEventListener('click', () => {
    state.searchQuery = '';
    dom.searchInput.value = '';
    setActiveCategory('All');
  });

  dom.retryLoadBtn.addEventListener('click', () => {
    fetchGamesCatalog();
  });

  dom.randomGameBtn.addEventListener('click', () => {
    const games = getAllGames();
    if (games.length === 0) return;
    const pool = games.length > 1 ? games.filter((g) => g.id !== state.activeGameId) : games;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    launchGame(pick.id);
  });

  dom.stageFavoriteBtn.addEventListener('click', () => {
    if (state.activeGameId) {
      toggleFavorite(state.activeGameId);
    }
  });

  dom.stageReloadBtn.addEventListener('click', reloadActiveGame);
  dom.stageTheaterBtn.addEventListener('click', () => setTheaterMode(!state.isTheater));
  dom.stageCloseBtn.addEventListener('click', closeStage);

  dom.stageFullscreenBtn.addEventListener('click', () => {
    const iframe = document.getElementById('active-game-iframe');
    const target = iframe || dom.stageViewport;
    if (target.requestFullscreen) {
      target.requestFullscreen().catch(() => {});
    }
  });

  // Add Game Modal
  dom.openAddModalBtn.addEventListener('click', () => {
    dom.addGameError.hidden = true;
    dom.addGameForm.reset();
    dom.addGameDialog.showModal();
  });

  const closeAddModal = () => dom.addGameDialog.close();
  dom.closeAddDialogBtn.addEventListener('click', closeAddModal);
  dom.cancelAddDialogBtn.addEventListener('click', closeAddModal);

  dom.addGameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    dom.addGameError.hidden = true;

    const title = dom.newGameTitle.value.trim();
    const category = dom.newGameCategory.value;
    const rawIframeOrUrl = dom.newGameIframe.value.trim();
    const controls = dom.newGameControls.value.trim() || 'Keyboard or Mouse';
    const description = dom.newGameDesc.value.trim() || 'Custom iframe game added to your local catalog.';

    let iframeHtml = '';
    if (rawIframeOrUrl.toLowerCase().includes('<iframe')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawIframeOrUrl, 'text/html');
      const parsed = doc.querySelector('iframe');
      const safeSrc = parsed ? sanitizeIframeSrc(parsed.getAttribute('src')) : null;
      if (!safeSrc) {
        dom.addGameError.textContent = 'Please provide an <iframe> with a valid https:// or /games/ src URL.';
        dom.addGameError.hidden = false;
        return;
      }
      iframeHtml = `<iframe src="${safeSrc}" title="${title.replace(/"/g, '&quot;')}" allow="fullscreen" loading="lazy"></iframe>`;
    } else {
      const safeSrc = sanitizeIframeSrc(rawIframeOrUrl);
      if (!safeSrc) {
        dom.addGameError.textContent = 'Please provide a valid https:// or relative /games/... URL, or a full <iframe> snippet.';
        dom.addGameError.hidden = false;
        return;
      }
      iframeHtml = `<iframe src="${safeSrc}" title="${title.replace(/"/g, '&quot;')}" allow="fullscreen" loading="lazy"></iframe>`;
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'custom-game';

    const newEntry = {
      id: `${slug}-${Date.now().toString(36)}`,
      title,
      category,
      players: '1 Player',
      controls,
      description,
      iframe: iframeHtml,
      isCustom: true,
    };

    state.customGames.push(newEntry);
    saveCustomGames();
    dom.addGameDialog.close();
    renderCatalog();
    launchGame(newEntry.id);
  });

  // JSON Preview Modal
  dom.openJsonBtn.addEventListener('click', openJsonModal);
  dom.footerJsonBtn.addEventListener('click', openJsonModal);
  dom.closeJsonDialogBtn.addEventListener('click', () => dom.jsonDialog.close());

  dom.copyJsonBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(dom.jsonPreviewCode.textContent || '');
      dom.copyJsonBtn.textContent = 'Copied';
    } catch {
      dom.copyJsonBtn.textContent = 'Copy Failed';
    }
  });

  dom.downloadJsonBtn.addEventListener('click', () => {
    const blob = new Blob([dom.jsonPreviewCode.textContent || '[]'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'games.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  // Escape key exits theater mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isTheater) {
      setTheaterMode(false);
    }
  });
}

wireEvents();
fetchGamesCatalog();
