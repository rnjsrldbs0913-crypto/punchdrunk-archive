(() => {
  const root = document.documentElement;
  const features = window.PD_CUSTOMER_CONFIG?.features || {};
  const storageKey = 'pd-customer-theme-v1';

  root.classList.toggle('feature-customer-modern-style', features.modernVisualStyle !== false);
  root.classList.toggle('feature-customer-color-field', features.colorFieldBackground !== false);
  root.classList.toggle('feature-customer-day-night', features.dayNightTheme !== false);
  root.classList.toggle('feature-customer-theme-transition', features.smoothThemeTransition !== false);

  function readSavedTheme() {
    if (features.dayNightTheme === false) return 'night';
    try {
      return localStorage.getItem(storageKey) === 'day' ? 'day' : 'night';
    } catch (error) {
      return 'night';
    }
  }

  function getThemeText(theme) {
    const isEnglish = document.documentElement.lang === 'en';
    if (theme === 'day') {
      return isEnglish ? 'Switch to dark mode' : '다크 모드로 변경';
    }
    return isEnglish ? 'Switch to light mode' : '라이트 모드로 변경';
  }

  function updateControl(theme) {
    const button = document.querySelector('[data-customer-theme-toggle]');
    const icon = button?.querySelector('[data-customer-theme-icon]');
    if (!button || !icon) return;
    const label = getThemeText(theme);
    icon.textContent = theme === 'day' ? '☾' : '☀';
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function applyTheme(theme, save = false) {
    const nextTheme = features.dayNightTheme === false || theme !== 'day' ? 'night' : 'day';
    root.dataset.customerTheme = nextTheme;
    root.style.colorScheme = nextTheme === 'day' ? 'light' : 'dark';
    document.querySelector('[data-customer-theme-color]')?.setAttribute('content', nextTheme === 'day' ? '#f3f4f1' : '#07080a');
    updateControl(nextTheme);
    if (!save || features.dayNightTheme === false) return;
    try {
      localStorage.setItem(storageKey, nextTheme);
    } catch (error) {
      // 저장이 막힌 브라우저에서도 현재 화면의 테마 전환은 그대로 작동합니다.
    }
  }

  applyTheme(readSavedTheme());

  document.addEventListener('DOMContentLoaded', () => {
    updateControl(root.dataset.customerTheme || 'night');

    document.querySelector('[data-customer-theme-toggle]')?.addEventListener('click', () => {
      applyTheme(root.dataset.customerTheme === 'day' ? 'night' : 'day', true);
    });

    new MutationObserver(() => updateControl(root.dataset.customerTheme || 'night'))
      .observe(root, { attributes: true, attributeFilter: ['lang'] });
  });
})();
