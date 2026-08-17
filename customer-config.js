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
      // 2026-08-14: 글꼴, 여백, 카드와 상세 화면을 젊고 단정한 디자인으로 바꿉니다.
      modernVisualStyle: true,
      // 2026-08-14: 화면 왼쪽 파랑, 오른쪽 빨강의 은은한 배경만 따로 켜고 끕니다.
      colorFieldBackground: true,
      // 2026-08-14: 해/달 버튼으로 데이 모드와 나이트 모드를 바꿉니다.
      dayNightTheme: true,
      // 2026-08-17: 해/달 대신 전화박스 조명이 켜지고 꺼지는 버튼을 사용합니다.
      themeIllustrationToggle: true,
      // 2026-08-14: 모드를 바꿀 때 색이 부드럽게 이어지는 효과만 따로 켜고 끕니다.
      smoothThemeTransition: true,
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
