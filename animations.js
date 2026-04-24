/**
 * Модуль анімацій для інтерфейсу турнірної платформи.
 * Використовує Intersection Observer API для оптимізації продуктивності.
 */

/**
 * Ініціалізує спостерігач для плавної появи елементів при прокрутці.
 * * @param {string} [selector='.fade-in'] - CSS-селектор для елементів з анімацією.
 * @param {Object} [options={}] - Параметри конфігурації для IntersectionObserver.
 * @returns {IntersectionObserver} Екземпляр спостерігача.
 * @example
 * initFadeInObserver('.card', { threshold: 0.5 });
 */
function initFadeInObserver(selector = '.fade-in', options = {}) {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px',
  };

  const observerOptions = { ...defaultOptions, ...options };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(selector).forEach((el) => {
    observer.observe(el);
  });

  return observer;
}

/**
 * Ініціалізує sticky-навігацію зі зміною стилю при прокрутці.
 * Додає клас 'scrolled', коли користувач прокрутив сторінку вниз.
 * * @returns {void}
 */
function initStickyNav() {
  const nav = document.querySelector('nav[aria-label="Основна навігація"]');
  if (!nav) return;

  const SCROLL_THRESHOLD = 80;

  const handleScroll = () => {
    if (window.scrollY > SCROLL_THRESHOLD) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll);
}