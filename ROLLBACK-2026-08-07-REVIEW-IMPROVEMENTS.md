# 2026-08-07 개선 항목 되돌리기

이번에 적용한 2~8번은 서로 독립적으로 끌 수 있습니다. 나중에 마음에 들지 않는 항목 번호를 말해주면 아래 스위치 하나만 `true`에서 `false`로 바꾸면 됩니다.

## 관리자 페이지

`admin.js` 맨 위의 `ADMIN_FEATURES`에서 변경합니다.

- 2번, 왼쪽 음반 목록 가로 밀림 방지: `sidebarWidthFix`
- 3번, 하단 저장 바의 MYBOX 연결 상태 정확히 표시: `accurateStickySaveStatus`
- 5번, 기본 정보 / Apple 검색 / 커버 / 트랙 / 설명 바로가기: `sectionJumpNav`

## 손님 페이지

`app.js` 맨 위의 `CUSTOMER_FEATURES`에서 변경합니다.

- 4번, 금주의 음반과 상세 커버 우선 로딩: `priorityCovers`
- 6번, 곡 단위 신청곡 메모와 커버가 보이는 신청곡 메모 화면: `requestTrackList`
- 7번, 누른 위치의 커버가 상세 커버 자리까지 확대되는 전환 효과: `coverTransitions`
- 8번, 작은 안내 문구와 보조 정보의 명암 강화: `higherContrast`
- 상세 화면 상단 중앙의 작은 로고: `compactDetailHeader`

## 2026-08-07 저녁 추가 개선

아래 항목도 서로 독립적입니다.

- 상세 커버 전체 화면 보기: `app.js`의 `detailCoverViewer`
- 모바일 목록이 손가락을 따라 움직이고 페이지 교체 없이 이어지는 전환: `app.js`의 `smoothSwipeTracking`
- 목록 커버가 상세 커버에 도착할 때 깜빡이지 않는 인계: `app.js`의 `seamlessCoverTransitions`
- 관리자 상단의 안내·잠금·점검 패널 접기: `admin.js`의 `compactUtilityPanels`

원하는 항목만 `true`에서 `false`로 바꾸면 나머지를 유지한 채 해당 기능만 이전 방식으로 되돌릴 수 있습니다.

이번 수정 직전 파일은 다음 MYBOX 백업 폴더에도 보관되어 있습니다.

`N:\개인\Punch-drunk Archive Backups\2026-08-07-212109-cover-viewer-smooth-motion-admin-compact`

예를 들어 신청 후보 기능만 빼려면 다음처럼 바꿉니다.

```js
requestTrackList: false,
```

다른 항목은 `true`인 채로 두면 그대로 유지됩니다.

## 2026-08-07 지속형 화면 전환

깜빡임을 없애기 위해 추가한 구조 변경도 `app.js` 맨 위에서 각각 되돌릴 수 있습니다.

- 모바일 목록을 교체하지 않는 네이티브 가로 스크롤: `nativeMobilePager`
- 음반 목록을 지우지 않고 상세 화면과 함께 유지하는 이중 레이어: `persistentDetailLayers`
- 목록과 상세 화면을 한 장면처럼 직접 이어 주는 커버 전환: `directCoverTransition`

세 항목을 모두 이전 방식으로 되돌리려면 다음처럼 바꿉니다.

```js
nativeMobilePager: false,
persistentDetailLayers: false,
directCoverTransition: false,
```

이번 구조 변경 직전 파일은 다음 MYBOX 백업 폴더에 있습니다.

`N:\개인\Punch-drunk Archive Backups\2026-08-07-before-persistent-mobile-navigation`

## 2026-08-07 즉시 커버 전환과 연속 목록 간격

이번에 추가한 두 항목도 `app.js` 맨 위에서 서로 따로 되돌릴 수 있습니다.

- 터치 직후 썸네일 커버를 먼저 움직이고 원본 커버는 뒤에서 교체하는 전환: `instantCoverMotion`
- 앞 페이지 마지막 음반과 다음 페이지 첫 음반 사이에도 일반 음반과 같은 간격을 두는 기능: `continuousPagerGutters`

예를 들어 커버 전환만 이전 방식으로 되돌리려면 다음처럼 바꿉니다.

```js
instantCoverMotion: false,
continuousPagerGutters: true,
```

이번 수정 직전 전체 파일은 다음 MYBOX 백업 폴더에 있습니다.

`N:\개인\Punch-drunk Archive Backups\2026-08-07-before-instant-cover-continuous-pager`

## 참고

- 신청곡 메모는 손님의 현재 브라우저에만 저장되며 자동으로 신청되지 않습니다. 손님이 신청 용지에 직접 옮겨 적어야 합니다.
- 전환 효과는 손님이 누른 커버의 위치에서 상세 화면의 큰 커버 자리까지 직접 이동하며 확대됩니다.
- 움직임 줄이기를 설정한 기기에서는 전환 효과가 거의 생략됩니다.
- Netlify용 별도 파일이나 ZIP은 만들지 않습니다.
