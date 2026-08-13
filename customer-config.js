(() => {
  window.PD_CUSTOMER_CONFIG = Object.freeze({
    features: Object.freeze({
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
      // 원래 디자인: 상단은 인물 없이 중앙 원형 로고를 기본 크기로 표시합니다.
      compactHeaderFigures: false,
      coverTransitionLayerFix: true,
      // 상단 인물 뒤의 파랑/빨강 확장 배경입니다. false로 바꾸면 이 항목만 즉시 되돌아갑니다.
      wideHeaderColorField: false,
    }),
    mobilePagerMedia: '(max-width: 719px), (pointer: coarse) and (max-width: 900px)',
    weeklyMotionTest: Object.freeze({
      enabled: true,
      albumId: 'album-mrdetafz',
      src: 'media/weekly-motion-test.mp4',
      poster: 'media/weekly-motion-test-poster.jpg',
    }),
  });
})();
