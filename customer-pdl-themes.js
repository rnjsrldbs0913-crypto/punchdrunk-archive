(() => {
  const THEMES = new Set(['darkbase', 'scale']);
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('pdl-theme');
  if (!THEMES.has(theme)) return;

  const html = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  let animationFrame = 0;
  let lastFrameAt = 0;

  html.classList.add('pdl-theme-preview', `pdl-theme-${theme}`);
  body.classList.add('pdl-theme-preview', `pdl-theme-${theme}`);
  canvas.className = 'pdl-page-color-field';
  canvas.setAttribute('aria-hidden', 'true');
  body.prepend(canvas);

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', theme === 'scale' ? '#101015' : '#0c0911');

  function fitCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(window.innerWidth * ratio));
    const height = Math.max(1, Math.round(window.innerHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height, ratio };
  }

  function drawRibbon(width, height, field, time, index) {
    const centerY = field.y * height + Math.sin(time * field.speed + index * 1.37) * field.travel * height;
    const centerX = Math.cos(time * field.speed * 0.62 + index) * width * field.drift;
    const thickness = field.thickness * height;
    const bend = Math.sin(time * field.speed * 0.74 + index * 0.83) * width * field.bend;

    context.save();
    context.translate(centerX, 0);
    context.globalAlpha = field.alpha;
    context.fillStyle = field.color;
    context.beginPath();
    context.moveTo(-width * 0.28, centerY - thickness * 0.38 - bend * 0.18);
    context.bezierCurveTo(
      width * 0.14,
      centerY - thickness * 1.05,
      width * 0.62,
      centerY + thickness * 0.14,
      width * 1.28,
      centerY - thickness * 0.45 + bend
    );
    context.lineTo(width * 1.28, centerY + thickness * 0.48 + bend);
    context.bezierCurveTo(
      width * 0.76,
      centerY + thickness * 1.08,
      width * 0.24,
      centerY - thickness * 0.09,
      -width * 0.28,
      centerY + thickness * 0.44 - bend * 0.18
    );
    context.closePath();
    context.fill();
    context.restore();
  }

  function getFields() {
    if (theme === 'scale') {
      return [
        { color: '#ef4858', y: 0.07, thickness: 0.036, speed: 1.08, travel: 0.025, drift: 0.14, bend: 0.42, alpha: 0.94 },
        { color: '#2344a8', y: 0.22, thickness: 0.12, speed: 0.62, travel: 0.065, drift: 0.08, bend: 0.25, alpha: 0.82 },
        { color: '#f2c747', y: 0.35, thickness: 0.018, speed: 1.18, travel: 0.08, drift: 0.17, bend: 0.46, alpha: 0.76 },
        { color: '#ff7ba7', y: 0.5, thickness: 0.22, speed: 0.72, travel: 0.1, drift: 0.1, bend: 0.2, alpha: 0.88 },
        { color: '#3156c6', y: 0.69, thickness: 0.068, speed: 0.94, travel: 0.095, drift: 0.15, bend: 0.34, alpha: 0.9 },
        { color: '#ef4858', y: 0.84, thickness: 0.12, speed: 0.8, travel: 0.07, drift: 0.1, bend: 0.27, alpha: 0.82 },
        { color: '#2344a8', y: 0.98, thickness: 0.16, speed: 0.66, travel: 0.055, drift: 0.08, bend: 0.22, alpha: 0.76 },
      ];
    }

    return [
      { color: '#ef4858', y: 0.065, thickness: 0.046, speed: 0.92, travel: 0.028, drift: 0.12, bend: 0.36, alpha: 0.88 },
      { color: '#2344a8', y: 0.24, thickness: 0.13, speed: 0.62, travel: 0.07, drift: 0.09, bend: 0.24, alpha: 0.78 },
      { color: '#ef4858', y: 0.48, thickness: 0.16, speed: 0.76, travel: 0.08, drift: 0.1, bend: 0.2, alpha: 0.84 },
      { color: '#ff7ba7', y: 0.72, thickness: 0.19, speed: 0.54, travel: 0.07, drift: 0.08, bend: 0.18, alpha: 0.8 },
      { color: '#3156c6', y: 0.94, thickness: 0.11, speed: 0.7, travel: 0.055, drift: 0.12, bend: 0.28, alpha: 0.76 },
    ];
  }

  function draw(now = performance.now()) {
    const { width, height, ratio } = fitCanvas();
    const time = now * 0.00018;
    context.clearRect(0, 0, width, height);
    context.fillStyle = theme === 'scale' ? '#101015' : '#0c0911';
    context.fillRect(0, 0, width, height);
    context.save();
    context.filter = `blur(${Math.round((theme === 'scale' ? 20 : 31) * ratio)}px)`;
    getFields().forEach((field, index) => drawRibbon(width, height, field, time, index));
    context.restore();
  }

  function loop(now) {
    if (now - lastFrameAt >= 32) {
      draw(now);
      lastFrameAt = now;
    }
    animationFrame = window.requestAnimationFrame(loop);
  }

  function start() {
    window.cancelAnimationFrame(animationFrame);
    if (reducedMotion.matches) {
      draw(0);
      return;
    }
    lastFrameAt = 0;
    animationFrame = window.requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => draw());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.cancelAnimationFrame(animationFrame);
    else start();
  });
  reducedMotion.addEventListener?.('change', start);

  window.PD_THEME_PREVIEW = Object.freeze({ theme });
  start();
})();
