/* Archive feature module: createSearch. No build step is required. */
(() => {
  const archive = window.PD_ARCHIVE = window.PD_ARCHIVE || {};
  archive.createSearch = function ({
    albums, state, CUSTOMER_CONFIG, t,
  }) {
    function normalize(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s\-_.:;,'"!?’‘“”()[\]{}]+/g, '')
        .trim();
    }

    function getLocalizedArtist(album) {
      const original = String(album?.artist || '').trim();
      const artistKo = String(album?.artistKo || '').trim();
      const artistEn = String(album?.artistEn || '').trim();
      if (artistKo && artistEn) return state.language === 'en' ? artistEn : artistKo;
      return original;
    }

    function getArtistKey(album) {
      return normalize(album?.artistKo || album?.artistEn || album?.artist).normalize('NFC');
    }

    function getSearchTerms(query = state.query) {
      return String(query || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .normalize('NFC')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }

    function matchesSearch(value, terms) {
      if (!terms.length) return true;
      const words = getSearchTerms(value);
      const compactText = words.join('');
      return terms.every(term => {
        // 한글·일본어처럼 단어 안에서 이어 쓰는 언어는 부분 검색을 유지합니다.
        // 영문·숫자는 단어 앞부분부터 찾습니다. "no"는 "known"에 걸리지 않습니다.
        const containsCjk = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u9fff\uac00-\ud7a3]/u.test(term);
        return containsCjk
          ? words.some(word => word.includes(term)) || compactText.includes(term)
          : words.some(word => word.startsWith(term));
      });
    }

    function getAlbumArtistSearchText(album) {
      const ids = new Set(getAlbumArtistCredits(album).map(credit => credit.id));
      [...ids].forEach(id => (artistById.get(id)?.members || []).forEach(memberId => ids.add(memberId)));
      const names = [...ids].flatMap(id => {
        const identity = artistById.get(id);
        return identity ? [identity.ko, identity.en, ...(identity.aliases || [])] : [];
      });
      return [album.artist, album.artistKo, album.artistEn, getLocalizedArtist(album), ...names]
        .filter(Boolean).join(' ');
    }

    function getAlbumSearchMetadata(album) {
      return [album.title, getAlbumArtistSearchText(album)].filter(Boolean).join(' ');
    }

    function getAlbumSearchGroups(album) {
      // 여러 검색어는 음반 정보 한 묶음 또는 한 곡 안에서 함께 맞아야 합니다.
      // 서로 다른 곡에서 한 단어씩 발견되는 우연한 결과는 제외합니다.
      const metadata = getAlbumSearchMetadata(album);
      return [
        metadata,
        ...(album.recommendedTracks || []).map(track => `${metadata} ${track}`),
        ...(album.tracklist || []).map(track => `${metadata} ${track}`),
      ];
    }

    function albumMatchesSearch(album, terms) {
      return !terms.length || getAlbumSearchGroups(album).some(value => matchesSearch(value, terms));
    }

    function fieldMatches(value, query) {
      return matchesSearch(value, getSearchTerms(query));
    }

    function getTrackSearchMatches(album, query = state.query) {
      const terms = getSearchTerms(query);
      if (!terms.length) return [];
      const metadata = getAlbumSearchMetadata(album);
      // 음반 정보만으로 검색어가 모두 맞으면 곡 자체의 일치만 표시합니다.
      // 아티스트+곡명 검색은 검색 결과와 동일한 정보 묶음으로 실제 트랙을 찾습니다.
      const metadataOnly = matchesSearch(metadata, terms);
      const matchesTrack = track => matchesSearch(metadataOnly ? track : `${metadata} ${track}`, terms);
      const matchingRecommendations = (album.recommendedTracks || []).filter(matchesTrack);
      return (album.tracklist || []).flatMap((track, index) => {
        const matches = matchesTrack(track)
          || matchingRecommendations.some(recommended => isRecommendedTrack(track, [recommended]));
        return matches ? [{ index, track }] : [];
      });
    }

    function getTrackSearchQuery(album, query = state.query) {
      return getTrackSearchMatches(album, query).length ? String(query).trim() : '';
    }

    function albumHasTrackSearchMatch(album, query = state.query) {
      return Boolean(getTrackSearchQuery(album, query));
    }

    function getSearchMatchType(album) {
      if (!getSearchTerms().length) return '';
      if (fieldMatches(album.title, state.query)) return 'title';
      if (fieldMatches([album.artist, album.artistKo, album.artistEn].join(' '), state.query)) return 'artist';
      if (fieldMatches(getAlbumArtistSearchText(album), state.query)) return 'relatedArtist';
      if (albumHasTrackSearchMatch(album)) return 'tracklist';
      return '';
    }

    function getSearchMatchLabel(album, matchType = getSearchMatchType(album)) {
      const labels = {
        title: 'matchTitle',
        artist: 'matchArtist',
        relatedArtist: 'matchRelatedArtist',
        year: 'matchYear',
        format: 'matchFormat',
        genre: 'matchGenre',
        tracklist: 'matchTracklist',
      };
      return labels[matchType] ? t(labels[matchType]) : '';
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
      return {
      number, title: match[2].trim(),
    };
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

    const artistDirectory = CUSTOMER_CONFIG.artistDirectory || {};
    const artistDefinitions = Array.isArray(artistDirectory.identities) ? artistDirectory.identities : [];
    const artistById = new Map(artistDefinitions.map(identity => [identity.id, identity]));
    const artistAliasToId = new Map();
    artistDefinitions.forEach(identity => {
      [identity.ko, identity.en, ...(identity.aliases || [])].filter(Boolean).forEach(name => {
        artistAliasToId.set(normalize(name).normalize('NFC'), identity.id);
      });
    });
    // 쉼표가 이름의 일부인 경우 먼저 보호한 뒤 공동 명의의 쉼표만 나눕니다.
    const protectedArtistNames = [...new Set(artistDefinitions.flatMap(identity =>
      [identity.ko, identity.en, ...(identity.aliases || [])].filter(name => String(name || '').includes(','))
    ))].sort((a, b) => b.length - a.length);

    function splitArtistNames(value) {
      const text = String(value || '').trim();
      if (!text) return [];
      if (artistAliasToId.has(normalize(text).normalize('NFC'))) return [text];
      const restored = [];
      let safeText = text;
      protectedArtistNames.forEach(name => {
        const pattern = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        safeText = safeText.replace(pattern, match => {
          const index = restored.push(match) - 1;
          return `\uE000${index}\uE001`;
        });
      });
      // 알려진 그룹명은 위에서 보호합니다. 나머지는 공동 명의의 구분자만 나눕니다.
      safeText = safeText.replace(/\s+[x×]\s+/gi, ',').replace(/\s*\/\s+/g, ',');
      const parts = [];
      let part = '';
      let parentheses = 0;
      for (const character of safeText) {
        if (character === '(') parentheses += 1;
        if (character === ')') parentheses = Math.max(0, parentheses - 1);
        if ((character === ',' || character === '&') && parentheses === 0) {
          parts.push(part);
          part = '';
        } else {
          part += character;
        }
      }
      parts.push(part);
      return parts.map(part =>
        part.replace(/\uE000(\d+)\uE001/g, (_, index) => restored[Number(index)] || '').trim()
      ).filter(Boolean);
    }

    // 두 언어의 참여자 수가 같을 때만 서로 연결합니다. 같은 영문명에 서로 다른
    // 한글 표기가 쓰이거나, 일부 음반에 영문명이 없는 경우도 같은 인물로 찾습니다.
    const albumArtistNames = albums.map(album => {
      const ko = splitArtistNames(album.artistKo || album.artist || album.artistEn);
      const en = splitArtistNames(album.artistEn);
      return {
      ko, en: en.length === ko.length ? en : [],
    };
    });
    albumArtistNames.sort((a, b) => Number(Boolean(b.en.length)) - Number(Boolean(a.en.length)));
    albumArtistNames.forEach(({ ko, en }) => ko.forEach((name, index) => {
      const englishName = en[index] || '';
      const key = normalize(name).normalize('NFC');
      const englishKey = normalize(englishName).normalize('NFC');
      const id = artistAliasToId.get(key) || artistAliasToId.get(englishKey) || `name:${englishKey || key}`;
      if (!artistById.has(id)) artistById.set(id, { id, ko: name, en: englishName || name });
      [key, englishKey].filter(Boolean).forEach(alias => {
        if (!artistAliasToId.has(alias)) artistAliasToId.set(alias, id);
      });
    }));

    function getAlbumArtistCredits(album) {
      const override = artistDirectory.creditOverrides?.[album?.id];
      if (Array.isArray(override)) {
        return override.filter(id => artistById.has(id)).map(id => {
          const identity = artistById.get(id);
          return {
      id, ko: identity.ko, en: identity.en || identity.ko,
    };
        });
      }
      const koreanNames = splitArtistNames(album?.artistKo || album?.artist || album?.artistEn);
      const englishNames = splitArtistNames(album?.artistEn);
      return koreanNames.map((name, index) => {
        const englishName = englishNames.length === koreanNames.length ? englishNames[index] : '';
        const id = artistAliasToId.get(normalize(name).normalize('NFC'))
          || artistAliasToId.get(normalize(englishName).normalize('NFC'))
          || `name:${normalize(name).normalize('NFC')}`;
        const identity = artistById.get(id);
        return {
      id, ko: identity?.ko || name, en: identity?.en || englishName || name,
    };
      }).filter(credit => credit.id !== 'name:' && !/^(여러아티스트|variousartists)$/.test(normalize(credit.ko).normalize('NFC')));
    }

    function getArtistChoices(album) {
      const choices = [];
      const seen = new Set();
      const add = credit => {
        if (!credit?.id || seen.has(credit.id)) return;
        seen.add(credit.id);
        choices.push(credit);
      };
      getAlbumArtistCredits(album).forEach(credit => {
        add(credit);
        (artistById.get(credit.id)?.members || []).forEach(id => {
          const identity = artistById.get(id);
          if (identity) add({ id, ko: identity.ko, en: identity.en || identity.ko });
        });
      });
      return choices;
    }

    function getRelatedArtistAlbums(album, artistId = '') {
      const ids = artistId ? [artistId] : getArtistChoices(album).map(choice => choice.id);
      if (!ids.length) return [];
      return albums.filter(item => getAlbumArtistCredits(item).some(credit =>
        ids.includes(credit.id) || (artistById.get(credit.id)?.members || []).some(memberId => ids.includes(memberId))
      ));
    }

    function getArtistAlbums(album) {
      const key = getArtistKey(album);
      if (!key || /^(여러아티스트|variousartists)$/.test(key)) return [];
      return albums.filter(item => getArtistKey(item) === key);
    }


    return {
      normalize, getLocalizedArtist, getArtistKey, getSearchTerms,
      matchesSearch, getAlbumArtistSearchText, getAlbumSearchMetadata, getAlbumSearchGroups,
      albumMatchesSearch, fieldMatches, getTrackSearchMatches, getTrackSearchQuery,
      albumHasTrackSearchMatch, getSearchMatchType, getSearchMatchLabel, stripTrackNumber,
      splitTrackLine, isRecommendedTrack, getAlbumArtistCredits, getArtistChoices,
      getRelatedArtistAlbums, getArtistAlbums,
    };
  };
})();
