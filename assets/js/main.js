(function () {
  var loaded = false;
  var cfg = window.NOVA_TRACKING || {};

  function inject(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function loadTracking() {
    if (loaded) return;
    loaded = true;
    if (!cfg.gtm) return;

    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    inject('https://www.googletagmanager.com/gtm.js?id=' + cfg.gtm);
  }

  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (evt) {
    window.addEventListener(evt, loadTracking, { once: true, passive: true });
  });

  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadTracking, { timeout: 3000 });
  } else {
    setTimeout(loadTracking, 3000);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.nodeType === 3) t = t.parentNode;
    if (!t || t.nodeType !== 1) return;
    var el = t.closest('[data-cta]');
    if (!el) return;
    loadTracking();
    window.dataLayer.push({
      event: el.getAttribute('data-cta'),
      cta_location: el.getAttribute('data-cta-location') || 'unknown',
      page_language: document.documentElement.lang
    });
  });

  var embeds = document.querySelectorAll('[data-embed-src]');
  var formScriptLoaded = false;

  function materializeEmbed(holder) {
    var frame = document.createElement('iframe');
    frame.src = holder.getAttribute('data-embed-src');
    frame.title = holder.getAttribute('data-embed-title') || '';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.minHeight = holder.style.minHeight;
    frame.style.border = '0';
    var formId = holder.getAttribute('data-embed-form-id');
    if (formId) {
      frame.id = 'inline-' + formId;
      frame.setAttribute('data-layout', "{'id':'INLINE'}");
      frame.setAttribute('data-trigger-type', 'alwaysShow');
      frame.setAttribute('data-trigger-value', '');
      frame.setAttribute('data-activation-type', 'alwaysActivated');
      frame.setAttribute('data-activation-value', '');
      frame.setAttribute('data-deactivation-type', 'neverDeactivate');
      frame.setAttribute('data-deactivation-value', '');
      frame.setAttribute('data-form-name', holder.getAttribute('data-embed-form-name') || '');
      frame.setAttribute('data-height', holder.getAttribute('data-embed-height') || '');
      frame.setAttribute('data-layout-iframe-id', 'inline-' + formId);
      frame.setAttribute('data-form-id', formId);
    }
    holder.replaceChildren(frame);
    var script = holder.getAttribute('data-embed-script');
    if (formId && script && !formScriptLoaded) {
      formScriptLoaded = true;
      inject(script);
    }
  }

  if (embeds.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          materializeEmbed(entry.target);
        });
      }, { rootMargin: '800px 0px' });
      embeds.forEach(function (el) { io.observe(el); });
    } else {
      embeds.forEach(function (el) { materializeEmbed(el); });
    }
  }

  var heroVideo = document.querySelector('[data-hero-video]');
  if (heroVideo) {
    var heroEl = null;

    var reducedMotion = function () {
      return document.documentElement.classList.contains('a11y-motion') ||
        !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };

    var mountHeroVideo = function () {
      if (heroEl || reducedMotion()) return;
      var narrow = (window.innerWidth || 1280) < 768;
      var src = narrow ? heroVideo.getAttribute('data-src-mobile') : heroVideo.getAttribute('data-src');
      if (!src) return;

      heroEl = document.createElement('video');
      heroEl.muted = true;
      heroEl.setAttribute('muted', '');
      heroEl.setAttribute('playsinline', '');
      heroEl.setAttribute('loop', '');
      heroEl.setAttribute('autoplay', '');
      heroEl.setAttribute('preload', 'auto');
      heroEl.setAttribute('disablepictureinpicture', '');
      heroEl.setAttribute('disableremoteplayback', '');
      heroEl.setAttribute('aria-hidden', 'true');
      heroEl.setAttribute('tabindex', '-1');
      heroEl.setAttribute('src', src);

      heroEl.addEventListener('playing', function () { heroVideo.classList.add('is-playing'); });
      heroEl.addEventListener('pause', function () { heroVideo.classList.remove('is-playing'); });

      heroVideo.appendChild(heroEl);
      var attempt = heroEl.play && heroEl.play();
      if (attempt && attempt.catch) attempt.catch(function () {  });
    };

    document.addEventListener('visibilitychange', function () {
      if (!heroEl || reducedMotion()) return;
      if (document.visibilityState === 'visible') {
        var p = heroEl.play && heroEl.play();
        if (p && p.catch) p.catch(function () {});
      }
    });

    if ('requestIdleCallback' in window) {
      requestIdleCallback(mountHeroVideo, { timeout: 1200 });
    } else {
      setTimeout(mountHeroVideo, 600);
    }
  }

  var widgetsLoaded = false;
  function loadWidgets() {
    if (widgetsLoaded) return;
    widgetsLoaded = true;

    if (cfg.chatWidgetId) {
      var chat = document.createElement('script');
      chat.src = cfg.chatLoader;
      chat.setAttribute('data-resources-url', cfg.chatResourcesUrl);
      chat.setAttribute('data-widget-id', cfg.chatWidgetId);
      document.head.appendChild(chat);
    }

  }

  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (evt) {
    window.addEventListener(evt, loadWidgets, { once: true, passive: true });
  });

  var header = document.querySelector('[data-header]');
  if (header) {
    var syncHeader = function () {
      if ((window.scrollY || window.pageYOffset || 0) > 12) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', syncHeader, { passive: true });
    syncHeader();
  }

  var drawer = document.querySelector('[data-drawer]');
  var opener = document.querySelector('[data-drawer-open]');
  if (drawer && opener) {
    var panel = drawer.querySelector('.drawer__panel');
    var lastFocus = null;

    var focusables = function () {
      return Array.prototype.slice.call(panel.querySelectorAll(
        'a[href], button, summary, [tabindex]:not([tabindex="-1"])'
      )).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    };

    var openDrawer = function () {
      lastFocus = document.activeElement;
      drawer.classList.add('is-open');
      opener.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-open');
      var close = drawer.querySelector('.drawer__close');
      if (close) setTimeout(function () { close.focus(); }, 60);
    };

    var closeDrawer = function () {
      drawer.classList.remove('is-open');
      opener.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('menu-open');
      if (window.location && window.location.hash === '#site-drawer' && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    opener.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); });
    opener.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); openDrawer(); }
    });

    Array.prototype.forEach.call(drawer.querySelectorAll('[data-drawer-close]'), function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); closeDrawer(); });
    });

    drawer.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.nodeType === 3) t = t.parentNode;
      var link = t && t.closest ? t.closest('a[href]') : null;
      if (link && !link.hasAttribute('data-drawer-close') && drawer.classList.contains('is-open')) {
        var href = link.getAttribute('href') || '';
        if (href.charAt(0) === '#') closeDrawer();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key === 'Escape' || e.key === 'Esc') { closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var items = focusables();
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  var a11yBtn = document.querySelector('[data-a11y-open]');
  var a11yPanel = document.querySelector('[data-a11y-panel]');
  if (a11yBtn && a11yPanel) {
    var root = document.documentElement;
    var A11Y_KEYS = ['contrast', 'links', 'readable', 'spacing', 'motion', 'gray'];
    var TEXT_LEVELS = ['100%', '112%', '125%', '140%'];
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('nova-a11y') || '{}') || {}; } catch (err) { prefs = {}; }

    var save = function () {
      try { localStorage.setItem('nova-a11y', JSON.stringify(prefs)); } catch (err) {  }
    };

    var render = function () {
      var level = prefs.text || 0;
      for (var i = 1; i < TEXT_LEVELS.length; i++) root.classList.remove('a11y-text-' + i);
      if (level > 0) root.classList.add('a11y-text-' + level);
      var out = a11yPanel.querySelector('[data-a11y-text-level]');
      if (out) out.textContent = TEXT_LEVELS[level];

      A11Y_KEYS.forEach(function (k) {
        if (prefs[k]) root.classList.add('a11y-' + k); else root.classList.remove('a11y-' + k);
        var b = a11yPanel.querySelector('[data-a11y-toggle="' + k + '"]');
        if (b) b.setAttribute('aria-pressed', prefs[k] ? 'true' : 'false');
      });

      var vid = document.querySelector('[data-hero-video]');
      if (vid) {
        vid.style.display = prefs.motion ? 'none' : '';
        var v = vid.querySelector('video');
        if (v && prefs.motion && v.pause) v.pause();
      }
    };

    var openA11y = function () {
      a11yPanel.hidden = false;
      root.classList.add('a11y-open');
      a11yBtn.setAttribute('aria-expanded', 'true');
      var first = a11yPanel.querySelector('button');
      if (first) first.focus();
    };

    var closeA11y = function (returnFocus) {
      a11yPanel.hidden = true;
      root.classList.remove('a11y-open');
      a11yBtn.setAttribute('aria-expanded', 'false');
      if (returnFocus) a11yBtn.focus();
    };

    a11yBtn.addEventListener('click', function () {
      if (a11yPanel.hidden) openA11y(); else closeA11y(false);
    });

    a11yPanel.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.nodeType === 3) t = t.parentNode;
      var btn = t && t.closest ? t.closest('button') : null;
      if (!btn) return;

      if (btn.hasAttribute('data-a11y-close')) { closeA11y(true); return; }

      if (btn.hasAttribute('data-a11y-text')) {
        var step = parseInt(btn.getAttribute('data-a11y-text'), 10);
        prefs.text = Math.max(0, Math.min(TEXT_LEVELS.length - 1, (prefs.text || 0) + step));
      } else if (btn.hasAttribute('data-a11y-toggle')) {
        var k = btn.getAttribute('data-a11y-toggle');
        prefs[k] = !prefs[k];
      } else if (btn.hasAttribute('data-a11y-reset')) {
        prefs = {};
      } else {
        return;
      }
      save();
      render();
    });

    document.addEventListener('keydown', function (e) {
      if (!a11yPanel.hidden && (e.key === 'Escape' || e.key === 'Esc')) closeA11y(true);
    });

    document.addEventListener('click', function (e) {
      if (a11yPanel.hidden) return;
      var t = e.target;
      if (t && t.nodeType === 3) t = t.parentNode;
      if (t && t.closest && !t.closest('[data-a11y-panel]') && !t.closest('[data-a11y-open]')) closeA11y(false);
    });

    render();
  }

  var sliders = document.querySelectorAll('[data-slider]');
  Array.prototype.forEach.call(sliders, function (track) {
    var items = track.children;
    if (items.length < 2) return;

    var section = track.closest ? track.closest('section, article') : null;
    var heading = section ? section.querySelector('h2, h1') : null;
    if (!/^(UL|OL)$/.test(track.tagName)) track.setAttribute('role', 'region');
    track.setAttribute('tabindex', '0');
    if (heading && !track.hasAttribute('aria-label')) track.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ' ').trim());

    var dots = document.createElement('div');
    dots.className = 'slider-dots';
    var lang = document.documentElement.lang.indexOf('es') === 0;
    for (var i = 0; i < items.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (lang ? 'Ir a la tarjeta ' : 'Go to card ') + (i + 1) + (lang ? ' de ' : ' of ') + items.length);
      (function (index) {
        b.addEventListener('click', function () {
          var target = items[index];
          track.scrollTo({ left: target.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft || 0), behavior: 'smooth' });
        });
      })(i);
      dots.appendChild(b);
    }
    track.parentNode.insertBefore(dots, track.nextSibling);

    var syncDots = function () {
      var overflows = track.scrollWidth > track.clientWidth + 4;
      dots.style.display = overflows ? '' : 'none';
      if (!overflows) return;
      var pos = track.scrollLeft;
      var active = 0, best = Infinity;
      for (var j = 0; j < items.length; j++) {
        var d = Math.abs(items[j].offsetLeft - track.offsetLeft - pos);
        if (d < best) { best = d; active = j; }
      }
      if (pos + track.clientWidth >= track.scrollWidth - 4) active = items.length - 1;
      Array.prototype.forEach.call(dots.children, function (btn, k) {
        if (k === active) btn.setAttribute('aria-current', 'true'); else btn.removeAttribute('aria-current');
      });
    };

    var pending = false;
    track.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; syncDots(); }, 60);
    }, { passive: true });
    window.addEventListener('resize', syncDots);
    syncDots();
  });

  var lightbox = document.querySelector('[data-lightbox]');
  var galleryLinks = Array.prototype.slice.call(document.querySelectorAll('[data-gallery-item]'));
  if (lightbox && galleryLinks.length && typeof lightbox.showModal === 'function') {
    var lbFigure = lightbox.querySelector('[data-lightbox-figure]');
    var lbCaption = lightbox.querySelector('[data-lightbox-caption]');
    var lbCount = lightbox.querySelector('[data-lightbox-count]');
    var lbOf = lightbox.getAttribute('data-of') || '/';
    var lbImg = document.createElement('img');
    lbImg.className = 'lightbox__img';
    lbImg.alt = '';
    lbImg.decoding = 'async';
    lbFigure.insertBefore(lbImg, lbFigure.firstChild);
    var lbIndex = 0;
    var lbOpener = null;

    var preload = function (i) {
      var link = galleryLinks[(i + galleryLinks.length) % galleryLinks.length];
      var pre = new Image();
      pre.src = link.getAttribute('href');
    };

    var showPhoto = function (i) {
      lbIndex = (i + galleryLinks.length) % galleryLinks.length;
      var link = galleryLinks[lbIndex];
      var thumb = link.querySelector('img');
      var alt = thumb ? thumb.getAttribute('alt') : '';
      var full = link.getAttribute('href');
      var current = lbIndex;
      var ratio = parseFloat(link.getAttribute('data-ratio'));
      if (ratio > 0) lbImg.style.setProperty('--ar', String(ratio));
      if (thumb && thumb.complete && thumb.naturalWidth) {
        lbImg.src = thumb.currentSrc || thumb.src;
        var big = new Image();
        big.onload = function () { if (lbIndex === current) lbImg.src = full; };
        big.src = full;
      } else {
        lbImg.src = full;
      }
      lbImg.alt = alt;
      lbCaption.textContent = alt;
      lbCount.textContent = (lbIndex + 1) + ' ' + lbOf + ' ' + galleryLinks.length;
      preload(lbIndex + 1);
      preload(lbIndex - 1);
    };

    var openLightbox = function (i, opener) {
      lbOpener = opener || null;
      showPhoto(i);
      document.documentElement.classList.add('lightbox-open');
      lightbox.showModal();
    };

    galleryLinks.forEach(function (link, i) {
      link.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
        e.preventDefault();
        openLightbox(i, link);
      });
    });

    lightbox.addEventListener('close', function () {
      document.documentElement.classList.remove('lightbox-open');
      if (lbOpener && lbOpener.focus) lbOpener.focus();
    });

    lightbox.querySelector('[data-lightbox-close]').addEventListener('click', function () { lightbox.close(); });
    lightbox.querySelector('[data-lightbox-prev]').addEventListener('click', function () { showPhoto(lbIndex - 1); });
    lightbox.querySelector('[data-lightbox-next]').addEventListener('click', function () { showPhoto(lbIndex + 1); });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target === lbFigure) lightbox.close();
    });

    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(lbIndex - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(lbIndex + 1); }
    });

    var touchX = null;
    lightbox.addEventListener('touchstart', function (e) {
      touchX = e.touches && e.touches.length === 1 ? e.touches[0].clientX : null;
    }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (touchX === null || !e.changedTouches || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 50) return;
      showPhoto(dx < 0 ? lbIndex + 1 : lbIndex - 1);
    }, { passive: true });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-ba]'), function (frame) {
    var range = frame.querySelector('[data-ba-range]');
    if (!range) return;
    var sync = function () { frame.style.setProperty('--pos', range.value + '%'); };
    range.addEventListener('input', sync);
    sync();
  });

  Array.prototype.forEach.call(document.querySelectorAll('.marquee__track'), function (track) {
    if (track.classList.contains('is-looping')) return;
    var originals = Array.prototype.slice.call(track.children);
    originals.forEach(function (li) {
      var copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      var img = copy.querySelector('img');
      if (img) img.setAttribute('alt', '');
      track.appendChild(copy);
    });
    track.classList.add('is-looping');
  });
})();
