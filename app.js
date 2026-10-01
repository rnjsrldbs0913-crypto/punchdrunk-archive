(() => {
  const albumsFromConst = typeof ALBUMS !== 'undefined' && Array.isArray(ALBUMS) ? ALBUMS : null;
  const albums = albumsFromConst || (Array.isArray(window.PD_ALBUMS) ? window.PD_ALBUMS : []);
  const app = document.querySelector('#app');
  const homeTemplate = document.querySelector('#home-template');
  const detailTemplate = document.querySelector('#detail-template');
  const siteHeader = document.querySelector('[data-home-link]');
  const languageButtons = document.querySelectorAll('[data-language-option]');
  const LANGUAGE_STORAGE_KEY = 'pd-language';
  const ALBUM_VIEW_STORAGE_KEY = 'pd-mobile-album-view-v1';
  const ALBUM_VIEWS = new Set(['grid-2', 'grid-3', 'list']);
  const FORMAT_ALL = '전체';
  const GENRE_ALL = '전체 장르';
  const COUNTRY_UNKNOWN = '미입력';
  const NEW_ALBUM_DAYS = 14;
  const SWIPE_HINT_STORAGE_KEY = 'pd-swipe-hint-seen-v1';

  const CUSTOMER_CONFIG = window.PD_CUSTOMER_CONFIG || {};
  const CUSTOMER_FEATURES = CUSTOMER_CONFIG.features || {
    gridThumbnails: true,
    priorityCovers: true,
    requestTrackList: true,
    coverTransitions: true,
    higherContrast: true,
    compactDetailHeader: true,
    detailCoverViewer: true,
    smoothSwipeTracking: true,
    seamlessCoverTransitions: true,
    nativeMobilePager: true,
    persistentDetailLayers: true,
    directCoverTransition: true,
    instantCoverMotion: true,
    continuousPagerGutters: true,
    instantDetailContinuity: true,
    interactiveCoverViewer: true,
    sharpDetailCoverTransition: true,
    coverModeComparison: true,
    requestGuideBand: true,
    typographicPagination: true,
    browserThemeColor: true,
    filmGrain: true,
    landscapeTouchPager: true,
    compactHeaderFigures: true,
    coverTransitionLayerFix: true,
    wideHeaderColorField: true,
  };
  const MOBILE_PAGER_MEDIA = CUSTOMER_FEATURES.landscapeTouchPager
    ? CUSTOMER_CONFIG.mobilePagerMedia || '(max-width: 719px), (pointer: coarse) and (max-width: 900px)'
    : '(max-width: 719px)';
  const requestedCoverMode = new URLSearchParams(window.location.search).get('coverMode');
  const availableCoverModes = new Set(['thumbnail', 'original', 'optimized']);
  // 기본 화면은 현재 페이지와 양옆 페이지에 원본을 사용합니다. 필요하면 ?coverMode=thumbnail로 즉시 비교할 수 있습니다.
  const COVER_RENDER_MODE = CUSTOMER_FEATURES.coverModeComparison && availableCoverModes.has(requestedCoverMode)
    ? requestedCoverMode
    : 'original';
  const USES_SHARED_HIGH_QUALITY_COVERS = COVER_RENDER_MODE === 'original' || COVER_RENDER_MODE === 'optimized';
  document.documentElement.dataset.coverMode = COVER_RENDER_MODE;
  document.documentElement.classList.toggle('feature-customer-shared-cover-source', USES_SHARED_HIGH_QUALITY_COVERS);
  document.documentElement.classList.toggle('feature-customer-request-track-list', CUSTOMER_FEATURES.requestTrackList);
  document.documentElement.classList.toggle('feature-customer-cover-transitions', CUSTOMER_FEATURES.coverTransitions);
  document.documentElement.classList.toggle('feature-customer-higher-contrast', CUSTOMER_FEATURES.higherContrast);
  document.documentElement.classList.toggle('feature-customer-detail-cover-viewer', CUSTOMER_FEATURES.detailCoverViewer);
  document.documentElement.classList.toggle('feature-customer-smooth-swipe', CUSTOMER_FEATURES.smoothSwipeTracking);
  document.documentElement.classList.toggle('feature-customer-seamless-cover-transition', CUSTOMER_FEATURES.seamlessCoverTransitions);
  document.documentElement.classList.toggle('feature-customer-native-pager', CUSTOMER_FEATURES.nativeMobilePager);
  document.documentElement.classList.toggle('feature-customer-persistent-detail', CUSTOMER_FEATURES.persistentDetailLayers);
  document.documentElement.classList.toggle('feature-customer-direct-cover-transition', CUSTOMER_FEATURES.directCoverTransition);
  document.documentElement.classList.toggle('feature-customer-instant-cover-motion', CUSTOMER_FEATURES.instantCoverMotion);
  document.documentElement.classList.toggle('feature-customer-continuous-pager-gutters', CUSTOMER_FEATURES.continuousPagerGutters);
  document.documentElement.classList.toggle('feature-customer-instant-detail-continuity', CUSTOMER_FEATURES.instantDetailContinuity);
  document.documentElement.classList.toggle('feature-customer-interactive-cover-viewer', CUSTOMER_FEATURES.interactiveCoverViewer);
  document.documentElement.classList.toggle('feature-customer-sharp-detail-transition', CUSTOMER_FEATURES.sharpDetailCoverTransition);
  document.documentElement.classList.toggle('feature-customer-request-guide-band', CUSTOMER_FEATURES.requestGuideBand);
  document.documentElement.classList.toggle('feature-customer-typographic-pagination', CUSTOMER_FEATURES.typographicPagination);
  document.documentElement.classList.toggle('feature-customer-browser-theme', CUSTOMER_FEATURES.browserThemeColor);
  document.documentElement.classList.toggle('feature-customer-film-grain', CUSTOMER_FEATURES.filmGrain);
  document.documentElement.classList.toggle('feature-customer-landscape-touch-pager', CUSTOMER_FEATURES.landscapeTouchPager);
  document.documentElement.classList.toggle('feature-customer-compact-header-figures', CUSTOMER_FEATURES.compactHeaderFigures);
  document.documentElement.classList.toggle('feature-customer-cover-transition-layer-fix', CUSTOMER_FEATURES.coverTransitionLayerFix);
  document.documentElement.classList.toggle('feature-customer-wide-header-color-field', CUSTOMER_FEATURES.wideHeaderColorField);
  document.documentElement.classList.toggle('feature-customer-pretendard-font', CUSTOMER_FEATURES.modernPretendardFont);
  document.documentElement.classList.toggle('feature-customer-stronger-day-pastels', CUSTOMER_FEATURES.strongerDayPastels);
  document.documentElement.classList.toggle('feature-customer-weekly-day-color-bridge', CUSTOMER_FEATURES.weeklyDayColorBridge);
  document.documentElement.classList.toggle('feature-customer-partial-page-fix', CUSTOMER_FEATURES.partialAlbumPageFix);
  // 브라우저 상단 색상도 기능 스위치로 독립적으로 되돌릴 수 있게 합니다.
  if (!CUSTOMER_FEATURES.browserThemeColor) {
    document.querySelector('[data-customer-theme-color]')?.remove();
  }
  function getInitialLanguage() {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'ko' || saved === 'en') return saved;
    } catch (error) {
      console.warn(error);
    }
    return 'ko';
  }

  function getInitialAlbumView() {
    try {
      const saved = localStorage.getItem(ALBUM_VIEW_STORAGE_KEY);
      if (ALBUM_VIEWS.has(saved)) return saved;
    } catch (_) { /* 저장이 제한된 브라우저에서도 기본 보기를 사용합니다. */ }
    return 'grid-3';
  }

  const HOME_SECTIONS = Array.from(homeTemplate.content.querySelectorAll('[data-home-panel]'), panel => panel.dataset.homePanel);
  const state = {
    homeSection: HOME_SECTIONS[0],
    albumView: getInitialAlbumView(),
    query: '',
    artist: '',
    format: FORMAT_ALL,
    genre: GENRE_ALL,
    sort: 'default',
    decade: '',
    recentOnly: false,
    filtersExpanded: false,
    page: 1,
    lastRandomAlbumId: '',
    detailTrackSearch: null,
    detailTrackFocus: null,
    language: getInitialLanguage(),
  };
  const {
    normalize, getLocalizedArtist, getArtistKey, getSearchTerms,
    matchesSearch, getAlbumArtistSearchText, getAlbumSearchMetadata, getAlbumSearchGroups,
    albumMatchesSearch, fieldMatches, getTrackSearchMatches, getTrackSearchQuery,
    albumHasTrackSearchMatch, getSearchMatchType, getSearchMatchLabel, stripTrackNumber,
    splitTrackLine, isRecommendedTrack, getAlbumArtistCredits, getArtistChoices,
    getRelatedArtistAlbums, getArtistAlbums,
  } = window.PD_ARCHIVE.createSearch({
    albums, state, CUSTOMER_CONFIG, t,
  });

  let suppressAlbumCardClickUntil = 0;
  let swipeHintSeenInMemory = false;
  let swipeHintObserver = null;
  let swipeHintTimer = 0;
  let swipeHintQueued = false;
  let swipeHintSection = null;
  let artistAlbumsOverlay = null;
  let artistAlbumsTrigger = null;
  let artistAlbumsBaseUrl = '';
  let artistAlbumsClosing = false;
  let afterArtistAlbumsClose = null;
  let homeViewLayer = null;
  let detailViewLayer = null;
  let homeViewReady = false;
  let homeScrollPosition = 0;
  let homeAlbumPage = 1;
  let finishHomeSectionMotion = null;

  const STANDARD_GENRES = [
    '재즈',
    '소울/펑크',
    '힙합',
    '알앤비',
    '록',
    '팝',
    '일렉트로닉',
    '사운드트랙',
    '월드/라틴',
    '한국음악',
    '기타',
  ];

  // Mutable view references are shared explicitly with navigation and cover modules.
  const sharedView = {
    get homeViewLayer() { return homeViewLayer; },
    set homeViewLayer(value) { homeViewLayer = value; },
    get homeViewReady() { return homeViewReady; },
    set homeViewReady(value) { homeViewReady = value; },
    get homeScrollPosition() { return homeScrollPosition; },
    set homeScrollPosition(value) { homeScrollPosition = value; },
    get homeAlbumPage() { return homeAlbumPage; },
    set homeAlbumPage(value) { homeAlbumPage = value; },
    get detailViewLayer() { return detailViewLayer; },
    set detailViewLayer(value) { detailViewLayer = value; },
  };
  const {
    readBrowseStateFromUrl, applyBrowseStateFromUrl, syncBrowseUrl, getBaseUrl,
    getAlbumHash, getAlbumIdFromHash, openAlbum, goHome,
    goPreviousView, goAlbumList, renderRouteFromLocation,
  } = window.PD_ARCHIVE.createNavigation({
    albums, app, state, FORMAT_ALL, GENRE_ALL, STANDARD_GENRES, HOME_SECTIONS, CUSTOMER_FEATURES,
    normalize, getArtistKey, getAlbumDecade, getWeeklyAlbum, renderHome, renderDetail,
    setHomeSection, revealPersistentHomeView, view: sharedView,
    finishHomeSectionMotion: () => finishHomeSectionMotion?.(),
    animateDirectCoverIntoDetail: (...args) => animateDirectCoverIntoDetail(...args),
    animateCoverIntoDetail: (...args) => animateCoverIntoDetail(...args),
  });
  const {
    createFallbackCover, createCover, getComparisonCoverSource, getOptimizedCoverPath,
    closeDetailCoverViewer, openDetailCoverViewer, requestCloseDetailCoverViewer, animateDirectCoverIntoDetail,
    animateCoverIntoDetail, preloadTransitionCover, setupWeeklyMotion, handleCoverPopState,
  } = window.PD_ARCHIVE.createCoverMotion({
    app, state, CUSTOMER_FEATURES, COVER_RENDER_MODE, USES_SHARED_HIGH_QUALITY_COVERS,
    t, escapeHtml, getLocalizedArtist, activatePersistentDetailView, view: sharedView,
  });
  const {
    isTrackRequested, toggleRequestTrack, refreshRequestTrackUi, hideRequestTrackList,
    closeRequestTrackList, openRequestTrackList, showRequestAddedToast, handleNotesPopState,
  } = window.PD_ARCHIVE.createRequestNotes({
    albums, app, CUSTOMER_FEATURES, t, createCover, splitTrackLine, formatLabel,
    getLocalizedArtist, openAlbum, renderRouteFromLocation,
  });
  const { recordRecentAlbum, openRecentAlbums, handleRecentAlbumsPopState } = window.PD_ARCHIVE.createRecentAlbums({
    albums, t, createCover, getLocalizedArtist, openAlbum, renderRouteFromLocation,
  });

  applyBrowseStateFromUrl();

  const GENRE_LABELS = {
    ko: {
      [GENRE_ALL]: '전체 장르',
      '재즈': '재즈',
      '소울/펑크': '소울/펑크',
      '힙합': '힙합',
      '알앤비': '알앤비',
      '록': '록',
      '팝': '팝',
      '일렉트로닉': '일렉트로닉',
      '사운드트랙': '사운드트랙',
      '월드/라틴': '월드/라틴',
      '한국음악': '한국음악',
      '기타': '기타',
    },
    en: {
      [GENRE_ALL]: 'All genres',
      '재즈': 'Jazz',
      '소울/펑크': 'Soul/Funk',
      '힙합': 'Hip-Hop',
      '알앤비': 'R&B',
      '록': 'Rock',
      '팝': 'Pop',
      '일렉트로닉': 'Electronic',
      '사운드트랙': 'Soundtrack',
      '월드/라틴': 'World/Latin',
      '한국음악': 'Korean Music',
      '기타': 'Other',
    },
  };

  const UI_TEXT = {
    ko: {
      homeLabel: '처음 화면으로 돌아가기',
      languageLabel: '언어 선택',
      weeklyAlbum: '금주의 음반',
      catalogTab: '음반 목록',
      browseSections: '음반 둘러보기',
      weeklyNote: 'PUNCH-DRUNK PICK',
      selectionReason: '이번 주의 선택',
      details: '음반 자세히 보기 →',
      chooseWeekly: '금주의 음반을 선택하세요',
      weeklyDefaultReason: '이번 주 Punch-drunk의 분위기와 잘 맞는 음반으로 골랐습니다.',
      weeklyHistory: '지난 선택들',
      weeklyHistoryTitle: '금주의 음반 선정 이력',
      weeklyHistoryEmpty: '아직 기록된 선택이 없습니다.',
      weeklyHistoryClose: '선정 이력 닫기',
      weeklyHistoryCurrent: '현재',
      weeklyMotionPlay: '영상 재생',
      weeklyMotionPause: '영상 정지',
      requestGuideTitle: '신청 안내',
      requestGuideLine1: '신청곡은 받으신 신청 용지에 적어 직원에게 건네주세요.',
      requestGuideLine2: '리스트에 없는 곡은 스트리밍으로 재생됩니다.',
      released: year => `${year}년 발매`,
      searchSection: '검색과 필터',
      albumSearch: '검색',
      searchPlaceholder: '음반명·아티스트·곡 제목',
      clearSearch: '검색어 지우기',
      artistAlbumsButton: '이 아티스트의 음반 보기',
      artistAlbumsAll: '전체',
      artistAlbumsChoose: '아티스트 선택',
      artistAlbumsClose: '아티스트 음반 팝업 닫기',
      artistAlbumsEmpty: '현재 보유한 음반이 없습니다.',
      artistAlbumsCurrent: '현재 보고 있는 음반',
      artistAlbumsScope: (artist, count) => `${artist}의 음반 ${count}장`,
      clearArtistScope: '아티스트 보기 해제',
      filters: '필터',
      sort: '정렬',
      formatFilter: '음반 형식',
      genreFilter: '장르',
      releaseDecade: '발매 연대',
      allDecades: '전체 연대',
      decadeLabel: year => `${year}년대`,
      sortDefault: '기본순',
      sortNewest: '최근 발매순',
      sortOldest: '오래된순',
      sortArtist: '아티스트순',
      sortTitle: '앨범명순',
      randomAlbum: '오늘 뭐 듣지?',
      filterResultsJump: count => `해당 음반 ${count}장 보기 ↓`,
      newAlbums: '새로 온 음반',
      resetFilters: '필터 초기화',
      requestListCount: count => `신청곡 메모 ${count}`,
      requestListTitle: '신청곡 메모',
      requestListOpen: '신청곡 메모 보기',
      requestTrackAdd: '신청곡 메모에 담기',
      requestTrackRemove: '신청곡 메모에서 빼기',
      requestListEmpty: '아직 메모해 둔 신청곡이 없습니다.',
      requestListNotice: '이 창은 신청곡 메모용입니다. 신청곡은 받으신 종이에 적어주세요.',
      requestListClear: '전체 비우기',
      requestListClose: '신청곡 메모 닫기',
      requestAdded: '메모에 담겼습니다',
      recentAlbumsButton: '최근 본 음반',
      recentAlbumsTitle: '최근 본 음반',
      recentAlbumsClose: '최근 본 음반 닫기',
      recentAlbumsEmpty: '아직 본 음반이 없습니다.',
      weeklyHold: '꾹',
      weeklyHoldLabel: '길게 눌러 영상 보기',
      lighting: '조명',
      searchAllAlbums: '전체 음반에서 찾기',
      emptyAllAlbums: '보유 음반에서 찾지 못했습니다.',
      emptyRequest: '목록에 없어도 종이에 적어주세요.',
      requestListView: '메모 보기',
      requestFloatingCount: count => `메모 ${count}곡`,
      moreMatchedTracks: count => `외 ${count}곡`,
      matchRelatedArtist: '관련 아티스트',
      albumList: '앨범 목록',
      albumListPage: '앨범 목록 페이지',
      albumView: '보기 방식',
      albumViewTwo: '2×2 보기 · 한 페이지에 4장',
      albumViewThree: '3×3 보기 · 한 페이지에 9장',
      albumViewList: '목록형',
      emptyAlbums: '조건에 맞는 음반이 없습니다.',
      all: '전체',
      previous: '이전',
      next: '다음',
      firstAlbumPage: '첫 페이지',
      lastAlbumPage: '마지막 페이지',
      previousAlbumPage: '이전 음반 페이지',
      nextAlbumPage: '다음 음반 페이지',
      chooseAlbumPage: '페이지 선택',
      pageNumber: '페이지 번호',
      goToPage: '이동',
      swipePagePosition: '음반 목록 현재 위치',
      pageStatus: (page, total) => `${page} / ${total} 페이지`,
      resultSummary: ({ total, start, end }) => total
        ? `${total}장 · ${start}–${end}` : '0장',
      previousView: '← 이전 화면',
      albumListButton: '음반 목록',
      tracklist: '트랙리스트',
      recommendedHint: '표시는 추천곡입니다.',
      description: '설명',
      otherAlbums: '다른 음반 보기',
      prevAlbum: '이전 음반',
      nextAlbum: '다음 음반',
      tracklistEmpty: '트랙리스트를 입력하세요',
      descriptionEmpty: '설명을 입력하세요.',
      requestNote: '신청곡은 받으신 신청 용지에 적어 직원에게 건네주세요. 리스트에 없는 곡은 스트리밍으로 재생됩니다.',
      matchTitle: '앨범명에서 검색됨',
      matchArtist: '아티스트에서 검색됨',
      matchYear: '연도에서 검색됨',
      matchFormat: '포맷에서 검색됨',
      matchGenre: '장르에서 검색됨',
      matchRecommended: '트랙리스트에서 검색됨',
      matchTracklist: '트랙리스트에서 검색됨',
      trackSearchMatch: '검색 일치',
      formatVinyl: 'LP',
      formatCD: 'CD',
    },
    en: {
      homeLabel: 'Back to home',
      languageLabel: 'Language',
      weeklyAlbum: 'Album of the Week',
      catalogTab: 'Record Collection',
      browseSections: 'Browse records',
      weeklyNote: 'PUNCH-DRUNK PICK',
      selectionReason: "This week's pick",
      details: 'View album →',
      chooseWeekly: 'Choose an album of the week',
      weeklyDefaultReason: 'Selected because it fits the mood of Punch-drunk this week.',
      weeklyHistory: 'Past picks',
      weeklyHistoryTitle: 'Album of the Week history',
      weeklyHistoryEmpty: 'No selections have been recorded yet.',
      weeklyHistoryClose: 'Close selection history',
      weeklyHistoryCurrent: 'Current',
      weeklyMotionPlay: 'Play video',
      weeklyMotionPause: 'Pause video',
      requestGuideTitle: 'Song requests',
      requestGuideLine1: 'Please write your request on the slip provided and hand it to a member of staff.',
      requestGuideLine2: 'Songs not on the list will be played via streaming.',
      released: year => `Released in ${year}`,
      searchSection: 'Search and filters',
      albumSearch: 'Search',
      searchPlaceholder: 'Album · artist · track title',
      clearSearch: 'Clear search',
      artistAlbumsButton: 'Albums by this artist',
      artistAlbumsAll: 'All',
      artistAlbumsChoose: 'Choose an artist',
      artistAlbumsClose: 'Close artist albums',
      artistAlbumsEmpty: 'No albums in the archive yet.',
      artistAlbumsCurrent: 'Current album',
      artistAlbumsScope: (artist, count) => `${artist} · ${count} albums`,
      clearArtistScope: 'Clear artist selection',
      filters: 'Filters',
      sort: 'Sort',
      formatFilter: 'Record format',
      genreFilter: 'Genre',
      releaseDecade: 'Release decade',
      allDecades: 'All decades',
      decadeLabel: year => `${year}s`,
      sortDefault: 'Default',
      sortNewest: 'Newest release',
      sortOldest: 'Oldest release',
      sortArtist: 'Artist',
      sortTitle: 'Album title',
      randomAlbum: 'Pick for Me',
      filterResultsJump: count => `View ${count} albums ↓`,
      newAlbums: 'New arrivals',
      resetFilters: 'Reset filters',
      requestListCount: count => `Request notes ${count}`,
      requestListTitle: 'Request notes',
      requestListOpen: 'View request notes',
      requestTrackAdd: 'Add to request notes',
      requestTrackRemove: 'Remove from request notes',
      requestListEmpty: 'You have not saved any tracks in your notes yet.',
      requestListNotice: 'For request notes only. Please write your request on the paper provided.',
      requestListClear: 'Clear all',
      requestListClose: 'Close request notes',
      requestAdded: 'Added to notes.',
      recentAlbumsButton: 'Recent albums',
      recentAlbumsTitle: 'Recently viewed',
      recentAlbumsClose: 'Close recently viewed albums',
      recentAlbumsEmpty: 'No albums viewed yet.',
      weeklyHold: 'Hold',
      weeklyHoldLabel: 'Press and hold to watch the video',
      lighting: 'Light',
      searchAllAlbums: 'Search all records',
      emptyAllAlbums: 'No matching records in our collection.',
      emptyRequest: 'Not listed? You can still request it on paper.',
      requestListView: 'View notes',
      requestFloatingCount: count => `Notes ${count}`,
      moreMatchedTracks: count => `+${count} more`,
      matchRelatedArtist: 'Related artist',
      albumList: 'Album list',
      albumListPage: 'Album list pages',
      albumView: 'View',
      albumViewTwo: '2×2 view · 4 albums per page',
      albumViewThree: '3×3 view · 9 albums per page',
      albumViewList: 'List',
      emptyAlbums: 'No albums match these filters.',
      all: 'All',
      previous: 'Previous',
      next: 'Next',
      firstAlbumPage: 'First page',
      lastAlbumPage: 'Last page',
      previousAlbumPage: 'Previous album page',
      nextAlbumPage: 'Next album page',
      chooseAlbumPage: 'Choose a page',
      pageNumber: 'Page number',
      goToPage: 'Go',
      swipePagePosition: 'Current album list position',
      pageStatus: (page, total) => `Page ${page} of ${total}`,
      resultSummary: ({ total, start, end }) => total
        ? `${start}–${end} of ${total}` : '0 records',
      previousView: '← Previous',
      albumListButton: 'Album list',
      tracklist: 'Tracklist',
      recommendedHint: 'marks recommended tracks.',
      description: 'Description',
      otherAlbums: 'Browse other albums',
      prevAlbum: 'Previous album',
      nextAlbum: 'Next album',
      tracklistEmpty: 'Tracklist coming soon',
      descriptionEmpty: 'English description coming soon.',
      requestNote: 'Please write your request on the slip provided and hand it to a member of staff. Songs not on the list will be played via streaming.',
      matchTitle: 'Matched album title',
      matchArtist: 'Matched artist',
      matchYear: 'Matched year',
      matchFormat: 'Matched format',
      matchGenre: 'Matched genre',
      matchRecommended: 'Matched tracklist',
      matchTracklist: 'Matched tracklist',
      trackSearchMatch: 'Search match',
      formatVinyl: 'Vinyl',
      formatCD: 'CD',
    },
  };

  function t(key) {
    const value = UI_TEXT[state.language]?.[key] ?? UI_TEXT.ko[key] ?? '';
    return typeof value === 'function' ? value : String(value);
  }

  function getGenreLabel(genre, language = state.language) {
    return GENRE_LABELS[language]?.[genre] || genre || '';
  }

  // 국가 값은 관리자 데이터에 보존하되 손님 화면에는 아직 분류로 노출하지 않습니다.
  function getCountryLabel() {
    return '';
  }

  function applyStaticTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(element => {
      element.setAttribute('aria-label', t(element.dataset.i18nAria));
    });
  }

  function updateLanguageButtons() {
    languageButtons.forEach(button => {
      const active = button.dataset.languageOption === state.language;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.documentElement.lang = state.language;
  }

  function setLanguage(language) {
    if (language !== 'ko' && language !== 'en') return;
    state.language = language;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.warn(error);
    }
    updateLanguageButtons();
    applyStaticTranslations(document);
    if (CUSTOMER_FEATURES.persistentDetailLayers) homeViewReady = false;
    renderRouteFromLocation();
  }

  function normalizeGenreName(value) {
    // 검색용 정규화에서 분리된 한글 자모를 다시 합쳐 "랩", "재즈" 같은 한글 장르도 비교되게 합니다.
    return normalize(String(value || '').replace(/&/g, 'and')).normalize('NFC');
  }

  function classifyGenre(rawGenre) {
    const raw = String(rawGenre || '').trim();
    const genre = normalizeGenreName(raw);
    if (!genre) return '기타';

    // 장르 필터 정리: Apple/iTunes의 세부 장르나 예전 저장 값을 큰 장르로 묶어 보여줍니다.
    if (/soundtrack|ost|film|movie|score|originalmotionpicture|애니메이션|사운드트랙/.test(genre)) return '사운드트랙';
    // Jazz Rap처럼 다른 장르명이 함께 있어도 힙합 하위 장르를 먼저 힙합으로 묶습니다.
    if (/hiphop|hip\/hop|rap|boombap|jazzhop|drill|grime|crunk|gfunk|phonk|turntabl|gangsta|lofihiphop|memphisrap|pluggnb|plugg|붐뱁|트랩|드릴|그라임|갱스터|지펑크|쥐펑크|힙합|랩/.test(genre)) return '힙합';
    if (/jazz|bebop|bop|fusion|swing|ragtime|재즈/.test(genre)) return '재즈';
    if (/rband|rnb|randb|rhythmandblues|알앤비/.test(genre)) return '알앤비';
    if (/soul|funk|motown|disco|소울|펑크/.test(genre)) return '소울/펑크';
    if (/alternative|rock|punk|indie|grunge|newwave|metal|hardcore|록|락|얼터너티브|메탈/.test(genre)) return '록';
    if (/electronic|electronica|techno|house|dance|ambient|idm|edm|disco|일렉트로닉|댄스/.test(genre)) return '일렉트로닉';
    if (/latin|brazil|brasil|bossa|samba|world|afro|reggae|ska|dub|koreantraditional|국악|월드|라틴|브라질/.test(genre)) {
      return '월드/라틴';
    }
    if (/pop|kpop|koreanpop|jpop|cpop|가요|케이팝|팝/.test(genre)) return '팝';
    const exact = STANDARD_GENRES.find(item => normalizeGenreName(item) === genre);
    return exact || '기타';
  }

  function isLegacyKoreanGenre(value) {
    return /^(한국음악|koreanmusic|korean)$/i.test(String(value || '').trim().replace(/\s+/g, ''));
  }

  function getAlbumGenres(album) {
    const primaryGenre = album?.genre || album?.genres?.[0] || '기타';
    return [classifyGenre(primaryGenre)];
  }

  function getAlbumCountry(album) {
    return String(album?.country || '').trim() || COUNTRY_UNKNOWN;
  }

  function normalizeWeeklyHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.map((entry, index) => ({
      id: String(entry?.id || `weekly-${index + 1}`).trim(),
      selectedAt: String(entry?.selectedAt || '').trim(),
      reason: String(entry?.reason || '').trim(),
      reasonEn: String(entry?.reasonEn || '').trim(),
    })).filter(entry => entry.selectedAt);
  }

  albums.forEach(album => {
    const legacyGenre = album.genre;
    if (!String(album.country || '').trim() && isLegacyKoreanGenre(legacyGenre)) album.country = '한국';
    album.country = String(album.country || '').trim();
    album.genres = getAlbumGenres(album);
    album.genre = album.genres[0];
    album.weeklyHistory = normalizeWeeklyHistory(album.weeklyHistory);
    album.weeklyVideo = String(album.weeklyVideo || '').trim();
    album.weeklyVideoPoster = String(album.weeklyVideoPoster || '').trim();
  });
  function getWeeklyAlbum() {
    return albums.find(album => album.isWeekly === true || album.weekly === true) || null;
  }

  function getWeeklyHistoryEntries() {
    return albums.flatMap(album => (album.weeklyHistory || []).map((entry, index) => ({
      album,
      entry,
      index,
    }))).sort((a, b) => {
      const dateOrder = String(b.entry.selectedAt).localeCompare(String(a.entry.selectedAt));
      if (dateOrder) return dateOrder;
      return String(b.entry.id).localeCompare(String(a.entry.id));
    });
  }

  function formatWeeklyHistoryDate(value) {
    const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return new Intl.DateTimeFormat(state.language === 'en' ? 'en-US' : 'ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  function openWeeklyHistory(trigger) {
    document.querySelector('.weekly-history-overlay')?.remove();
    const entries = getWeeklyHistoryEntries();
    const overlay = document.createElement('div');
    overlay.className = 'weekly-history-overlay';
    overlay.setAttribute('role', 'presentation');
    const panel = document.createElement('section');
    panel.className = 'weekly-history-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'weekly-history-title');

    const head = document.createElement('header');
    const title = document.createElement('h2');
    title.id = 'weekly-history-title';
    title.textContent = t('weeklyHistoryTitle');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'weekly-history-close';
    close.textContent = '×';
    close.setAttribute('aria-label', t('weeklyHistoryClose'));
    head.append(title, close);

    const list = document.createElement('div');
    list.className = 'weekly-history-list';
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'weekly-history-empty';
      empty.textContent = t('weeklyHistoryEmpty');
      list.append(empty);
    } else {
      const current = getWeeklyAlbum();
      entries.forEach((item, itemIndex) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'weekly-history-item';
        const cover = createCover(item.album, 'weekly-history-cover');
        const copy = document.createElement('span');
        copy.className = 'weekly-history-copy';
        const date = document.createElement('span');
        date.className = 'weekly-history-date';
        date.textContent = formatWeeklyHistoryDate(item.entry.selectedAt);
        if (itemIndex === 0 && current?.id === item.album.id) {
          const currentBadge = document.createElement('b');
          currentBadge.textContent = t('weeklyHistoryCurrent');
          date.append(' · ', currentBadge);
        }
        const albumTitle = document.createElement('strong');
        albumTitle.textContent = item.album.title || '';
        const artist = document.createElement('span');
        artist.textContent = getLocalizedArtist(item.album) || '';
        const reason = document.createElement('p');
        reason.textContent = String(state.language === 'en' ? item.entry.reasonEn : item.entry.reason).trim()
          || getLocalizedWeeklyReason(item.album);
        copy.append(date, albumTitle, artist, reason);
        button.append(cover, copy);
        button.addEventListener('click', () => {
          closeOverlay(false);
          openAlbum(item.album.id, { transitionSource: cover.querySelector('.cover-frame') });
        });
        list.append(button);
      });
    }

    const closeOverlay = (restoreFocus = true) => {
      overlay.remove();
      document.body.classList.remove('weekly-history-open');
      if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
    close.addEventListener('click', () => closeOverlay());
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeOverlay();
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeOverlay();
    });
    panel.append(head, list);
    overlay.append(panel);
    document.body.append(overlay);
    document.body.classList.add('weekly-history-open');
    close.focus({ preventScroll: true });
  }

  function formatLabel(format, language = state.language) {
    if (format === 'Vinyl') return language === 'en' ? UI_TEXT.en.formatVinyl : UI_TEXT.ko.formatVinyl;
    if (format === 'CD') return UI_TEXT[language]?.formatCD || 'CD';
    return format || '';
  }

  function getLocalizedDescription(album) {
    if (state.language === 'en') return String(album?.descriptionEn || '').trim();
    return String(album?.description || '').trim();
  }

  function getLocalizedWeeklyReason(album) {
    const value = state.language === 'en' ? album?.weeklyReasonEn : album?.weeklyReason;
    return String(value || '').trim() || t('weeklyDefaultReason');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function matchesAlbumFilters(album, terms, options = {}) {
    const includeFormat = options.includeFormat !== false;
    const includeGenre = options.includeGenre !== false;
    const includeDecade = options.includeDecade !== false;
    const matchesGenre = state.genre === GENRE_ALL || getAlbumGenres(album)[0] === state.genre;
    return (!state.artist || getArtistKey(album) === normalize(state.artist).normalize('NFC'))
      && (!includeFormat || state.format === FORMAT_ALL || album.format === state.format)
      && (!includeGenre || matchesGenre)
      && (!includeDecade || !state.decade || getAlbumDecade(album) === state.decade)
      && (!state.recentOnly || isRecentlyAdded(album))
      && albumMatchesSearch(album, terms);
  }

  function getFormatFilterCounts() {
    const terms = getSearchTerms();
    const relevant = albums.filter(album => matchesAlbumFilters(album, terms, { includeFormat: false }));
    return [FORMAT_ALL, 'Vinyl', 'CD'].map(name => ({
      name,
      count: name === FORMAT_ALL ? relevant.length : relevant.filter(album => album.format === name).length,
    }));
  }

  function getGenreFilterCounts() {
    const terms = getSearchTerms();
    const relevant = albums.filter(album => matchesAlbumFilters(album, terms, { includeGenre: false }));
    const counts = relevant.reduce((map, album) => {
      const genre = getAlbumGenres(album)[0];
      map.set(genre, (map.get(genre) || 0) + 1);
      return map;
    }, new Map());
    return [
      { name: GENRE_ALL, count: relevant.length },
      ...STANDARD_GENRES.filter(name => counts.has(name) || name === state.genre)
        .map(name => ({ name, count: counts.get(name) || 0 })),
    ];
  }

  function getDecadeFilterCounts() {
    const terms = getSearchTerms();
    const relevant = albums.filter(album => matchesAlbumFilters(album, terms, { includeDecade: false }));
    const counts = new Map();
    relevant.forEach(album => {
      const decade = getAlbumDecade(album);
      if (decade) counts.set(decade, (counts.get(decade) || 0) + 1);
    });
    const decades = [...new Set(albums.map(getAlbumDecade).filter(Boolean))].sort();
    return [
      { name: '', count: relevant.length },
      ...decades.map(name => ({ name, count: counts.get(name) || 0 })),
    ];
  }

  function getFilteredAlbums() {
    const terms = getSearchTerms();
    return albums.filter(album => matchesAlbumFilters(album, terms));
  }
  function parseYear(year) {
    const parsed = parseInt(String(year || '').match(/\d{4}/)?.[0] || '0', 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getAlbumDecade(album) {
    const year = parseYear(album?.year);
    return year >= 1900 ? String(Math.floor(year / 10) * 10) : '';
  }

  function compareText(a, b) {
    return String(a || '').localeCompare(String(b || ''), state.language === 'en' ? 'en' : 'ko', { sensitivity: 'base' });
  }

  function getVisibleAlbums() {
    const filtered = getFilteredAlbums();
    const sorted = [...filtered];

    if (state.sort === 'newest') sorted.sort((a, b) => parseYear(b.year) - parseYear(a.year));
    if (state.sort === 'oldest') sorted.sort((a, b) => parseYear(a.year) - parseYear(b.year));
    if (state.sort === 'artist') sorted.sort((a, b) => compareText(getLocalizedArtist(a), getLocalizedArtist(b)) || compareText(a.title, b.title));
    if (state.sort === 'title') sorted.sort((a, b) => compareText(a.title, b.title) || compareText(getLocalizedArtist(a), getLocalizedArtist(b)));

    return sorted;
  }

  function getEffectiveAlbumView() {
    return isMobileAlbumPager() ? state.albumView : 'default';
  }

  function getAlbumsPerPage() {
    if (isMobileAlbumPager()) return state.albumView === 'grid-2' ? 4 : 9;
    if (window.matchMedia('(min-width: 1060px)').matches) return 18;
    if (window.matchMedia('(min-width: 720px)').matches) return 15;
    return 9;
  }

  // 보기 방식별로 남은 음반도 마지막 페이지에서 빠짐없이 표시합니다.
  function getAlbumPageCount(totalAlbums, perPage = getAlbumsPerPage()) {
    const safeTotal = Math.max(0, Number(totalAlbums) || 0);
    const safePerPage = Math.max(1, Number(perPage) || 1);
    const fullPages = Math.floor(safeTotal / safePerPage);
    const partialPage = safeTotal % safePerPage > 0 ? 1 : 0;
    return Math.max(1, fullPages + partialPage);
  }

  function isMobileAlbumPager() {
    return window.matchMedia(MOBILE_PAGER_MEDIA).matches;
  }

  function resetAlbumPage() {
    state.page = 1;
  }

  function updateAlbumViewButtons(root = app) {
    root.querySelectorAll('[data-album-view-option]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.albumViewOption === state.albumView));
    });
  }

  function setAlbumView(view) {
    if (!ALBUM_VIEWS.has(view) || view === state.albumView) return;
    state.albumView = view;
    try { localStorage.setItem(ALBUM_VIEW_STORAGE_KEY, view); } catch (_) { /* 현재 화면에서는 계속 사용할 수 있습니다. */ }
    cancelSwipeDiscoveryHint();
    updateAlbumViewButtons();
    updateAlbumGrid();
  }

  // 휴대폰 폭과 글꼴이 달라도 도구 버튼 문구가 두 줄이 되지 않도록 실제 버튼 너비에 맞춰 조정합니다.
  function fitSearchToolLabels(root = app) {
    root.querySelectorAll('.search-tools .tool-button, .result-random-button').forEach(button => {
      button.style.fontSize = '';
      button.style.paddingInline = '';

      const baseSize = Number.parseFloat(window.getComputedStyle(button).fontSize) || 13;
      let fontSize = baseSize;

      while (button.scrollWidth > button.clientWidth + 1 && fontSize > 10) {
        fontSize = Math.max(10, fontSize - 0.5);
        button.style.fontSize = `${fontSize}px`;
      }

      if (button.scrollWidth > button.clientWidth + 1) {
        button.style.paddingInline = '4px';
      }
    });
  }

  function scheduleSearchToolLabelFit() {
    window.requestAnimationFrame(() => fitSearchToolLabels());
  }

  function getAlbumTotalPages() {
    return getAlbumPageCount(getVisibleAlbums().length, getAlbumsPerPage());
  }

  function goToAlbumPage(page, options = {}) {
    const totalPages = getAlbumTotalPages();
    const nextPage = Math.min(Math.max(1, page), totalPages);
    if (nextPage === state.page) return false;
    const previousPage = state.page;
    const direction = nextPage > previousPage ? 'next' : 'prev';
    state.page = nextPage;
    const persistentGrid = app.querySelector('[data-album-grid].is-persistent-pager');
    if (CUSTOMER_FEATURES.nativeMobilePager && isMobileAlbumPager() && persistentGrid?._pdPager) {
      const behavior = options.behavior || (Math.abs(nextPage - previousPage) === 1 ? 'smooth' : 'auto');
      persistentGrid._pdPager.goTo(nextPage, behavior);
      updateAlbumGrid({ ...options, direction, preservePersistentTrack: true });
      return true;
    }
    updateAlbumGrid({ ...options, direction });
    return true;
  }

  // SWIPE-AFFORDANCE-2-NUDGE: 목록이 화면에 처음 들어왔을 때 한 번만 옆 페이지를 살짝 보여줍니다.
  function hasSeenSwipeDiscoveryHint() {
    if (swipeHintSeenInMemory) return true;
    try {
      return window.sessionStorage.getItem(SWIPE_HINT_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  function markSwipeDiscoveryHintSeen() {
    swipeHintSeenInMemory = true;
    try {
      window.sessionStorage.setItem(SWIPE_HINT_STORAGE_KEY, 'true');
    } catch (error) {
      console.warn(error);
    }
  }

  function cancelSwipeDiscoveryHint() {
    swipeHintObserver?.disconnect();
    swipeHintObserver = null;
    window.clearTimeout(swipeHintTimer);
    swipeHintTimer = 0;
    swipeHintQueued = false;

    if (swipeHintSection) {
      swipeHintSection.classList.remove('is-swipe-hinting');
      delete swipeHintSection.dataset.swipeHintDirection;
      swipeHintSection = null;
    }
  }

  function scheduleSwipeDiscoveryHint(section, totalPages) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canShow = section && isMobileAlbumPager() && totalPages > 1 && !reduceMotion && !hasSeenSwipeDiscoveryHint();
    if (!canShow) {
      if (swipeHintQueued || swipeHintSection) cancelSwipeDiscoveryHint();
      return;
    }
    if (swipeHintQueued || swipeHintSection) return;

    const playHint = () => {
      if (!section.isConnected || hasSeenSwipeDiscoveryHint()) {
        cancelSwipeDiscoveryHint();
        return;
      }

      const track = section.querySelector('.album-swipe-track');
      if (!track) {
        cancelSwipeDiscoveryHint();
        return;
      }

      cancelSwipeDiscoveryHint();
      markSwipeDiscoveryHintSeen();
      swipeHintSection = section;
      section.dataset.swipeHintDirection = state.page < totalPages ? 'next' : 'previous';
      section.classList.add('is-swipe-hinting');

      const finish = () => {
        if (swipeHintSection !== section) return;
        window.clearTimeout(swipeHintTimer);
        swipeHintTimer = 0;
        section.classList.remove('is-swipe-hinting');
        delete section.dataset.swipeHintDirection;
        swipeHintSection = null;
      };

      track.addEventListener('animationend', finish, { once: true });
      swipeHintTimer = window.setTimeout(finish, 1150);
    };

    swipeHintQueued = true;
    if ('IntersectionObserver' in window) {
      swipeHintObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.28)) playHint();
      }, { threshold: [0.28], rootMargin: '0px 0px -8% 0px' });
      swipeHintObserver.observe(section);
      return;
    }

    swipeHintTimer = window.setTimeout(playHint, 500);
  }

  function isWeeklyDetailRandom(button) {
    return state.homeSection === 'weekly' && Boolean(button.closest('.detail-page'));
  }

  function updateRandomAlbumButtons(root = app) {
    const filteredCount = getFilteredAlbums().length;
    root.querySelectorAll('[data-random-album]').forEach(button => {
      button.disabled = isWeeklyDetailRandom(button) ? albums.length === 0 : filteredCount === 0;
      button.textContent = t('randomAlbum');
      button.setAttribute('aria-label', button.textContent);
    });
  }

  function openRandomAlbum(button) {
    // 금주의 음반 상세에서는 전체 음반, 그 외에는 현재 검색과 필터 결과에서 고릅니다.
    const ignoreFilters = isWeeklyDetailRandom(button);
    const filtered = ignoreFilters ? albums : getFilteredAlbums();
    if (!filtered.length) return;
    const blockedId = getAlbumIdFromHash() || state.lastRandomAlbumId;
    const pool = filtered.length > 1
      ? filtered.filter(item => item.id !== blockedId)
      : filtered;
    const album = pool[Math.floor(Math.random() * pool.length)];
    state.lastRandomAlbumId = album.id;
    openAlbum(album.id, { trackSearchQuery: ignoreFilters ? '' : getTrackSearchQuery(album) });
  }

  function getFilterToggleSummary() {
    const formatText = state.format === FORMAT_ALL ? t('all') : formatLabel(state.format);
    const genreText = getGenreLabel(state.genre);
    const parts = [formatText, genreText];
    if (state.decade) parts.push(t('decadeLabel')(state.decade));
    if (state.recentOnly) parts.unshift(t('newAlbums'));

    const sortKeyByValue = {
      newest: 'sortNewest',
      oldest: 'sortOldest',
      artist: 'sortArtist',
      title: 'sortTitle',
    };
    if (sortKeyByValue[state.sort]) parts.push(t(sortKeyByValue[state.sort]));
    return parts.join(' · ');
  }

  function updateFilterResultsJumpVisibility() {
    const button = document.querySelector('body > [data-filter-results-jump]');
    const panel = app.querySelector('[data-filter-panel]');
    if (!button || !panel) return;
    const rect = panel.getBoundingClientRect();
    button.hidden = !state.filtersExpanded
      || state.homeSection !== 'catalog'
      || document.body.classList.contains('is-detail-view')
      || rect.top >= window.innerHeight - 80
      || rect.bottom <= 80;
  }

  window.addEventListener('scroll', updateFilterResultsJumpVisibility, { passive: true });
  window.addEventListener('resize', updateFilterResultsJumpVisibility, { passive: true });

  // 검색창은 항상 보이고, 정렬과 필터만 손님이 필요할 때 펼쳐서 사용합니다.
  function updateFilterPanel(root = app) {
    const toggle = root.querySelector('[data-filter-toggle]');
    const panel = root.querySelector('[data-filter-panel]');
    const summary = root.querySelector('[data-filter-toggle-summary]');
    if (!toggle || !panel || !summary) return;

    toggle.setAttribute('aria-expanded', String(state.filtersExpanded));
    panel.hidden = !state.filtersExpanded;
    summary.textContent = getFilterToggleSummary();
    requestAnimationFrame(updateFilterResultsJumpVisibility);
  }

  function setHomeSection(section, options = {}) {
    if (!HOME_SECTIONS.includes(section)) return;
    finishHomeSectionMotion?.();
    const root = app.querySelector('[data-home-sections]');
    state.homeSection = section;
    requestAnimationFrame(updateFilterResultsJumpVisibility);
    if (!root) return;
    const tabs = Array.from(root.querySelectorAll('[data-home-section]'));
    const panels = Array.from(root.querySelectorAll('[data-home-panel]'));
    const stage = root.querySelector('[data-home-section-stage]');
    const previous = panels.find(panel => panel.classList.contains('is-active'));
    const next = panels.find(panel => panel.dataset.homePanel === section);
    if (!next) return;
    const changed = previous && previous !== next;
    const nav = root.querySelector('[role="tablist"]');

    // Keep the navigation in view when switching from a long, scrolled collection.
    if (options.scrollToTabs) {
      const top = root.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: window.scrollY + top, behavior: 'instant' });
    }
    const previousHeight = stage.getBoundingClientRect().height;
    tabs.forEach((tab, index) => {
      const selected = tab.dataset.homeSection === section;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) {
        nav.style.setProperty('--section-index', index);
        if (options.focus) tab.focus({ preventScroll: true });
      }
    });
    nav.style.setProperty('--section-count', tabs.length);
    panels.forEach(panel => {
      const selected = panel === next;
      panel.classList.toggle('is-active', selected);
      panel.inert = !selected;
      if (selected) panel.removeAttribute('aria-hidden');
      else panel.setAttribute('aria-hidden', 'true');
    });
    root.dataset.section = section;
    if (options.remember !== false && !getAlbumIdFromHash()) syncBrowseUrl();
    if (changed) {
      previous.querySelectorAll('video').forEach(video => video.pause());
      previous.querySelector('.is-motion-playing')?.classList.remove('is-motion-playing');
    }
    cancelSwipeDiscoveryHint();
    if (section === 'catalog') {
      app.querySelector('[data-album-grid]')?._pdPager?.resume(state.page);
      scheduleSearchToolLabelFit();
      scheduleSwipeDiscoveryHint(app.querySelector('[data-grid-section]'), getAlbumTotalPages());
    }

    if (!changed || options.animate === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !next.animate) return;
    const direction = panels.indexOf(next) > panels.indexOf(previous) ? 1 : -1;
    const nextHeight = stage.getBoundingClientRect().height;
    previous.classList.add('is-leaving');
    stage.classList.add('is-switching');
    const timing = { duration: 300, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'both' };
    const animations = [
      previous.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-100 * direction}%)`, opacity: 0 }], timing),
      next.animate([{ transform: `translateX(${100 * direction}%)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], timing),
      stage.animate([{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }], timing),
    ];
    const finish = () => {
      if (finishHomeSectionMotion !== finish) return;
      finishHomeSectionMotion = null;
      previous.classList.remove('is-leaving');
      stage.classList.remove('is-switching');
      animations.forEach(animation => animation.cancel());
    };
    finishHomeSectionMotion = finish;
    Promise.all(animations.map(animation => animation.finished)).then(finish, finish);
  }

  function setupHomeSections() {
    const tabs = Array.from(app.querySelectorAll('[data-home-section]'));
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => setHomeSection(tab.dataset.homeSection, { scrollToTabs: true }));
      tab.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = tabs.length - 1;
        else return;
        event.preventDefault();
        setHomeSection(tabs[target].dataset.homeSection, { focus: true, scrollToTabs: true });
      });
    });
    setHomeSection(state.homeSection, { animate: false, remember: false });
  }

  function ensurePersistentViewLayers() {
    if (!CUSTOMER_FEATURES.persistentDetailLayers) return false;
    if (homeViewLayer?.isConnected && detailViewLayer?.isConnected) return true;

    homeViewLayer = document.createElement('div');
    homeViewLayer.className = 'customer-view-layer customer-home-view';
    homeViewLayer.dataset.customerHomeView = '';
    detailViewLayer = document.createElement('div');
    detailViewLayer.className = 'customer-view-layer customer-detail-view';
    detailViewLayer.dataset.customerDetailView = '';
    detailViewLayer.setAttribute('aria-hidden', 'true');
    app.classList.add('has-persistent-view-layers');
    app.replaceChildren(homeViewLayer, detailViewLayer);
    return true;
  }

  function stagePersistentDetailView(animated) {
    if (!ensurePersistentViewLayers()) return;
    app.classList.toggle('is-detail-staging', animated);
    app.classList.toggle('is-detail-active', !animated);
    homeViewLayer.setAttribute('aria-hidden', 'true');
    detailViewLayer.removeAttribute('aria-hidden');
  }

  function activatePersistentDetailView() {
    if (!getAlbumIdFromHash()) return;
    if (!CUSTOMER_FEATURES.persistentDetailLayers || !detailViewLayer?.isConnected) return;
    app.classList.remove('is-detail-staging');
    app.classList.add('is-detail-active');
    homeViewLayer?.setAttribute('aria-hidden', 'true');
    detailViewLayer.removeAttribute('aria-hidden');
  }

  function revealPersistentHomeView(options = {}) {
    if (!CUSTOMER_FEATURES.persistentDetailLayers || !homeViewReady || !homeViewLayer?.isConnected) return false;
    closeDetailCoverViewer({ restoreFocus: false });
    document.body.classList.remove('is-detail-view');
    cancelSwipeDiscoveryHint();
    app.classList.remove('is-detail-staging', 'is-detail-active');
    homeViewLayer.removeAttribute('aria-hidden');
    detailViewLayer?.setAttribute('aria-hidden', 'true');
    setHomeSection(state.homeSection, { animate: false, remember: false });
    const preservedPage = Number.parseInt(homeViewLayer.dataset.preservedAlbumPage || '', 10);
    if (Number.isInteger(preservedPage)) homeAlbumPage = preservedPage;
    state.page = Math.min(getAlbumTotalPages(), Math.max(1, homeAlbumPage));
    const persistentGrid = homeViewLayer.querySelector('[data-album-grid].is-persistent-pager');
    persistentGrid?._pdPager?.resume(state.page);
    refreshRequestTrackUi(app);
    if (persistentGrid) updateAlbumGrid({ preservePersistentTrack: true });
    scheduleSearchToolLabelFit();

    const targetScroll = Number.isFinite(options.scrollY) ? options.scrollY : homeScrollPosition;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(0, targetScroll), left: 0, behavior: 'auto' });
    }));
    return true;
  }

  function renderHome(options = {}) {
    document.querySelector('body > [data-filter-results-jump]')?.remove();
    finishHomeSectionMotion?.();
    app.querySelector('[data-album-grid]')?._pdPager?.destroy();
    closeDetailCoverViewer({ restoreFocus: false });
    document.body.classList.remove('is-detail-view');
    cancelSwipeDiscoveryHint();
    const node = homeTemplate.content.cloneNode(true);
    applyStaticTranslations(node);
    const weekly = getWeeklyAlbum();
    const weeklyButton = node.querySelector('[data-weekly-open]');
    const weeklyHistoryButton = node.querySelector('[data-weekly-history]');
    const weeklyHistoryCount = node.querySelector('[data-weekly-history-count]');
    const weeklyHistoryEntries = getWeeklyHistoryEntries();

    if (weeklyHistoryButton) {
      weeklyHistoryButton.hidden = weeklyHistoryEntries.length === 0;
      weeklyHistoryButton.addEventListener('click', () => openWeeklyHistory(weeklyHistoryButton));
    }
    if (weeklyHistoryCount) weeklyHistoryCount.textContent = String(weeklyHistoryEntries.length);

    if (weekly) {
      const weeklyCover = createCover(weekly, 'weekly-cover-art', { priority: true });
      node.querySelector('[data-weekly-cover]').append(weeklyCover);
      node.querySelector('[data-weekly-format]').textContent = [
        formatLabel(weekly.format),
        getAlbumGenres(weekly).map(genre => getGenreLabel(genre)).join(' · '),
        getAlbumCountry(weekly) === COUNTRY_UNKNOWN ? '' : getCountryLabel(getAlbumCountry(weekly)),
      ].filter(Boolean).join(' · ');
      const weeklyTitle = node.querySelector('[data-weekly-title]');
      weeklyTitle.textContent = weekly.title || t('chooseWeekly');
      const titleLength = Array.from(weeklyTitle.textContent).length;
      weeklyTitle.dataset.titleLength = titleLength > 72 ? 'very-long' : titleLength > 38 ? 'long' : 'normal';
      node.querySelector('[data-weekly-artist]').textContent = getLocalizedArtist(weekly) || '';
      node.querySelector('[data-weekly-year]').textContent = weekly.year ? t('released')(weekly.year) : '';
      node.querySelector('[data-weekly-reason]').textContent = getLocalizedWeeklyReason(weekly);
      const weeklyMotion = setupWeeklyMotion(weeklyButton, weekly);
      weeklyButton.addEventListener('click', event => {
        if (weeklyMotion.shouldSuppressClick()) {
          event.preventDefault();
          return;
        }
        openAlbum(weekly.id, {
          transitionSource: weeklyButton.querySelector('.cover-frame'),
        });
      });
      weeklyButton.addEventListener('pointerdown', () => preloadTransitionCover(weekly, weeklyCover.querySelector('img')?.currentSrc), { passive: true });
      weeklyButton.addEventListener('focus', () => preloadTransitionCover(weekly, weeklyCover.querySelector('img')?.currentSrc));
    } else {
      weeklyButton.disabled = true;
      weeklyButton.classList.add('is-empty');
      node.querySelector('[data-weekly-cover]').append(createFallbackCover({ artist: 'PUNCH-DRUNK', title: t('chooseWeekly') }, 'weekly-cover-art'));
      node.querySelector('[data-weekly-format]').textContent = '';
      node.querySelector('[data-weekly-title]').textContent = t('chooseWeekly');
      node.querySelector('[data-weekly-artist]').textContent = '';
      node.querySelector('[data-weekly-year]').textContent = '';
      node.querySelector('[data-weekly-reason]').textContent = t('weeklyDefaultReason');
    }

    const searchInput = node.querySelector('#search-input');
    const artistScope = node.querySelector('[data-artist-scope]');
    if (state.artist) {
      const artistAlbum = albums.find(item => getArtistKey(item) === normalize(state.artist).normalize('NFC'));
      const artistName = artistAlbum ? getLocalizedArtist(artistAlbum) : state.artist;
      artistScope.hidden = false;
      artistScope.querySelector('[data-artist-scope-label]').textContent = t('artistAlbumsScope')(artistName, getArtistAlbums(artistAlbum).length);
    }
    artistScope.querySelector('[data-clear-artist-scope]').addEventListener('click', () => {
      state.artist = '';
      resetAlbumPage();
      renderHome();
    });
    updateAlbumViewButtons(node);
    node.querySelectorAll('[data-album-view-option]').forEach(button => {
      button.addEventListener('click', () => setAlbumView(button.dataset.albumViewOption));
    });
    const searchClearButton = node.querySelector('[data-search-clear]');
    const updateSearchClearButton = () => {
      searchClearButton.hidden = !searchInput.value;
    };
    searchInput.value = state.query;
    updateSearchClearButton();
    searchInput.addEventListener('input', event => {
      state.query = event.target.value;
      renderAllFilterControls(app);
      resetAlbumPage();
      updateAlbumGrid();
      updateSearchClearButton();
    });
    searchClearButton.addEventListener('click', () => {
      state.query = '';
      searchInput.value = '';
      renderAllFilterControls(app);
      resetAlbumPage();
      updateAlbumGrid();
      updateSearchClearButton();
      searchInput.focus();
    });

    const sortSelect = node.querySelector('[data-sort-select]');
    sortSelect.value = state.sort;
    sortSelect.addEventListener('change', event => {
      state.sort = event.target.value;
      resetAlbumPage();
      updateAlbumGrid();
      updateFilterPanel(app);
    });

    node.querySelector('[data-decade-select]').addEventListener('change', event => {
      state.decade = event.target.value;
      resetAlbumPage();
      renderAllFilterControls(app);
      updateAlbumGrid();
      updateFilterPanel(app);
    });

    node.querySelector('[data-filter-toggle]').addEventListener('click', () => {
      state.filtersExpanded = !state.filtersExpanded;
      updateFilterPanel(app);
      if (state.filtersExpanded) scheduleSearchToolLabelFit();
    });

    node.querySelector('[data-filter-results-jump]').addEventListener('click', () => {
      state.filtersExpanded = false;
      updateFilterPanel(app);
      requestAnimationFrame(() => {
        app.querySelector('[data-grid-section]')?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        });
      });
    });
    const newAlbumsButton = node.querySelector('[data-new-albums]');
    newAlbumsButton.dataset.active = String(state.recentOnly);
    newAlbumsButton.setAttribute('aria-pressed', String(state.recentOnly));
    newAlbumsButton.addEventListener('click', () => {
      state.recentOnly = !state.recentOnly;
      resetAlbumPage();
      renderHome();
    });

    node.querySelector('[data-reset-filters]').addEventListener('click', () => {
      state.query = '';
      state.artist = '';
      state.format = FORMAT_ALL;
      state.genre = GENRE_ALL;
      state.sort = 'default';
      state.decade = '';
      state.recentOnly = false;
      state.filtersExpanded = false;
      resetAlbumPage();
      renderHome();
    });

    node.querySelector('[data-empty-clear-filters]').addEventListener('click', () => {
      // 검색어와 보기 방식은 유지하고 결과를 제한한 조건만 해제합니다.
      state.artist = '';
      state.format = FORMAT_ALL;
      state.genre = GENRE_ALL;
      state.decade = '';
      state.recentOnly = false;
      state.filtersExpanded = false;
      resetAlbumPage();
      renderHome();
      app.querySelector('#search-input')?.focus({ preventScroll: true });
    });

    const requestListButton = node.querySelector('[data-request-list]');
    if (requestListButton) {
      requestListButton.hidden = !CUSTOMER_FEATURES.requestTrackList;
      requestListButton.addEventListener('click', openRequestTrackList);
    }

    renderAllFilterControls(node);
    updateFilterPanel(node);
    setupAlbumSwipe(node.querySelector('[data-grid-section]'));
    if (ensurePersistentViewLayers()) {
      homeViewLayer.replaceChildren(node);
      homeViewReady = true;
      if (options.keepInactive) {
        homeViewLayer.setAttribute('aria-hidden', 'true');
      } else {
        app.classList.remove('is-detail-staging', 'is-detail-active');
        homeViewLayer.removeAttribute('aria-hidden');
        detailViewLayer.setAttribute('aria-hidden', 'true');
      }
    } else {
      app.replaceChildren(node);
    }
    document.body.append(app.querySelector('[data-filter-results-jump]'));
    setupHomeSections();
    refreshRequestTrackUi(app);
    updateAlbumGrid();
    updateFilterResultsJumpVisibility();
    scheduleSearchToolLabelFit();
  }

  function getAlbumAddedTime(album) {
    const explicitTime = Date.parse(album?.addedAt || '');
    if (Number.isFinite(explicitTime)) return explicitTime;

    // 예전 관리자에서 만든 ID에는 생성 시각이 36진수로 들어 있습니다. 날짜 필드가 없는 기존 음반만 보조적으로 판별합니다.
    const idMatch = String(album?.id || '').match(/^album-([a-z0-9]+)(?:-|$)/i);
    if (!idMatch) return 0;
    const inferredTime = Number.parseInt(idMatch[1], 36);
    const oldestAllowed = Date.UTC(2020, 0, 1);
    if (!Number.isFinite(inferredTime) || inferredTime < oldestAllowed || inferredTime > Date.now() + 86400000) return 0;
    return inferredTime;
  }

  function isRecentlyAdded(album) {
    const addedTime = getAlbumAddedTime(album);
    if (!addedTime) return false;
    const age = Date.now() - addedTime;
    return age >= 0 && age <= NEW_ALBUM_DAYS * 24 * 60 * 60 * 1000;
  }

  function renderFormatFilters(container) {
    if (!container) return;
    const formats = getFormatFilterCounts();
    container.replaceChildren(...formats.map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-chip';
      button.textContent = `${item.name === FORMAT_ALL ? t('all') : formatLabel(item.name)} ${item.count}`;
      const active = state.format === item.name;
      button.dataset.active = String(active);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = item.count === 0 && !active;
      button.addEventListener('click', () => {
        state.format = item.name;
        resetAlbumPage();
        renderAllFilterControls();
        updateAlbumGrid();
        updateFilterPanel(app);
      });
      return button;
    }));
  }

  function renderGenreFilters(container) {
    if (!container) return;
    const genres = getGenreFilterCounts();
    container.replaceChildren(...genres.map(genre => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-chip genre-chip';
      button.textContent = `${getGenreLabel(genre.name)} ${genre.count}`;
      const active = state.genre === genre.name;
      button.dataset.active = String(active);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = genre.count === 0 && !active;
      button.addEventListener('click', () => {
        state.genre = genre.name;
        resetAlbumPage();
        renderAllFilterControls();
        updateAlbumGrid();
        updateFilterPanel(app);
      });
      return button;
    }));

  }

  function renderDecadeFilter(select) {
    if (!select) return;
    const options = getDecadeFilterCounts().map(item => {
      const option = document.createElement('option');
      option.value = item.name;
      option.textContent = `${item.name ? t('decadeLabel')(item.name) : t('allDecades')} ${item.count}`;
      option.disabled = item.count === 0 && item.name !== state.decade;
      return option;
    });
    select.replaceChildren(...options);
    select.value = state.decade;
  }

  function renderAllFilterControls(root = app) {
    renderFormatFilters(root.querySelector('[data-format-filters]'));
    renderGenreFilters(root.querySelector('[data-genre-filters]'));
    renderDecadeFilter(root.querySelector('[data-decade-select]'));
  }

  function renderPagination(container, totalAlbums, totalPages) {
    if (!container) return;
    if (totalPages <= 1) {
      container.replaceChildren();
      return;
    }

    const makeButton = (label, page, options = {}) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.page = String(page);
      if (options.className) button.className = options.className;
      if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);
      if (options.title) button.title = options.title;
      if (options.disabled) button.disabled = true;
      button.addEventListener('click', () => {
        if (button.disabled || page === state.page) return;
        goToAlbumPage(page, { scrollToGrid: true });
      });
      return button;
    };

    const controls = document.createElement('div');
    controls.className = 'pagination-controls';

    const paginationLabels = CUSTOMER_FEATURES.typographicPagination
      ? { first: '«', previous: '‹', next: '›', last: '»' }
      : { first: '|<', previous: '<', next: '>', last: '>|' };

    const firstButton = makeButton(paginationLabels.first, 1, {
      className: 'pagination-nav-button is-backward',
      ariaLabel: t('firstAlbumPage'),
      title: t('firstAlbumPage'),
      disabled: state.page === 1,
    });
    const previousButton = makeButton(paginationLabels.previous, Math.max(1, state.page - 1), {
      className: 'pagination-nav-button is-backward',
      ariaLabel: t('previousAlbumPage'),
      title: t('previousAlbumPage'),
      disabled: state.page === 1,
    });

    const picker = document.createElement('details');
    picker.className = 'pagination-page-picker';
    const pickerSummary = document.createElement('summary');
    pickerSummary.className = 'pagination-page-summary';
    pickerSummary.setAttribute('aria-label', `${t('chooseAlbumPage')}: ${state.page} / ${totalPages}`);

    const pickerStatus = document.createElement('span');
    pickerStatus.textContent = `${state.page} / ${totalPages}`;
    const pickerChevron = document.createElement('span');
    pickerChevron.className = 'pagination-page-chevron';
    pickerChevron.textContent = '▾';
    pickerChevron.setAttribute('aria-hidden', 'true');
    pickerSummary.append(pickerStatus, pickerChevron);

    const pickerPanel = document.createElement('div');
    pickerPanel.className = 'pagination-page-panel';
    const pickerHeading = document.createElement('div');
    pickerHeading.className = 'pagination-page-heading';
    const pickerTitle = document.createElement('strong');
    pickerTitle.textContent = t('chooseAlbumPage');
    const pickerPosition = document.createElement('span');
    pickerPosition.textContent = `${state.page} / ${totalPages}`;
    pickerHeading.append(pickerTitle, pickerPosition);

    const pageGrid = document.createElement('div');
    pageGrid.className = 'pagination-page-grid';
    pageGrid.setAttribute('role', 'list');
    for (let page = 1; page <= totalPages; page += 1) {
      const pageButton = document.createElement('button');
      pageButton.type = 'button';
      pageButton.className = 'pagination-page-number';
      pageButton.textContent = String(page);
      pageButton.dataset.page = String(page);
      pageButton.setAttribute('aria-label', t('pageStatus')(page, totalPages));
      if (page === state.page) {
        pageButton.dataset.current = 'true';
        pageButton.setAttribute('aria-current', 'page');
      }
      pageButton.addEventListener('click', () => {
        picker.removeAttribute('open');
        if (page === state.page) return;
        goToAlbumPage(page, { scrollToGrid: true });
      });
      pageGrid.append(pageButton);
    }

    const pageForm = document.createElement('form');
    pageForm.className = 'pagination-page-form';
    const pageLabel = document.createElement('label');
    pageLabel.textContent = t('pageNumber');
    const pageInput = document.createElement('input');
    pageInput.type = 'number';
    pageInput.inputMode = 'numeric';
    pageInput.min = '1';
    pageInput.max = String(totalPages);
    pageInput.value = String(state.page);
    pageInput.setAttribute('aria-label', t('pageNumber'));
    const pageSubmit = document.createElement('button');
    pageSubmit.type = 'submit';
    pageSubmit.textContent = t('goToPage');
    pageLabel.append(pageInput);
    pageForm.append(pageLabel, pageSubmit);
    pageForm.addEventListener('submit', event => {
      event.preventDefault();
      const requestedPage = Math.min(totalPages, Math.max(1, Number.parseInt(pageInput.value, 10) || state.page));
      picker.removeAttribute('open');
      if (requestedPage === state.page) return;
      goToAlbumPage(requestedPage, { scrollToGrid: true });
    });

    pickerPanel.append(pickerHeading, pageGrid, pageForm);
    picker.append(pickerSummary, pickerPanel);
    picker.addEventListener('toggle', () => {
      if (!picker.open) return;
      requestAnimationFrame(() => {
        picker.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
      });
    });
    picker.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !picker.open) return;
      event.preventDefault();
      picker.removeAttribute('open');
      pickerSummary.focus();
    });

    const nextButton = makeButton(paginationLabels.next, Math.min(totalPages, state.page + 1), {
      className: 'pagination-nav-button is-forward',
      ariaLabel: t('nextAlbumPage'),
      title: t('nextAlbumPage'),
      disabled: state.page === totalPages,
    });
    const lastButton = makeButton(paginationLabels.last, totalPages, {
      className: 'pagination-nav-button is-forward',
      ariaLabel: t('lastAlbumPage'),
      title: t('lastAlbumPage'),
      disabled: state.page === totalPages,
    });

    controls.append(firstButton, previousButton, picker, nextButton, lastButton);
    container.replaceChildren(controls);
  }

  function createAlbumCard(album, options = {}) {
    const cardOptions = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    const card = document.createElement('button');
    const recentlyAdded = isRecentlyAdded(album);
    const searchMatchType = getSearchMatchType(album);
    const matchingTracks = getTrackSearchMatches(album);
    const trackSearchQuery = getTrackSearchQuery(album);
    card.type = 'button';
    card.className = 'album-card';
    card.dataset.albumId = album.id;
    card.dataset.recent = String(recentlyAdded);
    card.addEventListener('click', event => {
      if (Date.now() < suppressAlbumCardClickUntil) {
        event.preventDefault();
        return;
      }
      openAlbum(album.id, {
        trackSearchQuery,
        transitionSource: cover,
      });
    });
    const cover = createCover(album, 'grid-cover', { priority: cardOptions.priorityCover === true });
    // 현재 페이지와 양옆 페이지는 상세용 원본까지 미리 준비해, 넘긴 직후 눌러도 같은 화질로 확대합니다.
    const preloadCardCover = () => preloadTransitionCover(album, String(album.coverImage || '').trim());
    if (CUSTOMER_FEATURES.sharpDetailCoverTransition && cardOptions.priorityCover === true) preloadCardCover();
    card.addEventListener('pointerdown', preloadCardCover, { passive: true });
    card.addEventListener('focus', preloadCardCover);
    card.addEventListener('mouseenter', preloadCardCover, { once: true });
    if (recentlyAdded) {
      const badge = document.createElement('span');
      badge.className = 'album-card-new';
      badge.textContent = 'NEW';
      badge.setAttribute('aria-label', state.language === 'ko' ? '최근 등록 음반' : 'Recently added');
      cover.append(badge);
    }
    card.append(cover);

    const meta = document.createElement('span');
    meta.className = 'album-card-meta';
    meta.innerHTML = `<strong class="album-card-artist">${escapeHtml(getLocalizedArtist(album) || '')}</strong><em class="album-card-title">${escapeHtml(album.title || '')}</em>`;
    const facts = document.createElement('span');
    facts.className = 'album-card-facts';
    [
      getAlbumGenres(album).map(genre => getGenreLabel(genre)).join(', '),
      getAlbumCountry(album) === COUNTRY_UNKNOWN ? '' : getCountryLabel(getAlbumCountry(album)),
      String(album.year || '').trim(),
      formatLabel(album.format),
    ]
      .filter(Boolean).forEach(value => {
        const fact = document.createElement('span');
        fact.textContent = value;
        facts.append(fact);
      });
    meta.append(facts);
    card.append(meta);

    const matchLabel = getSearchMatchLabel(album, searchMatchType);
    if (matchLabel) {
      const match = document.createElement('span');
      match.className = 'album-card-match';
      match.textContent = matchLabel;
      card.append(match);
    }

    if (matchingTracks.length) {
      const trackMatch = document.createElement('span');
      trackMatch.className = 'album-card-track-match';
      const parts = splitTrackLine(matchingTracks[0].track);
      const firstTrack = [parts.number.replace(/\.$/, ''), parts.title].filter(Boolean).join(' · ');
      trackMatch.textContent = firstTrack;
      if (matchingTracks.length > 1) {
        const count = document.createElement('span');
        count.className = 'album-card-track-count';
        count.textContent = t('moreMatchedTracks')(matchingTracks.length - 1);
        trackMatch.append(document.createTextNode(' · '), count);
      }
      trackMatch.title = matchingTracks.map(({ track }) => track).join('\n');
      card.append(trackMatch);
    }

    return card;
  }

  function getPageAlbums(list, page, perPage) {
    const start = (page - 1) * perPage;
    return list.slice(start, start + perPage);
  }

  function renderAlbumGridPage(albums, options = {}) {
    const page = document.createElement('div');
    page.className = `album-grid-page${options.empty ? ' is-empty' : ''}`;
    if (Number.isInteger(options.page)) page.dataset.page = String(options.page);
    if (options.hidden) {
      page.setAttribute('aria-hidden', 'true');
      page.inert = true;
    }
    page.replaceChildren(...albums.map(album => createAlbumCard(album, {
      priorityCover: options.priorityCovers === true,
    })));
    return page;
  }

  function setPersistentPagerCurrentPage(grid, pageNumber) {
    Array.from(grid.children).forEach((page, index) => {
      const active = index + 1 === pageNumber;
      page.inert = !active;
      if (active) page.removeAttribute('aria-hidden');
      else page.setAttribute('aria-hidden', 'true');
    });
  }

  function renderPersistentMobileGrid(grid, filtered, perPage, totalPages) {
    grid.classList.add('is-persistent-pager');
    grid.classList.remove('is-swipe-pager', 'is-dragging', 'is-touching');
    delete grid.dataset.slide;

    const pages = Array.from({ length: totalPages }, (_, index) => renderAlbumGridPage([], {
      page: index + 1,
      hidden: index + 1 !== state.page,
    }));
    grid.replaceChildren(...pages);

    const hydrateRadius = USES_SHARED_HIGH_QUALITY_COVERS ? 1 : 2;
    const hydrate = centerPage => {
      const firstPage = Math.max(1, centerPage - hydrateRadius);
      const lastPage = Math.min(totalPages, centerPage + hydrateRadius);
      for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
        const page = grid.children[pageNumber - 1];
        if (!page || page.dataset.hydrated === 'true') continue;
        const pageAlbums = getPageAlbums(filtered, pageNumber, perPage);
        const priority = Math.abs(pageNumber - centerPage) <= 1;
        page.replaceChildren(...pageAlbums.map(album => createAlbumCard(album, { priorityCover: priority })));
        page.dataset.hydrated = 'true';
      }
    };

    const releaseDistantPages = centerPage => {
      if (!USES_SHARED_HIGH_QUALITY_COVERS) return;
      Array.from(grid.children).forEach((page, index) => {
        if (Math.abs(index + 1 - centerPage) <= 1 || page.dataset.hydrated !== 'true') return;
        page.replaceChildren();
        delete page.dataset.hydrated;
      });
    };

    let scrollFrame = 0;
    let settleTimer = 0;
    let programmaticTarget = null;
    let suspended = false;

    const getPositionPage = () => {
      const width = grid.clientWidth || 1;
      return Math.min(totalPages, Math.max(1, Math.round(grid.scrollLeft / width) + 1));
    };

    const hydrateVisibleRange = () => {
      const width = grid.clientWidth || 1;
      const rawPage = grid.scrollLeft / width + 1;
      hydrate(Math.min(totalPages, Math.max(1, Math.round(rawPage))));
      hydrate(Math.min(totalPages, Math.max(1, Math.floor(rawPage))));
      hydrate(Math.min(totalPages, Math.max(1, Math.ceil(rawPage))));
    };

    const settle = () => {
      window.clearTimeout(settleTimer);
      if (suspended) return;
      const settledPage = programmaticTarget || getPositionPage();
      programmaticTarget = null;
      hydrate(settledPage);
      setPersistentPagerCurrentPage(grid, settledPage);
      if (state.page !== settledPage) state.page = settledPage;
      releaseDistantPages(settledPage);
      updateAlbumGrid({ preservePersistentTrack: true });
    };

    grid._pdPager = {
      hydrate,
      goTo(pageNumber, behavior = 'smooth') {
        const targetPage = Math.min(totalPages, Math.max(1, pageNumber));
        programmaticTarget = targetPage;
        hydrate(targetPage);
        setPersistentPagerCurrentPage(grid, targetPage);
        grid.scrollTo({ left: (targetPage - 1) * grid.clientWidth, top: 0, behavior });
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(settle, behavior === 'smooth' ? 520 : 40);
      },
      realign() {
        hydrate(state.page);
        releaseDistantPages(state.page);
        grid.scrollTo({ left: (state.page - 1) * grid.clientWidth, top: 0, behavior: 'auto' });
        setPersistentPagerCurrentPage(grid, state.page);
      },
      suspend() {
        suspended = true;
        programmaticTarget = null;
        window.clearTimeout(settleTimer);
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        scrollFrame = 0;
      },
      resume(pageNumber) {
        const targetPage = Math.min(totalPages, Math.max(1, pageNumber));
        suspended = false;
        programmaticTarget = null;
        window.clearTimeout(settleTimer);
        hydrate(targetPage);
        releaseDistantPages(targetPage);
        grid.scrollTo({ left: (targetPage - 1) * grid.clientWidth, top: 0, behavior: 'auto' });
        setPersistentPagerCurrentPage(grid, targetPage);
      },
      destroy() {
        suspended = true;
        programmaticTarget = null;
        window.clearTimeout(settleTimer);
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        cancelAnimationFrame(alignFrame);
        grid.removeEventListener('scroll', onScroll);
        grid.removeEventListener('scrollend', settle);
      },
    };

    const onScroll = () => {
      if (suspended) return;
      suppressAlbumCardClickUntil = Date.now() + 180;
      markSwipeDiscoveryHintSeen();
      cancelSwipeDiscoveryHint();
      if (!scrollFrame) {
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          hydrateVisibleRange();
        });
      }
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 110);
    };
    grid.addEventListener('scroll', onScroll, { passive: true });
    if ('onscrollend' in window) grid.addEventListener('scrollend', settle, { passive: true });

    hydrate(state.page);
    releaseDistantPages(state.page);
    const alignFrame = requestAnimationFrame(() => grid._pdPager?.realign());
  }

  function renderMobileSwipeGrid(grid, filtered, perPage, totalPages) {
    grid.classList.add('is-swipe-pager');
    grid.classList.remove('is-dragging', 'is-touching');
    delete grid.dataset.slide;

    const track = document.createElement('div');
    track.className = 'album-swipe-track';
    track.style.transform = 'translate3d(-100%, 0, 0)';

    const previousAlbums = state.page > 1 ? getPageAlbums(filtered, state.page - 1, perPage) : [];
    const currentAlbums = getPageAlbums(filtered, state.page, perPage);
    const nextAlbums = state.page < totalPages ? getPageAlbums(filtered, state.page + 1, perPage) : [];

    track.append(
      renderAlbumGridPage(previousAlbums, {
        hidden: true,
        empty: state.page <= 1,
        priorityCovers: CUSTOMER_FEATURES.smoothSwipeTracking,
      }),
      renderAlbumGridPage(currentAlbums, { priorityCovers: CUSTOMER_FEATURES.smoothSwipeTracking }),
      renderAlbumGridPage(nextAlbums, {
        hidden: true,
        empty: state.page >= totalPages,
        priorityCovers: CUSTOMER_FEATURES.smoothSwipeTracking,
      })
    );

    grid.replaceChildren(track);
  }

  function setSwipeTrackOffset(track, offset) {
    track.style.transform = `translate3d(calc(-100% + ${offset}px), 0, 0)`;
  }

  function recenterSettledSwipeTrack(track, targetPage, direction) {
    if (!track || !CUSTOMER_FEATURES.smoothSwipeTracking) return false;
    const filtered = getVisibleAlbums();
    const perPage = getAlbumsPerPage();
    const totalPages = getAlbumPageCount(filtered.length, perPage);
    if (targetPage < 1 || targetPage > totalPages || track.children.length !== 3) return false;

    track.style.transition = 'none';
    if (direction === 'next') {
      track.firstElementChild?.remove();
      const nextPage = targetPage + 1;
      track.append(renderAlbumGridPage(
        nextPage <= totalPages ? getPageAlbums(filtered, nextPage, perPage) : [],
        {
          hidden: true,
          empty: nextPage > totalPages,
          priorityCovers: true,
        }
      ));
    } else if (direction === 'previous') {
      track.lastElementChild?.remove();
      const previousPage = targetPage - 1;
      track.prepend(renderAlbumGridPage(
        previousPage >= 1 ? getPageAlbums(filtered, previousPage, perPage) : [],
        {
          hidden: true,
          empty: previousPage < 1,
          priorityCovers: true,
        }
      ));
    } else {
      return false;
    }

    Array.from(track.children).forEach((page, index) => {
      if (index === 1) page.removeAttribute('aria-hidden');
      else page.setAttribute('aria-hidden', 'true');
    });
    // 노드를 한 칸 회전시키는 것과 기준점을 되돌리는 것을 같은 프레임에 처리해 화면이 번쩍이지 않습니다.
    track.style.transform = 'translate3d(-100%, 0, 0)';
    track.getBoundingClientRect();
    track.style.transition = '';
    return true;
  }

  function settleAlbumSwipe(section, swipe, targetPage, targetTransform) {
    const track = swipe.track;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(swipe.settleTimer);
      section.classList.remove('is-swiping');
      swipe.grid?.classList.remove('is-dragging', 'is-touching');
      if (targetPage !== state.page) {
        const previousPage = state.page;
        state.page = targetPage;
        const direction = targetPage > previousPage ? 'next' : 'previous';
        const keptTrack = recenterSettledSwipeTrack(track, targetPage, direction);
        updateAlbumGrid({ preserveMobileTrack: keptTrack });
      } else if (track) {
        track.style.transition = '';
        track.style.transform = 'translate3d(-100%, 0, 0)';
      }
      swipe.active = false;
      swipe.dragging = false;
      swipe.axis = null;
      swipe.pointerId = null;
      swipe.track = null;
      swipe.grid = null;
      section.dataset.swiping = 'false';
    };

    if (!track) {
      finish();
      return;
    }

    if (swipe.frameId) {
      window.cancelAnimationFrame(swipe.frameId);
      swipe.frameId = 0;
      setSwipeTrackOffset(track, swipe.pendingOffset);
    }

    // 현재 손가락 위치를 먼저 확정해야 놓는 순간부터 자연스럽게 이어집니다.
    track.getBoundingClientRect();
    const distanceRatio = targetPage === state.page
      ? Math.min(1, Math.abs(swipe.pendingOffset) / Math.max(1, swipe.width))
      : Math.min(1, Math.abs(swipe.width - Math.abs(swipe.pendingOffset)) / Math.max(1, swipe.width));
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 1
      : Math.round(150 + distanceRatio * 100);
    track.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.78, 0.18, 1)`;
    track.style.transform = targetTransform;
    track.addEventListener('transitionend', finish, { once: true });
    swipe.settleTimer = window.setTimeout(finish, duration + 80);
  }

  function setupAlbumSwipe(section) {
    if (!section) return;
    const swipe = {
      active: false,
      dragging: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastTime: 0,
      startTime: 0,
      velocityX: 0,
      width: 0,
      totalPages: 1,
      axis: null,
      pointerId: null,
      track: null,
      grid: null,
      pendingOffset: 0,
      frameId: 0,
      settleTimer: 0,
    };

    const queueSwipeOffset = offset => {
      swipe.pendingOffset = offset;
      if (swipe.frameId) return;
      swipe.frameId = window.requestAnimationFrame(() => {
        swipe.frameId = 0;
        if (swipe.track) setSwipeTrackOffset(swipe.track, swipe.pendingOffset);
      });
    };

    const clearSwipe = () => {
      if (swipe.frameId) {
        window.cancelAnimationFrame(swipe.frameId);
        swipe.frameId = 0;
      }
      swipe.active = false;
      swipe.dragging = false;
      swipe.axis = null;
      swipe.pointerId = null;
      swipe.track = null;
      swipe.grid?.classList.remove('is-dragging', 'is-touching');
      swipe.grid = null;
      section.dataset.swiping = 'false';
    };

    section.addEventListener('pointerdown', event => {
      if (!isMobileAlbumPager() || event.button > 0) return;
      if (event.target.closest('[data-pagination]')) return;
      const grid = section.querySelector('[data-album-grid]');
      const track = grid?.querySelector('.album-swipe-track');
      if (!grid || !track || getAlbumTotalPages() <= 1) return;

      if (section.classList.contains('is-swipe-hinting')) cancelSwipeDiscoveryHint();
      window.clearTimeout(swipe.settleTimer);
      swipe.active = true;
      swipe.dragging = false;
      swipe.axis = null;
      swipe.startX = event.clientX;
      swipe.startY = event.clientY;
      swipe.lastX = event.clientX;
      swipe.lastTime = performance.now();
      swipe.startTime = swipe.lastTime;
      swipe.velocityX = 0;
      swipe.width = grid.getBoundingClientRect().width || window.innerWidth;
      swipe.totalPages = getAlbumTotalPages();
      swipe.pointerId = event.pointerId;
      swipe.grid = grid;
      swipe.track = track;
      swipe.pendingOffset = 0;
      track.style.transition = 'none';
      grid.classList.add('is-touching');
      section.dataset.swiping = 'false';
    });

    section.addEventListener('pointermove', event => {
      if (!swipe.active || event.pointerId !== swipe.pointerId || !swipe.track) return;
      const deltaX = event.clientX - swipe.startX;
      const deltaY = event.clientY - swipe.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (!swipe.dragging) {
        if (absX < 4 && absY < 4) return;

        // 세로 스크롤은 그대로 두되, 대각선 가로 스와이프는 조금 더 빨리 붙잡습니다.
        const clearlyVertical = absY >= 9 && absY > absX * 1.3;
        if (clearlyVertical) {
          swipe.axis = 'y';
          clearSwipe();
          return;
        }

        const horizontalIntent = absX >= 5 && absX >= absY * 0.72;
        if (!horizontalIntent) return;
        markSwipeDiscoveryHintSeen();
        cancelSwipeDiscoveryHint();
        swipe.axis = 'x';
        swipe.dragging = true;
        suppressAlbumCardClickUntil = Date.now() + 500;
        swipe.grid.classList.add('is-dragging');
        section.dataset.swiping = 'true';
        swipe.lastX = event.clientX;
        swipe.lastTime = performance.now();
        try {
          section.setPointerCapture(event.pointerId);
        } catch (error) {
          console.warn(error);
        }
      }

      event.preventDefault();
      const now = performance.now();
      const elapsed = Math.max(1, now - swipe.lastTime);
      const instantVelocity = (event.clientX - swipe.lastX) / elapsed;
      swipe.velocityX = swipe.velocityX * 0.56 + instantVelocity * 0.44;
      swipe.lastX = event.clientX;
      swipe.lastTime = now;

      // 모바일 스와이프: 손가락이 움직이는 만큼 앨범 트랙도 같이 움직입니다.
      let offset = deltaX;
      if ((state.page <= 1 && deltaX > 0) || (state.page >= swipe.totalPages && deltaX < 0)) {
        offset = deltaX * 0.28;
      }
      const limit = swipe.width * 1.08;
      offset = Math.max(-limit, Math.min(limit, offset));
      queueSwipeOffset(offset);
    }, { passive: false });

    section.addEventListener('pointerup', event => {
      if (!swipe.active || event.pointerId !== swipe.pointerId) return;
      const deltaX = event.clientX - swipe.startX;
      const deltaY = event.clientY - swipe.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const totalPages = getAlbumTotalPages();

      if (!swipe.dragging) {
        clearSwipe();
        return;
      }

      suppressAlbumCardClickUntil = Date.now() + 500;
      const now = performance.now();
      const duration = Math.max(1, now - swipe.startTime);
      const releaseDelay = Math.max(0, now - swipe.lastTime);
      const recentVelocity = swipe.velocityX * Math.max(0, 1 - releaseDelay / 140);
      const averageVelocity = deltaX / duration;
      const releaseVelocity = Math.abs(recentVelocity) > Math.abs(averageVelocity)
        ? recentVelocity
        : averageVelocity * 0.65;
      const threshold = Math.min(82, Math.max(36, swipe.width * 0.17));
      const projectedX = deltaX + releaseVelocity * 135;
      const horizontalIntent = absX >= 14 && absX >= absY * 0.68;
      const wantsNext = horizontalIntent && projectedX < -threshold && state.page < totalPages;
      const wantsPrev = horizontalIntent && projectedX > threshold && state.page > 1;

      if (wantsNext) {
        settleAlbumSwipe(section, swipe, state.page + 1, 'translate3d(-200%, 0, 0)');
        return;
      }
      if (wantsPrev) {
        settleAlbumSwipe(section, swipe, state.page - 1, 'translate3d(0%, 0, 0)');
        return;
      }
      settleAlbumSwipe(section, swipe, state.page, 'translate3d(-100%, 0, 0)');
    });

    section.addEventListener('pointercancel', () => {
      if (swipe.dragging && swipe.track) {
        settleAlbumSwipe(section, swipe, state.page, 'translate3d(-100%, 0, 0)');
      } else {
        clearSwipe();
      }
    });
  }

  function updateAlbumGrid(options = {}) {
    updateRandomAlbumButtons();
    const grid = app.querySelector('[data-album-grid]');
    if (!grid) return;
    const empty = app.querySelector('[data-empty-message]');
    const summary = app.querySelector('[data-result-summary]');
    const pagination = app.querySelector('[data-pagination]');
    const filtered = getVisibleAlbums();
    const filterResultsJump = document.querySelector('body > [data-filter-results-jump]');
    if (filterResultsJump) filterResultsJump.textContent = t('filterResultsJump')(filtered.length);
    const perPage = getAlbumsPerPage();
    const previousPerPage = Number(grid.dataset.perPage);
    const view = getEffectiveAlbumView();
    const layoutChanged = grid.dataset.albumView !== view || previousPerPage !== perPage;
    if (previousPerPage && previousPerPage !== perPage) {
      // 새 레이아웃에서도 이전 페이지의 첫 음반을 포함하는 페이지로 이동합니다.
      state.page = Math.floor((state.page - 1) * previousPerPage / perPage) + 1;
    }
    if (layoutChanged) options = { ...options, preservePersistentTrack: false, preserveMobileTrack: false };
    grid.dataset.albumView = view;
    grid.dataset.perPage = String(perPage);
    const totalPages = getAlbumPageCount(filtered.length, perPage);
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    if (layoutChanged && document.body.classList.contains('is-detail-view') && homeViewLayer) {
      homeAlbumPage = state.page;
      homeViewLayer.dataset.preservedAlbumPage = String(state.page);
    }
    if (!options.preservePersistentTrack) {
      grid._pdPager?.destroy();
      delete grid._pdPager;
    }
    const start = (state.page - 1) * perPage;
    const pagedAlbums = getPageAlbums(filtered, state.page, perPage);
    const shownStart = filtered.length ? start + 1 : 0;
    const shownEnd = Math.min(start + perPage, filtered.length);

    const baseFormatText = state.format === FORMAT_ALL ? t('all') : formatLabel(state.format);
    const summaryPrefixes = [];
    if (state.recentOnly) summaryPrefixes.push(t('newAlbums'));
    const formatText = [...summaryPrefixes, baseFormatText].join(' · ');
    const genreText = [getGenreLabel(state.genre), state.decade ? t('decadeLabel')(state.decade) : '']
      .filter(Boolean).join(' · ');
    summary.textContent = t('resultSummary')({
      format: formatText,
      genre: genreText,
      total: filtered.length,
      start: shownStart,
      end: shownEnd,
    });

    if (isMobileAlbumPager() && filtered.length && totalPages > 1 && CUSTOMER_FEATURES.nativeMobilePager && options.preservePersistentTrack && grid.classList.contains('is-persistent-pager')) {
      grid.classList.remove('is-dragging', 'is-touching');
      delete grid.dataset.slide;
      if (options.realignPersistentTrack) requestAnimationFrame(() => grid._pdPager?.realign());
    } else if (isMobileAlbumPager() && filtered.length && totalPages > 1 && CUSTOMER_FEATURES.nativeMobilePager) {
      renderPersistentMobileGrid(grid, filtered, perPage, totalPages);
    } else if (isMobileAlbumPager() && filtered.length && totalPages > 1 && options.preserveMobileTrack) {
      grid.classList.remove('is-dragging', 'is-touching');
      delete grid.dataset.slide;
    } else if (isMobileAlbumPager() && filtered.length && totalPages > 1) {
      renderMobileSwipeGrid(grid, filtered, perPage, totalPages);
    } else {
      grid.classList.remove('is-persistent-pager', 'is-swipe-pager', 'is-dragging', 'is-touching');
      delete grid._pdPager;
      grid.replaceChildren(...pagedAlbums.map(createAlbumCard));
      if (options.direction) {
        grid.dataset.slide = options.direction;
        window.setTimeout(() => {
          if (grid.dataset.slide === options.direction) delete grid.dataset.slide;
        }, 260);
      } else {
        delete grid.dataset.slide;
      }
    }

    const hasRestrictingFilters = Boolean(state.artist || state.format !== FORMAT_ALL
      || state.genre !== GENRE_ALL || state.decade || state.recentOnly);
    empty.querySelector('[data-empty-title]').textContent = t(hasRestrictingFilters ? 'emptyAlbums' : 'emptyAllAlbums');
    empty.querySelector('[data-empty-clear-filters]').hidden = !hasRestrictingFilters;
    empty.hidden = filtered.length !== 0;
    refreshRequestTrackUi(app);
    renderPagination(pagination, filtered.length, totalPages);
    if (state.homeSection === 'catalog') scheduleSwipeDiscoveryHint(app.querySelector('[data-grid-section]'), totalPages);
    if (options.scrollToGrid) {
      app.querySelector('.grid-section')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    syncBrowseUrl();
  }

  function hideArtistAlbums() {
    artistAlbumsOverlay?.remove();
    artistAlbumsOverlay = null;
    document.body.classList.remove('artist-albums-open');
    if (artistAlbumsTrigger?.isConnected) artistAlbumsTrigger.focus({ preventScroll: true });
    artistAlbumsClosing = false;
  }

  function closeArtistAlbums(afterClose) {
    if (!artistAlbumsOverlay || artistAlbumsClosing) return;
    afterArtistAlbumsClose = typeof afterClose === 'function' ? afterClose : null;
    if (history.state?.artistAlbums) {
      artistAlbumsClosing = true;
      history.back();
      return;
    }
    hideArtistAlbums();
    const callback = afterArtistAlbumsClose;
    afterArtistAlbumsClose = null;
    callback?.();
  }

  function openArtistAlbums(album, trigger, options = {}) {
    if (artistAlbumsOverlay || !getRelatedArtistAlbums(album).length) return;
    artistAlbumsTrigger = trigger || document.activeElement;
    artistAlbumsBaseUrl = window.location.href;
    if (!options.fromHistory) {
      history.pushState({ ...history.state, artistAlbums: true, artistPopupAlbumId: album.id }, '', artistAlbumsBaseUrl);
    }

    const overlay = document.createElement('div');
    overlay.className = 'artist-albums-overlay';
    const panel = document.createElement('section');
    panel.className = 'artist-albums-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'artist-albums-title');
    const header = document.createElement('header');
    header.className = 'artist-albums-header';
    const title = document.createElement('h2');
    title.id = 'artist-albums-title';
    title.textContent = t('artistAlbumsButton');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'artist-albums-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', t('artistAlbumsClose'));
    closeButton.addEventListener('click', () => closeArtistAlbums());
    header.append(title, closeButton);

    const choices = getArtistChoices(album);
    panel.classList.toggle('has-selector', choices.length > 1);
    const selector = document.createElement('div');
    selector.className = 'artist-albums-selector';
    selector.setAttribute('role', 'group');
    selector.setAttribute('aria-label', t('artistAlbumsChoose'));
    const list = document.createElement('div');
    list.className = 'artist-albums-list';
    const showAlbums = artistId => {
      selector.querySelectorAll('button').forEach(button => {
        const selected = button.dataset.artistId === artistId;
        button.setAttribute('aria-pressed', String(selected));
      });
      const related = getRelatedArtistAlbums(album, artistId);
      if (!related.length) {
        const empty = document.createElement('p');
        empty.className = 'artist-albums-empty';
        empty.textContent = t('artistAlbumsEmpty');
        list.replaceChildren(empty);
        return;
      }
      list.replaceChildren(...related.map(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'artist-albums-item';
        const isCurrent = item.id === album.id;
        if (isCurrent) {
          button.classList.add('is-current');
          button.setAttribute('aria-current', 'page');
        }
        const cover = createCover(item, 'artist-albums-cover');
        const info = document.createElement('span');
        info.className = 'artist-albums-info';
        const albumTitle = document.createElement('strong');
        albumTitle.textContent = item.title || '';
        const artist = document.createElement('span');
        artist.className = 'artist-albums-artist';
        artist.textContent = getLocalizedArtist(item) || '';
        const facts = document.createElement('small');
        facts.textContent = [formatLabel(item.format), getAlbumGenres(item).map(genre => getGenreLabel(genre)).join(', '), item.year].filter(Boolean).join(' · ');
        info.append(albumTitle, artist, facts);
        if (isCurrent) {
          const current = document.createElement('span');
          current.className = 'artist-albums-current';
          current.textContent = t('artistAlbumsCurrent');
          info.append(current);
        }
        button.append(cover, info);
        button.addEventListener('click', () => closeArtistAlbums(isCurrent ? undefined : () => openAlbum(item.id)));
        return button;
      }));
      list.scrollTop = 0;
    };
    if (choices.length > 1) {
      [{ id: '', ko: t('artistAlbumsAll'), en: t('artistAlbumsAll') }, ...choices].forEach(choice => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.artistId = choice.id;
        button.textContent = choice.id ? (state.language === 'en' ? choice.en : choice.ko) : t('artistAlbumsAll');
        button.addEventListener('click', () => showAlbums(choice.id));
        selector.append(button);
      });
      panel.append(header, selector, list);
    } else {
      panel.append(header, list);
    }
    overlay.append(panel);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeArtistAlbums();
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeArtistAlbums();
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll('button:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.body.append(overlay);
    artistAlbumsOverlay = overlay;
    document.body.classList.add('artist-albums-open');
    showAlbums('');
    closeButton.focus({ preventScroll: true });
  }

  function renderDetail(albumId, options = {}) {
    document.querySelector('body > [data-filter-results-jump]')?.setAttribute('hidden', '');
    document.body.classList.toggle('is-detail-view', CUSTOMER_FEATURES.compactDetailHeader);
    const album = albums.find(item => item.id === albumId) || getWeeklyAlbum();
    if (!album) return renderHome();
    const persistentLayers = ensurePersistentViewLayers();
    const detailRoot = persistentLayers ? detailViewLayer : app;

    const node = detailTemplate.content.cloneNode(true);
    applyStaticTranslations(node);
    node.querySelectorAll('[data-request-list]').forEach(button => button.addEventListener('click', openRequestTrackList));
    node.querySelector('[data-history-back]').addEventListener('click', goPreviousView);
    node.querySelector('[data-album-list]').addEventListener('click', goAlbumList);
    const detailCoverWrap = node.querySelector('[data-detail-cover]');
    detailCoverWrap.append(createCover(album, 'detail-cover', { priority: true }));
    if (CUSTOMER_FEATURES.detailCoverViewer && String(album.coverImage || '').trim()) {
      detailCoverWrap.classList.add('is-expandable');
      detailCoverWrap.tabIndex = 0;
      detailCoverWrap.setAttribute('role', 'button');
      detailCoverWrap.setAttribute('aria-label', state.language === 'ko' ? '앨범 커버 크게 보기' : 'Expand album cover');
      const expandIcon = document.createElement('span');
      expandIcon.className = 'detail-cover-expand-icon';
      expandIcon.textContent = '⛶';
      expandIcon.setAttribute('aria-hidden', 'true');
      detailCoverWrap.append(expandIcon);
      detailCoverWrap.addEventListener('click', () => openDetailCoverViewer(album, detailCoverWrap));
      detailCoverWrap.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openDetailCoverViewer(album, detailCoverWrap);
      });
    }
    node.querySelector('[data-detail-title]').textContent = album.title || '';
    node.querySelector('[data-detail-artist]').textContent = getLocalizedArtist(album) || '';
    const artistAlbumsButton = node.querySelector('[data-artist-albums]');
    if (getRelatedArtistAlbums(album).length) {
      artistAlbumsButton.hidden = false;
      artistAlbumsButton.textContent = t('artistAlbumsButton');
      artistAlbumsButton.addEventListener('click', () => openArtistAlbums(album, artistAlbumsButton));
    }

    const tags = [
      formatLabel(album.format),
      ...getAlbumGenres(album).map(genre => getGenreLabel(genre)),
      getAlbumCountry(album) === COUNTRY_UNKNOWN ? '' : getCountryLabel(getAlbumCountry(album)),
      album.year,
    ].filter(Boolean);
    node.querySelector('[data-detail-tags]').replaceChildren(...tags.map(tag => {
      const span = document.createElement('span');
      span.className = 'pill';
      span.textContent = tag;
      return span;
    }));
    const detailPageNode = node.querySelector('.detail-page');
    detailPageNode.dataset.albumId = String(album.id);

    const populateDetailContent = root => {
      const activeDetailPage = root.querySelector('.detail-page');
      if (!activeDetailPage || activeDetailPage.dataset.albumId !== String(album.id)) return '';

      const trackList = root.querySelector('[data-detail-tracklist]');
      const hasTracklist = Boolean(album.tracklist && album.tracklist.length);
      const tracks = hasTracklist ? album.tracklist : [t('tracklistEmpty')];
      const recommendedTracks = album.recommendedTracks || [];
      const trackSearchQuery = state.detailTrackSearch?.albumId === album.id
        ? state.detailTrackSearch.query
        : '';
      const matchedTrackIndices = new Set(getTrackSearchMatches(album, trackSearchQuery).map(({ index }) => index));

      trackList.replaceChildren(...tracks.map((track, trackIndex) => {
        const { number, title } = splitTrackLine(track);
        const li = document.createElement('li');
        li.className = 'track-row';
        if (isRecommendedTrack(track, recommendedTracks)) li.classList.add('is-recommended');
        const isSearchMatch = matchedTrackIndices.has(trackIndex);
        if (isSearchMatch) li.classList.add('is-search-match');
        const isRequestFocus = state.detailTrackFocus?.albumId === album.id
          && state.detailTrackFocus.trackIndex === trackIndex;
        if (isRequestFocus) li.classList.add('is-request-focus');

        const dot = document.createElement('span');
        dot.className = 'recommend-dot';
        dot.setAttribute('aria-hidden', 'true');

        const numberSpan = document.createElement('span');
        numberSpan.className = 'track-number';
        numberSpan.textContent = number;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'track-title';
        titleSpan.textContent = title;
        if (isSearchMatch) {
          const searchMarker = document.createElement('span');
          searchMarker.className = 'track-search-marker';
          searchMarker.textContent = t('trackSearchMatch');
          titleSpan.append(searchMarker);
        }

        const requestButton = document.createElement(hasTracklist && CUSTOMER_FEATURES.requestTrackList ? 'button' : 'span');
        requestButton.className = 'track-request-button';
        if (requestButton instanceof HTMLButtonElement) {
          requestButton.type = 'button';
          requestButton.dataset.requestTrack = '';
          requestButton.dataset.albumId = String(album.id);
          requestButton.dataset.trackIndex = String(trackIndex);
          requestButton.addEventListener('click', () => {
            const added = toggleRequestTrack(album, trackIndex);
            refreshRequestTrackUi(app);
            if (added) showRequestAddedToast();
          });
        } else {
          requestButton.setAttribute('aria-hidden', 'true');
        }

        // 추천곡 점 렌더링: 시각적 순서가 추천점 → 곡 번호 → 곡명으로 보이게 합니다.
        li.append(dot, numberSpan, titleSpan, requestButton);
        return li;
      }));

      root.querySelector('[data-detail-description]').textContent = getLocalizedDescription(album) || t('descriptionEmpty');
      root.querySelector('[data-request-note]').textContent = t('requestNote');

      const filteredList = getVisibleAlbums();
      const navList = filteredList.some(item => item.id === album.id) ? filteredList : albums;
      const currentIndex = Math.max(0, navList.findIndex(item => item.id === album.id));
      const previousAlbum = navList[(currentIndex - 1 + navList.length) % navList.length];
      const nextAlbum = navList[(currentIndex + 1) % navList.length];
      const prevButton = root.querySelector('[data-prev-album]');
      const nextButton = root.querySelector('[data-next-album]');

      if (navList.length <= 1) {
        prevButton.disabled = true;
        nextButton.disabled = true;
      } else {
        prevButton.addEventListener('click', () => openAlbum(previousAlbum.id));
        nextButton.addEventListener('click', () => openAlbum(nextAlbum.id));
      }
      return trackSearchQuery;
    };

    const revealFocusedTrack = (root, trackSearchQuery) => {
      const firstTrackSearchMatch = root.querySelector('.track-row.is-search-match');
      const focusedRequestTrack = root.querySelector('.track-row.is-request-focus');
      const trackToReveal = focusedRequestTrack || (trackSearchQuery ? firstTrackSearchMatch : null);
      if (trackToReveal) {
        // 신청곡 메모나 곡 검색으로 들어온 경우 해당 곡을 강조하고 화면 중앙에 보여줍니다.
        window.setTimeout(() => requestAnimationFrame(() => {
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          trackToReveal.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'center',
          });
        }), options.skipInitialScroll ? 540 : 0);
      } else if (!options.skipInitialScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const deferContent = options.deferContent === true;
    const initialTrackSearchQuery = deferContent ? '' : populateDetailContent(node);
    detailRoot.replaceChildren(node);
    recordRecentAlbum(album.id);
    updateRandomAlbumButtons();
    if (persistentLayers) stagePersistentDetailView(Boolean(options.skipInitialScroll));
    refreshRequestTrackUi(app);

    if (deferContent) {
      requestAnimationFrame(() => window.setTimeout(() => {
        if (detailRoot.querySelector('.detail-page')?.dataset.albumId !== String(album.id)) return;
        const deferredTrackSearchQuery = populateDetailContent(detailRoot);
        refreshRequestTrackUi(app);
        revealFocusedTrack(detailRoot, deferredTrackSearchQuery);
      }, 0));
    } else {
      revealFocusedTrack(detailRoot, initialTrackSearchQuery);
    }
  }

  siteHeader.addEventListener('click', goHome);
  siteHeader.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') goHome();
  });

  languageButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      setLanguage(button.dataset.languageOption);
    });
  });

  document.addEventListener('click', event => {
    const recentButton = event.target.closest('[data-recent-albums]');
    if (recentButton) openRecentAlbums();
    const button = event.target.closest('[data-random-album]');
    if (button) openRandomAlbum(button);
  });

  let resizeTimer = null;
  let resizePreservedAlbumPage = 1;
  let resizeHeldPersistentPager = false;
  window.addEventListener('resize', () => {
    const persistentGrid = app.querySelector('[data-album-grid].is-persistent-pager');
    if (CUSTOMER_FEATURES.nativeMobilePager && persistentGrid?._pdPager) {
      resizePreservedAlbumPage = state.page;
      resizeHeldPersistentPager = true;
      persistentGrid._pdPager.suspend();
    }
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (resizeHeldPersistentPager && CUSTOMER_FEATURES.nativeMobilePager && isMobileAlbumPager()) {
        state.page = Math.max(1, resizePreservedAlbumPage);
      }
      updateAlbumGrid({
        preservePersistentTrack: CUSTOMER_FEATURES.nativeMobilePager && isMobileAlbumPager(),
      });
      app.querySelector('[data-album-grid].is-persistent-pager')?._pdPager?.resume(state.page);
      resizeHeldPersistentPager = false;
      scheduleSearchToolLabelFit();
    }, 120);
  });

  function handlePopState() {
    if (handleRecentAlbumsPopState()) return;
    if (handleNotesPopState()) return;
    if (artistAlbumsOverlay) {
      const stayedOnPage = window.location.href === artistAlbumsBaseUrl;
      hideArtistAlbums();
      const callback = afterArtistAlbumsClose;
      afterArtistAlbumsClose = null;
      if (stayedOnPage) {
        callback?.();
        return;
      }
    }
    if (history.state?.artistAlbums) {
      renderRouteFromLocation();
      const album = albums.find(item => item.id === history.state.artistPopupAlbumId);
      if (album) openArtistAlbums(album, document.querySelector('[data-artist-albums]'), { fromHistory: true });
      return;
    }
    if (handleCoverPopState()) return;
    renderRouteFromLocation();
  }

  window.addEventListener('popstate', handlePopState);
  updateLanguageButtons();
  applyStaticTranslations(document);

  const initialAlbumId = getAlbumIdFromHash();
  if (initialAlbumId && albums.some(album => album.id === initialAlbumId)) {
    // 상세 주소로 바로 들어온 손님도 뒤로가기를 누르면 사이트 밖이 아니라 목록으로 돌아가게 합니다.
    state.homeSection = 'catalog';
    history.replaceState({ view: 'home', homeSection: state.homeSection }, '', getBaseUrl());
    history.pushState({ view: 'detail', albumId: initialAlbumId, homeSection: state.homeSection }, '', `${getBaseUrl()}${getAlbumHash(initialAlbumId)}`);
    if (CUSTOMER_FEATURES.persistentDetailLayers) renderHome({ keepInactive: true });
    renderDetail(initialAlbumId);
  } else {
    if (window.location.hash) history.replaceState({ view: 'home', homeSection: state.homeSection }, '', getBaseUrl());
    else history.replaceState({ view: 'home', homeSection: state.homeSection }, '', `${getBaseUrl()}${window.location.hash}`);
    renderHome();
  }
})();
