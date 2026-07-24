(() => {
  const initialAlbums = typeof ALBUMS !== 'undefined' && Array.isArray(ALBUMS) ? ALBUMS : window.PD_ALBUMS;
  const initialCovers = typeof COVER_IMAGES !== 'undefined' && Array.isArray(COVER_IMAGES) ? COVER_IMAGES : window.PD_COVERS;
  let albums = JSON.parse(JSON.stringify(Array.isArray(initialAlbums) ? initialAlbums : []));
  let covers = Array.isArray(initialCovers) ? [...initialCovers] : [];
  // 탐색기로 선택한 이미지는 미리보기 URL을 가진다.
  // 작업 폴더를 연결하면 이미지 파일도 covers 폴더로 자동 복사한다.
  const coverPreviewUrls = new Map();
  const pendingCoverFiles = new Map();
  let currentId = albums[0]?.id || null;
  const APPLE_SEARCH_LIMIT = 50;
  const APPLE_RESULTS_PER_PAGE = 10;
  const OPENAI_API_KEY_STORAGE_KEY = 'pd-openai-api-key';
  const OPENAI_MODEL_STORAGE_KEY = 'pd-openai-model';
  const LOCAL_BRIDGE_REQUEST_TIMEOUT = 5 * 60 * 1000;
  const EDIT_SESSION_HEARTBEAT_MS = 30 * 1000;
  const LOCAL_LOCK_KEY = 'pd-admin-local-lock';
  const DESCRIPTION_MODE_KEY = 'pd-admin-description-mode';
  const HANDLE_DB_NAME = 'punchdrunk-admin';
  const HANDLE_STORE_NAME = 'handles';
  const PROJECT_HANDLE_KEY = 'project-folder';
  const BACKUP_HANDLE_KEY = 'backup-folder';
  // 이번 관리 편의 개선 묶음입니다. 특정 기능만 되돌릴 때 이 값을 기준으로 끌 수 있습니다.
  const ADMIN_FEATURES = {
    dashboard: true,
    draftManager: true,
    coverAudit: true,
    imageOptimization: true,
    localLock: true,
    localCodexBridge: true,
    localBridgeDirectSave: true,
    multiComputerGuard: true,
    physicalCoverAudit: true,
    gridThumbnails: true,
  };
  const COVER_OPTIMIZATION = {
    maxDimension: 2000,
    quality: 0.9,
    type: 'image/jpeg',
  };
  const COVER_THUMBNAIL = {
    maxDimension: 480,
    quality: 0.82,
    type: 'image/jpeg',
  };
  let appleSearchResults = [];
  let appleResultPage = 1;

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

  // Chrome/Edge 전용: 사용자가 선택한 프로젝트 폴더에 직접 저장하기 위한 핸들입니다.
  let projectDirHandle = null;
  let backupDirHandle = null;
  const supportsDirectSave = typeof window.showDirectoryPicker === 'function';

  const albumList = document.querySelector('[data-album-list]');
  const editorTitle = document.querySelector('[data-editor-title]');
  const coverGallery = document.querySelector('[data-cover-gallery]');
  const coverGallerySearch = document.querySelector('[data-cover-gallery-search]');
  const coverGallerySummary = document.querySelector('[data-cover-gallery-summary]');
  const toggleCoverGalleryButton = document.querySelector('[data-toggle-cover-gallery]');
  const coverPreview = document.querySelector('[data-cover-preview]');
  const recommendChecks = document.querySelector('[data-recommend-checks]');
  const weeklyReasonSection = document.querySelector('[data-weekly-reason-section]');
  const projectStatus = document.querySelector('[data-project-status]');
  const directPanel = document.querySelector('.save-panel, .direct-save-panel');
  const saveFeedback = document.querySelector('[data-save-feedback]');
  const saveStatus = document.querySelector('[data-save-status]');
  const backupFolderStatus = document.querySelector('[data-backup-folder-status]');
  const collaborationStatus = document.querySelector('[data-collaboration-status]');
  const autosaveStatus = document.querySelector('[data-autosave-status]');
  const currentWeekly = document.querySelector('[data-current-weekly]');
  const previewCurrent = document.querySelector('[data-preview-current]');
  const setCurrentWeeklyButton = document.querySelector('[data-set-current-weekly]');
  const albumListSearch = document.querySelector('[data-album-list-search]');
  const albumListSort = document.querySelector('[data-album-list-sort]');
  const albumListSummary = document.querySelector('[data-album-list-summary]');
  const albumListFilters = document.querySelector('[data-album-list-filters]');
  const focusCurrentButton = document.querySelector('[data-focus-current]');
  const appleSearchTerm = document.querySelector('[data-apple-search-term]');
  const appleCountry = document.querySelector('[data-apple-country]');
  const appleStatus = document.querySelector('[data-apple-status]');
  const appleResults = document.querySelector('[data-apple-results]');
  const artistLabelStatus = document.querySelector('[data-artist-label-status]');
  const openAiApiKeyInput = document.querySelector('[data-openai-api-key]');
  const openAiModelInput = document.querySelector('[data-openai-model]');
  const translationStatus = document.querySelector('[data-translation-status]');
  const translateDescriptionButton = document.querySelector('[data-translate-description]');
  const translateApiButton = document.querySelector('[data-translate-api]');
  const translationPanel = document.querySelector('.translation-panel');
  const apiFallback = document.querySelector('[data-api-fallback]');
  const copyTranslationPromptButton = document.querySelector('[data-copy-translation-prompt]');
  const draftRecoveryPanel = document.querySelector('[data-draft-recovery]');
  const draftRecoveryText = document.querySelector('[data-draft-recovery-text]');
  const restoreDraftButton = document.querySelector('[data-restore-draft]');
  const exportDraftButton = document.querySelector('[data-export-draft]');
  const dismissDraftButton = document.querySelector('[data-dismiss-draft]');
  const draftManagerPanel = document.querySelector('[data-draft-manager]');
  const draftList = document.querySelector('[data-draft-list]');
  const adminDashboard = document.querySelector('[data-admin-dashboard]');
  const coverOptimizeStatus = document.querySelector('[data-cover-optimize-status]');
  const coverAuditSummary = document.querySelector('[data-cover-audit-summary]');
  const coverAuditResults = document.querySelector('[data-cover-audit-results]');
  const exportCoverAuditButton = document.querySelector('[data-export-cover-audit]');
  const localLockPanel = document.querySelector('[data-local-lock-panel]');
  const localLockInput = document.querySelector('[data-local-lock-code]');
  const localLockStatus = document.querySelector('[data-local-lock-status]');
  const descriptionModeToggle = document.querySelector('[data-description-mode]');
  const stickySave = document.querySelector('[data-sticky-save]');
  const stickySaveState = document.querySelector('[data-sticky-save-state]');
  const stickyFolder = document.querySelector('[data-sticky-folder]');
  const deleteUndoToast = document.querySelector('[data-delete-undo]');
  const deleteUndoText = document.querySelector('[data-delete-undo-text]');
  const undoDeleteButton = document.querySelector('[data-undo-delete]');
  const editorPanel = document.querySelector('.editor-panel');

  const DRAFT_KEY = 'pd-admin-draft';
  const DRAFT_HISTORY_KEY = 'pd-admin-draft-history';

  let hasUnsavedChanges = false;
  let autoDraftTimer = null;
  let bestRecoveryDraft = null;
  let coverGalleryOpen = false;
  let coverGalleryQuery = '';
  let descriptionMode = readJsonStorage(DESCRIPTION_MODE_KEY, false) === true;
  let pendingDeletedAlbum = null;
  let deleteUndoTimer = null;
  let localBridgeConnected = false;
  let localBridgeAvailable = false;
  let localBridgeInfo = null;
  let localProjectRevision = null;
  let projectDataBaseline = null;
  let editSessionTimer = null;
  let editSessionConflict = null;
  let lastCoverAudit = null;
  const listState = {
    query: '',
    sort: 'recent',
    filter: 'all',
  };

  const LIST_FILTER_LABELS = {
    all: '전체',
    Vinyl: 'LP',
    CD: 'CD',
    weekly: '금주의 음반',
    'missing-cover': '커버 없음',
    'missing-tracks': '트랙 없음',
    'missing-description': '설명 없음',
    'missing-description-en': '영문 설명 없음',
    'missing-artist-labels': '아티스트 표기 없음',
    'cover-path-issue': '커버 경로 확인',
  };

  const KNOWN_ARTIST_ALIASES = {
    'agustin pereyra lucena': { ko: '아구스틴 페레이라 루세나', en: 'Agustin Pereyra Lucena' },
    'bill evans trio': { ko: '빌 에반스 트리오', en: 'Bill Evans Trio' },
    'cautious clay': { ko: '코셔스 클레이', en: 'Cautious Clay' },
    'childish gambino': { ko: '차일디시 감비노', en: 'Childish Gambino' },
    'common': { ko: '커먼', en: 'Common' },
    'cosmic boy': { ko: '코스믹보이', en: 'Cosmic Boy' },
    'curtis mayfield': { ko: '커티스 메이필드', en: 'Curtis Mayfield' },
    'daniel caesar': { ko: '다니엘 시저', en: 'Daniel Caesar' },
    'daryl hall and john oates': { ko: '대릴 홀 & 존 오츠', en: 'Daryl Hall & John Oates' },
    'daryl hall john oates': { ko: '대릴 홀 & 존 오츠', en: 'Daryl Hall & John Oates' },
    'dijon': { ko: '디종', en: 'Dijon' },
    'dj soulscape': { ko: '디제이 소울스케이프', en: 'DJ Soulscape' },
    'ek': { ko: 'EK', en: 'EK' },
    'flofilz': { ko: '플로필즈', en: 'FloFilz' },
    'george benson': { ko: '조지 벤슨', en: 'George Benson' },
    'herbie hancock': { ko: '허비 핸콕', en: 'Herbie Hancock' },
    'hyukoh': { ko: '혁오', en: 'HYUKOH' },
    'idk': { ko: 'IDK', en: 'IDK' },
    'jalen ngonda': { ko: '제일런 응곤다', en: 'Jalen Ngonda' },
    'jill scott': { ko: '질 스콧', en: 'Jill Scott' },
    'joe lovano': { ko: '조 로바노', en: 'Joe Lovano' },
    'john legend': { ko: '존 레전드', en: 'John Legend' },
    'jon brion': { ko: '존 브리온', en: 'Jon Brion' },
    'jungle': { ko: '정글', en: 'Jungle' },
    'julian lage': { ko: '줄리안 라지', en: 'Julian Lage' },
    'kendrick lamar': { ko: '켄드릭 라마', en: 'Kendrick Lamar' },
    'kris kross': { ko: '크리스 크로스', en: 'Kris Kross' },
    'laufey': { ko: '라우페이', en: 'Laufey' },
    'mariah carey': { ko: '머라이어 캐리', en: 'Mariah Carey' },
    'mathias eick': { ko: '마티아스 아익', en: 'Mathias Eick' },
    'mccoy tyner': { ko: '맥코이 타이너', en: 'McCoy Tyner' },
    'michael jackson': { ko: '마이클 잭슨', en: 'Michael Jackson' },
    'michael mayo': { ko: '마이클 마요', en: 'Michael Mayo' },
    'nas': { ko: '나스', en: 'Nas' },
    'oddisee': { ko: '오디시', en: 'Oddisee' },
    'pami': { ko: '파미', en: 'pami' },
    'paul mccartney': { ko: '폴 매카트니', en: 'Paul McCartney' },
    'radiohop': { ko: 'RADIOHOP', en: 'RADIOHOP' },
    'roy hargrove': { ko: '로이 하그로브', en: 'Roy Hargrove' },
    'slick rick': { ko: '슬릭 릭', en: 'Slick Rick' },
    'slum village': { ko: '슬럼 빌리지', en: 'Slum Village' },
    'sparklmami': { ko: '스파클마미', en: 'Sparklmami' },
    'stanley turrentine': { ko: '스탠리 터렌타인', en: 'Stanley Turrentine' },
    'stevie wonder': { ko: '스티비 원더', en: 'Stevie Wonder' },
    'swervy': { ko: '스월비', en: 'Swervy' },
    'talib kweli': { ko: '탈립 콸리', en: 'Talib Kweli' },
    'the beatles': { ko: '비틀즈', en: 'The Beatles' },
    'tyler the creator': { ko: '타일러, 더 크리에이터', en: 'Tyler, The Creator' },
    'various artists': { ko: 'Various Artists', en: 'Various Artists' },
    'victor feldman stan levey and scott lafaro': { ko: '빅터 펠드먼, 스탠 레비 & 스콧 라파로', en: 'Victor Feldman, Stan Levey & Scott LaFaro' },
    'young gun silver fox': { ko: '영 건 실버 폭스', en: 'Young Gun Silver Fox' },
    'yotam silberstein': { ko: '요탐 실버스타인', en: 'Yotam Silberstein' },
    'ziont': { ko: '자이언티', en: 'Zion.T' },
    '존브리온': { ko: '존 브리온', en: 'Jon Brion' },
    '허비핸콕': { ko: '허비 핸콕', en: 'Herbie Hancock' },
    '혁오': { ko: '혁오', en: 'HYUKOH' },
    '스월비': { ko: '스월비', en: 'Swervy' },
  };

  const fields = Array.from(document.querySelectorAll('[data-field]')).reduce((map, el) => {
    map[el.dataset.field] = el;
    return map;
  }, {});

  function setProjectStatus(message, type = 'normal') {
    if (projectStatus) projectStatus.textContent = message;
    if (directPanel) {
      directPanel.dataset.connected = String(type === 'connected');
      directPanel.dataset.error = String(type === 'error');
    }
    if (stickyFolder) {
      stickyFolder.textContent = projectDirHandle
        ? `작업 폴더: ${projectDirHandle.name || '연결됨'}`
        : '작업 폴더 미연결';
    }
  }

  function setBackupFolderStatus(message) {
    if (!backupFolderStatus) return;
    backupFolderStatus.textContent = message || (backupDirHandle
      ? `자동 백업: ${backupDirHandle.name || '연결됨'}`
      : '자동 백업: 폴더 미연결');
  }

  function setSaveFeedback(message, state = 'idle') {
    if (!saveFeedback) return;
    saveFeedback.hidden = false;
    saveFeedback.dataset.state = state;
    saveFeedback.textContent = message;
  }

  function getTimeText() {
    return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function createDraftPayload(reason = 'auto') {
    return {
      albums,
      covers,
      currentId,
      reason,
      savedAt: new Date().toISOString(),
      albumCount: albums.length,
    };
  }

  function readJsonStorage(key, fallback = null) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(error);
      return false;
    }
  }

  function removeStorageItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(error);
      return false;
    }
  }

  async function hashLocalLockCode(code) {
    const text = String(code || '');
    if (window.crypto?.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    return `fallback:${btoa(unescape(encodeURIComponent(text)))}`;
  }

  function getLocalLock() {
    return readJsonStorage(LOCAL_LOCK_KEY);
  }

  function updateLocalLockStatus() {
    if (!localLockStatus) return;
    const enabled = Boolean(getLocalLock()?.hash);
    localLockStatus.textContent = enabled
      ? '이 브라우저에서 관리자 로컬 잠금이 켜져 있습니다. 실제 인터넷 보안용 로그인은 별도로 필요합니다.'
      : '이 브라우저에서만 쓰는 간단한 잠금입니다. 실제 인터넷 보안용 로그인은 호스팅 방식이 정해진 뒤 따로 붙이는 것이 안전합니다.';
  }

  async function enableLocalLock() {
    const code = String(localLockInput?.value || '').trim();
    if (code.length < 4) {
      setSaveFeedback('잠금 코드는 4글자 이상으로 입력해주세요.', 'error');
      localLockInput?.focus();
      return;
    }
    writeJsonStorage(LOCAL_LOCK_KEY, {
      hash: await hashLocalLockCode(code),
      savedAt: new Date().toISOString(),
    });
    if (localLockInput) localLockInput.value = '';
    updateLocalLockStatus();
    setSaveFeedback('관리자 로컬 잠금을 켰습니다. 다음에 이 브라우저에서 admin.html을 열면 코드를 입력해야 합니다.', 'success');
  }

  function disableLocalLock() {
    removeStorageItem(LOCAL_LOCK_KEY);
    if (localLockInput) localLockInput.value = '';
    updateLocalLockStatus();
    setSaveFeedback('관리자 로컬 잠금을 껐습니다.', 'working');
  }

  async function verifyLocalLockCode(input, status) {
    const lock = getLocalLock();
    if (!lock?.hash) return true;
    const hash = await hashLocalLockCode(input.value);
    if (hash === lock.hash) return true;
    status.textContent = '잠금 코드가 맞지 않습니다.';
    input.select();
    return false;
  }

  function showLocalLockOverlayIfNeeded() {
    if (!ADMIN_FEATURES.localLock || !getLocalLock()?.hash) {
      if (localLockPanel && !ADMIN_FEATURES.localLock) localLockPanel.hidden = true;
      updateLocalLockStatus();
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'admin-lock-overlay';
    overlay.innerHTML = `
      <div class="admin-lock-card">
        <strong>관리자 잠금</strong>
        <p>이 브라우저에서 설정한 로컬 잠금입니다. 잠금 코드를 입력하면 편집 화면이 열립니다.</p>
        <input type="password" autocomplete="off" placeholder="잠금 코드" />
        <button type="button" class="admin-button primary">열기</button>
        <span></span>
      </div>
    `;
    const input = overlay.querySelector('input');
    const button = overlay.querySelector('button');
    const status = overlay.querySelector('span');
    const unlock = async () => {
      if (await verifyLocalLockCode(input, status)) overlay.remove();
    };
    button.addEventListener('click', unlock);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') unlock();
    });
    document.body.append(overlay);
    window.setTimeout(() => input.focus(), 0);
  }

  function rememberDraftHistory(previousDraft) {
    if (!previousDraft || !Array.isArray(previousDraft.albums)) return;
    const history = readJsonStorage(DRAFT_HISTORY_KEY, []);
    const next = [previousDraft, ...(Array.isArray(history) ? history : [])]
      .filter((item, index, list) => {
        if (!item?.savedAt) return true;
        return list.findIndex(other => other?.savedAt === item.savedAt) === index;
      })
      .slice(0, 8);
    localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(next));
  }

  function persistDraft(reason = 'auto') {
    try {
      const previous = readJsonStorage(DRAFT_KEY);
      const payload = createDraftPayload(reason);
      if (previous && JSON.stringify(previous.albums || []) !== JSON.stringify(payload.albums || [])) {
        rememberDraftHistory(previous);
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn(error);
      if (autosaveStatus) autosaveStatus.textContent = '브라우저 임시 저장 실패';
      return false;
    }
  }

  function scheduleAutoDraft() {
    clearTimeout(autoDraftTimer);
    if (autosaveStatus) autosaveStatus.textContent = '자동 임시 저장 준비 중';
    autoDraftTimer = setTimeout(() => {
      if (persistDraft('auto') && autosaveStatus) autosaveStatus.textContent = `자동 임시 저장됨: ${getTimeText()}`;
    }, 600);
  }

  function markDirty() {
    hasUnsavedChanges = true;
    lastCoverAudit = null;
    if (exportCoverAuditButton) exportCoverAuditButton.disabled = true;
    if (directPanel) directPanel.dataset.dirty = 'true';
    if (stickySave) stickySave.dataset.dirty = 'true';
    if (stickySaveState) stickySaveState.textContent = '저장 필요';
    if (saveStatus) saveStatus.textContent = '마지막 저장: 파일 저장 필요';
    renderAdminDashboard();
    renderCoverAuditSummary();
    scheduleAutoDraft();
  }

  function markClean(message = `마지막 저장: ${getTimeText()}`) {
    hasUnsavedChanges = false;
    if (directPanel) directPanel.dataset.dirty = 'false';
    if (stickySave) stickySave.dataset.dirty = 'false';
    if (stickySaveState) stickySaveState.textContent = '저장 완료';
    if (saveStatus) saveStatus.textContent = message;
  }

  function validateAlbumsBeforeSaving() {
    const problems = [];
    albums.forEach((album, index) => {
      ensureAlbumShape(album);
      album.artist = String(album.artistKo || '').trim();
      const label = album.title || `#${index + 1}`;
      if (!album.title.trim()) problems.push(`${label}: 앨범명이 비어 있습니다.`);
      if (!album.artistKo.trim()) problems.push(`${label}: 아티스트 한글표기가 비어 있습니다.`);
      if (!album.artistEn.trim()) problems.push(`${label}: 아티스트 영문표기가 비어 있습니다.`);
      if (!['Vinyl', 'CD'].includes(album.format)) problems.push(`${label}: 포맷은 LP 또는 CD여야 합니다.`);
    });

    if (!problems.length) return true;
    alert(`저장 전에 확인해주세요.\n\n${problems.slice(0, 6).join('\n')}`);
    return false;
  }

  async function verifyPermission(handle, readWrite = true) {
    const options = { mode: readWrite ? 'readwrite' : 'read' };
    if (typeof handle.queryPermission === 'function') {
      const current = await handle.queryPermission(options);
      if (current === 'granted') return true;
    }
    if (typeof handle.requestPermission === 'function') {
      const requested = await handle.requestPermission(options);
      return requested === 'granted';
    }
    return true;
  }

  function openHandleDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB를 사용할 수 없습니다.'));
      const request = indexedDB.open(HANDLE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(HANDLE_STORE_NAME)) {
          request.result.createObjectStore(HANDLE_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function rememberDirectoryHandle(key, handle, label) {
    try {
      const db = await openHandleDatabase();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite');
        transaction.objectStore(HANDLE_STORE_NAME).put(handle, key);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    } catch (error) {
      console.warn(`${label} 기억 실패`, error);
    }
  }

  async function getRememberedDirectoryHandle(key, label) {
    try {
      const db = await openHandleDatabase();
      const handle = await new Promise((resolve, reject) => {
        const request = db.transaction(HANDLE_STORE_NAME, 'readonly')
          .objectStore(HANDLE_STORE_NAME)
          .get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return handle;
    } catch (error) {
      console.warn(`기억한 ${label} 불러오기 실패`, error);
      return null;
    }
  }

  function rememberProjectHandle(handle) {
    return rememberDirectoryHandle(PROJECT_HANDLE_KEY, handle, '작업 폴더');
  }

  function getRememberedProjectHandle() {
    return getRememberedDirectoryHandle(PROJECT_HANDLE_KEY, '작업 폴더');
  }

  function rememberBackupHandle(handle) {
    return rememberDirectoryHandle(BACKUP_HANDLE_KEY, handle, '자동 백업 폴더');
  }

  function getRememberedBackupHandle() {
    return getRememberedDirectoryHandle(BACKUP_HANDLE_KEY, '자동 백업 폴더');
  }

  async function readProjectFile(filename) {
    const fileHandle = await projectDirHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file.text();
  }

  async function writeDirectoryFile(directoryHandle, filename, text) {
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  function writeProjectFile(filename, text) {
    return writeDirectoryFile(projectDirHandle, filename, text);
  }

  async function validateProjectDirectoryHandle(handle) {
    await handle.getFileHandle('index.html');
    await handle.getFileHandle('admin.html');
    await handle.getFileHandle('albums-data.js');
    await handle.getFileHandle('covers-list.js');
    await handle.getDirectoryHandle('covers');
    return true;
  }

  function parseDataFile(text, type) {
    // 우리가 직접 만든 albums-data.js / covers-list.js 형식을 읽기 위한 로컬 전용 파서입니다.
    // const ALBUMS / const COVER_IMAGES 형식과 window.PD_ALBUMS / window.PD_COVERS 형식을 모두 읽습니다.
    const fakeWindow = {};
    const expression = type === 'albums'
      ? 'window.PD_ALBUMS || (typeof ALBUMS !== "undefined" ? ALBUMS : undefined)'
      : 'window.PD_COVERS || window.COVER_IMAGES || (typeof COVER_IMAGES !== "undefined" ? COVER_IMAGES : undefined)';
    const runner = new Function('window', `${text}\n; return ${expression};`);
    const parsed = runner(fakeWindow);
    return Array.isArray(parsed) ? parsed : [];
  }

  // 다른 컴퓨터가 MYBOX 데이터를 바꿨는지 저장 직전에 비교하기 위한 기준값입니다.
  // 파일의 공백이 아니라 실제 앨범/커버 내용만 비교합니다.
  function createProjectDataSignature(albumList, coverList) {
    return JSON.stringify({
      albums: parseDataFile(serializeAlbumsFromList(albumList), 'albums'),
      covers: (Array.isArray(coverList) ? coverList : []).map(path => String(path || '').trim()),
    });
  }

  function setCollaborationStatus(message, state = 'checking') {
    if (!collaborationStatus) return;
    collaborationStatus.textContent = message;
    collaborationStatus.dataset.state = state;
  }

  async function readProjectDataSignature() {
    const [albumText, coverText] = await Promise.all([
      readProjectFile('albums-data.js'),
      readProjectFile('covers-list.js'),
    ]);
    return createProjectDataSignature(
      parseDataFile(albumText, 'albums'),
      parseDataFile(coverText, 'covers')
    );
  }

  async function confirmProjectDataIsStillCurrent() {
    if (!ADMIN_FEATURES.multiComputerGuard || !projectDirHandle) return true;
    try {
      const diskSignature = await readProjectDataSignature();
      if (!projectDataBaseline) {
        projectDataBaseline = diskSignature;
        return true;
      }
      if (diskSignature === projectDataBaseline) return true;

      persistDraft('external-change-conflict');
      const message = '저장 중단: 이 페이지를 연 뒤 다른 컴퓨터에서 MYBOX 데이터가 변경되었습니다. 현재 입력은 브라우저 임시저장본에 보존했습니다. MYBOX 동기화가 끝난 뒤 페이지를 새로 열어 변경 내용을 확인해주세요.';
      setCollaborationStatus(message, 'conflict');
      setProjectStatus(message, 'error');
      setSaveFeedback(message, 'error');
      alert(message);
      return false;
    } catch (error) {
      console.error(error);
      const message = '저장 중단: MYBOX의 최신 데이터를 확인하지 못했습니다. 동기화와 폴더 권한을 확인한 뒤 다시 시도해주세요.';
      setCollaborationStatus(message, 'conflict');
      setSaveFeedback(message, 'error');
      return false;
    }
  }

  async function loadConnectedProjectData() {
    try {
      const albumText = await readProjectFile('albums-data.js');
      const nextAlbums = parseDataFile(albumText, 'albums');
      if (nextAlbums.length) albums = nextAlbums;
    } catch (error) {
      console.warn(error);
    }

    try {
      const coverText = await readProjectFile('covers-list.js');
      covers = parseDataFile(coverText, 'covers');
    } catch (error) {
      console.warn(error);
    }

    currentId = albums[0]?.id || null;
    albums.forEach(ensureAlbumShape);
    projectDataBaseline = createProjectDataSignature(albums, covers);
  }

  async function connectProjectFolder() {
    if (!supportsDirectSave) {
      setProjectStatus('이 브라우저에서는 직접 저장을 지원하지 않습니다. 데스크탑 Chrome 또는 Edge를 사용하세요.', 'error');
      alert('직접 저장은 데스크탑 Chrome 또는 Edge에서 사용하는 것을 권장합니다. 지금 브라우저에서는 내보내기 방식을 사용하세요.');
      return;
    }

    try {
      projectDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const ok = await verifyPermission(projectDirHandle, true);
      if (!ok) {
        setProjectStatus('폴더 쓰기 권한이 허용되지 않았습니다.', 'error');
        return;
      }

      try {
        await validateProjectDirectoryHandle(projectDirHandle);
      } catch (error) {
        projectDirHandle = null;
        const message = '선택한 폴더가 Punch-drunk Archive 원본이 아닙니다. index.html과 admin.html이 들어 있는 Punch-drunk Archive 폴더를 선택해주세요.';
        setProjectStatus(message, 'error');
        setSaveFeedback(message, 'error');
        alert(message);
        return;
      }

      await rememberProjectHandle(projectDirHandle);
      await loadConnectedProjectData();
      setProjectStatus('작업 폴더가 연결되었습니다. 이제 변경사항 바로 저장과 커버 자동 복사를 사용할 수 있습니다.', 'connected');
      renderAll();
    } catch (error) {
      if (error?.name === 'AbortError') {
        setProjectStatus('작업 폴더 선택이 취소되었습니다.', 'normal');
        return;
      }
      console.error(error);
      setProjectStatus('작업 폴더 연결 중 오류가 났습니다. 내보내기 방식을 사용하세요.', 'error');
      alert('작업 폴더 연결 중 오류가 났습니다.');
    }
  }

  async function connectBackupFolder() {
    if (!supportsDirectSave) {
      setSaveFeedback('자동 백업 폴더 연결은 데스크탑 Chrome 또는 Edge에서 사용할 수 있습니다.', 'error');
      return false;
    }

    try {
      backupDirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'punchdrunk-backups' });
      const ok = await verifyPermission(backupDirHandle, true);
      if (!ok) {
        backupDirHandle = null;
        setBackupFolderStatus('자동 백업: 쓰기 권한 없음');
        setSaveFeedback('자동 백업 폴더 쓰기 권한이 필요합니다.', 'error');
        return false;
      }

      await rememberBackupHandle(backupDirHandle);
      setBackupFolderStatus(`자동 백업: ${backupDirHandle.name || '연결됨'}`);
      setSaveFeedback('자동 백업 폴더가 연결되었습니다.', 'success');
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') {
        setBackupFolderStatus();
        return false;
      }
      console.error(error);
      backupDirHandle = null;
      setBackupFolderStatus('자동 백업: 연결 실패');
      setSaveFeedback('자동 백업 폴더 연결에 실패했습니다.', 'error');
      return false;
    }
  }

  async function selectProjectFolderForSaving() {
    if (projectDirHandle) {
      try {
        const permission = typeof projectDirHandle.queryPermission === 'function'
          ? await projectDirHandle.queryPermission({ mode: 'readwrite' })
          : 'granted';
        if (permission === 'granted') return true;
      } catch (error) {
        console.warn('기억한 작업 폴더 권한 확인 실패', error);
      }
      // 예전에 기억한 폴더 권한이 만료되었으면 새 폴더 선택창을 다시 엽니다.
      projectDirHandle = null;
    }

    if (!supportsDirectSave) {
      persistDraft('save-unsupported-browser');
      const message = '저장 실패: 이 브라우저는 파일을 직접 저장할 수 없습니다. 데스크탑 Chrome 또는 Edge에서 관리자 페이지를 열어주세요.';
      setProjectStatus(message, 'error');
      setSaveFeedback(message, 'error');
      return false;
    }

    try {
      setSaveFeedback('저장할 punchdrunk-archive 폴더를 선택해주세요.', 'working');
      projectDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const ok = await verifyPermission(projectDirHandle, true);
      if (!ok) {
        projectDirHandle = null;
        const message = '저장 실패: 폴더 쓰기 권한이 허용되지 않았습니다.';
        setProjectStatus(message, 'error');
        setSaveFeedback(message, 'error');
        return false;
      }

      try {
        await validateProjectDirectoryHandle(projectDirHandle);
      } catch (error) {
        projectDirHandle = null;
        const message = '저장 실패: index.html과 admin.html이 들어 있는 Punch-drunk Archive 원본 폴더를 선택해야 합니다.';
        setProjectStatus(message, 'error');
        setSaveFeedback(message, 'error');
        alert(message);
        return false;
      }

      await rememberProjectHandle(projectDirHandle);
      setProjectStatus('작업 폴더가 선택되었습니다. 이제 저장하기 버튼으로 바로 저장됩니다.', 'connected');
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') {
        const message = '저장이 취소되었습니다. 폴더를 선택해야 저장할 수 있습니다.';
        setProjectStatus(message, 'normal');
        setSaveFeedback(message, 'error');
        return false;
      }
      console.error(error);
      const message = '저장 실패: 작업 폴더 선택 중 오류가 났습니다.';
      setProjectStatus(message, 'error');
      setSaveFeedback(message, 'error');
      return false;
    }
  }

  function getAutomaticBackupFolderName() {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
      milliseconds,
    ].join('-') + '-admin-save';
  }

  async function ensureBackupFolderForSaving() {
    if (!backupDirHandle) {
      setSaveFeedback('처음 한 번만 MYBOX의 Punch-drunk Archive Backups 폴더를 선택해주세요.', 'working');
      return connectBackupFolder();
    }

    const ok = await verifyPermission(backupDirHandle, true);
    if (ok) return true;
    backupDirHandle = null;
    setBackupFolderStatus('자동 백업: 권한 확인 필요');
    setSaveFeedback('자동 백업 폴더 권한을 다시 허용해주세요.', 'error');
    return false;
  }

  async function createAutomaticDataBackup() {
    const previousAlbums = await readProjectFile('albums-data.js');
    const previousCovers = await readProjectFile('covers-list.js');
    const nextAlbums = serializeAlbums();
    const nextCovers = serializeCovers();

    if (previousAlbums === nextAlbums && previousCovers === nextCovers) {
      setBackupFolderStatus(`자동 백업: ${backupDirHandle.name || '연결됨'}`);
      return false;
    }

    const folderName = getAutomaticBackupFolderName();
    const snapshotDir = await backupDirHandle.getDirectoryHandle(folderName, { create: true });
    await writeDirectoryFile(snapshotDir, 'albums-data.js', previousAlbums);
    await writeDirectoryFile(snapshotDir, 'covers-list.js', previousCovers);
    setBackupFolderStatus(`자동 백업 완료: ${folderName}`);
    return true;
  }

  async function rebuildDeploymentZipAfterSave() {
    if (!isLocalAdminOrigin()) return { attempted: false };
    if (!localBridgeConnected) await checkLocalBridgeStatus();
    if (!localBridgeConnected) return { attempted: false };
    const result = await requestLocalBridge('/api/rebuild-deployment-zip', {
      method: 'POST',
      body: '{}',
    }, 15 * 60 * 1000);
    return { attempted: true, result };
  }

  async function saveViaLocalBridge() {
    try {
      const sessionReady = await heartbeatEditSession();
      if (!sessionReady) return false;

      const latestStatus = await requestLocalBridge('/api/status', { method: 'GET', headers: {} }, 20_000);
      if (localProjectRevision && latestStatus.dataRevision && localProjectRevision !== latestStatus.dataRevision) {
        const message = '저장 중단: 다른 컴퓨터에서 MYBOX 데이터가 변경되었습니다. 현재 입력은 브라우저 임시저장본에 보존했습니다. MYBOX 동기화 후 관리자 페이지를 다시 열어주세요.';
        persistDraft('local-bridge-conflict');
        setCollaborationStatus(message, 'conflict');
        setProjectStatus(message, 'error');
        setSaveFeedback(message, 'error');
        return false;
      }

      setSaveFeedback('MYBOX에 커버와 음반 데이터를 저장하고 있습니다...', 'working');
      const copiedCoverCount = await copyPendingCoverFilesToProject();
      const externalCoverResult = await downloadExternalCoverFilesToProject();
      const saveResult = await requestLocalBridge('/api/save-project', {
        method: 'POST',
        body: JSON.stringify({
          albumsText: serializeAlbums(),
          coversText: serializeCovers(),
          expectedRevision: localProjectRevision || latestStatus.dataRevision || '',
        }),
      }, 2 * 60 * 1000);

      localProjectRevision = saveResult.revision || null;
      projectDataBaseline = createProjectDataSignature(albums, covers);
      setBackupFolderStatus(saveResult.backupCreated
        ? `자동 백업 완료: ${saveResult.backupName}`
        : '자동 백업: 변경 전 데이터와 같아 생략됨');

      let deploymentMessage = 'Netlify용 ZIP 갱신 완료';
      let deploymentFailed = false;
      setSaveFeedback('파일 저장 완료. Netlify용 ZIP을 갱신하고 있습니다...', 'working');
      try {
        await rebuildDeploymentZipAfterSave();
      } catch (error) {
        console.error(error);
        deploymentFailed = true;
        deploymentMessage = 'Netlify용 ZIP 갱신 실패';
      }

      const messages = [];
      if (copiedCoverCount) messages.push(`선택한 커버 ${copiedCoverCount}개 저장`);
      if (externalCoverResult.downloaded) messages.push(`외부 커버 ${externalCoverResult.downloaded}개 저장`);
      if (externalCoverResult.failed) messages.push(`외부 커버 ${externalCoverResult.failed}개는 URL 유지`);
      messages.push(deploymentMessage);
      const message = `저장 완료: ${getTimeText()} · ${messages.join(' · ')}`;
      setProjectStatus(message, 'connected');
      setSaveFeedback(message, deploymentFailed || externalCoverResult.failed ? 'error' : 'success');
      markClean(`마지막 저장: ${getTimeText()} · MYBOX 직접 저장 · ${deploymentMessage}`);
      return true;
    } catch (error) {
      console.error(error);
      persistDraft('local-bridge-save-error');
      const message = `저장 실패: ${error.message || '로컬 관리자 실행기가 파일을 저장하지 못했습니다.'}`;
      setProjectStatus(message, 'error');
      setSaveFeedback(message, 'error');
      return false;
    }
  }

  async function saveDirectly() {
    if (!validateAlbumsBeforeSaving()) {
      setSaveFeedback('저장 실패: 비어 있는 필수 입력값이 있습니다. 안내창 내용을 확인해주세요.', 'error');
      return;
    }

    const repairedIds = repairDuplicateAlbumIds();
    persistDraft('save-start');
    setSaveFeedback(repairedIds ? '중복 ID를 자동 정리하고 저장 중입니다...' : '저장 중입니다...', 'working');

    if (!localBridgeConnected && isLocalAdminOrigin()) await checkLocalBridgeStatus();
    if (isLocalDirectSaveAvailable()) {
      await saveViaLocalBridge();
      return;
    }

    const ready = await selectProjectFolderForSaving();
    if (!ready) return;

    try {
      const ok = await verifyPermission(projectDirHandle, true);
      if (!ok) {
        setProjectStatus('폴더 쓰기 권한이 허용되지 않았습니다.', 'error');
        setSaveFeedback('저장 실패: 폴더 쓰기 권한이 필요합니다.', 'error');
        return;
      }
      const sessionReady = await heartbeatEditSession();
      if (!sessionReady) return;
      const projectIsCurrent = await confirmProjectDataIsStillCurrent();
      if (!projectIsCurrent) return;
      const backupReady = await ensureBackupFolderForSaving();
      if (!backupReady) return;
      await createAutomaticDataBackup();
      const copiedCoverCount = await copyPendingCoverFilesToProject();
      const externalCoverResult = await downloadExternalCoverFilesToProject();
      await writeProjectFile('albums-data.js', serializeAlbums());
      await writeProjectFile('covers-list.js', serializeCovers());
      projectDataBaseline = createProjectDataSignature(albums, covers);

      let deploymentMessage = '';
      let deploymentFailed = false;
      let deploymentSkipped = false;
      if (isLocalAdminOrigin()) {
        setSaveFeedback('파일 저장 완료. Netlify용 ZIP을 갱신하고 있습니다...', 'working');
        try {
          const deployment = await rebuildDeploymentZipAfterSave();
          deploymentSkipped = !deployment.attempted;
          deploymentMessage = deployment.attempted
            ? 'Netlify용 ZIP 갱신 완료'
            : 'Netlify용 ZIP 자동 갱신 안 됨';
        } catch (error) {
          console.error(error);
          deploymentFailed = true;
          deploymentMessage = 'Netlify용 ZIP 갱신 실패';
        }
      } else {
        deploymentSkipped = true;
        deploymentMessage = 'Netlify용 ZIP 자동 갱신 안 됨';
      }

      const coverMessages = [];
      if (copiedCoverCount) coverMessages.push(`선택한 커버 ${copiedCoverCount}개를 covers 폴더에 복사했습니다.`);
      if (externalCoverResult.downloaded) coverMessages.push(`외부 커버 ${externalCoverResult.downloaded}개를 covers 폴더에 저장했습니다.`);
      if (externalCoverResult.failed) coverMessages.push(`외부 커버 ${externalCoverResult.failed}개는 브라우저 보안 제한이나 원본 서버 문제로 URL을 유지했습니다.`);

      if (deploymentMessage) coverMessages.push(deploymentMessage);
      const message = `저장 완료: ${getTimeText()}${coverMessages.length ? ` · ${coverMessages.join(' ')}` : ''}`;
      setProjectStatus(message, 'connected');
      setSaveFeedback(message, deploymentFailed ? 'error' : ((deploymentSkipped || externalCoverResult.failed) ? 'working' : 'success'));
      markClean(`마지막 저장: ${getTimeText()} · 직접 저장${deploymentMessage ? ` · ${deploymentMessage}` : ''}`);
    } catch (error) {
      console.error(error);
      persistDraft('save-error');
      const message = '저장 실패: 파일을 쓰는 중 오류가 났습니다. 브라우저 임시 저장본은 보존했습니다.';
      setProjectStatus(message, 'error');
      setSaveFeedback(message, 'error');
    }
  }

  function replaceFileExtension(fileName, extension) {
    const clean = String(fileName || 'cover').trim() || 'cover';
    const base = clean.replace(/\.[a-z0-9]+$/i, '');
    return `${base}.${extension}`;
  }

  function canOptimizeCoverFile(file) {
    if (!ADMIN_FEATURES.imageOptimization) return false;
    return /^image\/(jpeg|png|webp)$/i.test(String(file?.type || ''));
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지를 읽지 못했습니다.'));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => {
      canvas.toBlob(resolve, type, quality);
    });
  }

  async function optimizeCoverFile(file) {
    if (!canOptimizeCoverFile(file)) {
      return { file, optimized: false, message: '원본 유지' };
    }

    try {
      const img = await loadImageFromFile(file);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const longest = Math.max(width, height);
      const scale = longest > COVER_OPTIMIZATION.maxDimension
        ? COVER_OPTIMIZATION.maxDimension / longest
        : 1;

      if (scale >= 1 && file.size < 900 * 1024 && file.type === 'image/jpeg') {
        return { file, optimized: false, message: `${width}x${height} 원본 유지` };
      }

      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#111017';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const blob = await canvasToBlob(canvas, COVER_OPTIMIZATION.type, COVER_OPTIMIZATION.quality);
      if (!blob || (blob.size >= file.size && scale >= 1)) {
        return { file, optimized: false, message: `${width}x${height} 원본 유지` };
      }

      const optimizedFileName = replaceFileExtension(file.name, 'jpg');
      const optimizedFile = new File([blob], optimizedFileName, {
        type: COVER_OPTIMIZATION.type,
        lastModified: Date.now(),
      });
      const savedKb = Math.max(0, Math.round((file.size - blob.size) / 1024));
      return {
        file: optimizedFile,
        optimized: true,
        message: `${width}x${height} → ${targetWidth}x${targetHeight}${savedKb ? ` · 약 ${savedKb}KB 절약` : ''}`,
      };
    } catch (error) {
      console.warn(error);
      return { file, optimized: false, message: '최적화 실패, 원본 유지' };
    }
  }

  function getCoverThumbnailPath(path) {
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

  async function createCoverThumbnailFile(file, originalPath) {
    if (!ADMIN_FEATURES.gridThumbnails) return null;
    const thumbnailPath = getCoverThumbnailPath(originalPath);
    if (!thumbnailPath) return null;

    try {
      const img = await loadImageFromFile(file);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const longest = Math.max(width, height);
      const scale = Math.min(1, COVER_THUMBNAIL.maxDimension / longest);
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#111017';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const blob = await canvasToBlob(canvas, COVER_THUMBNAIL.type, COVER_THUMBNAIL.quality);
      if (!blob) return null;
      const fileName = thumbnailPath.split('/').pop();
      return {
        path: thumbnailPath,
        file: new File([blob], fileName, {
          type: COVER_THUMBNAIL.type,
          lastModified: Date.now(),
        }),
      };
    } catch (error) {
      console.warn('목록용 썸네일 생성 실패', error);
      return null;
    }
  }

  async function copyCoverFileToProject(file, coverPath) {
    // 예비 폴더 연결 방식에서도 covers/thumbs 같은 하위 폴더까지 저장합니다.
    if (!projectDirHandle) return false;
    const normalized = String(coverPath || '').trim().replace(/\\/g, '/').replace(/^covers\//i, '');
    const parts = normalized.split('/').filter(Boolean);
    if (!parts.length || parts.some(part => part === '.' || part === '..')) {
      throw new Error('허용되지 않은 커버 저장 경로입니다.');
    }
    let directory = await projectDirHandle.getDirectoryHandle('covers', { create: true });
    for (const part of parts.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(part, { create: true });
    }
    const fileHandle = await directory.getFileHandle(parts.at(-1), { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    return true;
  }

  async function uploadCoverFileToLocalBridge(file, path) {
    if (!isLocalDirectSaveAvailable()) return false;
    await requestLocalBridge(`/api/save-cover?path=${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    }, 2 * 60 * 1000);
    return true;
  }

  async function copyPendingCoverFilesToProject() {
    if ((!projectDirHandle && !isLocalDirectSaveAvailable()) || !pendingCoverFiles.size) return 0;

    let copiedCount = 0;
    for (const [path, item] of Array.from(pendingCoverFiles.entries())) {
      try {
        if (projectDirHandle) await copyCoverFileToProject(item.file, path);
        else await uploadCoverFileToLocalBridge(item.file, path);
        pendingCoverFiles.delete(path);
        if (!item.isThumbnail) copiedCount += 1;
      } catch (error) {
        console.error(error);
        setProjectStatus('커버 이미지 복사에 실패했습니다. 이미지를 다시 선택한 뒤 저장해주세요.', 'error');
        throw error;
      }
    }

    return copiedCount;
  }

  function isExternalCoverImage(path) {
    return /^https?:\/\//i.test(String(path || '').trim());
  }

  function getCoverExtensionFromUrl(url, contentType = '') {
    const type = String(contentType || '').toLowerCase();
    if (type.includes('png')) return 'png';
    if (type.includes('webp')) return 'webp';
    if (type.includes('gif')) return 'gif';

    try {
      const pathname = new URL(url).pathname.toLowerCase();
      const match = pathname.match(/\.([a-z0-9]+)$/i);
      if (match && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(match[1])) {
        return match[1] === 'jpeg' ? 'jpg' : match[1];
      }
    } catch (error) {
      console.warn(error);
    }

    return 'jpg';
  }

  function getAlbumCoverFileName(album, extension) {
    const base = album.id || slugify(`${album.artist || ''}-${album.title || ''}`) || `cover-${Date.now()}`;
    return getSafeCoverFileName(`${base}.${extension}`);
  }

  async function downloadExternalCoverToProject(album) {
    // 외부 커버 고정 저장: Apple/iTunes 같은 외부 이미지 URL을 covers 폴더 안의 실제 파일로 바꿉니다.
    // 단, 브라우저가 허용하는 이미지 서버만 내려받을 수 있습니다.
    const originalUrl = String(album.coverImage || '').trim();
    if ((!projectDirHandle && !isLocalDirectSaveAvailable()) || !isExternalCoverImage(originalUrl)) return false;

    const response = await fetch(originalUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`커버 다운로드 실패: ${response.status}`);

    const blob = await response.blob();
    const extension = getCoverExtensionFromUrl(originalUrl, blob.type || response.headers.get('content-type'));
    const availableFileName = await getAvailableCoverFileName(getAlbumCoverFileName(album, extension));
    const path = toCoverPath(availableFileName);

    if (projectDirHandle) await copyCoverFileToProject(blob, path);
    else await uploadCoverFileToLocalBridge(blob, path);
    const thumbnail = await createCoverThumbnailFile(blob, path);
    if (thumbnail) {
      if (projectDirHandle) await copyCoverFileToProject(thumbnail.file, thumbnail.path);
      else await uploadCoverFileToLocalBridge(thumbnail.file, thumbnail.path);
    }
    album.coverImage = path;
    if (!covers.includes(path)) covers.push(path);
    return true;
  }

  async function downloadExternalCoverFilesToProject() {
    if (!projectDirHandle && !isLocalDirectSaveAvailable()) return { downloaded: 0, failed: 0 };

    let downloaded = 0;
    let failed = 0;

    for (const album of albums) {
      ensureAlbumShape(album);
      if (!isExternalCoverImage(album.coverImage)) continue;

      try {
        const ok = await downloadExternalCoverToProject(album);
        if (ok) downloaded += 1;
      } catch (error) {
        console.warn(error);
        failed += 1;
      }
    }

    return { downloaded, failed };
  }

  function getSafeCoverFileName(fileName) {
    const original = String(fileName || 'cover').trim();
    const dotIndex = original.lastIndexOf('.');
    const rawName = dotIndex > 0 ? original.slice(0, dotIndex) : original;
    const rawExt = dotIndex > 0 ? original.slice(dotIndex + 1) : 'jpg';
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const name = rawName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `cover-${Date.now()}`;
    return `${name}.${ext}`;
  }

  async function coverFileExistsInProject(fileName) {
    if (!projectDirHandle && isLocalDirectSaveAvailable()) {
      try {
        const result = await requestLocalBridge(`/api/cover-exists?path=${encodeURIComponent(toCoverPath(fileName))}`, {
          method: 'GET',
          headers: {},
        }, 15_000);
        return result.exists === true;
      } catch (error) {
        console.warn('로컬 커버 중복 확인 실패', error);
        return false;
      }
    }
    if (!projectDirHandle) return false;
    try {
      const coversDir = await projectDirHandle.getDirectoryHandle('covers', { create: true });
      await coversDir.getFileHandle(fileName);
      return true;
    } catch (error) {
      if (error?.name === 'NotFoundError') return false;
      return false;
    }
  }

  async function getAvailableCoverFileName(fileName) {
    // 중복 파일명 방지: covers-list.js 또는 실제 covers 폴더에 같은 이름이 있으면 -1, -2를 붙입니다.
    const safeName = getSafeCoverFileName(fileName);
    const dotIndex = safeName.lastIndexOf('.');
    const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
    const ext = dotIndex > 0 ? safeName.slice(dotIndex) : '';
    let candidate = safeName;
    let index = 1;

    while (covers.includes(toCoverPath(candidate)) || coverPreviewUrls.has(toCoverPath(candidate)) || await coverFileExistsInProject(candidate)) {
      candidate = `${base}-${index}${ext}`;
      index += 1;
    }

    return candidate;
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '') || `album-${Date.now()}`;
  }

  function generateAlbumId() {
    const base = `album-${Date.now().toString(36)}`;
    let candidate = base;
    let index = 1;
    while (albums.some(item => item.id === candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  function repairDuplicateAlbumIds() {
    const seen = new Set();
    let changed = false;

    albums.forEach(album => {
      const originalId = album.id;
      if (!album.id || seen.has(album.id)) {
        album.id = generateAlbumId();
        if (currentId === originalId) currentId = album.id;
        changed = true;
      }
      seen.add(album.id);
    });

    return changed;
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

  function hasKorean(value) {
    return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(String(value || ''));
  }

  function hasLatin(value) {
    return /[A-Za-z]/.test(String(value || ''));
  }

  function getKnownArtistAlias(artist) {
    const keys = [
      normalize(artist),
      normalize(String(artist || '').replace(/&/g, 'and')),
    ].filter(Boolean);
    for (const [key, alias] of Object.entries(KNOWN_ARTIST_ALIASES)) {
      const aliasKeys = [key, alias.ko, alias.en]
        .flatMap(value => [value, String(value || '').replace(/&/g, 'and')])
        .map(normalize)
        .filter(Boolean);
      if (keys.some(candidate => aliasKeys.includes(candidate))) return alias;
    }
    return null;
  }

  function applyArtistAlias(album, alias, overwrite = false) {
    if (!album || !alias?.ko || !alias?.en) return false;
    const beforeKo = album.artistKo || '';
    const beforeEn = album.artistEn || '';
    if (overwrite || !String(album.artistKo || '').trim()) album.artistKo = alias.ko;
    if (overwrite || !String(album.artistEn || '').trim()) album.artistEn = alias.en;
    album.artist = album.artistKo || album.artist || album.artistEn;
    return beforeKo !== album.artistKo || beforeEn !== album.artistEn;
  }

  function inferArtistAliasFromText(artist) {
    const known = getKnownArtistAlias(artist);
    if (known) return known;
    const text = String(artist || '').trim();
    if (!text) return null;
    if (hasKorean(text) && hasLatin(text)) return { ko: text, en: text };
    return null;
  }

  function classifyGenre(rawGenre) {
    const raw = String(rawGenre || '').trim();
    const genre = normalizeGenreName(raw);
    if (!genre) return '기타';

    // Apple/iTunes에서 가져온 세부 장르를 손님용 큰 장르로 자동 분류합니다.
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

  function setupGenreSelect() {
    if (!fields.genre || fields.genre.tagName !== 'SELECT') return;
    fields.genre.replaceChildren(...STANDARD_GENRES.map(genre => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      return option;
    }));
  }
  function stripTrackNumber(track) {
    const text = String(track || '').trim();
    return text.replace(/^([A-Z]\s*\d+|\d+|[A-Z][-–]\d+|[A-Z]\.\d+)\.?\s+/i, '').trim();
  }

  function splitTrackLine(track) {
    const text = String(track || '').trim();
    const match = text.match(/^([A-Z]\s*\d+|\d+|[A-Z][-–]\d+|[A-Z]\.\d+)\.?\s+(.+)$/i);
    if (!match) return { number: '', title: text };
    const rawNumber = match[1].replace(/\s+/g, '');
    return { number: rawNumber.endsWith('.') ? rawNumber : `${rawNumber}.`, title: match[2].trim() };
  }

  function isRecommendedTrack(track, recommendedTracks) {
    // 추천곡 매칭: 트랙 한 줄 또는 곡명이 정확히 같을 때만 같은 곡으로 봅니다.
    // 단어 포함 비교를 하지 않아 원곡과 Instrumental/Remix가 함께 선택되지 않습니다.
    const trackLine = normalize(String(track || '').trim());
    const trackTitle = normalize(stripTrackNumber(track));
    if (!trackTitle) return false;
    return (recommendedTracks || []).some(recommended => {
      const recommendedValue = normalize(String(recommended || '').trim());
      return recommendedValue && (recommendedValue === trackLine || recommendedValue === trackTitle);
    });
  }

  function getCanonicalRecommendedTracks(tracklist, recommendedTracks) {
    const tracks = (tracklist || []).map(track => String(track || '').trim()).filter(Boolean);
    const seen = new Set();
    const resolved = [];

    (recommendedTracks || []).forEach(recommended => {
      const raw = String(recommended || '').trim();
      const rawKey = normalize(raw);
      if (!rawKey) return;

      // 새 저장 형식은 트랙 번호까지 포함하므로 정확히 한 줄만 선택됩니다.
      let matchedTrack = tracks.find(track => normalize(track) === rawKey);

      // 예전 데이터는 곡명만 저장되어 있으므로 정확히 같은 제목의 첫 트랙으로 변환합니다.
      if (!matchedTrack) {
        matchedTrack = tracks.find(track => normalize(stripTrackNumber(track)) === rawKey);
      }

      // 과거에 번호까지 저장한 데이터가 있다면 번호 표기가 달라져도 정확한 제목으로 한 번만 복구합니다.
      if (!matchedTrack) {
        const parsed = splitTrackLine(raw);
        const parsedTitle = parsed.number ? normalize(parsed.title) : '';
        if (parsedTitle) {
          matchedTrack = tracks.find(track => normalize(stripTrackNumber(track)) === parsedTitle);
        }
      }

      const matchedKey = normalize(matchedTrack);
      if (!matchedTrack || !matchedKey || seen.has(matchedKey)) return;
      seen.add(matchedKey);
      resolved.push(matchedTrack);
    });

    return resolved;
  }

  function getCurrentAlbum() {
    return albums.find(album => album.id === currentId) || albums[0] || null;
  }

  function ensureAlbumShape(album) {
    album.id = String(album.id || '').trim() || generateAlbumId();
    album.title = String(album.title || '').trim();
    album.artist = String(album.artist || '').trim();
    album.artistKo = String(album.artistKo || (hasKorean(album.artist) ? album.artist : '')).trim();
    album.artistEn = String(album.artistEn || '').trim();
    album.artist = album.artistKo || album.artist;
    album.addedAt = String(album.addedAt || '').trim();
    album.year = String(album.year || '').trim();
    album.format = String(album.format || 'Vinyl').trim() || 'Vinyl';
    album.genre = classifyGenre(album.genre);
    album.coverImage = String(album.coverImage || '').trim();
    album.recommendedTracks = Array.isArray(album.recommendedTracks)
      ? album.recommendedTracks.map(item => String(item || '').trim()).filter(Boolean)
      : [];
    album.tracklist = Array.isArray(album.tracklist)
      ? album.tracklist.map(item => String(item || '').trim()).filter(Boolean)
      : [];
    if (album.tracklist.length && album.recommendedTracks.length) {
      const canonicalRecommendations = getCanonicalRecommendedTracks(album.tracklist, album.recommendedTracks);
      if (canonicalRecommendations.length) album.recommendedTracks = canonicalRecommendations;
    }
    album.description = String(album.description || '').trim();
    album.descriptionEn = String(album.descriptionEn || '').trim();
    album.weeklyReason = String(album.weeklyReason || '').trim();
    album.weeklyReasonEn = String(album.weeklyReasonEn || '').trim();
    album.isWeekly = album.isWeekly === true || album.weekly === true;
    delete album.weekly;
    return album;
  }

  function parseYear(year) {
    const parsed = parseInt(String(year || '').match(/\d{4}/)?.[0] || '0', 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function compareYearNewest(a, b) {
    const yearA = parseYear(a.year);
    const yearB = parseYear(b.year);
    if (!yearA && !yearB) return compareText(a.artist, b.artist) || compareText(a.title, b.title);
    if (!yearA) return 1;
    if (!yearB) return -1;
    return yearB - yearA || compareText(a.artist, b.artist) || compareText(a.title, b.title);
  }

  function compareYearOldest(a, b) {
    const yearA = parseYear(a.year);
    const yearB = parseYear(b.year);
    if (!yearA && !yearB) return compareText(a.artist, b.artist) || compareText(a.title, b.title);
    if (!yearA) return 1;
    if (!yearB) return -1;
    return yearA - yearB || compareText(a.artist, b.artist) || compareText(a.title, b.title);
  }

  function compareText(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'ko', { sensitivity: 'base' });
  }

  function getAlbumListSearchText(album) {
    return [
      album.title,
      album.artist,
      album.artistKo,
      album.artistEn,
      album.year,
      album.format,
      album.genre,
      album.id,
    ].join(' ');
  }

  function albumMatchesListFilter(album) {
    const filter = listState.filter || 'all';
    if (filter === 'all') return true;
    if (filter === 'Vinyl' || filter === 'CD') return album.format === filter;
    if (filter === 'weekly') return album.isWeekly === true;
    if (filter === 'missing-cover') return !String(album.coverImage || '').trim();
    if (filter === 'missing-tracks') return !Array.isArray(album.tracklist) || album.tracklist.length === 0;
    if (filter === 'missing-description') return !String(album.description || '').trim();
    if (filter === 'missing-description-en') return !String(album.descriptionEn || '').trim();
    if (filter === 'missing-artist-labels') return !String(album.artistKo || '').trim() || !String(album.artistEn || '').trim();
    if (filter === 'cover-path-issue') return hasCoverPathIssue(album);
    return true;
  }

  function hasCoverPathIssue(album) {
    const path = String(album.coverImage || '').trim();
    if (!path || isExternalCoverImage(path)) return false;
    return !covers.includes(path);
  }

  function getListFilterCount(filter) {
    if (filter === 'all') return albums.length;
    const previousFilter = listState.filter;
    listState.filter = filter;
    const count = albums.filter(album => {
      ensureAlbumShape(album);
      return albumMatchesListFilter(album);
    }).length;
    listState.filter = previousFilter;
    return count;
  }

  function renderAlbumListFilters() {
    if (!albumListFilters) return;
    albumListFilters.querySelectorAll('[data-list-filter]').forEach(button => {
      const filter = button.dataset.listFilter || 'all';
      const isDescriptionFilter = filter === 'missing-description' || filter === 'missing-description-en';
      button.hidden = isDescriptionFilter && !descriptionMode;
      if (!button.dataset.label) button.dataset.label = button.textContent.trim();
      button.dataset.active = String(filter === listState.filter);
      button.textContent = `${button.dataset.label} ${getListFilterCount(filter)}`;
    });
  }

  function getInitialLabel(value, fallback) {
    const first = [...String(value || '').trim()][0];
    return first ? first.toLocaleUpperCase('ko-KR') : fallback;
  }

  function getAlbumGroupLabel(album) {
    if (listState.sort === 'artist') return getInitialLabel(album.artist, '아티스트 없음');
    if (listState.sort === 'title') return getInitialLabel(album.title, '제목 없음');
    if (listState.sort === 'genre') return String(album.genre || '').trim() || '장르 없음';
    if (listState.sort === 'year-newest' || listState.sort === 'year-oldest') {
      const year = parseYear(album.year);
      if (!year) return '연도 없음';
      return `${Math.floor(year / 10) * 10}년대`;
    }
    return '';
  }

  function getAdminListAlbums() {
    const q = normalize(listState.query);
    const filtered = albums.filter(album => {
      ensureAlbumShape(album);
      const matchesQuery = !q || normalize(getAlbumListSearchText(album)).includes(q);
      return matchesQuery && albumMatchesListFilter(album);
    });
    const sorted = [...filtered];

    if (listState.sort === 'artist') sorted.sort((a, b) => compareText(a.artist, b.artist) || compareText(a.title, b.title));
    if (listState.sort === 'title') sorted.sort((a, b) => compareText(a.title, b.title) || compareText(a.artist, b.artist));
    if (listState.sort === 'year-newest') sorted.sort(compareYearNewest);
    if (listState.sort === 'year-oldest') sorted.sort(compareYearOldest);
    if (listState.sort === 'genre') sorted.sort((a, b) => compareText(a.genre, b.genre) || compareText(a.artist, b.artist) || compareText(a.title, b.title));

    return sorted;
  }

  function createAlbumListButton(album) {
    const button = document.createElement('button');
    const formatLabel = album.format === 'Vinyl' ? 'LP' : album.format;
    const meta = [album.artist || '아티스트 없음', album.year || '연도 없음', formatLabel || '', album.genre || ''].filter(Boolean).join(' · ');
    const badges = [];
    if (album.isWeekly) badges.push('금주의 음반');
    if (!String(album.coverImage || '').trim()) badges.push('커버 없음');
    if (!Array.isArray(album.tracklist) || album.tracklist.length === 0) badges.push('트랙 없음');
    if (descriptionMode && !String(album.description || '').trim()) badges.push('설명 없음');
    if (descriptionMode && !String(album.descriptionEn || '').trim()) badges.push('영문 설명 없음');
    if (!String(album.artistKo || '').trim() || !String(album.artistEn || '').trim()) badges.push('아티스트 표기 확인');
    if (hasCoverPathIssue(album)) badges.push('커버 경로 확인');

    button.type = 'button';
    button.className = 'album-edit-item';
    button.dataset.albumId = album.id;
    button.dataset.active = String(album.id === currentId);
    button.innerHTML = `
      <strong>${escapeHtml(album.title || '제목 없음')}</strong>
      <span class="album-list-meta">${escapeHtml(meta)}</span>
      ${badges.length ? `<span class="album-list-badges">${badges.map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}</span>` : ''}
    `;
    button.addEventListener('click', () => {
      currentId = album.id;
      renderAll();
    });
    return button;
  }

  function scrollCurrentAlbumIntoView() {
    if (!albumList || !currentId) return;
    const currentButton = Array.from(albumList.querySelectorAll('[data-album-id]'))
      .find(button => button.dataset.albumId === currentId);
    currentButton?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function renderAlbumList() {
    if (albumListSearch && albumListSearch.value !== listState.query) albumListSearch.value = listState.query;
    if (albumListSort && albumListSort.value !== listState.sort) albumListSort.value = listState.sort;
    renderAlbumListFilters();

    const visibleAlbums = getAdminListAlbums();
    if (albumListSummary) {
      const filterLabel = LIST_FILTER_LABELS[listState.filter] || '전체';
      const narrowed = listState.query || listState.filter !== 'all';
      albumListSummary.textContent = narrowed
        ? `${visibleAlbums.length} / ${albums.length}장 · ${filterLabel}`
        : `${albums.length}장의 음반 · 전체`;
    }

    if (!visibleAlbums.length) {
      const empty = document.createElement('p');
      empty.className = 'album-list-empty';
      empty.textContent = '검색 결과가 없습니다.';
      albumList.replaceChildren(empty);
      return;
    }

    const nodes = [];
    let previousGroup = '';
    visibleAlbums.forEach(album => {
      ensureAlbumShape(album);
      const group = getAlbumGroupLabel(album);
      if (group && group !== previousGroup) {
        const groupNode = document.createElement('div');
        groupNode.className = 'album-list-group';
        groupNode.textContent = group;
        nodes.push(groupNode);
        previousGroup = group;
      }
      nodes.push(createAlbumListButton(album));
    });
    albumList.replaceChildren(...nodes);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderEditor() {
    const album = getCurrentAlbum();
    if (!album) return;
    ensureAlbumShape(album);

    editorTitle.textContent = album.title ? `음반 편집 · ${album.title}` : '음반 편집';
    fields.id.value = album.id;
    fields.title.value = album.title;
    fields.artist.value = album.artist;
    fields.artistKo.value = album.artistKo;
    fields.artistEn.value = album.artistEn;
    fields.year.value = album.year;
    fields.format.value = album.format;
    fields.genre.value = classifyGenre(album.genre);
    fields.coverImage.value = album.coverImage;
    fields.tracklist.value = album.tracklist.join('\n');
    fields.description.value = album.description;
    fields.descriptionEn.value = album.descriptionEn;
    fields.weeklyReason.value = album.weeklyReason;
    fields.weeklyReasonEn.value = album.weeklyReasonEn;
    fields.isWeekly.checked = album.isWeekly === true;
    if (weeklyReasonSection) weeklyReasonSection.hidden = album.isWeekly !== true;
    if (previewCurrent) previewCurrent.href = `index.html#album=${encodeURIComponent(album.id)}`;
    if (appleSearchTerm && !appleSearchTerm.value.trim()) appleSearchTerm.value = getAppleSearchText();

    renderCoverPreview(album.coverImage, album);
    renderCoverGallery();
    renderRecommendChecks();
  }

  function renderAdminStatus() {
    const weekly = albums.find(album => album.isWeekly);
    const current = getCurrentAlbum();
    if (currentWeekly) {
      currentWeekly.textContent = weekly
        ? `${weekly.artist || '아티스트 없음'} - ${weekly.title || '제목 없음'}`
        : '금주의 음반이 없습니다.';
    }
    if (setCurrentWeeklyButton && current) {
      setCurrentWeeklyButton.disabled = current.isWeekly === true;
    }
  }

  function getAdminStats() {
    const safeAlbums = albums.map(album => ensureAlbumShape(album));
    return {
      total: safeAlbums.length,
      weekly: safeAlbums.filter(album => album.isWeekly === true).length,
      missingCover: safeAlbums.filter(album => !String(album.coverImage || '').trim()).length,
      missingTracks: safeAlbums.filter(album => !Array.isArray(album.tracklist) || album.tracklist.length === 0).length,
      missingDescription: safeAlbums.filter(album => !String(album.description || '').trim()).length,
      missingDescriptionEn: safeAlbums.filter(album => !String(album.descriptionEn || '').trim()).length,
      missingArtistLabels: safeAlbums.filter(album => !String(album.artistKo || '').trim() || !String(album.artistEn || '').trim()).length,
      coverPathIssue: safeAlbums.filter(hasCoverPathIssue).length,
    };
  }

  function renderAdminDashboard() {
    if (!adminDashboard) return;
    if (!ADMIN_FEATURES.dashboard) {
      adminDashboard.hidden = true;
      return;
    }
    const stats = getAdminStats();
    const items = [
      ['전체 음반', stats.total, 'all'],
      ['금주의 음반', stats.weekly, 'weekly'],
      ['커버 없음', stats.missingCover, 'missing-cover'],
      ['트랙 없음', stats.missingTracks, 'missing-tracks'],
      ['아티스트 표기 확인', stats.missingArtistLabels, 'missing-artist-labels'],
      ['커버 경로 확인', stats.coverPathIssue, 'cover-path-issue'],
    ];
    if (descriptionMode) {
      items.splice(4, 0,
        ['한글 설명 없음', stats.missingDescription, 'missing-description'],
        ['영문 설명 없음', stats.missingDescriptionEn, 'missing-description-en']
      );
    }

    adminDashboard.replaceChildren(...items.map(([label, count, filter]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dashboard-card';
      button.dataset.filterTarget = filter;
      button.innerHTML = `<span>${escapeHtml(label)}</span><strong>${count}</strong>`;
      button.addEventListener('click', () => {
        listState.filter = filter;
        renderAlbumList();
        albumListSearch?.focus();
      });
      return button;
    }));
  }

  function setAppleStatus(message, type = 'normal') {
    if (!appleStatus) return;
    appleStatus.textContent = message;
    appleStatus.dataset.error = String(type === 'error');
  }

  function getAppleCountry() {
    return appleCountry?.value || 'KR';
  }

  function getAppleSearchText() {
    const album = getCurrentAlbum();
    return [album?.artist, album?.title].filter(Boolean).join(' ').trim();
  }

  function fillAppleSearchFromCurrent() {
    if (!appleSearchTerm) return;
    appleSearchTerm.value = getAppleSearchText();
    setAppleStatus('현재 편집 중인 음반명으로 검색어를 채웠습니다.');
  }

  function getAppleArtworkUrl(result, size = 1200) {
    const url = String(result?.artworkUrl100 || result?.artworkUrl60 || '').trim();
    if (!url) return '';
    return url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`);
  }

  function getAppleReleaseYear(result) {
    return String(result?.releaseDate || '').slice(0, 4);
  }

  function createAppleMetaText(result) {
    return [
      result.artistName,
      getAppleReleaseYear(result),
      result.primaryGenreName,
      result.country,
      result._fromSongSearch ? '곡 검색 보완' : '',
    ].filter(Boolean).join(' · ');
  }

  function createAppleSearchUrl(term, country, entity, limit = APPLE_SEARCH_LIMIT) {
    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', term);
    url.searchParams.set('media', 'music');
    url.searchParams.set('entity', entity);
    url.searchParams.set('country', country);
    url.searchParams.set('limit', String(limit));
    return url;
  }

  async function fetchAppleSearchItems(term, country, entity, limit = APPLE_SEARCH_LIMIT) {
    const response = await fetch(createAppleSearchUrl(term, country, entity, limit).toString());
    if (!response.ok) throw new Error(`Apple/iTunes 응답 오류: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  }

  function createAppleCandidateKey(result) {
    if (result?.collectionId) return String(result.collectionId);
    return normalize(`${result?.artistName || ''} ${result?.collectionName || ''}`);
  }

  function createAppleCandidateFromSong(track) {
    return {
      collectionId: track.collectionId,
      artistName: track.collectionArtistName || track.artistName,
      collectionName: track.collectionName,
      artworkUrl60: track.artworkUrl60,
      artworkUrl100: track.artworkUrl100,
      releaseDate: track.releaseDate,
      primaryGenreName: track.primaryGenreName,
      country: track.country,
      collectionViewUrl: track.collectionViewUrl,
      _fromSongSearch: true,
    };
  }

  function getAppleCandidateScore(result, term) {
    const compactTerm = normalize(term);
    const haystack = normalize(`${result?.artistName || ''} ${result?.collectionName || ''}`);
    const termWords = String(term || '').split(/\s+/).map(normalize).filter(Boolean);
    let score = 0;

    if (compactTerm && haystack === compactTerm) score += 100;
    if (compactTerm && haystack.includes(compactTerm)) score += 60;
    termWords.forEach(word => {
      if (haystack.includes(word)) score += 12;
    });
    if (result?._fromSongSearch) score += 10;
    return score;
  }

  async function findAppleAlbumCandidates(term, country) {
    const candidates = [];
    const seen = new Set();

    const addCandidate = (candidate) => {
      if (!candidate?.collectionId || !candidate?.collectionName) return;
      const key = createAppleCandidateKey(candidate);
      if (!key || seen.has(key)) return;
      candidate._order = candidates.length;
      candidate._score = getAppleCandidateScore(candidate, term);
      candidate._searchCountry = country;
      seen.add(key);
      candidates.push(candidate);
    };

    // Apple/iTunes의 album 검색에서 빠지는 한국 음반이 있어 song 검색에서 앨범 후보를 한 번 더 보완합니다.
    const albumItems = await fetchAppleSearchItems(term, country, 'album');
    const songItems = await fetchAppleSearchItems(term, country, 'song');

    albumItems
      .filter(item => item.collectionId && item.collectionName)
      .forEach(addCandidate);

    songItems
      .filter(item => item.wrapperType === 'track' && item.kind === 'song' && item.collectionId && item.collectionName)
      .map(createAppleCandidateFromSong)
      .forEach(addCandidate);

    return candidates
      .sort((a, b) => b._score - a._score || a._order - b._order)
      .slice(0, APPLE_SEARCH_LIMIT);
  }

  async function searchAppleAlbums() {
    if (!appleSearchTerm || !appleResults) return;
    const term = appleSearchTerm.value.trim() || getAppleSearchText();
    if (!term) {
      setAppleStatus('먼저 아티스트명이나 앨범명을 입력하세요.', 'error');
      return;
    }

    appleSearchTerm.value = term;
    appleSearchResults = [];
    appleResultPage = 1;
    appleResults.replaceChildren();
    setAppleStatus(`Apple/iTunes에서 앨범 후보를 최대 ${APPLE_SEARCH_LIMIT}개까지 찾는 중입니다...`);

    try {
      const results = await findAppleAlbumCandidates(term, getAppleCountry());
      const hasSongBackfill = results.some(result => result._fromSongSearch);
      renderAppleResults(results, 1);
      setAppleStatus(results.length
        ? `${results.length}개 후보를 찾았습니다. 10개씩 넘겨보며 필요한 정보만 적용하세요.${hasSongBackfill ? ' 앨범 검색에서 빠진 후보는 곡 검색으로 보완했습니다.' : ''}`
        : '검색 결과가 없습니다. 검색어를 조금 바꿔보세요.', results.length ? 'normal' : 'error');
    } catch (error) {
      console.error(error);
      setAppleStatus('Apple/iTunes 검색에 실패했습니다. 인터넷 연결이나 검색어를 확인하세요.', 'error');
    }
  }
  function goToAppleResultPage(page) {
    renderAppleResults(appleSearchResults, page);
  }

  function createAppleResultPager(totalPages) {
    const nav = document.createElement('nav');
    nav.className = 'apple-result-pager';
    nav.setAttribute('aria-label', 'Apple/iTunes 검색 결과 페이지');

    const makeButton = (label, page, options = {}) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-button compact';
      button.textContent = label;
      if (options.current) button.dataset.current = 'true';
      if (options.disabled) button.disabled = true;
      button.addEventListener('click', () => {
        if (!button.disabled && page !== appleResultPage) goToAppleResultPage(page);
      });
      return button;
    };

    nav.append(makeButton('이전', Math.max(1, appleResultPage - 1), { disabled: appleResultPage === 1 }));
    for (let page = 1; page <= totalPages; page += 1) {
      nav.append(makeButton(String(page), page, { current: page === appleResultPage }));
    }
    nav.append(makeButton('다음', Math.min(totalPages, appleResultPage + 1), { disabled: appleResultPage === totalPages }));
    return nav;
  }

  function createAppleResultCard(result) {
    const card = document.createElement('article');
    card.className = 'apple-result-card';

    const cover = document.createElement('div');
    cover.className = 'apple-result-cover';
    const img = document.createElement('img');
    img.src = getAppleArtworkUrl(result, 300);
    img.alt = `${result.artistName || ''} - ${result.collectionName || ''}`.trim();
    img.onerror = () => cover.replaceChildren(createFallbackCover({
      artist: result.artistName || 'Apple/iTunes',
      title: result.collectionName || 'No Cover',
    }));
    cover.append(img);

    const meta = document.createElement('div');
    meta.className = 'apple-result-meta';
    const title = document.createElement('strong');
    title.textContent = result.collectionName || '제목 없음';
    const sub = document.createElement('span');
    sub.textContent = createAppleMetaText(result);
    const actions = document.createElement('div');
    actions.className = 'apple-result-actions';

    const applyBasicsButton = document.createElement('button');
    applyBasicsButton.type = 'button';
    applyBasicsButton.className = 'admin-button';
    applyBasicsButton.textContent = '기본 정보+커버 적용';
    applyBasicsButton.addEventListener('click', async () => applyAppleBasics(result));

    const applyTracksButton = document.createElement('button');
    applyTracksButton.type = 'button';
    applyTracksButton.className = 'admin-button';
    applyTracksButton.textContent = '트랙리스트 적용';
    applyTracksButton.addEventListener('click', () => applyAppleTracks(result));

    const applyAllButton = document.createElement('button');
    applyAllButton.type = 'button';
    applyAllButton.className = 'admin-button primary';
    applyAllButton.textContent = '둘 다 적용';
    applyAllButton.addEventListener('click', async () => {
      await applyAppleBasics(result, { quiet: true });
      const tracksApplied = await applyAppleTracks(result, { quiet: true });
      setAppleStatus(tracksApplied
        ? '기본 정보, 커버, 트랙리스트를 입력칸에 적용했습니다. 확인 후 저장하세요.'
        : '기본 정보와 커버를 적용했습니다. 같은 앨범으로 확인되는 트랙리스트가 없어 자동 적용하지 않았습니다.', tracksApplied ? 'normal' : 'error');
    });

    actions.append(applyBasicsButton, applyTracksButton, applyAllButton);
    meta.append(title, sub, actions);
    card.append(cover, meta);
    return card;
  }

  function renderAppleResults(results, page = 1) {
    if (!appleResults) return;
    appleSearchResults = Array.isArray(results) ? results : [];

    if (!appleSearchResults.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = '표시할 후보가 없습니다.';
      appleResults.replaceChildren(empty);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(appleSearchResults.length / APPLE_RESULTS_PER_PAGE));
    appleResultPage = Math.min(Math.max(1, page), totalPages);
    const start = (appleResultPage - 1) * APPLE_RESULTS_PER_PAGE;
    const pageResults = appleSearchResults.slice(start, start + APPLE_RESULTS_PER_PAGE);
    const range = document.createElement('p');
    range.className = 'apple-result-range';
    range.textContent = `${appleSearchResults.length}개 후보 중 ${start + 1}-${Math.min(start + APPLE_RESULTS_PER_PAGE, appleSearchResults.length)}번째`;

    const nodes = [range];
    if (totalPages > 1) nodes.push(createAppleResultPager(totalPages));
    nodes.push(...pageResults.map(createAppleResultCard));
    if (totalPages > 1) nodes.push(createAppleResultPager(totalPages));
    appleResults.replaceChildren(...nodes);
  }

  async function fetchAppleCollectionLocale(collectionId, country) {
    if (!collectionId) return null;
    const url = new URL('https://itunes.apple.com/lookup');
    url.searchParams.set('id', String(collectionId));
    url.searchParams.set('country', country);
    url.searchParams.set('entity', 'album');
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Apple/iTunes ${country} 표기 조회 오류: ${response.status}`);
    const data = await response.json();
    return (Array.isArray(data.results) ? data.results : [])
      .find(item => item.wrapperType === 'collection' || item.collectionType === 'Album') || null;
  }

  async function resolveAppleArtistAlias(result) {
    const artistName = String(result?.artistName || '').trim();
    if (!artistName) return { alias: null, distinct: false };

    const known = getKnownArtistAlias(artistName);
    if (known) return { alias: known, distinct: normalize(known.ko) !== normalize(known.en) };

    const lookups = await Promise.allSettled([
      fetchAppleCollectionLocale(result.collectionId, 'KR'),
      fetchAppleCollectionLocale(result.collectionId, 'US'),
    ]);
    const krName = String(lookups[0].status === 'fulfilled' ? lookups[0].value?.artistName || '' : '').trim();
    const usName = String(lookups[1].status === 'fulfilled' ? lookups[1].value?.artistName || '' : '').trim();
    const localized = createArtistAliasFromApple(krName, usName, artistName);
    if (localized?.ko && localized?.en) {
      return { alias: localized, distinct: normalize(localized.ko) !== normalize(localized.en) };
    }

    // Apple이 한쪽 표기만 주는 경우에도 저장이 막히지 않도록 제공된 이름으로 두 칸을 채웁니다.
    const koreanName = [krName, usName, artistName].find(hasKorean) || artistName;
    const englishName = [usName, krName, artistName].find(value => hasLatin(value) && !hasKorean(value)) || artistName;
    return {
      alias: { ko: koreanName, en: englishName },
      distinct: normalize(koreanName) !== normalize(englishName),
    };
  }

  async function applyAppleBasics(result, options = {}) {
    const album = getCurrentAlbum();
    if (!album) return;
    const artwork = getAppleArtworkUrl(result);
    const artistName = String(result.artistName || '').trim();

    album.title = result.collectionName || album.title;
    if (artistName) {
      // 조회가 끝나기 전에도 두 입력칸이 비어 보이지 않게 Apple의 기본 이름을 먼저 넣습니다.
      applyArtistAlias(album, getKnownArtistAlias(artistName) || { ko: artistName, en: artistName }, true);
    }
    album.artist = album.artistKo || album.artist;
    album.year = getAppleReleaseYear(result) || album.year;
    album.genre = classifyGenre(result.primaryGenreName || album.genre);
    if (artwork) album.coverImage = artwork;

    markDirty();
    renderAll();
    if (!options.quiet) setAppleStatus('기본 정보와 커버를 적용했습니다. 한글/영문 아티스트 표기를 확인하는 중입니다...');

    const resolved = await resolveAppleArtistAlias(result);
    if (resolved.alias) {
      applyArtistAlias(album, resolved.alias, true);
      album.artist = album.artistKo || album.artistEn || artistName;
      markDirty();
      renderAll();
    }

    if (!options.quiet) {
      const artistMessage = resolved.distinct
        ? '한글/영문 아티스트 표기도 각각 채웠습니다.'
        : 'Apple에 별도 한글 표기가 없어 제공된 이름을 두 칸에 넣었습니다. 필요하면 한글표기만 수정하세요.';
      setAppleStatus(`기본 정보와 커버를 적용했습니다. ${artistMessage} 장르는 큰 장르로 자동 분류했습니다. 확인 후 저장하세요.`);
    }
  }

  function setArtistLabelStatus(message, type = 'normal') {
    if (!artistLabelStatus) return;
    artistLabelStatus.textContent = message;
    artistLabelStatus.dataset.error = String(type === 'error');
  }

  function getBestAppleArtistName(results) {
    const first = Array.isArray(results) ? results[0] : null;
    return String(first?.artistName || '').trim();
  }

  function createArtistAliasFromApple(krArtist, usArtist, fallbackArtist) {
    const fallback = String(fallbackArtist || '').trim();
    const ko = String(krArtist || '').trim();
    const en = String(usArtist || '').trim();

    if (ko && en && normalize(ko) !== normalize(en)) return { ko, en };
    if (fallback && hasKorean(fallback) && en) return { ko: fallback, en };
    if (fallback && hasLatin(fallback) && ko && normalize(fallback) !== normalize(ko)) return { ko, en: fallback };
    return inferArtistAliasFromText(fallback);
  }

  async function guessArtistLabels() {
    const album = getCurrentAlbum();
    if (!album) return;
    const known = inferArtistAliasFromText(album.artist);
    if (known) {
      applyArtistAlias(album, known, true);
      fields.artistKo.value = album.artistKo;
      fields.artistEn.value = album.artistEn;
      markDirty();
      renderAlbumList();
      setArtistLabelStatus('알려진 표기표에서 아티스트 한글/영문 표기를 채웠습니다. 필요하면 직접 수정하세요.');
      return;
    }

    const term = [album.artist, album.title].filter(Boolean).join(' ').trim();
    if (!term) {
      setArtistLabelStatus('먼저 아티스트명이나 앨범명을 입력하세요.', 'error');
      return;
    }

    setArtistLabelStatus('Apple/iTunes KR/US 자료를 비교하는 중입니다...');
    try {
      const [krResults, usResults] = await Promise.all([
        findAppleAlbumCandidates(term, 'KR'),
        findAppleAlbumCandidates(term, 'US'),
      ]);
      const alias = createArtistAliasFromApple(
        getBestAppleArtistName(krResults),
        getBestAppleArtistName(usResults),
        album.artist
      );
      if (!alias?.ko || !alias?.en || normalize(alias.ko) === normalize(alias.en)) {
        setArtistLabelStatus('공식 한글/영문 표기를 둘 다 확실히 찾지 못해 자동 입력하지 않았습니다.', 'error');
        return;
      }
      applyArtistAlias(album, alias, true);
      fields.artistKo.value = album.artistKo;
      fields.artistEn.value = album.artistEn;
      markDirty();
      renderAlbumList();
      setArtistLabelStatus('Apple/iTunes 후보를 바탕으로 표기를 채웠습니다. 맞는지 한 번만 확인해주세요.');
    } catch (error) {
      console.error(error);
      setArtistLabelStatus('아티스트 표기를 가져오지 못했습니다. 인터넷 연결을 확인하거나 직접 입력하세요.', 'error');
    }
  }

  function setTranslationStatus(message, type = 'normal') {
    if (!translationStatus) return;
    translationStatus.textContent = message;
    translationStatus.dataset.error = String(type === 'error');
  }

  function isLocalAdminOrigin() {
    return ['127.0.0.1', 'localhost'].includes(window.location.hostname);
  }

  function isLocalDirectSaveAvailable() {
    return ADMIN_FEATURES.localBridgeDirectSave
      && localBridgeConnected
      && localBridgeInfo?.localDirectSave === true;
  }

  async function requestLocalBridge(path, options = {}, timeoutMs = LOCAL_BRIDGE_REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(path, {
        cache: 'no-store',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `로컬 관리자 오류: ${response.status}`);
      }
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('요청 시간이 너무 오래 걸립니다. 잠시 뒤 다시 시도해주세요.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function heartbeatEditSession({ quiet = false } = {}) {
    if (!ADMIN_FEATURES.multiComputerGuard || !isLocalAdminOrigin()) {
      if (!quiet) setCollaborationStatus('다른 컴퓨터 확인: 로컬 관리자 실행기로 열면 사용할 수 있습니다. 저장 직전 파일 변경 검사는 계속 작동합니다.', 'warning');
      return true;
    }

    try {
      const result = await requestLocalBridge('/api/edit-session/heartbeat', {
        method: 'POST',
        body: '{}',
      }, 15_000);
      if (result.conflict) {
        editSessionConflict = result.active || {};
        const computer = editSessionConflict.computer || '다른 컴퓨터';
        const message = `${computer}에서 관리자 페이지를 사용 중입니다. 그 컴퓨터의 작업과 MYBOX 동기화가 끝난 뒤 저장해주세요.`;
        setCollaborationStatus(message, 'conflict');
        if (!quiet) setSaveFeedback(message, 'error');
        return false;
      }
      editSessionConflict = null;
      const computer = result.session?.computer || '이 컴퓨터';
      setCollaborationStatus(`다른 컴퓨터 확인 완료: ${computer}에서 편집 중`, 'ok');
      return true;
    } catch (error) {
      console.warn('다른 컴퓨터 편집 상태 확인 실패', error);
      editSessionConflict = null;
      setCollaborationStatus('다른 컴퓨터의 편집 표시는 확인하지 못했습니다. 저장 직전 파일 변경 검사는 계속 작동합니다.', 'warning');
      return true;
    }
  }

  function startEditSessionHeartbeat() {
    if (editSessionTimer) window.clearInterval(editSessionTimer);
    heartbeatEditSession({ quiet: false });
    editSessionTimer = window.setInterval(() => heartbeatEditSession({ quiet: true }), EDIT_SESSION_HEARTBEAT_MS);
  }

  function releaseEditSession() {
    if (!ADMIN_FEATURES.multiComputerGuard || !isLocalAdminOrigin()) return;
    const body = new Blob(['{}'], { type: 'application/json' });
    navigator.sendBeacon('/api/edit-session/release', body);
  }

  function updateLocalBridgeUi() {
    const localDirectSave = isLocalDirectSaveAvailable();
    document.querySelectorAll('[data-connect-project], [data-connect-backup-folder]').forEach(button => {
      button.hidden = localDirectSave;
    });
    if (localDirectSave) {
      setProjectStatus('MYBOX 작업 폴더에 자동 연결되었습니다. 폴더를 선택하지 않고 저장하기를 누르면 됩니다.', 'connected');
      setBackupFolderStatus('자동 백업: MYBOX에 자동 연결됨');
    } else if (isLocalAdminOrigin() && !projectDirHandle) {
      setProjectStatus('로컬 관리자 실행기 연결에 실패했습니다. 이 창을 닫고 start-punchdrunk-admin.cmd를 다시 실행해주세요.', 'error');
      setBackupFolderStatus('자동 백업: 로컬 실행기 연결 실패');
    }
    if (translationPanel) translationPanel.dataset.codexConnected = String(localBridgeAvailable);
    if (translateDescriptionButton) translateDescriptionButton.disabled = !localBridgeAvailable;
    if (apiFallback && localBridgeAvailable) apiFallback.open = false;
    if (localBridgeAvailable) {
      const modelLabel = localBridgeInfo?.model ? ` · ${localBridgeInfo.model}` : '';
      setTranslationStatus(`Codex 연결됨${modelLabel}. 번역 결과를 확인한 뒤 저장하기를 누르세요.`);
      return;
    }
    if (localBridgeConnected) {
      setTranslationStatus('로컬 관리자는 연결됐지만 Codex 앱의 ChatGPT 로그인이 필요합니다.', 'error');
      return;
    }
    setTranslationStatus(isLocalAdminOrigin()
      ? 'Codex 연결을 확인하지 못했습니다. Codex 앱의 ChatGPT 로그인을 확인한 뒤 관리자 실행기를 다시 여세요.'
      : 'Codex 번역은 MYBOX의 로컬 관리자 실행기로 이 페이지를 열었을 때 사용할 수 있습니다.', 'error');
  }

  async function checkLocalBridgeStatus() {
    if (!ADMIN_FEATURES.localCodexBridge || !isLocalAdminOrigin()) {
      localBridgeConnected = false;
      localBridgeAvailable = false;
      updateLocalBridgeUi();
      return false;
    }
    try {
      localBridgeInfo = await requestLocalBridge('/api/status', { method: 'GET', headers: {} }, 15_000);
      localBridgeConnected = true;
      localBridgeAvailable = localBridgeInfo.available === true;
      localProjectRevision = localBridgeInfo.dataRevision || null;
      // MYBOX 저장 연결은 바로 표시하고, 상대적으로 느린 Codex 로그인 확인은 따로 기다립니다.
      updateLocalBridgeUi();

      try {
        const codexStatus = await requestLocalBridge('/api/codex-status', { method: 'GET', headers: {} }, 30_000);
        localBridgeInfo = { ...localBridgeInfo, ...codexStatus };
        localBridgeAvailable = codexStatus.available === true;
      } catch (error) {
        console.warn('Codex 로그인 확인 실패', error);
        localBridgeAvailable = false;
      }
    } catch (error) {
      console.warn('로컬 Codex 연결 확인 실패', error);
      localBridgeInfo = null;
      localBridgeConnected = false;
      localBridgeAvailable = false;
      localProjectRevision = null;
    }
    updateLocalBridgeUi();
    return localBridgeAvailable;
  }

  function getStoredText(key, fallback = '') {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      console.warn(error);
      return fallback;
    }
  }

  function setStoredText(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(error);
    }
  }

  function getOfficialNameMappings(album, sourceText = '') {
    const mappings = new Map();
    const addMapping = (korean, english, required = false) => {
      const ko = String(korean || '').trim();
      const en = String(english || '').trim();
      if (!ko || !en || normalize(ko) === normalize(en)) return;
      if (!required && !String(sourceText).includes(ko)) return;
      mappings.set(ko, en);
    };

    addMapping(album?.artistKo || album?.artist, album?.artistEn, true);
    albums.forEach(item => addMapping(item.artistKo || item.artist, item.artistEn));
    return [...mappings.entries()]
      .map(([korean, english]) => ({ korean, english }))
      .sort((a, b) => b.korean.length - a.korean.length);
  }

  function getProtectedMusicTitles(album) {
    return [
      album?.title,
      ...(album?.tracklist || []).map(stripTrackNumber),
      ...(album?.recommendedTracks || []).map(stripTrackNumber),
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index);
  }

  function getTranslationPrompt(album) {
    const source = String(album.description || '').trim();
    const mappings = getOfficialNameMappings(album, source);
    const mappingLines = mappings.length
      ? mappings.map(item => `- ${item.korean} -> ${item.english}`)
      : ['- No supplied mappings. Resolve names from context.'];
    const protectedTitles = getProtectedMusicTitles(album);
    return [
      'Translate the Korean album note into natural English for a music bar archive.',
      'Before writing, silently identify every person, artist, band, group, producer, label, company, venue, city, and other proper noun written in Hangul.',
      'Use the established official English spelling whenever it is known. For a Korean proper name without a known official spelling, romanize it naturally. Do not leave a proper name in Hangul merely because it appeared that way in the source.',
      'A Hangul phonetic rendering of a non-Korean name must become its standard English spelling. Examples: 마이클 잭슨 -> Michael Jackson; 퀸시 존스 -> Quincy Jones; 잭슨 파이브 -> The Jackson 5; 모타운 -> Motown.',
      'Apply every mandatory mapping below exactly. These mappings override your own guess.',
      '',
      'Mandatory name mappings:',
      ...mappingLines,
      '',
      'Do not translate album titles or song titles. Preserve names already written in Latin characters.',
      'Do not add facts. Keep the tone warm, concise, and bar-friendly.',
      'Return only the final English translation. Do not include a glossary, notes, or explanations.',
      '',
      `Album: ${album.title || ''}`,
      `Artist (Korean display): ${album.artistKo || album.artist || ''}`,
      `Artist (English display): ${album.artistEn || ''}`,
      `Protected album/song titles: ${protectedTitles.join(' | ')}`,
      '',
      'Korean note:',
      source,
    ].join('\n');
  }

  function extractOpenAiText(data) {
    if (typeof data?.output_text === 'string') return data.output_text;
    const output = Array.isArray(data?.output) ? data.output : [];
    return output.flatMap(item => Array.isArray(item.content) ? item.content : [])
      .map(part => part?.text || part?.content || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  function applyOfficialNameMappings(text, mappings) {
    return mappings.reduce(
      (result, item) => result.split(item.korean).join(item.english),
      String(text || '')
    );
  }

  function containsHangul(text) {
    return /[가-힣]/.test(String(text || ''));
  }

  function getProperNounCleanupPrompt(album, draft) {
    const source = String(album.description || '').trim();
    const mappings = getOfficialNameMappings(album, source);
    const mappingLines = mappings.length
      ? mappings.map(item => `- ${item.korean} -> ${item.english}`)
      : ['- No supplied mappings. Resolve names from context.'];
    return [
      'Revise the English draft so no untranslated Korean prose or Hangul-rendered proper noun remains.',
      'Replace every remaining Hangul proper noun with its official English spelling. If the official spelling is uncertain, romanize it naturally instead of leaving it in Hangul.',
      'The only Hangul that may remain is text that is exactly part of a protected album or song title listed below.',
      'Apply every mandatory mapping exactly. Do not add facts or explanations.',
      'Return only the corrected English translation.',
      '',
      'Mandatory name mappings:',
      ...mappingLines,
      '',
      `Protected album/song titles: ${getProtectedMusicTitles(album).join(' | ')}`,
      '',
      'Original Korean note:',
      source,
      '',
      'English draft to correct:',
      draft,
    ].join('\n');
  }

  async function requestOpenAiTranslation(apiKey, model, input, instructions) {
    const body = { model, instructions, input };
    if (/^gpt-5(?:[.-]|$)/i.test(model)) body.reasoning = { effort: 'medium' };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message || `OpenAI API 오류: ${response.status}`;
      throw new Error(message);
    }

    const text = extractOpenAiText(data);
    if (!text) throw new Error('번역 결과가 비어 있습니다.');
    return text.trim();
  }

  async function translateDescriptionWithCodex() {
    const album = getCurrentAlbum();
    if (!album) return;
    const source = String(album.description || '').trim();
    if (!source) {
      setTranslationStatus('먼저 한글 설명을 입력하세요.', 'error');
      return;
    }
    if (!localBridgeAvailable && !(await checkLocalBridgeStatus())) return;
    if (String(album.descriptionEn || '').trim() && !confirm('영문 설명이 이미 있습니다. Codex 번역으로 덮어쓸까요?')) return;

    if (translateDescriptionButton) translateDescriptionButton.disabled = true;
    setTranslationStatus('Codex가 번역하고 문장을 한 번 더 다듬는 중입니다. 잠시만 기다려주세요.');

    try {
      const mappings = getOfficialNameMappings(album, source);
      const result = await requestLocalBridge('/api/codex-translate', {
        method: 'POST',
        body: JSON.stringify({
          title: album.title,
          artist: album.artist,
          artistKo: album.artistKo,
          artistEn: album.artistEn,
          year: album.year,
          genre: album.genre,
          description: source,
          protectedTracks: [
            ...(album.tracklist || []).map(stripTrackNumber),
            ...(album.recommendedTracks || []).map(stripTrackNumber),
          ],
          nameMappings: mappings,
        }),
      });
      album.descriptionEn = applyOfficialNameMappings(result.translation, mappings).trim();
      fields.descriptionEn.value = album.descriptionEn;
      markDirty();
      const retryNotice = result.retried ? '일시적인 오류가 있어 자동 재시도 후 ' : '';
      setTranslationStatus(containsHangul(album.descriptionEn)
        ? `${retryNotice}Codex 번역을 채웠습니다. 한글 고유명사가 일부 남아 있으니 확인한 뒤 저장하세요.`
        : `${retryNotice}Codex 번역을 채웠습니다. 문장을 확인한 뒤 저장하기를 누르세요.`);
    } catch (error) {
      console.error(error);
      setTranslationStatus(`Codex 번역 실패: ${error.message || '알 수 없는 오류'}`, 'error');
      if (/로그인|실행 파일/.test(String(error.message || ''))) {
        localBridgeAvailable = false;
      }
    } finally {
      if (translateDescriptionButton) translateDescriptionButton.disabled = !localBridgeAvailable;
    }
  }

  async function translateDescriptionWithAi() {
    const album = getCurrentAlbum();
    if (!album) return;
    const source = String(album.description || '').trim();
    if (!source) {
      setTranslationStatus('먼저 한글 설명을 입력하세요.', 'error');
      return;
    }

    const apiKey = String(openAiApiKeyInput?.value || '').trim();
    const model = String(openAiModelInput?.value || 'gpt-5-mini').trim() || 'gpt-5-mini';
    if (!apiKey) {
      setTranslationStatus('OpenAI API 키를 입력하면 자동 번역을 사용할 수 있습니다. 키가 없다면 옆의 프롬프트 복사를 사용하세요.', 'error');
      return;
    }

    setStoredText(OPENAI_API_KEY_STORAGE_KEY, apiKey);
    setStoredText(OPENAI_MODEL_STORAGE_KEY, model);
    setTranslationStatus('AI가 영문 설명을 만드는 중입니다...');

    try {
      const mappings = getOfficialNameMappings(album, source);
      let translated = await requestOpenAiTranslation(
        apiKey,
        model,
        getTranslationPrompt(album),
        'Produce only the final English translation. Follow the input constraints and mandatory name mappings exactly. Resolve proper nouns silently before writing.'
      );
      translated = applyOfficialNameMappings(translated, mappings);

      if (containsHangul(translated)) {
        setTranslationStatus('남은 한글 고유명사를 영어 표기로 다시 확인하는 중입니다...');
        try {
          translated = await requestOpenAiTranslation(
            apiKey,
            model,
            getProperNounCleanupPrompt(album, translated),
            'Return only a corrected English translation. Replace remaining Hangul proper nouns while preserving the protected music titles.'
          );
          translated = applyOfficialNameMappings(translated, mappings);
        } catch (cleanupError) {
          console.warn('고유명사 2차 교정 실패', cleanupError);
        }
      }

      album.descriptionEn = translated.trim();
      fields.descriptionEn.value = album.descriptionEn;
      markDirty();
      setTranslationStatus(containsHangul(album.descriptionEn)
        ? '영문 설명을 채웠습니다. 고유명사로 보이는 한글이 일부 남아 있으니 한 번 확인해주세요.'
        : '영문 설명과 고유명사 영어 표기를 채웠습니다. 어투만 한 번 확인하고 저장하세요.');
    } catch (error) {
      console.error(error);
      setTranslationStatus(`자동 번역 실패: ${error.message || '알 수 없는 오류'} 프롬프트 복사로 대신 진행할 수 있습니다.`, 'error');
    }
  }

  async function copyTranslationPrompt() {
    const album = getCurrentAlbum();
    if (!album) return;
    const promptText = getTranslationPrompt(album);
    try {
      await navigator.clipboard.writeText(promptText);
      setTranslationStatus('번역 프롬프트를 클립보드에 복사했습니다. 다른 AI에 붙여넣고 결과를 영문 설명 칸에 넣으면 됩니다.');
    } catch (error) {
      console.error(error);
      setTranslationStatus('클립보드 복사가 막혔습니다. 한글 설명을 직접 복사해 번역한 뒤 영문 설명 칸에 붙여주세요.', 'error');
    }
  }

  function normalizeAppleAlbumName(value) {
    return normalize(String(value || '').replace(/\s*[-–—]\s*(single|ep)$/i, ''));
  }

  function sortAppleTracks(tracks) {
    return [...tracks].sort((a, b) => {
      const discA = a.discNumber || 1;
      const discB = b.discNumber || 1;
      const trackA = a.trackNumber || 0;
      const trackB = b.trackNumber || 0;
      return discA - discB || trackA - trackB || String(a.trackName || '').localeCompare(String(b.trackName || ''), 'ko');
    });
  }

  function dedupeAppleTracks(tracks) {
    const seen = new Set();
    const deduped = [];

    sortAppleTracks(tracks).forEach(track => {
      const title = normalize(track.trackName);
      if (!title) return;
      const disc = track.discNumber || '';
      const number = track.trackNumber || '';
      const album = normalizeAppleAlbumName(track.collectionName);
      const positionKey = number ? `pos:${album}:${disc}:${number}:${title}` : '';
      const titleKey = `title:${album}:${title}`;
      const idKey = track.trackId ? `id:${track.trackId}` : '';
      const key = positionKey || idKey || titleKey;
      if (seen.has(key) || (!positionKey && seen.has(titleKey))) return;
      seen.add(key);
      seen.add(titleKey);
      deduped.push(track);
    });

    return deduped;
  }

  function hasSameAppleCollectionId(track, result) {
    return Boolean(result?.collectionId && track?.collectionId && String(result.collectionId) === String(track.collectionId));
  }

  function hasExactAppleAlbumAndArtist(track, result) {
    const targetAlbum = normalizeAppleAlbumName(result?.collectionName);
    const trackAlbum = normalizeAppleAlbumName(track?.collectionName);
    const targetArtist = normalize(result?.artistName);
    const trackArtists = [track?.artistName, track?.collectionArtistName].map(normalize).filter(Boolean);
    const albumMatches = targetAlbum && trackAlbum && targetAlbum === trackAlbum;
    const artistMatches = !targetArtist || trackArtists.some(artist => artist === targetArtist);
    return albumMatches && artistMatches;
  }

  function getStrictAppleTracks(items, result) {
    const songs = (items || []).filter(item => item.wrapperType === 'track' && item.kind === 'song' && item.trackName);
    const collectionMatches = songs.filter(item => hasSameAppleCollectionId(item, result));
    if (collectionMatches.length) return dedupeAppleTracks(collectionMatches);

    // 트랙리스트 보완 검색은 보수적으로 처리합니다.
    // 앨범명/아티스트가 정확히 같은 경우만 허용하고, 비슷하게 포함되는 곡은 섞지 않습니다.
    return dedupeAppleTracks(songs.filter(item => hasExactAppleAlbumAndArtist(item, result)));
  }

  function isReliableAppleTrackSet(tracks, result) {
    if (!tracks.length) return false;
    const expectedCount = Number(result?.trackCount || tracks[0]?.trackCount || 0);
    if (expectedCount && tracks.length > expectedCount + 2) return false;
    if (tracks.length > 80) return false;
    return true;
  }

  async function searchAppleTracksByAlbum(result, country) {
    const terms = Array.from(new Set([
      [result?.artistName, result?.collectionName].filter(Boolean).join(' '),
      [result?.collectionName, result?.artistName].filter(Boolean).join(' '),
      result?.collectionName,
    ].filter(Boolean)));

    for (const term of terms) {
      const url = new URL('https://itunes.apple.com/search');
      url.searchParams.set('term', term);
      url.searchParams.set('media', 'music');
      url.searchParams.set('entity', 'song');
      url.searchParams.set('country', country);
      url.searchParams.set('limit', '200');

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Apple/iTunes 곡 검색 오류: ${response.status}`);
      const data = await response.json();
      const tracks = getStrictAppleTracks(data.results || [], result);
      if (isReliableAppleTrackSet(tracks, result)) return tracks;
    }

    return [];
  }

  async function fetchAppleTracks(result) {
    const collectionId = result?.collectionId;
    const country = getAppleCountry();
    if (!collectionId) return { tracks: [], country, source: 'none' };

    // Apple/iTunes 트랙리스트는 선택한 국가 자료만 사용합니다.
    // 한국 음반이 KR 자료를 못 찾을 때 US/GB 자료로 넘어가면 한글 제목이 영어 제목으로 바뀌는 일이 있어 국가 fallback은 막았습니다.
    const url = new URL('https://itunes.apple.com/lookup');
    url.searchParams.set('id', collectionId);
    url.searchParams.set('entity', 'song');
    url.searchParams.set('country', country);
    url.searchParams.set('limit', '200');

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Apple/iTunes 트랙 조회 오류: ${response.status}`);
    const data = await response.json();
    const lookupTracks = dedupeAppleTracks((data.results || [])
      .filter(item => item.wrapperType === 'track' && item.kind === 'song' && item.trackName));

    if (isReliableAppleTrackSet(lookupTracks, result)) return { tracks: lookupTracks, country, source: 'lookup' };

    // 일부 한국 음반은 앨범 lookup이 곡 목록을 돌려주지 않습니다.
    // 이때도 같은 앨범 ID 또는 정확히 같은 앨범명/아티스트로 확인되는 곡만 보완 적용합니다.
    const searchedTracks = await searchAppleTracksByAlbum(result, country);
    return { tracks: searchedTracks, country, source: searchedTracks.length ? 'strict-song-search' : 'none' };
  }
  function formatAppleTrack(track, index) {
    return `${index + 1}. ${track.trackName}`;
  }

  async function applyAppleTracks(result, options = {}) {
    const album = getCurrentAlbum();
    if (!album) return;
    if (!options.quiet && album.tracklist?.length) {
      const ok = confirm('현재 트랙리스트를 Apple/iTunes 트랙리스트로 바꿀까요?\n실물 음반과 다를 수 있으니 적용 후 꼭 확인해주세요.');
      if (!ok) return;
    }

    setAppleStatus('Apple/iTunes에서 트랙리스트를 가져오는 중입니다...');

    try {
      const { tracks, country, source } = await fetchAppleTracks(result);
      if (!tracks.length) {
        setAppleStatus('같은 앨범으로 확실히 확인되는 트랙리스트가 없어 자동 적용하지 않았습니다.', 'error');
        return false;
      }
      const existingCount = Array.isArray(album.tracklist) ? album.tracklist.length : 0;
      if (existingCount && tracks.length < Math.max(2, Math.floor(existingCount * 0.65))) {
        const message = `Apple/iTunes에서 ${tracks.length}곡만 확인됐습니다. 현재 트랙리스트 ${existingCount}곡보다 많이 적어서 자동 교체하지 않는 편이 안전합니다.`;
        if (options.quiet) {
          setAppleStatus(message, 'error');
          return false;
        }
        const ok = confirm(`${message}\n그래도 현재 트랙리스트를 바꿀까요?`);
        if (!ok) {
          setAppleStatus('가져온 곡 수가 너무 적어 트랙리스트 교체를 취소했습니다.', 'error');
          return false;
        }
      }

      album.tracklist = tracks.map((track, index) => formatAppleTrack(track, index));
      album.recommendedTracks = getCanonicalRecommendedTracks(album.tracklist, album.recommendedTracks);
      markDirty();
      renderAll();
      if (!options.quiet) setAppleStatus(`${tracks.length}곡을 트랙리스트 입력칸에 적용했습니다. ${country} 자료를 사용했습니다.${source === 'strict-song-search' ? ' 앨범 조회가 비어 있어 같은 앨범으로 확인된 곡만 보완했습니다.' : ''}${source === 'strict-song-search' && tracks.length < 5 ? ' 확인된 곡 수가 적으니 특히 꼼꼼히 봐주세요.' : ''} 실물 음반 기준으로 확인 후 저장하세요.`);
      return true;
    } catch (error) {
      console.error(error);
      setAppleStatus('트랙리스트를 가져오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력하세요.', 'error');
      return false;
    }
  }

  function renderCoverPreview(path, album = getCurrentAlbum()) {
    coverPreview.replaceChildren();
    if (!path) {
      coverPreview.append(createFallbackCover(album));
      return;
    }
    const img = document.createElement('img');
    img.src = getCoverSrc(path);
    img.alt = '커버 미리보기';
    img.onerror = () => coverPreview.replaceChildren(createFallbackCover(album));
    coverPreview.append(img);
  }

  function createFallbackCover(album) {
    const div = document.createElement('div');
    div.className = 'cover-fallback';
    div.innerHTML = `<span>${escapeHtml(album?.artist || 'PUNCH-DRUNK')}</span><strong>${escapeHtml(album?.title || 'No Cover')}</strong>`;
    return div;
  }

  function getCoverSrc(path) {
    return coverPreviewUrls.get(path) || path;
  }

  function toCoverPath(fileName) {
    return `covers/${String(fileName || '').trim()}`;
  }

  function updateCoverGalleryControls(visibleCount = 0) {
    if (toggleCoverGalleryButton) {
      toggleCoverGalleryButton.textContent = coverGalleryOpen ? '기존 커버 목록 닫기' : '기존 커버 목록 열기';
      toggleCoverGalleryButton.setAttribute('aria-expanded', String(coverGalleryOpen));
    }
    if (coverGallerySearch) coverGallerySearch.hidden = !coverGalleryOpen;
    if (coverGallerySummary) {
      if (!coverGalleryOpen) {
        coverGallerySummary.textContent = `목록을 열면 covers 폴더에 저장된 ${covers.length}개 이미지를 다시 선택할 수 있습니다.`;
      } else if (coverGalleryQuery) {
        coverGallerySummary.textContent = `${covers.length}개 중 ${visibleCount}개 표시 · 파일명 검색 중`;
      } else {
        coverGallerySummary.textContent = `${covers.length}개 커버 이미지가 있습니다. 파일명으로 검색해서 다시 선택할 수 있습니다.`;
      }
    }
  }

  function renderCoverGallery() {
    if (!coverGallery) return;
    if (!coverGalleryOpen) {
      coverGallery.hidden = true;
      coverGallery.replaceChildren();
      updateCoverGalleryControls();
      return;
    }

    const album = getCurrentAlbum();
    const q = normalize(coverGalleryQuery);
    const visibleCovers = covers.filter(path => !q || normalize(path).includes(q));

    coverGallery.hidden = false;
    updateCoverGalleryControls(visibleCovers.length);

    if (!visibleCovers.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text cover-gallery-empty';
      empty.textContent = '검색 결과가 없습니다.';
      coverGallery.replaceChildren(empty);
      return;
    }

    coverGallery.replaceChildren(...visibleCovers.map(path => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cover-choice';
      button.dataset.active = String(album?.coverImage === path);

      const thumb = document.createElement('div');
      thumb.className = 'cover-thumb';
      const img = document.createElement('img');
      img.src = getCoverSrc(path);
      img.alt = path;
      img.onerror = () => thumb.replaceChildren(createFallbackCover({ title: path.split('/').pop(), artist: 'No image' }));
      thumb.append(img);

      const label = document.createElement('span');
      label.textContent = path.split('/').pop();
      button.append(thumb, label);

      button.addEventListener('click', () => {
        const current = getCurrentAlbum();
        if (!current) return;
        current.coverImage = path;
        fields.coverImage.value = path;
        markDirty();
        renderCoverPreview(path, current);
        renderCoverGallery();
      });
      return button;
    }));
  }

  function normalizeCoverPathKey(path) {
    return String(path || '').trim().replace(/\\/g, '/').toLocaleLowerCase();
  }

  async function scanPhysicalCoverFiles() {
    if (!ADMIN_FEATURES.physicalCoverAudit) return null;
    if (isLocalDirectSaveAvailable()) {
      const result = await requestLocalBridge('/api/project-covers', { method: 'GET', headers: {} }, 30_000);
      return Array.isArray(result.covers)
        ? result.covers.filter(path => !String(path).startsWith('covers/thumbs/'))
        : [];
    }
    if (!projectDirHandle) return null;
    const permission = await verifyPermission(projectDirHandle, false);
    if (!permission) return null;
    const coversDirectory = await projectDirHandle.getDirectoryHandle('covers');
    const paths = [];

    async function collectFiles(directory, prefix) {
      for await (const [name, handle] of directory.entries()) {
        const path = `${prefix}/${name}`;
        if (handle.kind === 'directory' && path === 'covers/thumbs') continue;
        if (handle.kind === 'file') paths.push(path);
        if (handle.kind === 'directory') await collectFiles(handle, path);
      }
    }

    await collectFiles(coversDirectory, 'covers');
    return paths.sort((a, b) => a.localeCompare(b, 'ko'));
  }

  function getCoverAudit(physicalPaths = null) {
    const used = new Map();
    albums.forEach(album => {
      const path = String(album.coverImage || '').trim();
      if (!path || isExternalCoverImage(path)) return;
      if (!used.has(path)) used.set(path, []);
      used.get(path).push(album);
    });

    const coverSet = new Set(covers.map(normalizeCoverPathKey));
    const usedKeys = new Set(Array.from(used.keys(), normalizeCoverPathKey));
    const unused = covers.filter(path => !usedKeys.has(normalizeCoverPathKey(path)));
    const missing = Array.from(used.entries())
      .filter(([path]) => !coverSet.has(normalizeCoverPathKey(path)))
      .map(([path, usedAlbums]) => ({ path, albums: usedAlbums }));
    const duplicates = Array.from(used.entries())
      .filter(([, usedAlbums]) => usedAlbums.length > 1)
      .map(([path, usedAlbums]) => ({ path, albums: usedAlbums }));

    const physicalSet = Array.isArray(physicalPaths)
      ? new Set(physicalPaths.map(normalizeCoverPathKey))
      : null;
    const folderOnly = physicalSet
      ? physicalPaths.filter(path => !coverSet.has(normalizeCoverPathKey(path)))
      : null;
    const missingFiles = physicalSet
      ? covers.filter(path => !physicalSet.has(normalizeCoverPathKey(path)))
      : null;

    return { unused, missing, duplicates, folderOnly, missingFiles };
  }

  function renderCoverAuditSummary() {
    if (!coverAuditSummary || !ADMIN_FEATURES.coverAudit) return;
    const audit = lastCoverAudit || getCoverAudit();
    const physicalSummary = Array.isArray(audit.folderOnly)
      ? `, 목록 밖 실제 파일 ${audit.folderOnly.length}개, 실제 파일 없음 ${audit.missingFiles.length}개`
      : '';
    coverAuditSummary.textContent = `앨범에서 안 쓰는 커버 ${audit.unused.length}개, 목록 경로 확인 ${audit.missing.length}개, 여러 음반이 함께 쓰는 커버 ${audit.duplicates.length}개${physicalSummary}가 있습니다. 파일은 자동으로 삭제하지 않습니다.`;
  }

  function createCoverAuditBlock(title, items, renderItem) {
    const section = document.createElement('section');
    section.className = 'cover-audit-block';
    const heading = document.createElement('h3');
    heading.textContent = `${title} ${items.length}`;
    section.append(heading);

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = '해당 항목이 없습니다.';
      section.append(empty);
      return section;
    }

    const list = document.createElement('div');
    list.className = 'cover-audit-list';
    items.slice(0, 80).forEach(item => {
      const row = document.createElement('p');
      row.innerHTML = renderItem(item);
      list.append(row);
    });
    if (items.length > 80) {
      const more = document.createElement('p');
      more.className = 'helper-text';
      more.textContent = `나머지 ${items.length - 80}개는 생략했습니다. 파일명 검색으로 나눠 확인하세요.`;
      list.append(more);
    }
    section.append(list);
    return section;
  }

  async function renderCoverAuditResults() {
    if (!coverAuditResults || !ADMIN_FEATURES.coverAudit) return;
    coverAuditSummary.textContent = (projectDirHandle || isLocalDirectSaveAvailable())
      ? 'covers 폴더의 실제 파일까지 확인하고 있습니다.'
      : '작업 폴더가 연결되지 않아 등록 목록만 점검합니다.';
    let physicalPaths = null;
    try {
      physicalPaths = await scanPhysicalCoverFiles();
    } catch (error) {
      console.warn('실제 커버 폴더 점검 실패', error);
    }
    const audit = getCoverAudit(physicalPaths);
    lastCoverAudit = audit;
    coverAuditResults.hidden = false;
    const blocks = [
      createCoverAuditBlock('안 쓰는 커버', audit.unused, path => `<code>${escapeHtml(path)}</code>`),
      createCoverAuditBlock('커버 경로 확인 필요', audit.missing, item => {
        const albumsText = item.albums.map(album => `${album.artist || '아티스트 없음'} - ${album.title || '제목 없음'}`).join(', ');
        return `<code>${escapeHtml(item.path)}</code><span>${escapeHtml(albumsText)}</span>`;
      }),
      createCoverAuditBlock('여러 음반이 함께 쓰는 커버', audit.duplicates, item => {
        const albumsText = item.albums.map(album => `${album.artist || '아티스트 없음'} - ${album.title || '제목 없음'}`).join(', ');
        return `<code>${escapeHtml(item.path)}</code><span>${escapeHtml(albumsText)}</span>`;
      })
    ];
    if (Array.isArray(audit.folderOnly)) {
      blocks.push(
        createCoverAuditBlock('폴더에는 있지만 목록에 없는 파일', audit.folderOnly, path => `<code>${escapeHtml(path)}</code>`),
        createCoverAuditBlock('목록에는 있지만 실제 파일이 없는 경로', audit.missingFiles, path => `<code>${escapeHtml(path)}</code>`)
      );
    }
    coverAuditResults.replaceChildren(...blocks);
    if (exportCoverAuditButton) exportCoverAuditButton.disabled = false;
    renderCoverAuditSummary();
  }

  function exportCoverAuditReport() {
    if (!lastCoverAudit) {
      setSaveFeedback('먼저 커버 점검 버튼을 눌러주세요.', 'working');
      return;
    }
    const sections = [
      ['앨범에서 안 쓰는 커버', lastCoverAudit.unused],
      ['앨범 경로가 커버 목록에 없는 항목', lastCoverAudit.missing.map(item => item.path)],
      ['여러 음반이 함께 쓰는 커버', lastCoverAudit.duplicates.map(item => item.path)],
      ['covers 폴더에는 있지만 목록에 없는 파일', lastCoverAudit.folderOnly || ['작업 폴더 미연결로 확인하지 못함']],
      ['목록에는 있지만 실제 파일이 없는 경로', lastCoverAudit.missingFiles || ['작업 폴더 미연결로 확인하지 못함']],
    ];
    const report = [
      'PUNCH-DRUNK ARCHIVE 커버 점검 보고서',
      `생성 시각: ${new Date().toLocaleString('ko-KR')}`,
      '이 보고서는 확인용이며 어떤 파일도 자동으로 삭제하지 않습니다.',
      '',
      ...sections.flatMap(([title, items]) => [
        `[${title}] ${items.length}개`,
        ...(items.length ? items : ['없음']),
        '',
      ]),
    ].join('\n');
    downloadBlob(
      `punchdrunk-cover-audit-${new Date().toISOString().slice(0, 10)}.txt`,
      new Blob([report], { type: 'text/plain;charset=utf-8' })
    );
  }

  function renderRecommendChecks() {
    const album = getCurrentAlbum();
    if (!album) return;
    const tracks = album.tracklist || [];

    const wrap = document.createElement('div');
    wrap.className = 'recommend-check-list';

    if (!tracks.length) {
      const p = document.createElement('p');
      p.className = 'helper-text';
      p.textContent = '트랙리스트를 입력하면 추천곡 체크박스가 나타납니다.';
      recommendChecks.replaceChildren(p);
      return;
    }

    tracks.forEach(track => {
      const { number, title } = splitTrackLine(track);
      const row = document.createElement('label');
      row.className = 'recommend-check';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isRecommendedTrack(track, album.recommendedTracks);
      checkbox.addEventListener('change', () => {
        const current = getCurrentAlbum();
        if (!current) return;
        const trackKey = normalize(String(track || '').trim());
        const existing = new Set(
          getCanonicalRecommendedTracks(current.tracklist, current.recommendedTracks).map(item => normalize(item))
        );
        if (checkbox.checked) existing.add(trackKey);
        else existing.delete(trackKey);
        current.recommendedTracks = (current.tracklist || [])
          .map(item => String(item || '').trim())
          .filter(item => existing.has(normalize(item)));
        markDirty();
        renderRecommendChecks();
      });
      row.append(checkbox);

      const numberSpan = document.createElement('span');
      numberSpan.className = 'num';
      numberSpan.textContent = number;
      const titleSpan = document.createElement('span');
      titleSpan.className = 'title';
      titleSpan.textContent = title;
      row.append(numberSpan, titleSpan);
      wrap.append(row);
    });

    recommendChecks.replaceChildren(wrap);
  }

  function updateCurrentFromField(fieldName, value) {
    const album = getCurrentAlbum();
    if (!album) return;

    if (fieldName === 'isWeekly') {
      albums.forEach(item => item.isWeekly = false);
      album.isWeekly = Boolean(value);
      markDirty();
      renderAlbumList();
      renderAdminStatus();
      return;
    }

    if (fieldName === 'tracklist') {
      album.tracklist = String(value).split('\n').map(line => line.trim()).filter(Boolean);
      // 삭제된 곡이 추천곡에 남지 않도록 정리한다.
      album.recommendedTracks = getCanonicalRecommendedTracks(album.tracklist, album.recommendedTracks);
      markDirty();
      renderRecommendChecks();
      return;
    }

    album[fieldName] = value;
    if (fieldName === 'artistKo') {
      album.artist = value;
      if (fields.artist) fields.artist.value = value;
    }
    markDirty();

    if (fieldName === 'title' || fieldName === 'artist' || fieldName === 'artistKo') {
      editorTitle.textContent = album.title ? `음반 편집 · ${album.title}` : '음반 편집';
      if (!album.coverImage) renderCoverPreview('', album);
    }

    if (fieldName === 'coverImage') renderCoverPreview(value, album);
    renderAlbumList();
  }

  Object.entries(fields).forEach(([name, el]) => {
    if (name === 'id') return;
    if (el.type === 'checkbox') {
      el.addEventListener('change', () => {
        updateCurrentFromField(name, el.checked);
    renderAll();
      });
    } else {
      el.addEventListener('input', () => updateCurrentFromField(name, el.value));
      el.addEventListener('change', () => updateCurrentFromField(name, el.value));
    }
  });

  if (albumListSearch) {
    albumListSearch.addEventListener('input', () => {
      listState.query = albumListSearch.value;
      renderAlbumList();
    });
    albumListSearch.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      listState.query = '';
      renderAlbumList();
    });
  }

  if (albumListSort) {
    albumListSort.addEventListener('change', () => {
      listState.sort = albumListSort.value;
      renderAlbumList();
    });
  }

  if (albumListFilters) {
    albumListFilters.addEventListener('click', event => {
      const button = event.target.closest('[data-list-filter]');
      if (!button) return;
      listState.filter = button.dataset.listFilter || 'all';
      renderAlbumList();
    });
  }

  if (descriptionModeToggle) {
    descriptionModeToggle.checked = descriptionMode;
    descriptionModeToggle.addEventListener('change', () => {
      descriptionMode = descriptionModeToggle.checked;
      writeJsonStorage(DESCRIPTION_MODE_KEY, descriptionMode);
      if (!descriptionMode && ['missing-description', 'missing-description-en'].includes(listState.filter)) {
        listState.filter = 'all';
      }
      renderAlbumList();
      renderAdminDashboard();
    });
  }

  if (focusCurrentButton) {
    focusCurrentButton.addEventListener('click', () => {
      listState.query = '';
      listState.filter = 'all';
      renderAlbumList();
      scrollCurrentAlbumIntoView();
    });
  }

  document.querySelector('[data-apple-fill-current]').addEventListener('click', fillAppleSearchFromCurrent);
  document.querySelector('[data-apple-search]').addEventListener('click', searchAppleAlbums);
  if (appleSearchTerm) {
    appleSearchTerm.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchAppleAlbums();
      }
    });
  }

  document.querySelector('[data-guess-artist-labels]')?.addEventListener('click', guessArtistLabels);
  translateDescriptionButton?.addEventListener('click', translateDescriptionWithCodex);
  translateApiButton?.addEventListener('click', translateDescriptionWithAi);
  copyTranslationPromptButton?.addEventListener('click', copyTranslationPrompt);

  if (openAiApiKeyInput) {
    openAiApiKeyInput.value = getStoredText(OPENAI_API_KEY_STORAGE_KEY, '');
    openAiApiKeyInput.addEventListener('change', () => {
      setStoredText(OPENAI_API_KEY_STORAGE_KEY, openAiApiKeyInput.value.trim());
    });
  }

  if (openAiModelInput) {
    openAiModelInput.value = getStoredText(OPENAI_MODEL_STORAGE_KEY, openAiModelInput.value || 'gpt-5-mini');
    openAiModelInput.addEventListener('change', () => {
      setStoredText(OPENAI_MODEL_STORAGE_KEY, openAiModelInput.value.trim() || 'gpt-5-mini');
    });
  }

  document.querySelector('[data-new-album]').addEventListener('click', () => {
    const album = ensureAlbumShape({
      id: generateAlbumId(),
      title: '새 음반',
      artist: '',
      artistKo: '',
      artistEn: '',
      addedAt: new Date().toISOString(),
      year: '',
      format: 'Vinyl',
      genre: '기타',
      coverImage: '',
      recommendedTracks: [],
      tracklist: [],
      description: '',
      descriptionEn: '',
      weeklyReason: '',
      weeklyReasonEn: '',
      isWeekly: albums.length === 0,
    });
    albums.unshift(album);
    currentId = album.id;
    listState.query = '';
    listState.sort = 'recent';
    listState.filter = 'all';
    markDirty();
    renderAll();
    requestAnimationFrame(() => {
      editorPanel?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      fields.title?.focus({ preventScroll: true });
      fields.title?.select();
    });
  });

  function hideDeleteUndo() {
    clearTimeout(deleteUndoTimer);
    pendingDeletedAlbum = null;
    if (deleteUndoToast) deleteUndoToast.hidden = true;
  }

  function showDeleteUndo(albumTitle) {
    if (!deleteUndoToast) return;
    if (deleteUndoText) deleteUndoText.textContent = `‘${albumTitle || '제목 없음'}’ 음반을 삭제했습니다.`;
    deleteUndoToast.hidden = false;
    clearTimeout(deleteUndoTimer);
    deleteUndoTimer = setTimeout(hideDeleteUndo, 10000);
  }

  document.querySelector('[data-delete-album]').addEventListener('click', () => {
    const album = getCurrentAlbum();
    if (!album) return;
    const ok = confirm(`정말 삭제할까요?\n${album.artist} - ${album.title}`);
    if (!ok) return;
    pendingDeletedAlbum = {
      album: JSON.parse(JSON.stringify(album)),
      index: albums.indexOf(album),
    };
    albums = albums.filter(item => item !== album);
    currentId = albums[0]?.id || null;
    markDirty();
    renderAll();
    showDeleteUndo(album.title);
  });

  undoDeleteButton?.addEventListener('click', () => {
    if (!pendingDeletedAlbum) return;
    const { album, index } = pendingDeletedAlbum;
    albums.splice(Math.max(0, Math.min(index, albums.length)), 0, album);
    currentId = album.id;
    hideDeleteUndo();
    markDirty();
    renderAll();
    requestAnimationFrame(() => editorPanel?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  });

  document.querySelector('[data-add-cover-path]').addEventListener('click', () => {
    const input = document.querySelector('[data-new-cover-path]');
    const path = input.value.trim();
    if (!path) return;
    if (!covers.includes(path)) covers.push(path);
    input.value = '';
    markDirty();
    renderCoverGallery();
  });

  toggleCoverGalleryButton?.addEventListener('click', () => {
    coverGalleryOpen = !coverGalleryOpen;
    if (coverGalleryOpen && coverGallerySearch) {
      window.setTimeout(() => coverGallerySearch.focus(), 0);
    }
    renderCoverGallery();
  });

  coverGallerySearch?.addEventListener('input', () => {
    coverGalleryQuery = coverGallerySearch.value;
    renderCoverGallery();
  });

  const coverFileInput = document.querySelector('[data-cover-file-input]');
  document.querySelector('[data-pick-cover-files]').addEventListener('click', () => {
    coverFileInput.click();
  });

  coverFileInput.addEventListener('change', async () => {
    const files = Array.from(coverFileInput.files || []);
    if (!files.length) return;

    let firstAddedPath = '';
    let copiedCount = 0;
    const optimizeMessages = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const prepared = await optimizeCoverFile(file);
      const coverFile = prepared.file;
      optimizeMessages.push(`${file.name}: ${prepared.message}`);
      const availableFileName = await getAvailableCoverFileName(coverFile.name);
      const path = toCoverPath(availableFileName);
      const thumbnail = await createCoverThumbnailFile(coverFile, path);

      const oldUrl = coverPreviewUrls.get(path);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      coverPreviewUrls.set(path, URL.createObjectURL(coverFile));
      pendingCoverFiles.set(path, { file: coverFile, fileName: availableFileName });
      if (thumbnail) {
        pendingCoverFiles.set(thumbnail.path, {
          file: thumbnail.file,
          fileName: thumbnail.path.split('/').pop(),
          isThumbnail: true,
        });
      }

      if (projectDirHandle) {
        try {
          await copyCoverFileToProject(coverFile, path);
          pendingCoverFiles.delete(path);
          if (thumbnail) {
            await copyCoverFileToProject(thumbnail.file, thumbnail.path);
            pendingCoverFiles.delete(thumbnail.path);
          }
          copiedCount += 1;
        } catch (error) {
          console.error(error);
          setProjectStatus('커버 파일 자동 복사에 실패했습니다. 저장하기를 누르면 다시 복사합니다.', 'error');
        }
      }

      if (!covers.includes(path)) covers.push(path);
      if (!firstAddedPath) firstAddedPath = path;
    }

    const current = getCurrentAlbum();
    if (current && firstAddedPath) {
      current.coverImage = firstAddedPath;
      fields.coverImage.value = firstAddedPath;
      renderCoverPreview(firstAddedPath, current);
    }

    if (projectDirHandle && copiedCount) {
      setProjectStatus(`${copiedCount}개 커버 이미지를 covers 폴더에 복사했습니다. 마지막에 저장하기를 누르세요.`, 'connected');
    } else if (!projectDirHandle) {
      setProjectStatus('커버 미리보기가 추가되었습니다. 저장하기를 누르면 이미지 파일도 covers 폴더에 복사됩니다.', 'normal');
    }
    if (coverOptimizeStatus && optimizeMessages.length) {
      coverOptimizeStatus.textContent = `커버 처리: ${optimizeMessages.slice(0, 3).join(' / ')}${optimizeMessages.length > 3 ? ` 외 ${optimizeMessages.length - 3}개` : ''}`;
    }

    renderCoverGallery();
    renderAdminDashboard();
    markDirty();
    coverFileInput.value = '';
  });

  function serializeAlbums() {
    const clean = albums.map(album => {
      const item = ensureAlbumShape({ ...album });
      item.artist = item.artistKo;
      return {
        id: item.id,
        title: item.title,
        artist: item.artist,
        artistKo: item.artistKo,
        artistEn: item.artistEn,
        addedAt: item.addedAt,
        year: item.year,
        format: item.format,
        genre: item.genre,
        coverImage: item.coverImage,
        recommendedTracks: item.recommendedTracks,
        tracklist: item.tracklist,
        description: item.description,
        descriptionEn: item.descriptionEn,
        weeklyReason: item.weeklyReason,
        weeklyReasonEn: item.weeklyReasonEn,
        isWeekly: item.isWeekly,
      };
    });
    return `// PUNCH-DRUNK ARCHIVE 음반 데이터\n// admin.html에서 내보낸 파일입니다.\n\nconst ALBUMS = ${JSON.stringify(clean, null, 2)};\n\nwindow.PD_ALBUMS = ALBUMS;\n`;
  }

  function serializeCovers() {
    return `// PUNCH-DRUNK ARCHIVE 커버 이미지 목록\n// admin.html에서 내보낸 파일입니다.\n\nconst COVER_IMAGES = ${JSON.stringify(covers, null, 2)};\n\nwindow.PD_COVERS = COVER_IMAGES;\n`;
  }

  function downloadText(filename, text) {
    // 내보내기 fallback: 직접 저장이 안 되는 브라우저에서도 새 js 파일을 내려받아 교체할 수 있게 합니다.
    const blob = new Blob([text], { type: 'text/javascript;charset=utf-8' });
    downloadBlob(filename, blob);
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function makeCrcTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  }

  const crcTable = makeCrcTable();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function getDosDateTime() {
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    return { date, time };
  }

  function writeUint16(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  }

  function writeUint32(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  }

  function createZipBlob(entries) {
    const encoder = new TextEncoder();
    const chunks = [];
    const centralChunks = [];
    let offset = 0;
    const { date, time } = getDosDateTime();

    entries.forEach(entry => {
      const nameBytes = encoder.encode(entry.name);
      const data = entry.bytes;
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length);
      writeUint32(local, 0, 0x04034b50);
      writeUint16(local, 4, 20);
      writeUint16(local, 8, 0);
      writeUint16(local, 10, time);
      writeUint16(local, 12, date);
      writeUint32(local, 14, crc);
      writeUint32(local, 18, data.length);
      writeUint32(local, 22, data.length);
      writeUint16(local, 26, nameBytes.length);
      local.set(nameBytes, 30);
      chunks.push(local, data);

      const central = new Uint8Array(46 + nameBytes.length);
      writeUint32(central, 0, 0x02014b50);
      writeUint16(central, 4, 20);
      writeUint16(central, 6, 20);
      writeUint16(central, 10, 0);
      writeUint16(central, 12, time);
      writeUint16(central, 14, date);
      writeUint32(central, 16, crc);
      writeUint32(central, 20, data.length);
      writeUint32(central, 24, data.length);
      writeUint16(central, 28, nameBytes.length);
      writeUint32(central, 42, offset);
      central.set(nameBytes, 46);
      centralChunks.push(central);

      offset += local.length + data.length;
    });

    const centralOffset = offset;
    const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const end = new Uint8Array(22);
    writeUint32(end, 0, 0x06054b50);
    writeUint16(end, 8, entries.length);
    writeUint16(end, 10, entries.length);
    writeUint32(end, 12, centralSize);
    writeUint32(end, 16, centralOffset);
    return new Blob([...chunks, ...centralChunks, end], { type: 'application/zip' });
  }

  async function exportBackupZip() {
    if (!validateAlbumsBeforeSaving()) return;
    const encoder = new TextEncoder();
    const entries = [
      { name: 'albums-data.js', bytes: encoder.encode(serializeAlbums()) },
      { name: 'covers-list.js', bytes: encoder.encode(serializeCovers()) },
      { name: 'README-backup.txt', bytes: encoder.encode('Punch-drunk Archive 백업입니다. albums-data.js와 covers-list.js를 기존 파일과 교체하면 데이터를 복구할 수 있습니다.') },
    ];

    if (projectDirHandle) {
      try {
        const coversDir = await projectDirHandle.getDirectoryHandle('covers', { create: false });
        for (const path of covers) {
          const fileName = String(path).replace(/^covers\//, '');
          if (!fileName) continue;
          try {
            const fileHandle = await coversDir.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            entries.push({ name: `covers/${fileName}`, bytes: new Uint8Array(await file.arrayBuffer()) });
          } catch (error) {
            console.warn(error);
          }
        }
      } catch (error) {
        console.warn(error);
      }
    }

    downloadBlob(`punchdrunk-backup-${new Date().toISOString().slice(0, 10)}.zip`, createZipBlob(entries));
    if (autosaveStatus) autosaveStatus.textContent = `백업 ZIP 생성됨: ${getTimeText()}`;
  }

  function normalizeDraftPayload(payload) {
    if (!payload || !Array.isArray(payload.albums)) return null;
    return {
      albums: payload.albums,
      covers: Array.isArray(payload.covers) ? payload.covers : covers,
      currentId: payload.currentId || payload.albums[0]?.id || null,
      savedAt: payload.savedAt || '',
      albumCount: payload.albums.length,
    };
  }

  function getDraftCandidates() {
    const current = normalizeDraftPayload(readJsonStorage(DRAFT_KEY));
    const history = readJsonStorage(DRAFT_HISTORY_KEY, []);
    return [current, ...(Array.isArray(history) ? history.map(normalizeDraftPayload) : [])]
      .filter(Boolean)
      .filter((item, index, list) => {
        const key = `${item.savedAt}-${item.albumCount}`;
        return list.findIndex(other => `${other.savedAt}-${other.albumCount}` === key) === index;
      });
  }

  function isDraftWorthShowing(draft) {
    if (!draft?.albums?.length) return false;
    if (draft.albums.length > albums.length) return true;
    const currentIds = albums.map(album => album.id).join('|');
    const draftIds = draft.albums.map(album => album.id).join('|');
    return draftIds !== currentIds;
  }

  function findBestRecoveryDraft() {
    return getDraftCandidates()
      .filter(isDraftWorthShowing)
      .sort((a, b) => b.albums.length - a.albums.length || String(b.savedAt).localeCompare(String(a.savedAt)))[0] || null;
  }

  function formatDraftTime(savedAt) {
    if (!savedAt) return '';
    const date = new Date(savedAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ko-KR');
  }

  function createDraftKey(draft) {
    return `${draft?.savedAt || ''}|${draft?.albumCount || draft?.albums?.length || 0}`;
  }

  function getDraftCurrentTitle(draft) {
    const album = draft?.albums?.find(item => item.id === draft.currentId) || draft?.albums?.[0];
    if (!album) return '선택 음반 없음';
    return `${album.artist || '아티스트 없음'} - ${album.title || '제목 없음'}`;
  }

  function removeDraftByKey(key) {
    const current = normalizeDraftPayload(readJsonStorage(DRAFT_KEY));
    if (current && createDraftKey(current) === key) removeStorageItem(DRAFT_KEY);
    const history = readJsonStorage(DRAFT_HISTORY_KEY, []);
    if (Array.isArray(history)) {
      writeJsonStorage(DRAFT_HISTORY_KEY, history.filter(item => createDraftKey(normalizeDraftPayload(item)) !== key));
    }
    bestRecoveryDraft = findBestRecoveryDraft();
    renderDraftManager();
    showDraftRecoveryIfNeeded();
  }

  function clearAllDrafts() {
    removeStorageItem(DRAFT_KEY);
    removeStorageItem(DRAFT_HISTORY_KEY);
    bestRecoveryDraft = null;
    if (draftRecoveryPanel) draftRecoveryPanel.hidden = true;
    renderDraftManager();
    if (autosaveStatus) autosaveStatus.textContent = `임시저장본 비움: ${getTimeText()}`;
    setSaveFeedback('브라우저 임시저장본을 모두 비웠습니다. 현재 화면의 입력 내용은 그대로 남아 있습니다.', 'working');
  }

  function renderDraftManager() {
    if (!draftManagerPanel || !draftList) return;
    if (!ADMIN_FEATURES.draftManager || draftManagerPanel.hidden) return;
    const drafts = getDraftCandidates()
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));

    if (!drafts.length) {
      const empty = document.createElement('p');
      empty.className = 'helper-text';
      empty.textContent = '브라우저에 남아 있는 임시저장본이 없습니다.';
      draftList.replaceChildren(empty);
      return;
    }

    draftList.replaceChildren(...drafts.map(draft => {
      const row = document.createElement('div');
      row.className = 'draft-item';
      const key = createDraftKey(draft);
      const savedTime = formatDraftTime(draft.savedAt) || '저장 시각 없음';
      const meta = document.createElement('div');
      meta.innerHTML = `
        <strong>${escapeHtml(draft.albumCount || draft.albums.length)}장 · ${escapeHtml(savedTime)}</strong>
        <span>${escapeHtml(getDraftCurrentTitle(draft))}</span>
      `;

      const actions = document.createElement('div');
      actions.className = 'direct-actions';
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'admin-button compact';
      restore.textContent = '복구';
      restore.addEventListener('click', () => restoreDraftPayload(draft));

      const exportButton = document.createElement('button');
      exportButton.type = 'button';
      exportButton.className = 'admin-button compact';
      exportButton.textContent = 'ZIP 받기';
      exportButton.addEventListener('click', () => exportDraftRecoveryZip(draft));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'text-button';
      remove.textContent = '삭제';
      remove.addEventListener('click', () => {
        const ok = confirm('이 임시저장본을 삭제할까요? 현재 화면 입력 내용은 지워지지 않습니다.');
        if (ok) removeDraftByKey(key);
      });

      actions.append(restore, exportButton, remove);
      row.append(meta, actions);
      return row;
    }));
  }

  function showDraftRecoveryIfNeeded() {
    bestRecoveryDraft = findBestRecoveryDraft();
    if (!draftRecoveryPanel) return;
    if (!bestRecoveryDraft) {
      draftRecoveryPanel.hidden = true;
      return;
    }
    const savedTime = formatDraftTime(bestRecoveryDraft.savedAt);
    draftRecoveryPanel.hidden = false;
    if (draftRecoveryText) {
      draftRecoveryText.textContent = `${bestRecoveryDraft.albums.length}장의 음반이 들어 있는 임시 저장본이 있습니다.${savedTime ? ` 저장 시각: ${savedTime}` : ''} 복구하면 현재 화면 입력칸에 적용됩니다.`;
    }
  }

  function restoreDraftPayload(payload) {
    const draft = normalizeDraftPayload(payload);
    if (!draft) {
      alert('임시 저장 데이터를 불러오지 못했습니다.');
      return false;
    }
    albums = JSON.parse(JSON.stringify(draft.albums));
    covers = [...draft.covers];
    currentId = draft.currentId || albums[0]?.id || null;
    markDirty();
    renderAll();
    if (draftRecoveryPanel) draftRecoveryPanel.hidden = true;
    renderDraftManager();
    if (autosaveStatus) autosaveStatus.textContent = `임시 저장본 복구됨: ${getTimeText()}`;
    return true;
  }

  function serializeAlbumsFromList(list) {
    const clean = JSON.parse(JSON.stringify(Array.isArray(list) ? list : [])).map(album => {
      const item = ensureAlbumShape(album);
      item.artist = item.artistKo;
      return {
        id: item.id,
        title: item.title,
        artist: item.artist,
        artistKo: item.artistKo,
        artistEn: item.artistEn,
        addedAt: item.addedAt,
        year: item.year,
        format: item.format,
        genre: item.genre,
        coverImage: item.coverImage,
        recommendedTracks: item.recommendedTracks,
        tracklist: item.tracklist,
        description: item.description,
        descriptionEn: item.descriptionEn,
        weeklyReason: item.weeklyReason,
        weeklyReasonEn: item.weeklyReasonEn,
        isWeekly: item.isWeekly,
      };
    });
    return `// PUNCH-DRUNK ARCHIVE 복구 음반 데이터\n// 브라우저 임시 저장본에서 만든 파일입니다.\n\nconst ALBUMS = ${JSON.stringify(clean, null, 2)};\n\nwindow.PD_ALBUMS = ALBUMS;\n`;
  }

  function serializeCoversFromList(list) {
    const clean = Array.isArray(list) ? list : [];
    return `// PUNCH-DRUNK ARCHIVE 복구 커버 이미지 목록\n// 브라우저 임시 저장본에서 만든 파일입니다.\n\nconst COVER_IMAGES = ${JSON.stringify(clean, null, 2)};\n\nwindow.PD_COVERS = COVER_IMAGES;\n`;
  }

  function exportDraftRecoveryZip(payload = bestRecoveryDraft) {
    const draft = normalizeDraftPayload(payload);
    if (!draft) return alert('내보낼 임시 저장본이 없습니다.');
    const encoder = new TextEncoder();
    const entries = [
      { name: 'albums-data.js', bytes: encoder.encode(serializeAlbumsFromList(draft.albums)) },
      { name: 'covers-list.js', bytes: encoder.encode(serializeCoversFromList(draft.covers)) },
      { name: 'README-recovery.txt', bytes: encoder.encode('브라우저 임시 저장본에서 만든 복구 파일입니다. albums-data.js와 covers-list.js를 기존 파일과 교체하면 복구할 수 있습니다.') },
    ];
    downloadBlob(`punchdrunk-recovery-${new Date().toISOString().slice(0, 10)}.zip`, createZipBlob(entries));
  }

  function exportAlbums() {
    if (!validateAlbumsBeforeSaving()) return;
    downloadText('albums-data.js', serializeAlbums());
    if (saveStatus) saveStatus.textContent = `마지막 내보내기: ${getTimeText()} · 다운로드 파일을 기존 albums-data.js와 교체해야 적용됩니다.`;
    alert('albums-data.js를 다운로드했습니다.\n사이트에 적용하려면 다운로드된 파일을 기존 albums-data.js와 교체해야 합니다.');
  }

  document.querySelector('[data-export-albums]')?.addEventListener('click', exportAlbums);
  document.querySelector('[data-export-albums-bottom]')?.addEventListener('click', exportAlbums);
  document.querySelector('[data-export-covers]')?.addEventListener('click', () => {
    downloadText('covers-list.js', serializeCovers());
    setSaveFeedback('covers-list.js를 다운로드했습니다. 사이트에 적용하려면 기존 covers-list.js와 교체해야 합니다.', 'working');
  });
  document.querySelector('[data-export-backup]')?.addEventListener('click', exportBackupZip);
  document.querySelector('[data-connect-backup-folder]')?.addEventListener('click', connectBackupFolder);

  document.querySelectorAll('[data-connect-project]').forEach(button => {
    button.addEventListener('click', connectProjectFolder);
  });

  document.querySelectorAll('[data-save-main]').forEach(button => {
    button.addEventListener('click', saveDirectly);
  });

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
    event.preventDefault();
    saveDirectly();
  });

  document.querySelectorAll('[data-save-direct]').forEach(button => {
    button.addEventListener('click', saveDirectly);
  });

  if (setCurrentWeeklyButton) {
    setCurrentWeeklyButton.addEventListener('click', () => {
      const album = getCurrentAlbum();
      if (!album) return;
      albums.forEach(item => item.isWeekly = false);
      album.isWeekly = true;
      fields.isWeekly.checked = true;
      markDirty();
      renderAlbumList();
      renderEditor();
      renderAdminStatus();
    });
  }

  window.addEventListener('beforeunload', event => {
    if (hasUnsavedChanges) persistDraft('beforeunload');
    if (!hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = '';
  });

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && hasUnsavedChanges) persistDraft('hidden');
  });

  document.querySelector('[data-save-draft]').addEventListener('click', () => {
    persistDraft('manual');
    if (autosaveStatus) autosaveStatus.textContent = `브라우저 임시 저장됨: ${getTimeText()}`;
    setSaveFeedback('브라우저에 임시 저장했습니다. 실제 파일 저장은 상단의 저장하기 버튼을 누르면 됩니다.', 'working');
  });

  document.querySelector('[data-load-draft]').addEventListener('click', () => {
    const draft = findBestRecoveryDraft() || normalizeDraftPayload(readJsonStorage(DRAFT_KEY));
    if (!draft) return alert('저장된 임시 데이터가 없습니다.');
    restoreDraftPayload(draft);
  });

  document.querySelector('[data-open-draft-manager]')?.addEventListener('click', () => {
    if (!draftManagerPanel) return;
    draftManagerPanel.hidden = false;
    renderDraftManager();
    draftManagerPanel.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  document.querySelector('[data-close-draft-manager]')?.addEventListener('click', () => {
    if (draftManagerPanel) draftManagerPanel.hidden = true;
  });

  document.querySelector('[data-refresh-drafts]')?.addEventListener('click', renderDraftManager);

  document.querySelector('[data-clear-drafts]')?.addEventListener('click', () => {
    const ok = confirm('브라우저에 남은 임시저장본을 모두 비울까요? 현재 화면 입력 내용은 지워지지 않습니다.');
    if (ok) clearAllDrafts();
  });

  if (restoreDraftButton) {
    restoreDraftButton.addEventListener('click', () => {
      if (!bestRecoveryDraft) bestRecoveryDraft = findBestRecoveryDraft();
      restoreDraftPayload(bestRecoveryDraft);
    });
  }

  if (exportDraftButton) {
    exportDraftButton.addEventListener('click', () => {
      if (!bestRecoveryDraft) bestRecoveryDraft = findBestRecoveryDraft();
      exportDraftRecoveryZip(bestRecoveryDraft);
    });
  }

  if (dismissDraftButton && draftRecoveryPanel) {
    dismissDraftButton.addEventListener('click', () => {
      draftRecoveryPanel.hidden = true;
    });
  }

  document.querySelector('[data-run-cover-audit]')?.addEventListener('click', renderCoverAuditResults);
  exportCoverAuditButton?.addEventListener('click', exportCoverAuditReport);

  document.querySelector('[data-enable-local-lock]')?.addEventListener('click', enableLocalLock);
  document.querySelector('[data-disable-local-lock]')?.addEventListener('click', () => {
    const ok = confirm('이 브라우저의 관리자 로컬 잠금을 끌까요?');
    if (ok) disableLocalLock();
  });

  function renderAll() {
    setupGenreSelect();
    albums.forEach(ensureAlbumShape);
    repairDuplicateAlbumIds();
    if (!currentId && albums[0]) currentId = albums[0].id;
    renderAlbumList();
    renderEditor();
    renderAdminStatus();
    renderAdminDashboard();
    renderCoverAuditSummary();
    updateLocalLockStatus();
  }

  async function restoreRememberedProjectFolder() {
    if (!supportsDirectSave) return;
    const rememberedHandle = await getRememberedProjectHandle();
    if (!rememberedHandle) return;
    projectDirHandle = rememberedHandle;

    try {
      const permission = typeof projectDirHandle.queryPermission === 'function'
        ? await projectDirHandle.queryPermission({ mode: 'readwrite' })
        : 'prompt';
      if (permission === 'granted') {
        await loadConnectedProjectData();
        setProjectStatus('지난번 작업 폴더를 자동으로 다시 연결했습니다.', 'connected');
        renderAll();
        return;
      }
      setProjectStatus('지난번 작업 폴더를 기억하고 있습니다. 저장하기를 누르면 폴더 권한을 다시 확인합니다.', 'normal');
    } catch (error) {
      console.warn(error);
      projectDirHandle = null;
      setProjectStatus('기억한 작업 폴더를 다시 열지 못했습니다. 저장할 때 폴더를 다시 선택해주세요.', 'normal');
    }
  }

  async function restoreRememberedBackupFolder() {
    if (!supportsDirectSave) return;
    const rememberedHandle = await getRememberedBackupHandle();
    if (!rememberedHandle) {
      setBackupFolderStatus();
      return;
    }
    backupDirHandle = rememberedHandle;

    try {
      const permission = typeof backupDirHandle.queryPermission === 'function'
        ? await backupDirHandle.queryPermission({ mode: 'readwrite' })
        : 'prompt';
      if (permission === 'granted') {
        setBackupFolderStatus(`자동 백업: ${backupDirHandle.name || '연결됨'}`);
        return;
      }
      setBackupFolderStatus('자동 백업: 저장할 때 권한 확인');
    } catch (error) {
      console.warn(error);
      backupDirHandle = null;
      setBackupFolderStatus('자동 백업: 폴더 재연결 필요');
    }
  }
  projectDataBaseline = createProjectDataSignature(albums, covers);
  renderAll();
  restoreRememberedProjectFolder();
  restoreRememberedBackupFolder();
  checkLocalBridgeStatus().finally(startEditSessionHeartbeat);
  showDraftRecoveryIfNeeded();
  showLocalLockOverlayIfNeeded();
  window.addEventListener('pagehide', releaseEditSession);
  if (!supportsDirectSave) {
    setProjectStatus('이 브라우저에서는 직접 저장을 지원하지 않습니다. 데스크탑 Chrome/Edge에서는 작업 폴더 연결을 사용할 수 있고, 지금은 내보내기 방식으로 사용하세요.', 'normal');
  }
})();
