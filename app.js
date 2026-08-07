(() => {
  const albumsFromConst = typeof ALBUMS !== 'undefined' && Array.isArray(ALBUMS) ? ALBUMS : null;
  const albums = albumsFromConst || (Array.isArray(window.PD_ALBUMS) ? window.PD_ALBUMS : []);
  const app = document.querySelector('#app');
  const homeTemplate = document.querySelector('#home-template');
  const detailTemplate = document.querySelector('#detail-template');
  const siteHeader = document.querySelector('[data-home-link]');
  const languageButtons = document.querySelectorAll('[data-language-option]');
  const LANGUAGE_STORAGE_KEY = 'pd-language';
  const FORMAT_ALL = '전체';
  const GENRE_ALL = '전체 장르';
  const NEW_ALBUM_DAYS = 14;
  const SWIPE_HINT_STORAGE_KEY = 'pd-swipe-hint-seen-v1';
  const REQUEST_TRACKS_STORAGE_KEY = 'pd-request-tracks-v1';
  const CUSTOMER_FEATURES = {
    // false로 바꾸면 원본 커버만 사용하므로 썸네일 기능만 간단히 되돌릴 수 있습니다.
    gridThumbnails: true,
    // 2026-08-07 손님 화면 개선입니다. 항목별로 false로 바꾸면 각각 원래 상태로 돌아갑니다.
    priorityCovers: true,
    requestTrackList: true,
    coverTransitions: true,
    higherContrast: true,
  };
  document.documentElement.classList.toggle('feature-customer-request-track-list', CUSTOMER_FEATURES.requestTrackList);
  document.documentElement.classList.toggle('feature-customer-cover-transitions', CUSTOMER_FEATURES.coverTransitions);
  document.documentElement.classList.toggle('feature-customer-higher-contrast', CUSTOMER_FEATURES.higherContrast);
  const WEEKLY_MOTION_TEST = Object.freeze({
    enabled: true,
    albumId: 'album-mrdetafz',
    src: 'media/weekly-motion-test.mp4',
    poster: 'media/weekly-motion-test-poster.jpg',
  });

  function getInitialLanguage() {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'ko' || saved === 'en') return saved;
    } catch (error) {
      console.warn(error);
    }
    return 'ko';
  }

  const state = {
    query: '',
    format: FORMAT_ALL,
    genre: GENRE_ALL,
    sort: 'default',
    recentOnly: false,
    filtersExpanded: false,
    page: 1,
    lastRandomAlbumId: '',
    detailTrackSearch: null,
    detailTrackFocus: null,
    language: getInitialLanguage(),
  };
  let suppressAlbumCardClickUntil = 0;
  let swipeHintSeenInMemory = false;
  let swipeHintObserver = null;
  let swipeHintTimer = 0;
  let swipeHintQueued = false;
  let swipeHintSection = null;
  let requestTracks = loadRequestTracks();
  let requestListOverlay = null;
  let requestToastTimer = 0;

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
      weeklyNote: 'PUNCH-DRUNK PICK',
      selectionReason: '이번 주의 선택',
      details: '음반 자세히 보기 →',
      chooseWeekly: '금주의 음반을 선택하세요',
      weeklyDefaultReason: '이번 주 Punch-drunk의 분위기와 잘 맞는 음반으로 골랐습니다.',
      requestGuideTitle: '신청 안내',
      requestGuideLine1: '신청곡은 받으신 신청 용지에 적어 직원에게 건네주세요.',
      requestGuideLine2: '리스트에 없는 곡은 스트리밍으로 재생됩니다.',
      released: year => `${year}년 발매`,
      searchSection: '검색과 필터',
      albumSearch: '검색',
      searchPlaceholder: '음반명·아티스트·곡 제목',
      clearSearch: '검색어 지우기',
      filters: '필터',
      sort: '정렬',
      sortDefault: '기본순',
      sortNewest: '최근 발매순',
      sortOldest: '오래된순',
      sortArtist: '아티스트순',
      sortTitle: '앨범명순',
      randomAlbum: '랜덤 음반',
      newAlbums: '새로 온 음반',
      resetFilters: '필터 초기화',
      requestListCount: count => `신청곡 ${count}`,
      requestListTitle: '신청곡 목록',
      requestListOpen: '담아둔 신청곡 보기',
      requestTrackAdd: '신청곡에 담기',
      requestTrackRemove: '신청곡에서 빼기',
      requestListEmpty: '아직 담아둔 신청곡이 없습니다.',
      requestListClear: '전체 비우기',
      requestListClose: '신청곡 목록 닫기',
      requestAdded: '신청곡에 담았습니다.',
      requestListView: '목록 보기',
      albumList: '앨범 목록',
      albumListPage: '앨범 목록 페이지',
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
      resultSummary: ({ format, genre, total, start, end }) => total
        ? `${format} / ${genre} · ${total}장 중 ${start}-${end}번째`
        : `${format} / ${genre} · 0장의 음반`,
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
      weeklyNote: 'PUNCH-DRUNK PICK',
      selectionReason: "This week's pick",
      details: 'View album →',
      chooseWeekly: 'Choose an album of the week',
      weeklyDefaultReason: 'Selected because it fits the mood of Punch-drunk this week.',
      requestGuideTitle: 'Song requests',
      requestGuideLine1: 'Please write your request on the slip provided and hand it to a member of staff.',
      requestGuideLine2: 'Songs not on the list will be played via streaming.',
      released: year => `Released in ${year}`,
      searchSection: 'Search and filters',
      albumSearch: 'Search',
      searchPlaceholder: 'Album · artist · track title',
      clearSearch: 'Clear search',
      filters: 'Filters',
      sort: 'Sort',
      sortDefault: 'Default',
      sortNewest: 'Newest release',
      sortOldest: 'Oldest release',
      sortArtist: 'Artist',
      sortTitle: 'Album title',
      randomAlbum: 'Random album',
      newAlbums: 'New arrivals',
      resetFilters: 'Reset filters',
      requestListCount: count => `Requests ${count}`,
      requestListTitle: 'Request list',
      requestListOpen: 'View saved requests',
      requestTrackAdd: 'Add to request list',
      requestTrackRemove: 'Remove from request list',
      requestListEmpty: 'You have not saved any tracks yet.',
      requestListClear: 'Clear all',
      requestListClose: 'Close request list',
      requestAdded: 'Added to your request list.',
      requestListView: 'View list',
      albumList: 'Album list',
      albumListPage: 'Album list pages',
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
      resultSummary: ({ format, genre, total, start, end }) => total
        ? `${format} / ${genre} · ${start}-${end} of ${total} albums`
        : `${format} / ${genre} · 0 albums`,
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

  function getRequestTrackId(albumId, trackIndex) {
    return `${String(albumId)}::${Number(trackIndex)}`;
  }

  function resolveRequestTrack(entry) {
    const album = albums.find(item => String(item.id) === String(entry?.albumId));
    if (!album || !Array.isArray(album.tracklist)) return null;
    let trackIndex = Number(entry?.trackIndex);
    const savedTrack = String(entry?.track || '');
    if (!Number.isInteger(trackIndex) || album.tracklist[trackIndex] !== savedTrack) {
      trackIndex = album.tracklist.findIndex(track => String(track) === savedTrack);
    }
    if (trackIndex < 0 || !album.tracklist[trackIndex]) return null;
    return { album, trackIndex, track: String(album.tracklist[trackIndex]) };
  }

  function loadRequestTracks() {
    if (!CUSTOMER_FEATURES.requestTrackList) return [];
    try {
      const saved = JSON.parse(localStorage.getItem(REQUEST_TRACKS_STORAGE_KEY) || '[]');
      const seen = new Set();
      return (Array.isArray(saved) ? saved : []).reduce((list, entry) => {
        const resolved = resolveRequestTrack(entry);
        if (!resolved) return list;
        const id = getRequestTrackId(resolved.album.id, resolved.trackIndex);
        if (seen.has(id)) return list;
        seen.add(id);
        list.push({ albumId: String(resolved.album.id), trackIndex: resolved.trackIndex, track: resolved.track });
        return list;
      }, []);
    } catch (error) {
      console.warn(error);
      return [];
    }
  }

  function saveRequestTracks() {
    if (!CUSTOMER_FEATURES.requestTrackList) return;
    try {
      localStorage.setItem(REQUEST_TRACKS_STORAGE_KEY, JSON.stringify(requestTracks));
    } catch (error) {
      console.warn(error);
    }
  }

  function isTrackRequested(albumId, trackIndex) {
    const id = getRequestTrackId(albumId, trackIndex);
    return requestTracks.some(entry => getRequestTrackId(entry.albumId, entry.trackIndex) === id);
  }

  function toggleRequestTrack(album, trackIndex) {
    if (!CUSTOMER_FEATURES.requestTrackList || !album?.tracklist?.[trackIndex]) return false;
    const id = getRequestTrackId(album.id, trackIndex);
    const existingIndex = requestTracks.findIndex(entry => getRequestTrackId(entry.albumId, entry.trackIndex) === id);
    if (existingIndex >= 0) requestTracks.splice(existingIndex, 1);
    else requestTracks.push({ albumId: String(album.id), trackIndex, track: String(album.tracklist[trackIndex]) });
    saveRequestTracks();
    return existingIndex < 0;
  }

  function refreshRequestTrackUi(root = app) {
    if (!root) return;
    root.querySelectorAll('[data-request-list]').forEach(button => {
      button.hidden = !CUSTOMER_FEATURES.requestTrackList;
      button.textContent = t('requestListCount')(requestTracks.length);
      button.title = t('requestListOpen');
      button.setAttribute('aria-label', t('requestListOpen'));
    });
    root.querySelectorAll('[data-request-track]').forEach(button => {
      const selected = isTrackRequested(button.dataset.albumId, Number(button.dataset.trackIndex));
      const label = selected ? t('requestTrackRemove') : t('requestTrackAdd');
      button.textContent = selected ? '✓' : '+';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function closeRequestTrackList() {
    if (!requestListOverlay) return;
    requestListOverlay.hidden = true;
    document.body.classList.remove('request-list-open');
  }

  function ensureRequestListOverlay() {
    if (requestListOverlay) return requestListOverlay;
    requestListOverlay = document.createElement('div');
    requestListOverlay.className = 'request-list-overlay';
    requestListOverlay.hidden = true;
    requestListOverlay.setAttribute('role', 'dialog');
    requestListOverlay.setAttribute('aria-modal', 'true');
    requestListOverlay.addEventListener('click', event => {
      if (event.target === requestListOverlay) closeRequestTrackList();
    });
    requestListOverlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeRequestTrackList();
    });
    document.body.append(requestListOverlay);
    return requestListOverlay;
  }

  function renderRequestTrackList() {
    const overlay = ensureRequestListOverlay();
    const resolvedEntries = requestTracks.map(entry => ({ entry, resolved: resolveRequestTrack(entry) })).filter(item => item.resolved);
    if (resolvedEntries.length !== requestTracks.length) {
      requestTracks = resolvedEntries.map(({ resolved }) => ({
        albumId: String(resolved.album.id),
        trackIndex: resolved.trackIndex,
        track: resolved.track,
      }));
      saveRequestTracks();
    }

    const panel = document.createElement('section');
    panel.className = 'request-list-panel';
    const header = document.createElement('header');
    header.className = 'request-list-header';
    const title = document.createElement('h2');
    title.textContent = t('requestListCount')(requestTracks.length);
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'request-list-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', t('requestListClose'));
    closeButton.addEventListener('click', closeRequestTrackList);
    header.append(title, closeButton);

    const content = document.createElement('div');
    content.className = 'request-list-content';
    if (!resolvedEntries.length) {
      const empty = document.createElement('p');
      empty.className = 'request-list-empty';
      empty.textContent = t('requestListEmpty');
      content.append(empty);
    } else {
      resolvedEntries.forEach(({ resolved }) => {
        const row = document.createElement('article');
        row.className = 'request-list-item';
        const openButton = document.createElement('button');
        openButton.type = 'button';
        openButton.className = 'request-list-item-main';
        const cover = createCover(resolved.album, 'request-list-cover');
        const text = document.createElement('span');
        text.className = 'request-list-item-text';
        const trackParts = splitTrackLine(resolved.track);
        const trackTitle = document.createElement('strong');
        trackTitle.textContent = trackParts.title;
        const trackNumber = document.createElement('span');
        trackNumber.className = 'request-list-track-number';
        trackNumber.textContent = trackParts.number || '';
        const albumMeta = document.createElement('span');
        albumMeta.className = 'request-list-album-meta';
        albumMeta.textContent = `${getLocalizedArtist(resolved.album) || ''} · ${resolved.album.title || ''}`;
        text.append(trackTitle, trackNumber, albumMeta);
        openButton.append(cover, text);
        openButton.addEventListener('click', () => {
          openAlbum(resolved.album.id, {
            focusTrackIndex: resolved.trackIndex,
            transitionSource: cover,
          });
          closeRequestTrackList();
        });

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'request-list-remove';
        removeButton.textContent = '×';
        removeButton.setAttribute('aria-label', t('requestTrackRemove'));
        removeButton.addEventListener('click', () => {
          const id = getRequestTrackId(resolved.album.id, resolved.trackIndex);
          requestTracks = requestTracks.filter(entry => getRequestTrackId(entry.albumId, entry.trackIndex) !== id);
          saveRequestTracks();
          renderRequestTrackList();
          refreshRequestTrackUi(app);
        });
        row.append(openButton, removeButton);
        content.append(row);
      });
    }

    const footer = document.createElement('footer');
    footer.className = 'request-list-footer';
    if (resolvedEntries.length) {
      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.textContent = t('requestListClear');
      clearButton.addEventListener('click', () => {
        requestTracks = [];
        saveRequestTracks();
        renderRequestTrackList();
        refreshRequestTrackUi(app);
      });
      footer.append(clearButton);
    }
    panel.append(header, content, footer);
    overlay.replaceChildren(panel);
    overlay.setAttribute('aria-label', t('requestListTitle'));
  }

  function openRequestTrackList() {
    if (!CUSTOMER_FEATURES.requestTrackList) return;
    renderRequestTrackList();
    requestListOverlay.hidden = false;
    document.body.classList.add('request-list-open');
    requestListOverlay.querySelector('.request-list-close')?.focus();
  }

  function showRequestAddedToast() {
    let toast = document.querySelector('[data-request-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'request-toast';
      toast.dataset.requestToast = '';
      document.body.append(toast);
    }
    const message = document.createElement('span');
    message.textContent = t('requestAdded');
    const listButton = document.createElement('button');
    listButton.type = 'button';
    listButton.textContent = t('requestListView');
    listButton.addEventListener('click', () => {
      window.clearTimeout(requestToastTimer);
      toast.remove();
      openRequestTrackList();
    });
    toast.replaceChildren(message, listButton);
    toast.dataset.visible = 'true';
    window.clearTimeout(requestToastTimer);
    requestToastTimer = window.setTimeout(() => toast.remove(), 2300);
  }

  function getGenreLabel(genre, language = state.language) {
    return GENRE_LABELS[language]?.[genre] || genre || '';
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
    renderRouteFromLocation();
  }

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s\-_.:;,'"!?’‘“”()[\]{}]+/g, '')
      .trim();
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
    if (/kpop|korean|koreanmusic|koreanpop|가요|케이팝|한국|한국음악/.test(genre)) return '한국음악';
    if (/rband|rnb|randb|rhythmandblues|알앤비/.test(genre)) return '알앤비';
    if (/soul|funk|motown|disco|소울|펑크/.test(genre)) return '소울/펑크';
    if (/alternative|rock|punk|indie|grunge|newwave|metal|hardcore|록|락|얼터너티브|메탈/.test(genre)) return '록';
    if (/electronic|electronica|techno|house|dance|ambient|idm|edm|disco|일렉트로닉|댄스/.test(genre)) return '일렉트로닉';
    if (/latin|brazil|brasil|bossa|samba|world|afro|reggae|ska|dub|koreantraditional|국악|월드|라틴|브라질/.test(genre)) {
      return '월드/라틴';
    }
    if (/pop|kpop|jpop|cpop|가요|케이팝|팝/.test(genre)) return '팝';
    const exact = STANDARD_GENRES.find(item => normalizeGenreName(item) === genre);
    return exact || '기타';
  }

  albums.forEach(album => {
    album.genre = classifyGenre(album.genre);
  });
  function getWeeklyAlbum() {
    return albums.find(album => album.isWeekly === true || album.weekly === true) || null;
  }

  function setupWeeklyMotion(card, album) {
    const video = card?.querySelector('[data-weekly-motion-video]');
    const scrim = card?.querySelector('[data-weekly-motion-scrim]');
    const indicator = card?.querySelector('[data-weekly-motion-indicator]');
    const enabled = WEEKLY_MOTION_TEST.enabled
      && album?.id === WEEKLY_MOTION_TEST.albumId
      && video
      && scrim
      && indicator;

    if (!enabled) {
      return { shouldSuppressClick: () => false };
    }

    video.src = WEEKLY_MOTION_TEST.src;
    video.poster = WEEKLY_MOTION_TEST.poster;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.hidden = false;
    scrim.hidden = false;
    indicator.hidden = false;
    card.classList.add('has-weekly-motion');
    card.setAttribute('aria-label', `${album.title || t('weeklyAlbum')}: ${t('details')}`);
    video.load();

    let activeInteraction = null;
    let suppressNextClick = false;
    let suppressClickTimer = null;
    let cancelledMotionTimer = null;

    const clearClickSuppression = () => {
      suppressNextClick = false;
      if (suppressClickTimer) window.clearTimeout(suppressClickTimer);
      suppressClickTimer = null;
    };

    const armClickSuppression = () => {
      // 네이버 같은 인앱 브라우저는 길게 누른 뒤 수 초 후 합성 click을 보내기도 합니다.
      // 시간만 재지 않고 같은 터치 뒤의 다음 click 한 번을 막되, 새 터치가 시작되면 바로 해제합니다.
      suppressNextClick = true;
      if (suppressClickTimer) window.clearTimeout(suppressClickTimer);
      suppressClickTimer = window.setTimeout(clearClickSuppression, 5000);
    };

    const clearCancelledMotionTimer = () => {
      if (cancelledMotionTimer) window.clearTimeout(cancelledMotionTimer);
      cancelledMotionTimer = null;
    };

    const stopMotion = ({ suppressClick = false } = {}) => {
      clearCancelledMotionTimer();
      video.pause();
      card.classList.remove('is-motion-playing');
      if (suppressClick) armClickSuppression();
    };

    const startMotion = interaction => {
      if (activeInteraction) return false;
      activeInteraction = {
        ...interaction,
        startedAt: performance.now(),
      };
      const requestKey = `${interaction.type}:${interaction.id}`;
      card.classList.add('is-motion-playing');
      video.muted = true;

      const playRequest = video.play();
      if (playRequest && typeof playRequest.then === 'function') {
        playRequest.then(() => {
          const activeKey = activeInteraction
            ? `${activeInteraction.type}:${activeInteraction.id}`
            : '';
          if (activeKey !== requestKey) video.pause();
        }).catch(error => {
          activeInteraction = null;
          stopMotion();
          console.warn('Weekly motion preview could not start.', error);
        });
      }
      return true;
    };

    const finishInteraction = ({ type, id, suppressClick = true } = {}) => {
      if (!activeInteraction
        || activeInteraction.type !== type
        || activeInteraction.id !== id) return;
      const heldLongEnough = performance.now() - activeInteraction.startedAt >= 160;
      const movedWhilePressed = Boolean(activeInteraction.moved);
      activeInteraction = null;
      stopMotion({ suppressClick: suppressClick && (heldLongEnough || movedWhilePressed) });
    };

    const keepMotionAfterBrowserCancel = () => {
      if (!activeInteraction) return;

      // 네이버 인앱 브라우저는 손가락을 계속 누르는 중에도 touchcancel을 보낼 수 있습니다.
      // 이 신호만으로 영상을 끄지 않고, 실제 해제 신호를 조금 더 기다립니다.
      activeInteraction.browserCancelled = true;
      activeInteraction.cancelledAt = performance.now();
      armClickSuppression();
      clearCancelledMotionTimer();
      cancelledMotionTimer = window.setTimeout(() => {
        if (!activeInteraction?.browserCancelled) return;
        activeInteraction = null;
        stopMotion({ suppressClick: true });
      }, 8000);
    };

    const touchCapable = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

    card.addEventListener('pointerdown', event => {
      if (event.button > 0 || (touchCapable && event.pointerType === 'touch')) return;
      if (!activeInteraction) clearClickSuppression();
      if (!startMotion({ type: 'pointer', id: event.pointerId })) return;
      try {
        card.setPointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture is optional; pointer cancellation still stops playback.
      }
    });

    const finishPointer = event => {
      finishInteraction({ type: 'pointer', id: event.pointerId });
    };

    card.addEventListener('pointerup', finishPointer);
    card.addEventListener('pointercancel', finishPointer);
    card.addEventListener('lostpointercapture', event => {
      finishInteraction({ type: 'pointer', id: event.pointerId });
    });

    if (touchCapable) {
      card.addEventListener('touchstart', event => {
        const touch = event.changedTouches[0];
        if (!touch) return;

        // 이전 터치를 브라우저가 취소한 뒤 새 손가락 입력이 오면 남은 재생 상태를 정리합니다.
        if (activeInteraction?.browserCancelled) {
          activeInteraction = null;
          stopMotion();
        }
        if (!activeInteraction) clearClickSuppression();
        startMotion({
          type: 'touch',
          id: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
        });
      }, { passive: true });

      card.addEventListener('touchmove', event => {
        if (activeInteraction?.type !== 'touch') return;
        const touch = Array.from(event.changedTouches)
          .find(item => item.identifier === activeInteraction.id);
        if (!touch) return;

        const distance = Math.hypot(
          touch.clientX - activeInteraction.startX,
          touch.clientY - activeInteraction.startY,
        );

        // 손가락 이동은 영상 정지 조건이 아닙니다. 누른 채 스크롤해도 재생을 유지합니다.
        // 대신 이동한 터치는 손을 뗀 뒤 상세 화면을 여는 클릭으로 처리되지 않게 기록합니다.
        if (distance > 6) activeInteraction.moved = true;
      }, { passive: true });

      const finishTouch = event => {
        if (activeInteraction?.type !== 'touch') return;
        const touch = Array.from(event.changedTouches)
          .find(item => item.identifier === activeInteraction.id);
        if (!touch) return;
        finishInteraction({ type: 'touch', id: touch.identifier });
      };

      card.addEventListener('touchend', finishTouch, { passive: true });
      card.addEventListener('touchcancel', event => {
        if (activeInteraction?.type !== 'touch') return;
        const changedTouches = Array.from(event.changedTouches || []);
        const touch = changedTouches
          .find(item => item.identifier === activeInteraction.id);
        if (changedTouches.length && !touch) return;

        const heldLongEnough = performance.now() - activeInteraction.startedAt >= 160;
        if (heldLongEnough) {
          keepMotionAfterBrowserCancel();
          return;
        }

        finishInteraction({ type: 'touch', id: activeInteraction.id, suppressClick: false });
      }, { passive: true });
    }

    card.addEventListener('contextmenu', event => event.preventDefault());
    card.addEventListener('keydown', clearClickSuppression);

    return {
      shouldSuppressClick: () => {
        // 네이버는 손가락을 떼기 전에도 합성 click을 보낼 수 있습니다.
        // 상세 화면 이동만 막고, 실제 touchend 전까지 영상은 계속 재생합니다.
        if (activeInteraction?.browserCancelled) {
          const timeSinceCancel = performance.now() - activeInteraction.cancelledAt;
          if (timeSinceCancel > 350) {
            activeInteraction = null;
            stopMotion({ suppressClick: true });
          } else {
            armClickSuppression();
          }
          return true;
        }

        if (activeInteraction
          && performance.now() - activeInteraction.startedAt >= 160) {
          armClickSuppression();
          return true;
        }
        if (!suppressNextClick) return false;
        clearClickSuppression();
        return true;
      },
    };
  }

  function formatLabel(format, language = state.language) {
    if (format === 'Vinyl') return language === 'en' ? UI_TEXT.en.formatVinyl : UI_TEXT.ko.formatVinyl;
    if (format === 'CD') return UI_TEXT[language]?.formatCD || 'CD';
    return format || '';
  }

  function getLocalizedArtist(album) {
    const original = String(album?.artist || '').trim();
    const artistKo = String(album?.artistKo || '').trim();
    const artistEn = String(album?.artistEn || '').trim();
    if (artistKo && artistEn) return state.language === 'en' ? artistEn : artistKo;
    return original;
  }

  function getLocalizedDescription(album) {
    if (state.language === 'en') return String(album?.descriptionEn || '').trim();
    return String(album?.description || '').trim();
  }

  function getLocalizedWeeklyReason(album) {
    const value = state.language === 'en' ? album?.weeklyReasonEn : album?.weeklyReason;
    return String(value || '').trim() || t('weeklyDefaultReason');
  }

  function createFallbackCover(album, className = '') {
    // 이미지 없을 때 임시 커버 표시: 깨진 이미지 아이콘 대신 앨범명/아티스트명을 보여줍니다.
    const fallback = document.createElement('div');
    fallback.className = `cover-fallback ${className}`.trim();
    fallback.innerHTML = `
      <span>${escapeHtml(getLocalizedArtist(album) || 'PUNCH-DRUNK')}</span>
      <strong>${escapeHtml(album.title || 'Untitled')}</strong>
    `;
    return fallback;
  }

  function getCoverThumbnailPath(path) {
    if (!CUSTOMER_FEATURES.gridThumbnails) return '';
    const normalized = String(path || '').trim().replace(/\\/g, '/');
    if (!/^covers\/(?!thumbs\/)/i.test(normalized) || /\.(?:gif|svg)$/i.test(normalized)) return '';

    const relativePath = normalized.slice('covers/'.length);
    const fileName = relativePath.split('/').pop() || 'cover';
    const baseName = fileName
      .replace(/\.[^.]+$/, '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'cover';
    let hash = 0x811c9dc5;
    for (const byte of new TextEncoder().encode(relativePath)) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
    return `covers/thumbs/${baseName}-${(hash >>> 0).toString(16).padStart(8, '0')}.jpg`;
  }

  function createCover(album, className = '', options = {}) {
    const wrap = document.createElement('div');
    wrap.className = `cover-frame ${className}`.trim();

    if (album.coverImage) {
      const img = document.createElement('img');
      const originalSource = String(album.coverImage).trim();
      const thumbnailSource = className.split(/\s+/).includes('grid-cover')
        ? getCoverThumbnailPath(originalSource)
        : '';
      let triedOriginal = !thumbnailSource;
      const priority = CUSTOMER_FEATURES.priorityCovers && options.priority === true;
      img.src = thumbnailSource || originalSource;
      img.alt = `${getLocalizedArtist(album) || ''} - ${album.title || ''}`.trim();
      // 첫 화면의 금주의 음반과 상세 커버는 목록 커버보다 먼저 불러와 빈 화면을 줄입니다.
      img.loading = priority ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (priority) img.fetchPriority = 'high';
      img.onerror = () => {
        if (!triedOriginal && originalSource) {
          triedOriginal = true;
          img.src = originalSource;
          return;
        }
        // 이미지 파일이 없거나 경로가 틀린 경우에도 화면이 깨지지 않게 임시 커버로 바꿉니다.
        // NEW 같은 커버 위 표시가 함께 사라지지 않도록 실패한 이미지 요소만 교체합니다.
        img.remove();
        wrap.prepend(createFallbackCover(album));
      };
      wrap.append(img);
    } else {
      wrap.append(createFallbackCover(album));
    }

    return wrap;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getGenresForCurrentFormat() {
    const relevant = albums.filter(album => {
      const formatOk = state.format === FORMAT_ALL || album.format === state.format;
      const recentOk = !state.recentOnly || isRecentlyAdded(album);
      return formatOk && recentOk;
    });
    const counts = relevant.reduce((map, album) => {
      const genre = classifyGenre(album.genre);
      if (!genre) return map;
      map.set(genre, (map.get(genre) || 0) + 1);
      return map;
    }, new Map());
    return [
      { name: GENRE_ALL, count: relevant.length },
      ...STANDARD_GENRES.filter(name => counts.has(name)).map(name => ({ name, count: counts.get(name) })),
    ];
  }
  function getSearchableText(album) {
    // 검색 대상 구성: 음반명, 아티스트, 곡 제목만 포함합니다.
    // 설명(description), 연도, 포맷, 장르는 일부러 제외하고 각 필터에서만 다룹니다.
    return [
      album.title,
      album.artist,
      album.artistKo,
      album.artistEn,
      getLocalizedArtist(album),
      ...(album.recommendedTracks || []),
      ...(album.tracklist || []),
    ].join(' ');
  }

  function getFilteredAlbums() {
    const q = normalize(state.query);
    return albums.filter(album => {
      // 포맷/장르 필터: 장르 필터는 현재 선택된 포맷 안에서만 적용됩니다.
      const formatOk = state.format === FORMAT_ALL || album.format === state.format;
      const albumGenre = classifyGenre(album.genre);
      const genreOk = state.genre === GENRE_ALL || albumGenre === state.genre;
      const queryOk = !q || normalize(getSearchableText(album)).includes(q);
      const recentOk = !state.recentOnly || isRecentlyAdded(album);
      return formatOk && genreOk && queryOk && recentOk;
    });
  }
  function parseYear(year) {
    const parsed = parseInt(String(year || '').match(/\d{4}/)?.[0] || '0', 10);
    return Number.isFinite(parsed) ? parsed : 0;
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

  function getAlbumsPerPage() {
    if (window.matchMedia('(min-width: 1060px)').matches) return 18;
    if (window.matchMedia('(min-width: 720px)').matches) return 15;
    return 9;
  }

  function isMobileAlbumPager() {
    return window.matchMedia('(max-width: 719px)').matches;
  }

  function resetAlbumPage() {
    state.page = 1;
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
    return Math.max(1, Math.ceil(getVisibleAlbums().length / getAlbumsPerPage()));
  }

  function goToAlbumPage(page, options = {}) {
    const totalPages = getAlbumTotalPages();
    const nextPage = Math.min(Math.max(1, page), totalPages);
    if (nextPage === state.page) return false;
    const direction = nextPage > state.page ? 'next' : 'prev';
    state.page = nextPage;
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
  function fieldMatches(value, q) {
    return normalize(value).includes(q);
  }

  function listMatches(list, q) {
    return (list || []).some(item => fieldMatches(item, q));
  }

  function albumHasTrackSearchMatch(album, query = state.query) {
    // 앨범명과 곡명이 동시에 검색되어도 트랙 일치 정보를 별도로 유지합니다.
    // 결과 문구가 '앨범명에서 검색됨'이어도 상세 화면에서는 해당 곡을 강조할 수 있습니다.
    const q = normalize(query);
    if (!q) return false;
    return listMatches(album.tracklist, q) || listMatches(album.recommendedTracks, q);
  }

  function getSearchMatchType(album) {
    const q = normalize(state.query);
    if (!q) return '';
    if (fieldMatches(album.title, q)) return 'title';
    if (fieldMatches(album.artist, q) || fieldMatches(album.artistKo, q) || fieldMatches(album.artistEn, q)) return 'artist';
    // 추천곡 검색도 손님 화면에서는 트랙리스트 검색으로 통합합니다.
    if (albumHasTrackSearchMatch(album, q)) return 'tracklist';
    return '';
  }

  function getSearchMatchLabel(album, matchType = getSearchMatchType(album)) {
    const labels = {
      title: 'matchTitle',
      artist: 'matchArtist',
      year: 'matchYear',
      format: 'matchFormat',
      genre: 'matchGenre',
      tracklist: 'matchTracklist',
    };
    return labels[matchType] ? t(labels[matchType]) : '';
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

  function animateCoverIntoDetail(transitionSource, commitDetailOpen) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sourceRect = transitionSource?.getBoundingClientRect();
    const canAnimate = CUSTOMER_FEATURES.coverTransitions
      && transitionSource
      && !reduceMotion
      && sourceRect
      && sourceRect.width > 8
      && sourceRect.height > 8;
    if (!canAnimate) {
      commitDetailOpen(false);
      return;
    }

    const sourceBorderRadius = getComputedStyle(transitionSource).borderRadius || '0px';
    const clone = transitionSource.cloneNode(true);
    clone.querySelectorAll('.album-card-new, .weekly-motion-indicator').forEach(element => element.remove());
    clone.querySelectorAll('img').forEach(image => {
      image.loading = 'eager';
      image.removeAttribute('fetchpriority');
    });
    clone.className = 'cover-transition-clone';
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${sourceRect.left}px`,
      top: `${sourceRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      margin: '0',
      transformOrigin: 'top left',
      zIndex: '1000',
      pointerEvents: 'none',
    });
    document.body.append(clone);
    document.documentElement.classList.add('is-cover-zoom-running');

    commitDetailOpen(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const destination = app.querySelector('[data-detail-cover] .cover-frame');
    const destinationRect = destination?.getBoundingClientRect();
    if (!destination || !destinationRect?.width || !destinationRect?.height) {
      clone.remove();
      document.documentElement.classList.remove('is-cover-zoom-running');
      return;
    }

    destination.style.visibility = 'hidden';
    const translateX = destinationRect.left - sourceRect.left;
    const translateY = destinationRect.top - sourceRect.top;
    const scaleX = destinationRect.width / sourceRect.width;
    const scaleY = destinationRect.height / sourceRect.height;
    let cleaned = false;
    const finish = () => {
      if (cleaned) return;
      cleaned = true;
      clone.remove();
      destination.style.visibility = '';
      document.documentElement.classList.remove('is-cover-zoom-running');
      const detailPage = app.querySelector('.detail-page');
      detailPage?.classList.add('is-cover-zoom-revealing');
      window.setTimeout(() => detailPage?.classList.remove('is-cover-zoom-revealing'), 360);
    };
    const destinationTransform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
    const destinationRadius = getComputedStyle(destination).borderRadius || '8px';
    if (typeof clone.animate === 'function') {
      const animation = clone.animate([
        {
          transform: 'translate3d(0, 0, 0) scale(1, 1)',
          borderRadius: sourceBorderRadius,
          boxShadow: '0 5px 16px rgba(0, 0, 0, 0.28)',
        },
        {
          transform: destinationTransform,
          borderRadius: destinationRadius,
          boxShadow: '0 22px 48px rgba(0, 0, 0, 0.42)',
        },
      ], {
        duration: 500,
        easing: 'cubic-bezier(0.22, 0.72, 0.18, 1)',
        fill: 'forwards',
      });
      animation.finished.then(finish).catch(finish);
    } else {
      // 일부 인앱 브라우저는 Web Animations API를 감추므로 같은 이동을 CSS transition으로 실행합니다.
      clone.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
      clone.style.borderRadius = sourceBorderRadius;
      clone.style.boxShadow = '0 5px 16px rgba(0, 0, 0, 0.28)';
      clone.style.transition = 'transform 500ms cubic-bezier(0.22, 0.72, 0.18, 1), border-radius 500ms ease, box-shadow 500ms ease';
      requestAnimationFrame(() => {
        clone.style.transform = destinationTransform;
        clone.style.borderRadius = destinationRadius;
        clone.style.boxShadow = '0 22px 48px rgba(0, 0, 0, 0.42)';
      });
    }
    window.setTimeout(finish, 650);
  }

  function openAlbum(albumId, options = {}) {
    const album = albums.find(item => item.id === albumId) || getWeeklyAlbum();
    if (!album) return renderHome();
    const detailHash = getAlbumHash(album.id);
    const trackSearchQuery = String(options.trackSearchQuery || '').trim();
    const focusTrackIndex = Number(options.focusTrackIndex);
    state.detailTrackSearch = trackSearchQuery ? { albumId: album.id, query: trackSearchQuery } : null;
    state.detailTrackFocus = Number.isInteger(focusTrackIndex) && focusTrackIndex >= 0
      ? { albumId: album.id, trackIndex: focusTrackIndex }
      : null;
    const detailState = { view: 'detail', albumId: album.id };
    if (trackSearchQuery) detailState.trackSearchQuery = trackSearchQuery;
    if (state.detailTrackFocus) detailState.focusTrackIndex = state.detailTrackFocus.trackIndex;

    const commitDetailOpen = skipInitialScroll => {
      // 브라우저 뒤로가기 지원: 상세 화면을 열 때 방문 기록에 한 단계를 쌓아 목록으로 돌아갈 수 있게 합니다.
      if (window.location.hash !== detailHash) {
        history.pushState(detailState, '', `${getBaseUrl()}${detailHash}`);
      } else {
        history.replaceState(detailState, '', `${getBaseUrl()}${detailHash}`);
      }
      renderDetail(album.id, { skipInitialScroll });
    };
    animateCoverIntoDetail(options.transitionSource, commitDetailOpen);
  }

  function openRandomAlbum() {
    if (!albums.length) return;
    const currentAlbumId = getAlbumIdFromHash();
    const blockedId = currentAlbumId || state.lastRandomAlbumId;
    const pool = albums.length > 1
      ? albums.filter(item => item.id !== blockedId)
      : albums;
    const album = pool[Math.floor(Math.random() * pool.length)];
    state.lastRandomAlbumId = album.id;
    openAlbum(album.id);
  }

  function getFilterToggleSummary() {
    const formatText = state.format === FORMAT_ALL ? t('all') : formatLabel(state.format);
    const genreText = getGenreLabel(state.genre);
    const parts = [formatText, genreText];
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

  // 검색창은 항상 보이고, 정렬과 필터만 손님이 필요할 때 펼쳐서 사용합니다.
  function updateFilterPanel(root = app) {
    const toggle = root.querySelector('[data-filter-toggle]');
    const panel = root.querySelector('[data-filter-panel]');
    const summary = root.querySelector('[data-filter-toggle-summary]');
    if (!toggle || !panel || !summary) return;

    toggle.setAttribute('aria-expanded', String(state.filtersExpanded));
    panel.hidden = !state.filtersExpanded;
    summary.textContent = getFilterToggleSummary();
  }

  function renderHome() {
    cancelSwipeDiscoveryHint();
    const node = homeTemplate.content.cloneNode(true);
    applyStaticTranslations(node);
    const weekly = getWeeklyAlbum();
    const weeklyButton = node.querySelector('[data-weekly-open]');

    if (weekly) {
      node.querySelector('[data-weekly-cover]').append(createCover(weekly, 'weekly-cover-art', { priority: true }));
      node.querySelector('[data-weekly-format]').textContent = [formatLabel(weekly.format), getGenreLabel(classifyGenre(weekly.genre))].filter(Boolean).join(' · ');
      node.querySelector('[data-weekly-title]').textContent = weekly.title || t('chooseWeekly');
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
    const searchClearButton = node.querySelector('[data-search-clear]');
    const updateSearchClearButton = () => {
      searchClearButton.hidden = !searchInput.value;
    };
    searchInput.value = state.query;
    updateSearchClearButton();
    searchInput.addEventListener('input', event => {
      state.query = event.target.value;
      resetAlbumPage();
      updateAlbumGrid();
      updateSearchClearButton();
    });
    searchClearButton.addEventListener('click', () => {
      state.query = '';
      searchInput.value = '';
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

    node.querySelector('[data-filter-toggle]').addEventListener('click', () => {
      state.filtersExpanded = !state.filtersExpanded;
      updateFilterPanel(app);
      if (state.filtersExpanded) scheduleSearchToolLabelFit();
    });

    const newAlbumsButton = node.querySelector('[data-new-albums]');
    newAlbumsButton.dataset.active = String(state.recentOnly);
    newAlbumsButton.setAttribute('aria-pressed', String(state.recentOnly));
    newAlbumsButton.addEventListener('click', () => {
      state.recentOnly = !state.recentOnly;
      state.genre = GENRE_ALL;
      resetAlbumPage();
      renderHome();
    });

    node.querySelector('[data-reset-filters]').addEventListener('click', () => {
      state.query = '';
      state.format = FORMAT_ALL;
      state.genre = GENRE_ALL;
      state.sort = 'default';
      state.recentOnly = false;
      state.filtersExpanded = false;
      resetAlbumPage();
      renderHome();
    });

    const requestListButton = node.querySelector('[data-request-list]');
    if (requestListButton) {
      requestListButton.hidden = !CUSTOMER_FEATURES.requestTrackList;
      requestListButton.addEventListener('click', openRequestTrackList);
    }

    renderFormatFilters(node.querySelector('[data-format-filters]'));
    renderGenreFilters(node.querySelector('[data-genre-filters]'));
    updateFilterPanel(node);
    setupAlbumSwipe(node.querySelector('[data-grid-section]'));
    app.replaceChildren(node);
    refreshRequestTrackUi(app);
    updateAlbumGrid();
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
    const formats = [FORMAT_ALL, 'Vinyl', 'CD'];
    container.replaceChildren(...formats.map(format => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-chip';
      button.textContent = format === FORMAT_ALL ? t('all') : formatLabel(format);
      button.dataset.active = String(state.format === format);
      button.addEventListener('click', () => {
        state.format = format;
        state.genre = GENRE_ALL;
        resetAlbumPage();
        renderHome();
      });
      return button;
    }));
  }

  function renderGenreFilters(container) {
    const genres = getGenresForCurrentFormat();
    container.replaceChildren(...genres.map(genre => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-chip genre-chip';
      button.textContent = `${getGenreLabel(genre.name)} ${genre.count}`;
      button.dataset.active = String(state.genre === genre.name);
      button.addEventListener('click', () => {
        state.genre = genre.name;
        resetAlbumPage();
        updateAlbumGrid();
        updateFilterPanel(app);
        container.querySelectorAll('.filter-chip').forEach(chip => chip.dataset.active = 'false');
        button.dataset.active = 'true';
      });
      return button;
    }));

    const scrollShell = container.closest('[data-genre-scroll-shell]');
    const updateScrollHints = () => {
      if (!scrollShell) return;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      scrollShell.classList.toggle('can-scroll-left', container.scrollLeft > 3);
      scrollShell.classList.toggle('can-scroll-right', maxScroll - container.scrollLeft > 3);
    };
    container.addEventListener('scroll', updateScrollHints, { passive: true });
    requestAnimationFrame(updateScrollHints);
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

    const firstButton = makeButton('|<', 1, {
      className: 'pagination-nav-button is-backward',
      ariaLabel: t('firstAlbumPage'),
      title: t('firstAlbumPage'),
      disabled: state.page === 1,
    });
    const previousButton = makeButton('<', Math.max(1, state.page - 1), {
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

    const nextButton = makeButton('>', Math.min(totalPages, state.page + 1), {
      className: 'pagination-nav-button is-forward',
      ariaLabel: t('nextAlbumPage'),
      title: t('nextAlbumPage'),
      disabled: state.page === totalPages,
    });
    const lastButton = makeButton('>|', totalPages, {
      className: 'pagination-nav-button is-forward',
      ariaLabel: t('lastAlbumPage'),
      title: t('lastAlbumPage'),
      disabled: state.page === totalPages,
    });

    controls.append(firstButton, previousButton, picker, nextButton, lastButton);
    container.replaceChildren(controls);
  }

  function createAlbumCard(album) {
    const card = document.createElement('button');
    const recentlyAdded = isRecentlyAdded(album);
    const searchMatchType = getSearchMatchType(album);
    const trackSearchQuery = albumHasTrackSearchMatch(album) ? state.query : '';
    card.type = 'button';
    card.className = 'album-card';
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
    const cover = createCover(album, 'grid-cover');
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
    meta.innerHTML = `<strong>${escapeHtml(getLocalizedArtist(album) || '')}</strong><em>${escapeHtml(album.title || '')}</em>`;
    card.append(meta);

    const matchLabel = getSearchMatchLabel(album, searchMatchType);
    if (matchLabel) {
      const match = document.createElement('span');
      match.className = 'album-card-match';
      match.textContent = matchLabel;
      card.append(match);
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
    if (options.hidden) page.setAttribute('aria-hidden', 'true');
    page.replaceChildren(...albums.map(createAlbumCard));
    return page;
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
      renderAlbumGridPage(previousAlbums, { hidden: true, empty: state.page <= 1 }),
      renderAlbumGridPage(currentAlbums),
      renderAlbumGridPage(nextAlbums, { hidden: true, empty: state.page >= totalPages })
    );

    grid.replaceChildren(track);
  }

  function setSwipeTrackOffset(track, offset) {
    track.style.transform = `translate3d(calc(-100% + ${offset}px), 0, 0)`;
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
        state.page = targetPage;
        updateAlbumGrid();
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
    const grid = app.querySelector('[data-album-grid]');
    if (!grid) return;
    const empty = app.querySelector('[data-empty-message]');
    const summary = app.querySelector('[data-result-summary]');
    const pagination = app.querySelector('[data-pagination]');
    const filtered = getVisibleAlbums();
    const perPage = getAlbumsPerPage();
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * perPage;
    const pagedAlbums = getPageAlbums(filtered, state.page, perPage);
    const shownStart = filtered.length ? start + 1 : 0;
    const shownEnd = Math.min(start + perPage, filtered.length);

    const baseFormatText = state.format === FORMAT_ALL ? t('all') : formatLabel(state.format);
    const summaryPrefixes = [];
    if (state.recentOnly) summaryPrefixes.push(t('newAlbums'));
    const formatText = [...summaryPrefixes, baseFormatText].join(' · ');
    const genreText = getGenreLabel(state.genre);
    summary.textContent = t('resultSummary')({
      format: formatText,
      genre: genreText,
      total: filtered.length,
      start: shownStart,
      end: shownEnd,
    });

    if (isMobileAlbumPager() && filtered.length && totalPages > 1) {
      renderMobileSwipeGrid(grid, filtered, perPage, totalPages);
    } else {
      grid.classList.remove('is-swipe-pager', 'is-dragging', 'is-touching');
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

    empty.textContent = t('emptyAlbums');
    empty.hidden = filtered.length !== 0;
    refreshRequestTrackUi(app);
    renderPagination(pagination, filtered.length, totalPages);
    scheduleSwipeDiscoveryHint(app.querySelector('[data-grid-section]'), totalPages);
    if (options.scrollToGrid) {
      app.querySelector('.grid-section')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function stripTrackNumber(track) {
    const text = String(track || '').trim();
    // 트랙 번호와 곡 제목 분리: A1. Title / B2 Title / 1. Title 같은 앞 번호를 제거합니다.
    return text.replace(/^([A-Z]\s*\d+|\d+|[A-Z][-–]\d+|[A-Z]\.\d+)\.?\s+/i, '').trim();
  }

  function splitTrackLine(track) {
    // 트랙 번호와 곡 제목 분리: 추천점이 곡 번호 왼쪽에 놓이도록 번호를 별도 span으로 나눕니다.
    const text = String(track || '').trim();
    const match = text.match(/^([A-Z]\s*\d+|\d+|[A-Z][-–]\d+|[A-Z]\.\d+)\.?\s+(.+)$/i);
    if (!match) return { number: '', title: text };
    const rawNumber = match[1].replace(/\s+/g, '');
    const number = rawNumber.endsWith('.') ? rawNumber : `${rawNumber}.`;
    return { number, title: match[2].trim() };
  }

  function isRecommendedTrack(track, recommendedTracks) {
    // 추천곡 매칭: 트랙 한 줄 또는 곡명이 정확히 같을 때만 같은 곡으로 봅니다.
    // 단어 포함 비교를 하지 않아 원곡과 Instrumental/Remix가 함께 표시되지 않습니다.
    const trackLine = normalize(String(track || '').trim());
    const trackTitle = normalize(stripTrackNumber(track));
    if (!trackTitle) return false;
    return (recommendedTracks || []).some(recommended => {
      const recommendedValue = normalize(String(recommended || '').trim());
      return recommendedValue && (recommendedValue === trackLine || recommendedValue === trackTitle);
    });
  }

  function isTrackSearchMatch(track, searchQuery, recommendedTracks) {
    // 트랙 검색 강조: 트랙리스트 직접 검색과 추천곡 데이터 검색을 모두 실제 트랙 행에 연결합니다.
    const q = normalize(searchQuery);
    if (!q) return false;
    if (fieldMatches(track, q)) return true;

    const trackTitle = normalize(stripTrackNumber(track));
    return (recommendedTracks || []).some(recommended => {
      const recommendedTitle = normalize(stripTrackNumber(recommended));
      return fieldMatches(recommended, q)
        && recommendedTitle
        && (trackTitle === recommendedTitle || trackTitle.includes(recommendedTitle));
    });
  }

  function goHome() {
    state.detailTrackSearch = null;
    state.detailTrackFocus = null;
    history.replaceState({ view: 'home' }, '', getBaseUrl());
    renderHome();
  }

  function goPreviousView() {
    history.back();
  }

  function goAlbumList() {
    state.detailTrackSearch = null;
    state.detailTrackFocus = null;
    history.pushState({ view: 'home' }, '', getBaseUrl());
    renderHome();
    requestAnimationFrame(() => {
      document.querySelector('.search-section')?.scrollIntoView({ block: 'start' });
    });
  }

  function renderDetail(albumId, options = {}) {
    const album = albums.find(item => item.id === albumId) || getWeeklyAlbum();
    if (!album) return renderHome();

    const node = detailTemplate.content.cloneNode(true);
    applyStaticTranslations(node);
    node.querySelectorAll('[data-request-list]').forEach(button => button.addEventListener('click', openRequestTrackList));
    node.querySelector('[data-history-back]').addEventListener('click', goPreviousView);
    node.querySelector('[data-album-list]').addEventListener('click', goAlbumList);
    node.querySelector('[data-detail-cover]').append(createCover(album, 'detail-cover', { priority: true }));
    node.querySelector('[data-detail-title]').textContent = album.title || '';
    node.querySelector('[data-detail-artist]').textContent = getLocalizedArtist(album) || '';

    const tags = [formatLabel(album.format), getGenreLabel(classifyGenre(album.genre)), album.year].filter(Boolean);
    node.querySelector('[data-detail-tags]').replaceChildren(...tags.map(tag => {
      const span = document.createElement('span');
      span.className = 'pill';
      span.textContent = tag;
      return span;
    }));

    const trackList = node.querySelector('[data-detail-tracklist]');
    const hasTracklist = Boolean(album.tracklist && album.tracklist.length);
    const tracks = hasTracklist ? album.tracklist : [t('tracklistEmpty')];
    const recommendedTracks = album.recommendedTracks || [];
    const trackSearchQuery = state.detailTrackSearch?.albumId === album.id
      ? state.detailTrackSearch.query
      : '';

    trackList.replaceChildren(...tracks.map((track, trackIndex) => {
      const { number, title } = splitTrackLine(track);
      const li = document.createElement('li');
      li.className = 'track-row';
      if (isRecommendedTrack(track, recommendedTracks)) li.classList.add('is-recommended');
      const isSearchMatch = isTrackSearchMatch(track, trackSearchQuery, recommendedTracks);
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

    node.querySelector('[data-detail-description]').textContent = getLocalizedDescription(album) || t('descriptionEmpty');
    node.querySelector('[data-request-note]').textContent = t('requestNote');

    const filteredList = getVisibleAlbums();
    const navList = filteredList.some(item => item.id === album.id) ? filteredList : albums;
    const currentIndex = Math.max(0, navList.findIndex(item => item.id === album.id));
    const previousAlbum = navList[(currentIndex - 1 + navList.length) % navList.length];
    const nextAlbum = navList[(currentIndex + 1) % navList.length];
    const prevButton = node.querySelector('[data-prev-album]');
    const nextButton = node.querySelector('[data-next-album]');

    if (navList.length <= 1) {
      prevButton.disabled = true;
      nextButton.disabled = true;
    } else {
      prevButton.addEventListener('click', () => openAlbum(previousAlbum.id));
      nextButton.addEventListener('click', () => openAlbum(nextAlbum.id));
    }

    app.replaceChildren(node);
    refreshRequestTrackUi(app);

    const firstTrackSearchMatch = app.querySelector('.track-row.is-search-match');
    const focusedRequestTrack = app.querySelector('.track-row.is-request-focus');
    const trackToReveal = focusedRequestTrack || (trackSearchQuery ? firstTrackSearchMatch : null);
    if (trackToReveal) {
      // 신청곡 목록이나 곡 검색으로 들어온 경우 해당 곡을 강조하고 화면 중앙에 보여줍니다.
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
    if (event.target.closest('[data-random-album]')) openRandomAlbum();
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateAlbumGrid();
      scheduleSearchToolLabelFit();
    }, 120);
  });

  function renderRouteFromLocation() {
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
      renderDetail(albumId);
      return;
    }
    state.detailTrackSearch = null;
    state.detailTrackFocus = null;
    if (window.location.hash) history.replaceState({ view: 'home' }, '', getBaseUrl());
    renderHome();
  }

  window.addEventListener('popstate', renderRouteFromLocation);
  updateLanguageButtons();
  applyStaticTranslations(document);

  const initialAlbumId = getAlbumIdFromHash();
  if (initialAlbumId && albums.some(album => album.id === initialAlbumId)) {
    // 상세 주소로 바로 들어온 손님도 뒤로가기를 누르면 사이트 밖이 아니라 목록으로 돌아가게 합니다.
    history.replaceState({ view: 'home' }, '', getBaseUrl());
    history.pushState({ view: 'detail', albumId: initialAlbumId }, '', `${getBaseUrl()}${getAlbumHash(initialAlbumId)}`);
    renderDetail(initialAlbumId);
  } else {
    if (window.location.hash) history.replaceState({ view: 'home' }, '', getBaseUrl());
    else history.replaceState({ view: 'home' }, '', `${getBaseUrl()}${window.location.hash}`);
    renderHome();
  }
})();
