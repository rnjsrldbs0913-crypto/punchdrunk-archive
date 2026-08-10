(() => {
  const theme = 'darkbase';

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
  if (themeColor) themeColor.setAttribute('content', '#0c0911');

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
    const centerY = field.y * height + Math.sin(time * field.speed + index) * field.travel * height;
    const thickness = field.thickness * height;
    const slant = Math.sin(time * field.speed * 0.72 + index * 0.7) * width * field.slant;
    const pathThickness = thickness * 4.2;
    const gradientCenterX = width * 0.5;
    const gradientCenterY = centerY + slant * 0.38;
    const normalLength = Math.max(1, Math.hypot(slant, width));
    const normalX = -slant / normalLength;
    const normalY = width / normalLength;
    const fadeRadius = thickness * 1.45;
    const gradient = context.createLinearGradient(
      gradientCenterX - normalX * fadeRadius,
      gradientCenterY - normalY * fadeRadius,
      gradientCenterX + normalX * fadeRadius,
      gradientCenterY + normalY * fadeRadius
    );

    const colorAt = (alpha) => {
      const value = Number.parseInt(field.color.slice(1), 16);
      const red = (value >> 16) & 255;
      const green = (value >> 8) & 255;
      const blue = value & 255;
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    };

    gradient.addColorStop(0, colorAt(0));
    gradient.addColorStop(0.08, colorAt(0));
    gradient.addColorStop(0.28, colorAt(field.alpha * 0.34));
    gradient.addColorStop(0.4, colorAt(field.alpha * 0.9));
    gradient.addColorStop(0.6, colorAt(field.alpha * 0.9));
    gradient.addColorStop(0.72, colorAt(field.alpha * 0.34));
    gradient.addColorStop(0.92, colorAt(0));
    gradient.addColorStop(1, colorAt(0));

    context.save();
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(-width * 0.22, centerY - pathThickness * 0.38 - slant * 0.25);
    context.bezierCurveTo(
      width * 0.16,
      centerY - pathThickness,
      width * 0.62,
      centerY + pathThickness * 0.08,
      width * 1.2,
      centerY - pathThickness * 0.48 + slant
    );
    context.lineTo(width * 1.2, centerY + pathThickness * 0.48 + slant);
    context.bezierCurveTo(
      width * 0.72,
      centerY + pathThickness,
      width * 0.25,
      centerY - pathThickness * 0.06,
      -width * 0.22,
      centerY + pathThickness * 0.42 - slant * 0.25
    );
    context.closePath();
    context.fill();
    context.restore();
  }

  function getFields() {
    return [
      { color: '#ef4858', y: 0.18, thickness: 0.18, speed: 0.8, travel: 0.12, slant: 0.12, alpha: 0.9 },
      { color: '#203d9b', y: 0.43, thickness: 0.21, speed: 0.65, travel: 0.13, slant: 0.18, alpha: 0.88 },
      { color: '#ff7ba7', y: 0.72, thickness: 0.22, speed: 0.55, travel: 0.12, slant: 0.13, alpha: 0.86 },
    ];
  }

  function draw(now = performance.now()) {
    const { width, height, ratio } = fitCanvas();
    const time = now * 0.0002;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#0c0911';
    context.fillRect(0, 0, width, height);
    getFields().forEach((field, index) => drawRibbon(width, height, field, time, index));
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
