/* Archive feature module: createCoverMotion. No build step is required. */
(() => {
  const archive = window.PD_ARCHIVE = window.PD_ARCHIVE || {};
  archive.createCoverMotion = function ({
    app, state, CUSTOMER_FEATURES, COVER_RENDER_MODE,
    USES_SHARED_HIGH_QUALITY_COVERS, t, escapeHtml, getLocalizedArtist,
    activatePersistentDetailView, view,
  }) {
    let detailCoverViewer = null;
    let detailCoverViewerTrigger = null;
    let detailCoverViewerHistoryActive = false;
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

    function getCoverVariantPath(path, folder, extension) {
      const normalized = String(path || '').trim().replace(/\\/g, '/');
      if (!/^covers\/(?!thumbs\/|display\/)/i.test(normalized) || /\.(?:gif|svg)$/i.test(normalized)) return '';

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
      return `covers/${folder}/${baseName}-${(hash >>> 0).toString(16).padStart(8, '0')}.${extension}`;
    }

    function getCoverThumbnailPath(path) {
      if (!CUSTOMER_FEATURES.gridThumbnails) return '';
      return getCoverVariantPath(path, 'thumbs', 'jpg');
    }

    function getOptimizedCoverPath(path) {
      return getCoverVariantPath(path, 'display', 'webp');
    }

    function getComparisonCoverSource(album) {
      const originalSource = String(album?.coverImage || '').trim();
      if (COVER_RENDER_MODE === 'optimized') return getOptimizedCoverPath(originalSource) || originalSource;
      return originalSource;
    }

    function createCover(album, className = '', options = {}) {
      const wrap = document.createElement('div');
      wrap.className = `cover-frame ${className}`.trim();

      if (album.coverImage) {
        const img = document.createElement('img');
        const originalSource = String(album.coverImage).trim();
        const classes = className.split(/\s+/);
        const comparisonTarget = classes.some(name => name === 'grid-cover' || name === 'detail-cover' || name === 'weekly-cover-art');
        const sources = [originalSource];
        if (comparisonTarget && COVER_RENDER_MODE === 'optimized') {
          sources.unshift(getOptimizedCoverPath(originalSource));
        } else if (classes.includes('grid-cover') && COVER_RENDER_MODE === 'thumbnail') {
          sources.unshift(getCoverThumbnailPath(originalSource));
        }
        const availableSources = [...new Set(sources.filter(Boolean))];
        let sourceIndex = 0;
        const priority = CUSTOMER_FEATURES.priorityCovers && options.priority === true;
        img.src = availableSources[sourceIndex] || originalSource;
        img.alt = `${getLocalizedArtist(album) || ''} - ${album.title || ''}`.trim();
        // 첫 화면의 금주의 음반과 상세 커버는 목록 커버보다 먼저 불러와 빈 화면을 줄입니다.
        img.loading = priority ? 'eager' : 'lazy';
        img.decoding = 'async';
        if (priority) img.fetchPriority = 'high';
        img.onerror = () => {
          sourceIndex += 1;
          if (availableSources[sourceIndex]) {
            img.src = availableSources[sourceIndex];
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

    function ensureDetailCoverViewer() {
      if (detailCoverViewer) return detailCoverViewer;

      const overlay = document.createElement('div');
      overlay.className = 'detail-cover-viewer';
      overlay.hidden = true;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      const stage = document.createElement('div');
      stage.className = 'detail-cover-viewer-stage';
      const image = document.createElement('img');
      image.className = 'detail-cover-viewer-image';
      image.draggable = false;
      stage.append(image);

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'detail-cover-viewer-close';
      closeButton.textContent = '×';

      const view = {
        overlay,
        stage,
        image,
        closeButton,
        pointers: new Map(),
        scale: 1,
        x: 0,
        y: 0,
        dismissX: 0,
        dismissY: 0,
        gesture: null,
        opening: false,
        closing: false,
        settling: false,
        transitionClone: null,
        transitionToken: 0,
        pendingCloseOptions: null,
      };

      const setBackdropStrength = strength => {
        const clamped = Math.max(0, Math.min(1, strength));
        overlay.style.setProperty('--viewer-backdrop-opacity', String(0.97 * clamped));
        closeButton.style.opacity = String(clamped);
      };

      const getBaseImageSize = () => {
        const stageRect = stage.getBoundingClientRect();
        const naturalWidth = image.naturalWidth || stageRect.width || 1;
        const naturalHeight = image.naturalHeight || stageRect.height || 1;
        const fit = Math.min(stageRect.width / naturalWidth, stageRect.height / naturalHeight);
        return {
          stageWidth: stageRect.width,
          stageHeight: stageRect.height,
          width: naturalWidth * fit,
          height: naturalHeight * fit,
        };
      };

      const applyTransform = () => {
        const size = getBaseImageSize();
        const maxX = Math.max(0, (size.width * view.scale - size.stageWidth) / 2);
        const maxY = Math.max(0, (size.height * view.scale - size.stageHeight) / 2);
        view.x = Math.max(-maxX, Math.min(maxX, view.x));
        view.y = Math.max(-maxY, Math.min(maxY, view.y));
        const dismissDistance = Math.hypot(view.dismissX, view.dismissY);
        const dismissScale = view.scale <= 1.01
          ? 1 - Math.min(0.045, dismissDistance / 2400)
          : 1;
        image.style.transform = `translate3d(${view.x + view.dismissX}px, ${view.y + view.dismissY}px, 0) scale(${view.scale * dismissScale})`;
        stage.classList.toggle('is-zoomed', view.scale > 1.01);
        stage.classList.toggle('is-dismissing', dismissDistance > 0.5);
        if (view.scale <= 1.01 && dismissDistance > 0) {
          const fadeDistance = Math.max(180, Math.min(window.innerWidth, window.innerHeight) * 0.48);
          setBackdropStrength(1 - Math.min(0.64, dismissDistance / fadeDistance * 0.64));
        } else if (!view.opening && !view.closing) {
          setBackdropStrength(1);
        }
      };

      const resetTransform = () => {
        view.scale = 1;
        view.x = 0;
        view.y = 0;
        view.dismissX = 0;
        view.dismissY = 0;
        view.gesture = null;
        view.pointers.clear();
        applyTransform();
      };

      const setScale = nextScale => {
        view.scale = Math.max(1, Math.min(4, nextScale));
        view.dismissX = 0;
        view.dismissY = 0;
        if (view.scale <= 1.01) {
          view.x = 0;
          view.y = 0;
        }
        applyTransform();
      };

      const getTriggerCover = () => {
        if (!detailCoverViewerTrigger?.isConnected) return null;
        return detailCoverViewerTrigger.querySelector('.cover-frame') || detailCoverViewerTrigger;
      };

      const getViewerTargetRect = sourceRect => {
        const stageRect = stage.getBoundingClientRect();
        const naturalWidth = image.naturalWidth || sourceRect?.width || 1;
        const naturalHeight = image.naturalHeight || sourceRect?.height || 1;
        const fit = Math.min(stageRect.width / naturalWidth, stageRect.height / naturalHeight);
        const width = Math.max(1, naturalWidth * fit);
        const height = Math.max(1, naturalHeight * fit);
        return {
          left: stageRect.left + (stageRect.width - width) / 2,
          top: stageRect.top + (stageRect.height - height) / 2,
          width,
          height,
        };
      };

      const createTransitionClone = (rect, source) => {
        if (!rect?.width || !rect?.height || !source) return null;
        const clone = document.createElement('img');
        clone.className = 'detail-cover-viewer-transition-image';
        clone.src = source;
        clone.alt = '';
        clone.setAttribute('aria-hidden', 'true');
        Object.assign(clone.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        overlay.append(clone);
        view.transitionClone = clone;
        return clone;
      };

      const animateCloneBetweenRects = (clone, fromRect, toRect, duration) => {
        if (!clone || !fromRect?.width || !toRect?.width) return Promise.resolve();
        const transform = `translate3d(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px, 0) scale(${toRect.width / fromRect.width}, ${toRect.height / fromRect.height})`;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          clone.style.transform = transform;
          return Promise.resolve();
        }
        if (typeof clone.animate === 'function') {
          const animation = clone.animate([
            { transform: 'translate3d(0, 0, 0) scale(1, 1)', borderRadius: '8px' },
            { transform, borderRadius: '2px' },
          ], {
            duration,
            easing: 'cubic-bezier(0.2, 0.78, 0.18, 1)',
            fill: 'forwards',
          });
          return Promise.race([
            animation.finished.catch(() => undefined),
            new Promise(resolve => window.setTimeout(resolve, duration + 100)),
          ]);
        }
        clone.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.78, 0.18, 1), border-radius ${duration}ms ease`;
        clone.getBoundingClientRect();
        requestAnimationFrame(() => {
          clone.style.transform = transform;
          clone.style.borderRadius = '2px';
        });
        return new Promise(resolve => window.setTimeout(resolve, duration + 80));
      };

      const openFromTrigger = async trigger => {
        const token = ++view.transitionToken;
        view.opening = true;
        view.closing = false;
        delete overlay.dataset.closing;
        const source = trigger?.querySelector('.cover-frame') || trigger;
        const sourceRect = source?.getBoundingClientRect();
        const sourceImage = source?.querySelector('img') || source?.closest?.('img');
        const sourceUrl = sourceImage?.currentSrc || sourceImage?.src || image.currentSrc || image.src;
        image.style.opacity = '0';
        setBackdropStrength(0);
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (token !== view.transitionToken || overlay.hidden) return;
        const targetRect = getViewerTargetRect(sourceRect);
        const clone = createTransitionClone(sourceRect, sourceUrl);
        requestAnimationFrame(() => setBackdropStrength(1));
        await animateCloneBetweenRects(clone, sourceRect, targetRect, 360);
        if (token !== view.transitionToken || overlay.hidden) return;
        clone?.remove();
        if (view.transitionClone === clone) view.transitionClone = null;
        image.style.opacity = '1';
        view.opening = false;
        setBackdropStrength(1);
      };

      const settleDismissBack = () => {
        if (view.settling || view.closing) return;
        view.settling = true;
        const fromTransform = image.style.transform;
        setBackdropStrength(1);
        const finish = () => {
          view.dismissX = 0;
          view.dismissY = 0;
          view.settling = false;
          applyTransform();
        };
        if (typeof image.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          finish();
          return;
        }
        const animation = image.animate([
          { transform: fromTransform },
          { transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` },
        ], {
          duration: 220,
          easing: 'cubic-bezier(0.2, 0.78, 0.18, 1)',
        });
        animation.finished.then(finish).catch(finish);
      };

      const close = async ({ restoreFocus = true, animate = true } = {}) => {
        if (overlay.hidden || view.closing) return;
        const token = ++view.transitionToken;
        view.closing = true;
        overlay.dataset.closing = 'true';
        view.opening = false;
        view.settling = false;
        view.pointers.clear();
        view.gesture = null;
        const target = getTriggerCover();
        const targetRect = target?.getBoundingClientRect();
        const movingElement = view.transitionClone?.isConnected ? view.transitionClone : image;
        const currentRect = movingElement.getBoundingClientRect();
        const sourceUrl = image.currentSrc || image.src;
        view.transitionClone?.remove();
        view.transitionClone = null;
        image.style.opacity = '0';

        if (animate && targetRect?.width && currentRect?.width && sourceUrl) {
          const clone = createTransitionClone(currentRect, sourceUrl);
          requestAnimationFrame(() => setBackdropStrength(0));
          await animateCloneBetweenRects(clone, currentRect, targetRect, 320);
          clone?.remove();
          if (view.transitionClone === clone) view.transitionClone = null;
        } else {
          setBackdropStrength(0);
          if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            await new Promise(resolve => window.setTimeout(resolve, 160));
          }
        }
        if (token !== view.transitionToken) return;
        overlay.hidden = true;
        delete overlay.dataset.closing;
        document.body.classList.remove('detail-cover-viewer-open');
        image.style.opacity = '';
        view.closing = false;
        resetTransform();
        detailCoverViewerHistoryActive = false;
        if (restoreFocus && detailCoverViewerTrigger?.isConnected) {
          detailCoverViewerTrigger.focus({ preventScroll: true });
        }
        detailCoverViewerTrigger = null;
      };

      closeButton.addEventListener('click', () => requestCloseDetailCoverViewer());
      overlay.addEventListener('click', event => {
        if (event.target === overlay) requestCloseDetailCoverViewer();
      });
      overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') requestCloseDetailCoverViewer();
        if (event.key === 'Tab') {
          event.preventDefault();
          closeButton.focus();
        }
      });

      stage.addEventListener('wheel', event => {
        event.preventDefault();
        setScale(view.scale * (event.deltaY < 0 ? 1.16 : 0.86));
      }, { passive: false });

      stage.addEventListener('dblclick', event => {
        event.preventDefault();
        setScale(view.scale > 1.01 ? 1 : 2.4);
      });

      stage.addEventListener('pointerdown', event => {
        if (event.button > 0 || view.opening || view.closing || view.settling) return;
        event.preventDefault();
        try {
          stage.setPointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture is optional on older in-app browsers.
        }
        view.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...view.pointers.values()];
        if (points.length >= 2) {
          view.dismissX = 0;
          view.dismissY = 0;
          setBackdropStrength(1);
          const [a, b] = points;
          view.gesture = {
            type: 'pinch',
            distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
            centerX: (a.x + b.x) / 2,
            centerY: (a.y + b.y) / 2,
            scale: view.scale,
            x: view.x,
            y: view.y,
          };
        } else if (view.scale > 1.01) {
          view.gesture = {
            type: 'pan',
            startX: event.clientX,
            startY: event.clientY,
            x: view.x,
            y: view.y,
          };
        } else {
          view.gesture = {
            type: 'dismiss',
            startX: event.clientX,
            startY: event.clientY,
          };
        }
      });

      stage.addEventListener('pointermove', event => {
        if (!view.pointers.has(event.pointerId)) return;
        event.preventDefault();
        view.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...view.pointers.values()];

        if (points.length >= 2) {
          const [a, b] = points;
          if (view.gesture?.type !== 'pinch') {
            view.gesture = {
              type: 'pinch',
              distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
              centerX: (a.x + b.x) / 2,
              centerY: (a.y + b.y) / 2,
              scale: view.scale,
              x: view.x,
              y: view.y,
            };
          }
          const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
          const centerX = (a.x + b.x) / 2;
          const centerY = (a.y + b.y) / 2;
          view.scale = Math.max(1, Math.min(4, view.gesture.scale * distance / view.gesture.distance));
          view.x = view.gesture.x + centerX - view.gesture.centerX;
          view.y = view.gesture.y + centerY - view.gesture.centerY;
          applyTransform();
          return;
        }

        if (view.gesture?.type === 'pan' && view.scale > 1.01) {
          view.x = view.gesture.x + event.clientX - view.gesture.startX;
          view.y = view.gesture.y + event.clientY - view.gesture.startY;
          applyTransform();
          return;
        }

        if (view.gesture?.type === 'dismiss' && view.scale <= 1.01) {
          view.dismissX = event.clientX - view.gesture.startX;
          view.dismissY = event.clientY - view.gesture.startY;
          applyTransform();
        }
      }, { passive: false });

      const finishPointer = (event, cancelled = false) => {
        const finishedGesture = view.gesture;
        view.pointers.delete(event.pointerId);
        const remaining = [...view.pointers.values()][0];
        if (remaining) {
          view.gesture = view.scale > 1.01
            ? { type: 'pan', startX: remaining.x, startY: remaining.y, x: view.x, y: view.y }
            : { type: 'dismiss', startX: remaining.x - view.dismissX, startY: remaining.y - view.dismissY };
          return;
        }
        view.gesture = null;
        if (finishedGesture?.type !== 'dismiss') return;
        const distance = Math.hypot(view.dismissX, view.dismissY);
        const stageRect = stage.getBoundingClientRect();
        const threshold = Math.min(140, Math.max(88, Math.min(stageRect.width, stageRect.height) * 0.18));
        if (!cancelled && distance >= threshold) {
          requestCloseDetailCoverViewer({ restoreFocus: false });
        } else {
          settleDismissBack();
        }
      };
      stage.addEventListener('pointerup', finishPointer);
      stage.addEventListener('pointercancel', event => finishPointer(event, true));
      image.addEventListener('load', applyTransform);
      window.addEventListener('resize', applyTransform);

      overlay.append(stage, closeButton);
      document.body.append(overlay);
      detailCoverViewer = { ...view, resetTransform, close, openFromTrigger, setBackdropStrength };
      return detailCoverViewer;
    }

    function openDetailCoverViewer(album, trigger) {
      if (!CUSTOMER_FEATURES.detailCoverViewer || !String(album?.coverImage || '').trim()) return;
      const viewer = ensureDetailCoverViewer();
      detailCoverViewerTrigger = trigger || null;
      viewer.overlay.setAttribute('aria-label', state.language === 'ko' ? '앨범 커버 크게 보기' : 'Expanded album cover');
      viewer.closeButton.setAttribute('aria-label', state.language === 'ko' ? '커버 크게 보기 닫기' : 'Close expanded cover');
      const triggerImage = trigger?.querySelector('.cover-frame img') || trigger?.querySelector('img');
      viewer.image.src = triggerImage?.currentSrc || triggerImage?.src || String(album.coverImage).trim();
      viewer.image.alt = `${getLocalizedArtist(album) || ''} - ${album.title || ''}`.trim();
      viewer.overlay.hidden = false;
      document.body.classList.add('detail-cover-viewer-open');
      viewer.resetTransform();
      if (CUSTOMER_FEATURES.interactiveCoverViewer) {
        const currentState = history.state && typeof history.state === 'object'
          ? history.state
          : { view: 'detail', albumId: album.id };
        if (!currentState.coverViewer) {
          history.pushState({ ...currentState, view: 'detail', albumId: album.id, coverViewer: true }, '', window.location.href);
        }
        detailCoverViewerHistoryActive = true;
        viewer.openFromTrigger(trigger);
      } else {
        viewer.image.style.opacity = '1';
        viewer.setBackdropStrength(1);
      }
      viewer.closeButton.focus({ preventScroll: true });
    }

    function requestCloseDetailCoverViewer(options = {}) {
      if (!detailCoverViewer || detailCoverViewer.overlay.hidden || detailCoverViewer.overlay.dataset.closing === 'true') return;
      if (CUSTOMER_FEATURES.interactiveCoverViewer && detailCoverViewerHistoryActive) {
        detailCoverViewer.pendingCloseOptions = options;
        history.back();
        return;
      }
      detailCoverViewer.close(options);
    }

    function closeDetailCoverViewer(options = {}) {
      detailCoverViewer?.close(options);
    }

    function waitForTransitionCoverImage(destination, timeout = 1600) {
      const image = destination?.querySelector('img');
      if (!image) return Promise.resolve();
      const loaded = image.complete
        ? Promise.resolve()
        : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      const ready = loaded.then(() => {
        if (typeof image.decode !== 'function' || !image.naturalWidth) return undefined;
        return image.decode().catch(() => undefined);
      });
      return Promise.race([
        ready,
        new Promise(resolve => window.setTimeout(resolve, timeout)),
      ]);
    }

    const transitionCoverPreloads = new Map();

    function preloadTransitionCover(album, preferredSource = '') {
      const source = String(preferredSource || getComparisonCoverSource(album)).trim();
      if (!source) return Promise.resolve();
      if (transitionCoverPreloads.has(source)) return transitionCoverPreloads.get(source);

      const promise = new Promise(resolve => {
        const image = new Image();
        const finish = () => {
          if (typeof image.decode !== 'function' || !image.naturalWidth) {
            resolve();
            return;
          }
          image.decode().catch(() => undefined).then(resolve);
        };
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', resolve, { once: true });
        image.src = source;
        if (image.complete) finish();
      });
      transitionCoverPreloads.set(source, promise);
      return promise;
    }

    function upgradeDetailCoverWithoutFlash(destination, currentImage, originalSource, coverReady) {
      if (!destination || !currentImage || !originalSource) return;

      const getAbsoluteUrl = value => {
        try {
          return new URL(value, document.baseURI).href;
        } catch (error) {
          return String(value || '');
        }
      };
      const currentSource = currentImage.currentSrc || currentImage.src || '';
      if (getAbsoluteUrl(currentSource) === getAbsoluteUrl(originalSource)) return;

      // 목록 썸네일을 먼저 그대로 보여주고, 원본이 완전히 준비된 뒤 위에 겹쳐 교체해 빈 프레임을 막습니다.
      Promise.resolve(coverReady).then(() => {
        if (!destination.isConnected || destination.querySelector('img') !== currentImage) return;

        const upgradedImage = new Image();
        upgradedImage.className = `${currentImage.className || ''} cover-quality-upgrade`.trim();
        upgradedImage.alt = currentImage.alt || '';
        upgradedImage.loading = 'eager';
        upgradedImage.decoding = 'async';
        upgradedImage.fetchPriority = 'high';
        upgradedImage.draggable = false;
        let started = false;

        const revealUpgrade = () => {
          if (started) return;
          started = true;
          const decoded = typeof upgradedImage.decode === 'function'
            ? upgradedImage.decode().catch(() => undefined)
            : Promise.resolve();
          decoded.then(() => {
            if (!upgradedImage.naturalWidth || !destination.isConnected || destination.querySelector('img') !== currentImage) return;
            destination.append(upgradedImage);

            const finishUpgrade = () => {
              if (!upgradedImage.isConnected) return;
              currentImage.remove();
              upgradedImage.classList.remove('cover-quality-upgrade', 'is-ready');
            };
            upgradedImage.addEventListener('transitionend', finishUpgrade, { once: true });
            requestAnimationFrame(() => upgradedImage.classList.add('is-ready'));
            window.setTimeout(finishUpgrade, 240);
          });
        };

        upgradedImage.addEventListener('load', revealUpgrade, { once: true });
        upgradedImage.addEventListener('error', () => upgradedImage.remove(), { once: true });
        upgradedImage.src = originalSource;
        if (upgradedImage.complete) revealUpgrade();
      });
    }

    async function animateDirectCoverIntoDetail(album, transitionSource, commitDetailOpen) {
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

      const instantMotion = CUSTOMER_FEATURES.instantCoverMotion && CUSTOMER_FEATURES.instantDetailContinuity;
      const sourceImage = transitionSource.querySelector('img');
      const sourceImageUrl = sourceImage?.currentSrc || sourceImage?.src || '';
      const sharpTransition = instantMotion && CUSTOMER_FEATURES.sharpDetailCoverTransition && Boolean(sourceImage);
      const originalSource = String(album?.coverImage || '').trim();
      const transitionImageUrl = sharpTransition && originalSource ? originalSource : sourceImageUrl;
      const coverReady = preloadTransitionCover(album, transitionImageUrl);
      const sourceBorderRadius = getComputedStyle(transitionSource).borderRadius || '0px';
      const backdrop = instantMotion ? document.createElement('div') : null;
      if (backdrop) {
        backdrop.className = 'cover-transition-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.append(backdrop);
      }
      document.documentElement.classList.add('is-cover-zoom-running');

      const createTransitionClone = ({ rect, imageSource = sourceImageUrl, transform = 'none', borderRadius = sourceBorderRadius }) => {
        const clone = transitionSource.cloneNode(true);
        clone.querySelectorAll('.album-card-new, .weekly-motion-indicator').forEach(element => element.remove());
        clone.className = 'cover-transition-clone';
        const cloneImage = clone.querySelector('img');
        if (cloneImage && imageSource) {
          cloneImage.src = imageSource;
          cloneImage.loading = 'eager';
          cloneImage.decoding = 'sync';
          cloneImage.fetchPriority = 'high';
        }
        Object.assign(clone.style, {
          position: 'fixed',
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          margin: '0',
          borderRadius,
          transform,
          transformOrigin: 'top left',
          zIndex: '1000',
          pointerEvents: 'none',
          willChange: 'transform, border-radius, border-width, box-shadow',
        });
        return clone;
      };

      if (instantMotion) {
        // 상세 화면을 같은 프레임에 준비한 뒤 목록 위치에서 상세 커버 위치까지 한 번에 이동합니다.
        commitDetailOpen(true);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        const detailRoot = view.detailViewLayer?.isConnected ? view.detailViewLayer : app;
        const destination = detailRoot.querySelector('[data-detail-cover] .cover-frame');
        const detailPage = detailRoot.querySelector('.detail-page');
        if (!destination) {
          backdrop?.remove();
          document.documentElement.classList.remove('is-cover-zoom-running');
          activatePersistentDetailView();
          return;
        }

        destination.style.visibility = 'hidden';
        const destinationImage = destination.querySelector('img');
        if (transitionImageUrl && destinationImage) {
          destinationImage.src = transitionImageUrl;
          destinationImage.loading = 'eager';
          destinationImage.decoding = 'sync';
          destinationImage.fetchPriority = 'high';
        }

        const destinationRect = destination.getBoundingClientRect();
        if (!destinationRect.width || !destinationRect.height) {
          backdrop?.remove();
          destination.style.visibility = '';
          document.documentElement.classList.remove('is-cover-zoom-running');
          activatePersistentDetailView();
          return;
        }

        const sourceStyle = getComputedStyle(transitionSource);
        const destinationStyle = getComputedStyle(destination);
        const destinationRadius = destinationStyle.borderRadius || '6px';
        const sourceShadow = sourceStyle.boxShadow || 'none';
        const destinationShadow = destinationStyle.boxShadow || 'none';
        const sourceScaleX = sourceRect.width / destinationRect.width;
        const sourceScaleY = sourceRect.height / destinationRect.height;
        const sourceScale = Math.max(0.01, Math.min(sourceScaleX, sourceScaleY));
        const sourceRadiusValue = Number.parseFloat(sourceBorderRadius) || 0;
        const destinationRadiusValue = Number.parseFloat(destinationRadius) || 0;
        const sourceBorderWidth = Number.parseFloat(sourceStyle.borderTopWidth) || 0;
        const destinationBorderWidth = Number.parseFloat(destinationStyle.borderTopWidth) || 0;
        const sharpInitialTransform = `translate3d(${sourceRect.left - destinationRect.left}px, ${sourceRect.top - destinationRect.top}px, 0) scale(${sourceScaleX}, ${sourceScaleY})`;
        const regularFinalTransform = `translate3d(${destinationRect.left - sourceRect.left}px, ${destinationRect.top - sourceRect.top}px, 0) scale(${destinationRect.width / sourceRect.width}, ${destinationRect.height / sourceRect.height})`;

        // 상세 커버 자체를 목록 위치에 축소해 둔 뒤 펼칩니다.
        // 별도 복제본을 상세 커버로 교체하지 않으므로 마지막 프레임의 미세한 위치 변경도 생기지 않습니다.
        let clone = null;
        const movingCover = sharpTransition
          ? destination
          : createTransitionClone({ rect: sourceRect });
        if (sharpTransition) {
          Object.assign(destination.style, {
            visibility: '',
            transform: sharpInitialTransform,
            transformOrigin: 'top left',
            borderRadius: `${sourceRadiusValue / sourceScale}px`,
            borderWidth: `${sourceBorderWidth / sourceScale}px`,
            borderColor: sourceStyle.borderColor,
            boxShadow: sourceShadow,
            willChange: 'transform, border-radius, border-width, box-shadow',
            zIndex: '1000',
          });
        } else {
          clone = movingCover;
          document.body.append(clone);
        }
        movingCover.getBoundingClientRect();

        const upgradeDestinationCover = () => {
          if (USES_SHARED_HIGH_QUALITY_COVERS) return;
          upgradeDetailCoverWithoutFlash(destination, destinationImage, originalSource, coverReady);
        };
        let revealed = false;
        let coverAnimation = null;
        const revealDetail = () => {
          if (revealed) return;
          revealed = true;
          clone?.remove();
          coverAnimation?.cancel();
          backdrop?.remove();
          Object.assign(destination.style, {
            visibility: '',
            transform: '',
            transformOrigin: '',
            borderRadius: '',
            borderWidth: '',
            borderColor: '',
            boxShadow: '',
            transition: '',
            willChange: '',
            zIndex: '',
          });
          document.documentElement.classList.remove('is-cover-zoom-running');
          activatePersistentDetailView();
          detailPage?.classList.add('is-cover-zoom-revealing');
          upgradeDestinationCover();
          window.setTimeout(() => detailPage?.classList.remove('is-cover-zoom-revealing'), 220);
        };
        const coverKeyframes = sharpTransition
          ? [
            {
              transform: sharpInitialTransform,
              borderRadius: `${sourceRadiusValue / sourceScale}px`,
              borderWidth: `${sourceBorderWidth / sourceScale}px`,
              borderColor: sourceStyle.borderColor,
              boxShadow: sourceShadow,
            },
            {
              transform: 'translate3d(0, 0, 0) scale(1, 1)',
              borderRadius: `${destinationRadiusValue}px`,
              borderWidth: `${destinationBorderWidth}px`,
              borderColor: destinationStyle.borderColor,
              boxShadow: destinationShadow,
            },
          ]
          : [
            {
              transform: 'translate3d(0, 0, 0) scale(1)',
              borderRadius: sourceBorderRadius,
              boxShadow: sourceShadow,
            },
            {
              transform: regularFinalTransform,
              borderRadius: destinationRadius,
              boxShadow: destinationShadow,
            },
          ];
        const motionDuration = 420;
        if (typeof movingCover.animate === 'function') {
          coverAnimation = movingCover.animate(coverKeyframes, {
            duration: motionDuration,
            easing: 'cubic-bezier(0.22, 0.72, 0.18, 1)',
            fill: 'forwards',
          });
          coverAnimation.finished.then(revealDetail).catch(revealDetail);
        } else {
          // 일부 인앱 브라우저에서는 Web Animations API가 없어 같은 움직임을 CSS transition으로 실행합니다.
          movingCover.style.transition = [
            `transform ${motionDuration}ms cubic-bezier(0.22, 0.72, 0.18, 1)`,
            `border-radius ${motionDuration}ms ease`,
            `border-width ${motionDuration}ms ease`,
            `border-color ${motionDuration}ms ease`,
            `box-shadow ${motionDuration}ms ease`,
          ].join(', ');
          requestAnimationFrame(() => {
            movingCover.style.transform = sharpTransition ? 'translate3d(0, 0, 0) scale(1, 1)' : regularFinalTransform;
            movingCover.style.borderRadius = destinationRadius;
            movingCover.style.borderWidth = `${destinationBorderWidth}px`;
            movingCover.style.borderColor = destinationStyle.borderColor;
            movingCover.style.boxShadow = destinationShadow;
          });
          movingCover.addEventListener('transitionend', event => {
            if (event.propertyName === 'transform') revealDetail();
          });
        }
        window.setTimeout(revealDetail, 540);
        return;
      }

      const clone = createTransitionClone({ rect: sourceRect });
      document.body.append(clone);
      clone.getBoundingClientRect();

      commitDetailOpen(true);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const detailRoot = view.detailViewLayer?.isConnected ? view.detailViewLayer : app;
      const destination = detailRoot.querySelector('[data-detail-cover] .cover-frame');
      const detailPage = detailRoot.querySelector('.detail-page');
      if (!destination) {
        clone.remove();
        backdrop?.remove();
        document.documentElement.classList.remove('is-cover-zoom-running');
        activatePersistentDetailView();
        return;
      }

      destination.style.visibility = 'hidden';
      const destinationImage = destination.querySelector('img');
      if (instantMotion && sourceImageUrl && destinationImage) {
        // 현재 화면에서 이미 디코딩된 썸네일을 그대로 사용해 클릭 다음 프레임부터 이동합니다.
        destinationImage.src = sourceImageUrl;
        destinationImage.loading = 'eager';
        destinationImage.decoding = 'sync';
        destinationImage.fetchPriority = 'high';
      } else {
        await Promise.all([
          coverReady,
          waitForTransitionCoverImage(destination, 4000),
        ]);
      }

      const destinationRect = destination.getBoundingClientRect();
      if (!destinationRect.width || !destinationRect.height) {
        clone.remove();
        backdrop?.remove();
        destination.style.visibility = '';
        document.documentElement.classList.remove('is-cover-zoom-running');
        activatePersistentDetailView();
        return;
      }

      const inverseTransform = `translate3d(${sourceRect.left - destinationRect.left}px, ${sourceRect.top - destinationRect.top}px, 0) scale(${sourceRect.width / destinationRect.width}, ${sourceRect.height / destinationRect.height})`;
      const destinationRadius = getComputedStyle(destination).borderRadius || '8px';
      destination.style.visibility = '';
      destination.style.transformOrigin = 'top left';
      destination.style.willChange = 'transform, border-radius, box-shadow';

      const upgradeDestinationCover = () => {
        const originalSource = String(album?.coverImage || '').trim();
        if (!instantMotion || !destinationImage || !originalSource) return;
        coverReady.then(() => {
          if (!destination.isConnected || destination.querySelector('img') !== destinationImage) return;
          destinationImage.src = originalSource;
          destinationImage.loading = 'eager';
          destinationImage.decoding = 'async';
          destinationImage.fetchPriority = 'high';
        });
      };

      let revealed = false;
      const revealDetail = () => {
        if (revealed) return;
        revealed = true;
        clone.remove();
        backdrop?.remove();
        destination.style.visibility = '';
        destination.style.transform = '';
        destination.style.transformOrigin = '';
        destination.style.willChange = '';
        destination.style.transition = '';
        document.documentElement.classList.remove('is-cover-zoom-running');
        activatePersistentDetailView();
        detailPage?.classList.add('is-cover-zoom-revealing');
        upgradeDestinationCover();
        window.setTimeout(() => detailPage?.classList.remove('is-cover-zoom-revealing'), 360);
      };

      const motionDuration = instantMotion ? 440 : 520;

      if (typeof destination.animate === 'function') {
        const coverAnimation = destination.animate([
          {
            transform: inverseTransform,
            borderRadius: sourceBorderRadius,
            boxShadow: '0 5px 16px rgba(0, 0, 0, 0.28)',
          },
          {
            transform: 'translate3d(0, 0, 0) scale(1, 1)',
            borderRadius: destinationRadius,
            boxShadow: '0 22px 48px rgba(0, 0, 0, 0.42)',
          },
        ], {
          duration: motionDuration,
          easing: 'cubic-bezier(0.22, 0.72, 0.18, 1)',
          fill: 'forwards',
        });
        clone.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: instantMotion ? 60 : 90,
          easing: 'ease-out',
          fill: 'forwards',
        });
        coverAnimation.finished.then(revealDetail).catch(revealDetail);
        window.setTimeout(revealDetail, motionDuration + 180);
        return;
      }

      destination.style.transform = inverseTransform;
      destination.style.borderRadius = sourceBorderRadius;
      destination.style.boxShadow = '0 5px 16px rgba(0, 0, 0, 0.28)';
      destination.getBoundingClientRect();
      destination.style.transition = `transform ${motionDuration}ms cubic-bezier(0.22, 0.72, 0.18, 1), border-radius ${motionDuration}ms ease, box-shadow ${motionDuration}ms ease`;
      clone.style.transition = `opacity ${instantMotion ? 60 : 90}ms ease-out`;
      clone.style.opacity = '0';
      requestAnimationFrame(() => {
        destination.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
        destination.style.borderRadius = destinationRadius;
        destination.style.boxShadow = '0 22px 48px rgba(0, 0, 0, 0.42)';
      });
      window.setTimeout(revealDetail, motionDuration + 100);
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
        activatePersistentDetailView();
        return;
      }

      destination.style.visibility = 'hidden';
      const translateX = destinationRect.left - sourceRect.left;
      const translateY = destinationRect.top - sourceRect.top;
      const scaleX = destinationRect.width / sourceRect.width;
      const scaleY = destinationRect.height / sourceRect.height;
      let cleaned = false;
      const finish = async () => {
        if (cleaned) return;
        cleaned = true;
        const detailPage = app.querySelector('.detail-page');

        if (CUSTOMER_FEATURES.seamlessCoverTransitions) {
          // 실제 상세 커버가 디코딩될 때까지 움직인 커버를 목적지에 그대로 둡니다.
          await waitForTransitionCoverImage(destination);
          destination.style.visibility = '';
          destination.style.opacity = '0';
          destination.style.transition = 'none';
          detailPage?.classList.add('is-cover-zoom-revealing');
          document.documentElement.classList.remove('is-cover-zoom-running');
          destination.getBoundingClientRect();
          destination.style.transition = 'opacity 120ms ease-out';
          destination.style.opacity = '1';

          if (typeof clone.animate === 'function') {
            const handoff = clone.animate([
              { opacity: 1 },
              { opacity: 0 },
            ], {
              duration: 120,
              easing: 'ease-out',
              fill: 'forwards',
            });
            await Promise.race([
              handoff.finished.catch(() => undefined),
              new Promise(resolve => window.setTimeout(resolve, 180)),
            ]);
          } else {
            clone.style.transition = 'opacity 120ms ease-out';
            clone.style.opacity = '0';
            await new Promise(resolve => window.setTimeout(resolve, 140));
          }

          clone.remove();
          destination.style.opacity = '';
          destination.style.transition = '';
          activatePersistentDetailView();
          window.setTimeout(() => detailPage?.classList.remove('is-cover-zoom-revealing'), 360);
          return;
        }

        clone.remove();
        destination.style.visibility = '';
        document.documentElement.classList.remove('is-cover-zoom-running');
        activatePersistentDetailView();
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


    function setupWeeklyMotion(card, album) {
      const video = card?.querySelector('[data-weekly-motion-video]');
      const scrim = card?.querySelector('[data-weekly-motion-scrim]');
      const indicator = card?.querySelector('[data-weekly-motion-indicator]');
      const videoPath = String(album?.weeklyVideo || '').trim();
      const enabled = videoPath
        && video
        && scrim
        && indicator;

      if (!enabled) {
        return {
      shouldSuppressClick: () => false,
    };
      }

      video.src = videoPath;
      video.poster = String(album.weeklyVideoPoster || album.coverImage || '').trim();
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
      card.setAttribute('aria-label', `${album.title || t('weeklyAlbum')}: ${t('details')} · ${t('weeklyHoldLabel')}`);
      indicator.title = t('weeklyHoldLabel');
      video.load();

      let activeInteraction = null;
      const holdGestureMs = 300;
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
        const heldLongEnough = performance.now() - activeInteraction.startedAt >= holdGestureMs;
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

          const heldLongEnough = performance.now() - activeInteraction.startedAt >= holdGestureMs;
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
            && performance.now() - activeInteraction.startedAt >= holdGestureMs) {
            armClickSuppression();
            return true;
          }
          if (!suppressNextClick) return false;
          clearClickSuppression();
          return true;
        },
      };
    }
    function handleCoverPopState() {
      // 커버 크게 보기는 상세 페이지 위의 한 단계이므로, 뒤로가기는 먼저 뷰어만 닫습니다.
      if (CUSTOMER_FEATURES.interactiveCoverViewer && detailCoverViewer && !detailCoverViewer.overlay.hidden) {
        const closeOptions = detailCoverViewer.pendingCloseOptions || {};
        detailCoverViewer.pendingCloseOptions = null;
        closeDetailCoverViewer({ ...closeOptions, animate: true });
        return true;
      }
      return false;
    }

    return {
      createFallbackCover, createCover, getComparisonCoverSource, getOptimizedCoverPath,
      closeDetailCoverViewer, openDetailCoverViewer, requestCloseDetailCoverViewer, animateDirectCoverIntoDetail,
      animateCoverIntoDetail, preloadTransitionCover, setupWeeklyMotion, handleCoverPopState,
    };
  };
})();
