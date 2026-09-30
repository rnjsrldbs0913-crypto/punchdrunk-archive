/* Archive feature module: createNavigation. No build step is required. */
(() => {
  const archive = window.PD_ARCHIVE = window.PD_ARCHIVE || {};
  archive.createNavigation = function ({
    albums, app, state, FORMAT_ALL,
    GENRE_ALL, STANDARD_GENRES, HOME_SECTIONS, CUSTOMER_FEATURES,
    normalize, getArtistKey, getAlbumDecade, getWeeklyAlbum,
    renderHome, renderDetail, setHomeSection, revealPersistentHomeView,
    finishHomeSectionMotion, animateDirectCoverIntoDetail, animateCoverIntoDetail, view,
  }) {
    const BROWSE_SORTS = new Set(['default', 'newest', 'oldest', 'artist', 'title']);
    const BROWSE_URL_KEYS = ['q', 'artist', 'format', 'genre', 'sort', 'decade', 'recent', 'section', 'page'];

    function readBrowseStateFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const format = params.get('format');
      const genre = params.get('genre');
      const sort = params.get('sort');
      const decade = params.get('decade');
      const section = params.get('section');
      const requestedArtist = String(params.get('artist') || '').trim().slice(0, 120);
      const hasBrowseParams = BROWSE_URL_KEYS.some(key => key !== 'section' && params.has(key));
      return {
        query: String(params.get('q') || '').slice(0, 300),
        artist: requestedArtist && albums.some(album => getArtistKey(album) === normalize(requestedArtist).normalize('NFC'))
          ? requestedArtist : '',
        format: format === 'Vinyl' || format === 'CD' ? format : FORMAT_ALL,
        genre: STANDARD_GENRES.includes(genre) ? genre : GENRE_ALL,
        sort: BROWSE_SORTS.has(sort) ? sort : 'default',
        decade: /^\d{4}$/.test(decade || '') && albums.some(album => getAlbumDecade(album) === decade) ? decade : '',
        recentOnly: params.get('recent') === '1',
        page: /^\d+$/.test(params.get('page') || '')
          ? Math.min(1000000, Math.max(1, Number(params.get('page')))) : 1,
        homeSection: HOME_SECTIONS.includes(section)
          ? section
          : HOME_SECTIONS.includes(history.state?.homeSection)
            ? history.state.homeSection
            : hasBrowseParams ? 'catalog' : HOME_SECTIONS[0],
      };
    }

    function applyBrowseStateFromUrl() {
      const next = readBrowseStateFromUrl();
      const filtersChanged = ['query', 'artist', 'format', 'genre', 'sort', 'decade', 'recentOnly']
        .some(key => state[key] !== next[key]);
      const pageChanged = state.page !== next.page;
      Object.assign(state, next);
      if (filtersChanged) {
        state.filtersExpanded = state.format !== FORMAT_ALL
          || state.genre !== GENRE_ALL
          || state.sort !== 'default'
          || Boolean(state.decade)
          || state.recentOnly;
      }
      return filtersChanged || pageChanged;
    }

    function syncBrowseUrl() {
      const params = new URLSearchParams(window.location.search);
      BROWSE_URL_KEYS.forEach(key => params.delete(key));
      if (state.query.trim()) params.set('q', state.query.trim());
      if (state.artist) params.set('artist', state.artist);
      if (state.format !== FORMAT_ALL) params.set('format', state.format);
      if (state.genre !== GENRE_ALL) params.set('genre', state.genre);
      if (state.sort !== 'default') params.set('sort', state.sort);
      if (state.decade) params.set('decade', state.decade);
      if (state.recentOnly) params.set('recent', '1');
      if (state.page > 1) params.set('page', String(state.page));
      if (state.homeSection !== HOME_SECTIONS[0]) params.set('section', state.homeSection);
      const search = params.toString();
      const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
      if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`
        && history.state?.homeSection === state.homeSection) return;
      history.replaceState({ ...history.state, homeSection: state.homeSection }, '', url);
    }

    function getBaseUrl() {
      return `${window.location.pathname}${window.location.search}`;
    }

    function getAlbumHash(albumId) {
      return `#album=${encodeURIComponent(albumId)}`;
    }

    function getAlbumIdFromHash() {
      const match = window.location.hash.match(/^#album=(.+)$/);
      if (!match) return '';
      try {
        return decodeURIComponent(match[1]);
      } catch (error) {
        return '';
      }
    }

    function openAlbum(albumId, options = {}) {
      finishHomeSectionMotion?.();
      const album = albums.find(item => item.id === albumId) || getWeeklyAlbum();
      if (!album) return renderHome();
      if (CUSTOMER_FEATURES.persistentDetailLayers && !document.body.classList.contains('is-detail-view')) {
        view.homeScrollPosition = window.scrollY;
        view.homeAlbumPage = state.page;
        if (view.homeViewLayer) view.homeViewLayer.dataset.preservedAlbumPage = String(view.homeAlbumPage);
        app.querySelector('[data-album-grid].is-persistent-pager')?._pdPager?.suspend();
      }
      const detailHash = getAlbumHash(album.id);
      const trackSearchQuery = String(options.trackSearchQuery || '').trim();
      const focusTrackIndex = Number(options.focusTrackIndex);
      state.detailTrackSearch = trackSearchQuery ? { albumId: album.id, query: trackSearchQuery } : null;
      state.detailTrackFocus = Number.isInteger(focusTrackIndex) && focusTrackIndex >= 0
        ? { albumId: album.id, trackIndex: focusTrackIndex }
        : null;
      const detailState = { view: 'detail', albumId: album.id, homeSection: state.homeSection };
      if (trackSearchQuery) detailState.trackSearchQuery = trackSearchQuery;
      if (state.detailTrackFocus) detailState.focusTrackIndex = state.detailTrackFocus.trackIndex;

      const commitDetailOpen = skipInitialScroll => {
        // 브라우저 뒤로가기 지원: 상세 화면을 열 때 방문 기록에 한 단계를 쌓아 목록으로 돌아갈 수 있게 합니다.
        if (window.location.hash !== detailHash) {
          history.pushState(detailState, '', `${getBaseUrl()}${detailHash}`);
        } else {
          history.replaceState(detailState, '', `${getBaseUrl()}${detailHash}`);
        }
        renderDetail(album.id, {
          skipInitialScroll,
          // 전환 중에도 상세 정보가 이미 완성되어 있어 로딩처럼 뒤늦게 채워지지 않습니다.
          deferContent: false,
        });
      };
      if (CUSTOMER_FEATURES.persistentDetailLayers && CUSTOMER_FEATURES.directCoverTransition) {
        animateDirectCoverIntoDetail(album, options.transitionSource, commitDetailOpen);
      } else {
        animateCoverIntoDetail(options.transitionSource, commitDetailOpen);
      }
    }

    function goHome() {
      const returningFromDetail = Boolean(getAlbumIdFromHash());
      state.detailTrackSearch = null;
      state.detailTrackFocus = null;
      state.homeSection = 'weekly';
      syncBrowseUrl();
      history.replaceState({ view: 'home', homeSection: state.homeSection }, '', getBaseUrl());
      if (!returningFromDetail && app.querySelector('[data-home-sections]')) {
        setHomeSection(state.homeSection);
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      if (!revealPersistentHomeView({ scrollY: 0 })) renderHome();
    }

    function goPreviousView() {
      history.back();
    }

    function goAlbumList() {
      state.detailTrackSearch = null;
      state.detailTrackFocus = null;
      state.homeSection = 'catalog';
      syncBrowseUrl();
      history.pushState({ view: 'home', homeSection: state.homeSection }, '', getBaseUrl());
      if (!revealPersistentHomeView({ scrollY: 0 })) renderHome();
    }

    function renderRouteFromLocation() {
      const browseChanged = applyBrowseStateFromUrl();
      const albumId = getAlbumIdFromHash();
      if (albumId && albums.some(album => album.id === albumId)) {
        const trackSearchQuery = history.state?.albumId === albumId
          ? String(history.state.trackSearchQuery || '').trim()
          : '';
        const focusTrackIndex = history.state?.albumId === albumId
          ? Number(history.state.focusTrackIndex)
          : Number.NaN;
        state.detailTrackSearch = trackSearchQuery ? { albumId, query: trackSearchQuery } : null;
        state.detailTrackFocus = Number.isInteger(focusTrackIndex) && focusTrackIndex >= 0
          ? { albumId, trackIndex: focusTrackIndex }
          : null;
        if (CUSTOMER_FEATURES.persistentDetailLayers && (!view.homeViewReady || browseChanged)) renderHome({ keepInactive: true });
        renderDetail(albumId);
        return;
      }
      state.detailTrackSearch = null;
      state.detailTrackFocus = null;
      if (window.location.hash) history.replaceState({ view: 'home', homeSection: state.homeSection }, '', getBaseUrl());
      if (browseChanged) return renderHome();
      if (!revealPersistentHomeView({ scrollY: view.homeScrollPosition })) renderHome();
    }
    return {
      readBrowseStateFromUrl, applyBrowseStateFromUrl, syncBrowseUrl, getBaseUrl,
      getAlbumHash, getAlbumIdFromHash, openAlbum, goHome,
      goPreviousView, goAlbumList, renderRouteFromLocation,
    };
  };
})();
