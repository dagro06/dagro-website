/* ============================================
   DAGRO DIGITAL - Site Config Loader
   Laadt site-config.json en past design + content toe
   ============================================ */

(function() {
  var CACHE_KEY = 'dagro-site-config';
  var CONFIG_URL = '/site-config.json';

  // 1. Pas gecachte config direct toe (voorkomt flash)
  var cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try { applyDesign(JSON.parse(cached)); } catch(e) {}
  }

  // 2. Haal verse config op achtergrond
  fetch(CONFIG_URL + '?t=' + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(config) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(config));
      applyDesign(config);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { applyContent(config); });
      } else {
        applyContent(config);
      }
    })
    .catch(function() {});

  // Pas ook content toe vanuit cache als DOM ready
  if (cached) {
    var cachedConfig = JSON.parse(cached);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { applyContent(cachedConfig); });
    } else {
      applyContent(cachedConfig);
    }
  }

  function applyDesign(config) {
    var root = document.documentElement;

    // Kleuren
    if (config.design && config.design.colors) {
      Object.keys(config.design.colors).forEach(function(prop) {
        root.style.setProperty(prop, config.design.colors[prop]);
      });
    }

    // Fonts
    if (config.design && config.design.fonts) {
      Object.keys(config.design.fonts).forEach(function(prop) {
        root.style.setProperty(prop, config.design.fonts[prop]);
      });
    }

    // Font sizes
    if (config.design && config.design.fontSizes) {
      Object.keys(config.design.fontSizes).forEach(function(tag) {
        root.style.setProperty('--fs-' + tag, config.design.fontSizes[tag]);
      });
    }
  }

  function applyContent(config) {
    var pageKey = getPageKey();

    // Meta tags
    if (config.meta && config.meta[pageKey]) {
      var meta = config.meta[pageKey];
      if (meta.title) document.title = meta.title;
      if (meta.description) {
        var descTag = document.querySelector('meta[name="description"]');
        if (descTag) descTag.setAttribute('content', meta.description);
      }
    }

    // Favicon
    if (config.favicon) {
      var link = document.querySelector('link[rel="icon"]');
      if (link) link.setAttribute('href', config.favicon);
    }

    // Tekst content
    if (config.content && config.content[pageKey]) {
      var pageContent = config.content[pageKey];
      document.querySelectorAll('[data-content]').forEach(function(el) {
        var key = el.getAttribute('data-content');
        if (pageContent[key] !== undefined) {
          el.innerHTML = pageContent[key];
        }
      });
    }
  }

  function getPageKey() {
    var path = window.location.pathname;
    if (path === '/' || path === '/index' || path === '/index.html') return 'index';
    return path.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');
  }
})();
