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
      // true면 좌상단, false면 언어 전환 버튼 바로 왼쪽에 배치합니다.
      themeToggleLeftLayout: false,
      // 2026-08-14: 모드를 바꿀 때 색이 부드럽게 이어지는 효과만 따로 켜고 끕니다.
      smoothThemeTransition: true,
      // 2026-08-27: 손님 페이지 한글/영문 UI에 로컬 Pretendard Variable을 사용합니다.
      modernPretendardFont: true,
      // 2026-08-27: 밝은 모드의 파스텔 파랑/빨강이 충분히 보이도록 색 농도를 높입니다.
      strongerDayPastels: true,
      // 2026-08-27: 밝은 모드의 검은 금주의 음반 카드에 파랑/빨강 반사광을 연결합니다.
      weeklyDayColorBridge: true,
      // 2026-08-27: 9장이 차지 않은 마지막 묶음도 한 페이지로 정확히 이동합니다.
      partialAlbumPageFix: true,
    }),
    // 화면에 표시하는 아티스트명은 유지하고, 같은 인물의 다른 표기와 그룹 관계만 연결합니다.
    artistDirectory: Object.freeze({
      identities: Object.freeze([
        { id: 'anderson-paak', ko: '앤더슨 팩', en: 'Anderson .Paak', aliases: ['Anderson.Paak'] },
        { id: 'bruno-mars', ko: '브루노 마스', en: 'Bruno Mars' },
        { id: 'knxwledge', ko: '놀리지', en: 'Knxwledge' },
        { id: 'silk-sonic', ko: '실크 소닉', en: 'Silk Sonic', aliases: ['실크 소닉 (브루노 마스 & 앤더슨 팩)', 'Silk Sonic (Bruno Mars & Anderson .Paak)'], members: ['bruno-mars', 'anderson-paak'] },
        { id: 'nxworries', ko: '노워리스', en: 'NxWorries', aliases: ['노워리스 (앤더슨 팩 & 놀리지)', 'NxWorries (Anderson.Paak & Knxwledge)'], members: ['anderson-paak', 'knxwledge'] },
        { id: 'kanye-west', ko: '칸예 웨스트', en: 'Kanye West' },
        { id: 'kid-cudi', ko: '키드 커디', en: 'Kid Cudi' },
        { id: 'kids-see-ghosts', ko: '키즈 씨 고스트', en: 'KIDS SEE GHOSTS', aliases: ['키즈 씨 고스트 (칸예 웨스트 & 키드 커디)', 'KIDS SEE GHOSTS (Kanye West & Kid Cudi)'], members: ['kanye-west', 'kid-cudi'] },
        { id: 'mf-doom', ko: '엠에프 둠', en: 'MF DOOM', aliases: ['킹 기도라', 'King Geedorah'] },
        { id: 'madlib', ko: '매들립', en: 'Madlib', aliases: ['콰지모토', 'Quasimoto', '콰지모토 (매들립)', 'Quasimoto (Madlib)'] },
        { id: 'madvillain', ko: '매드빌런', en: 'Madvillain', aliases: ['매드빌런 (엠에프 둠 & 매들립)', 'Madvillain (MF DOOM & Madlib)'], members: ['mf-doom', 'madlib'] },
        { id: 'paloalto', ko: '팔로알토', en: 'Paloalto' },
        { id: 'the-quiett', ko: '더콰이엇', en: 'The Quiett' },
        { id: 'p-and-q', ko: '팔로알토 & 더콰이엇', en: 'Paloalto & The Quiett', aliases: ['팔로알토 & 더콰이엇 (P&Q)', 'Paloalto & The Quiett (P&Q)'], members: ['paloalto', 'the-quiett'] },
        { id: 'sik-k', ko: '식케이', en: 'Sik-K' },
        { id: 'haon', ko: '김하온', en: 'HAON', aliases: ['하온'] },
        { id: 'nowimyoung', ko: '나우아임영', en: 'NOWIMYOUNG' },
        { id: 'jmin', ko: '제이민', en: 'JMIN' },
        { id: 'kc', ko: 'KC', en: 'KC', aliases: ['KC (식케이, 김하온, 나우아임영, 제이민)', 'KC (Sik-K, HAON, NOWIMYOUNG, JMIN)'], members: ['sik-k', 'haon', 'nowimyoung', 'jmin'] },
        { id: 'tyler-the-creator', ko: '타일러, 더 크리에이터', en: 'Tyler, The Creator' },
        { id: 'prophet', ko: '프로펫', en: 'Prophet' },
        { id: 'bill-evans', ko: '빌 에반스', en: 'Bill Evans', aliases: ['빌 에반스 트리오', 'Bill Evans Trio'] },
        { id: 'miles-davis', ko: '마일스 데이비스', en: 'Miles Davis', aliases: ['마일스 데이비스 퀸텟', 'Miles Davis Quintet'] },
        { id: 'roy-hargrove', ko: '로이 하그로브', en: 'Roy Hargrove', aliases: ['로이 하그로브 퀸텟', 'Roy Hargrove Quintet'] },
        // 쉼표가 아티스트 이름 자체의 일부인 표기는 공동 명의로 나누지 않습니다.
        { id: 'grover-washington-jr', ko: '그로버 워싱턴 주니어', en: 'Grover Washington, Jr.' },
        { id: 'car-the-garden', ko: '카더가든', en: 'Car, the garden' },
      ]),
      // 쉼표가 이름 자체에 들어간 공동 명의 음반은 참여자를 직접 지정합니다.
      creditOverrides: Object.freeze({
        'album-ms41jv6k': ['tyler-the-creator', 'prophet'],
      }),
    }),
    mobilePagerMedia: '(max-width: 719px), (pointer: coarse) and (max-width: 900px)',
  });
})();
