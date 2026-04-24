// src/animations.js
// Модуль анімацій — Intersection Observer для fade-in ефектів

/**
 * Ініціалізує спостерігач для плавної появи елементів при прокрутці.
 * @param {string} selector - CSS-селектор для елементів з анімацією
 * @param {object} options - параметри IntersectionObserver
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
 */
function initStickyNav() {
  const nav = document.querySelector('nav[aria-label="Основна навігація"]');
  if (!nav) {
    return;
  }

  const SCROLL_THRESHOLD = 80;

  const handleScroll = () => {
    if (window.scrollY > SCROLL_THRESHOLD) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
}

// Ініціалізація після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
  initFadeInObserver();
  initStickyNav();
});

export { initFadeInObserver, initStickyNav };
