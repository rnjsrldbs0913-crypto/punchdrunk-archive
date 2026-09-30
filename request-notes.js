/* Archive feature module: createRequestNotes. No build step is required. */
(() => {
  const archive = window.PD_ARCHIVE = window.PD_ARCHIVE || {};
  archive.createRequestNotes = function ({
    albums, app, CUSTOMER_FEATURES, t,
    createCover, splitTrackLine, formatLabel, getLocalizedArtist,
    openAlbum, renderRouteFromLocation,
  }) {
    const REQUEST_TRACKS_STORAGE_KEY = 'pd-request-tracks-v1';
    let requestTracks = loadRequestTracks();
    let requestListOverlay = null;
    let requestListTrigger = null;
    let requestListBaseUrl = '';
    let requestListClosing = false;
    let afterRequestListClose = null;
    let requestToastTimer = 0;
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
      return {
      album, trackIndex, track: String(album.tracklist[trackIndex]),
    };
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

    let floatingRequestButton = null;

    function ensureFloatingRequestButton() {
      if (floatingRequestButton?.isConnected) return floatingRequestButton;
      floatingRequestButton = document.createElement('button');
      floatingRequestButton.type = 'button';
      floatingRequestButton.className = 'request-floating-button';
      floatingRequestButton.dataset.requestList = '';
      floatingRequestButton.hidden = true;
      floatingRequestButton.addEventListener('click', () => openRequestTrackList());
      document.body.append(floatingRequestButton);
      return floatingRequestButton;
    }

    function refreshRequestTrackUi(root = app) {
      if (!root) return;
      const floatingButton = ensureFloatingRequestButton();
      const listButtons = new Set([...root.querySelectorAll('[data-request-list]'), floatingButton]);
      listButtons.forEach(button => {
        const isFloating = button === floatingButton;
        button.hidden = !CUSTOMER_FEATURES.requestTrackList || (isFloating && requestTracks.length === 0);
        button.textContent = t(isFloating ? 'requestFloatingCount' : 'requestListCount')(requestTracks.length);
        button.title = t('requestListOpen');
        button.setAttribute('aria-label', isFloating
          ? `${t('requestListOpen')} · ${t('requestFloatingCount')(requestTracks.length)}`
          : t('requestListOpen'));
      });
      root.querySelectorAll('[data-request-track]').forEach(button => {
        const selected = isTrackRequested(button.dataset.albumId, Number(button.dataset.trackIndex));
        const album = albums.find(item => String(item.id) === button.dataset.albumId);
        const track = album?.tracklist?.[Number(button.dataset.trackIndex)];
        const title = track ? splitTrackLine(track).title : '';
        const label = [title, selected ? t('requestTrackRemove') : t('requestTrackAdd')].filter(Boolean).join(' · ');
        button.textContent = selected ? '✓' : '+';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', String(selected));
      });
    }

    function hideRequestTrackList() {
      if (!requestListOverlay) return;
      requestListOverlay.hidden = true;
      document.body.classList.remove('request-list-open');
      if (requestListTrigger?.isConnected) requestListTrigger.focus({ preventScroll: true });
      requestListClosing = false;
    }

    function closeRequestTrackList(afterClose) {
      if (!requestListOverlay || requestListOverlay.hidden || requestListClosing) return;
      afterRequestListClose = typeof afterClose === 'function' ? afterClose : null;
      if (history.state?.requestList) {
        requestListClosing = true;
        history.back();
        return;
      }
      hideRequestTrackList();
      const callback = afterRequestListClose;
      afterRequestListClose = null;
      callback?.();
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

      const notice = document.createElement('p');
      notice.className = 'request-list-notice';
      notice.textContent = t('requestListNotice');

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
          trackNumber.textContent = [formatLabel(resolved.album.format), trackParts.number].filter(Boolean).join(' · ');
          const artistMeta = document.createElement('span');
          artistMeta.className = 'request-list-artist';
          artistMeta.textContent = getLocalizedArtist(resolved.album) || '';
          const albumMeta = document.createElement('span');
          albumMeta.className = 'request-list-album-meta';
          albumMeta.textContent = resolved.album.title || '';
          text.append(trackTitle, artistMeta, albumMeta, trackNumber);
          openButton.append(cover, text);
          openButton.addEventListener('click', () => {
            closeRequestTrackList(() => openAlbum(resolved.album.id, {
              focusTrackIndex: resolved.trackIndex,
            }));
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
      panel.append(header, notice, content, footer);
      overlay.replaceChildren(panel);
      overlay.setAttribute('aria-label', t('requestListTitle'));
    }

    function openRequestTrackList(options = {}) {
      if (!CUSTOMER_FEATURES.requestTrackList || (requestListOverlay && !requestListOverlay.hidden)) return;
      requestListTrigger = document.activeElement;
      requestListBaseUrl = window.location.href;
      if (!options.fromHistory) {
        history.pushState({ ...history.state, requestList: true }, '', requestListBaseUrl);
      }
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
        toast.setAttribute('role', 'status');
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

    function handleNotesPopState() {
      // 메모창도 방문 기록 한 단계로 취급해 첫 뒤로가기는 배경 화면을 유지합니다.
      if (requestListOverlay && !requestListOverlay.hidden) {
        const stayedOnPage = window.location.href === requestListBaseUrl;
        hideRequestTrackList();
        const callback = afterRequestListClose;
        afterRequestListClose = null;
        if (stayedOnPage) {
          callback?.();
          return true;
        }
      }
      if (history.state?.requestList) {
        renderRouteFromLocation();
        openRequestTrackList({ fromHistory: true });
        return true;
      }
      return false;
    }

    return {
      isTrackRequested, toggleRequestTrack, refreshRequestTrackUi, hideRequestTrackList,
      closeRequestTrackList, openRequestTrackList, showRequestAddedToast, handleNotesPopState,
    };
  };
})();
