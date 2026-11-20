(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, motion = !!G && !reduce;
  var ROUTES = $$('.view').map(function (v) { return v.dataset.view; });
  var current = null, busy = false, io = null;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function fmt(t) { t = Math.max(0, t || 0); var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function tcode(t) { var s = Math.floor(t), f = Math.floor((t - s) * 30); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return '00:' + p(Math.floor(s / 60)) + ':' + p(s % 60) + ':' + p(f); }

  /* ---------- scroll: progress, header, mobile bar ---------- */
  var prog = $('#prog'), hdr = $('.hdr');
  function onScroll() {
    var h = document.documentElement, max = h.scrollHeight - innerHeight, y = scrollY;
    prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    hdr.classList.toggle('solid', y > 40);
    document.body.classList.toggle('past-hero', y > innerHeight * 0.7);
  }
  addEventListener('scroll', onScroll, { passive: true });


  /* ---------- hero video (responsive source, loading state, timecode) ---------- */
  var hv = $('#hero-v'), heroPoster = $('.opening .poster');
  function heroSrc() { return innerWidth / innerHeight < 0.9 ? 'tall' : 'wide'; }
  function setupHero() {
    if (!hv) return;
    var k = heroSrc();
    if (hv.dataset.cur === k) return;
    hv.dataset.cur = k;
    heroPoster.src = k === 'tall' ? heroPoster.dataset.tall : 'video/hero-wide.jpg';
    var hl = $('#hero-label'), hr = $('#hero-ratio'); if (hl) hl.textContent = k === 'tall' ? 'Fire & Faith' : 'Beauty of Dhoolpet'; if (hr) hr.textContent = k === 'tall' ? '9:16' : '2.20:1';
    if (reduce) return;                       // hold on the poster frame
    hv.classList.remove('ready');
    hv.src = hv.dataset[k];
    hv.addEventListener('canplay', function once() { hv.removeEventListener('canplay', once); hv.classList.add('ready'); var p = hv.play(); if (p && p.catch) p.catch(function () {}); });
    hv.load();
  }
  setupHero();
  addEventListener('resize', function () { clearTimeout(window.__hr); window.__hr = setTimeout(setupHero, 250); });
  var tcEl = $('#hero-tc');
  (function tick() { if (hv && tcEl && current === 'home' && !hv.paused) tcEl.textContent = tcode(hv.currentTime); requestAnimationFrame(tick); })();

  function openingSequence() {
    var name = $('.op-name span');
    if (!motion || !name) return;
    if (!name.dataset.split) {
      name.innerHTML = name.textContent.split('').map(function (c) { return '<span class="ch">' + c + '</span>'; }).join('');
      name.dataset.split = '1';
    }
    var tl = G.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.op-name .ch', { opacity: 0, yPercent: 40, filter: 'blur(8px)', duration: 1.6, stagger: 0.07 }, 0.35)
      .from('.opening [data-in]', { autoAlpha: 0, y: 18, duration: 1.2, stagger: 0.08 }, 0.6);
  }

  /* ---------- reveals ---------- */
  function intro(view) {
    if (!motion) return;
    var t = $$('[data-title-in]', view), ins = $$('[data-in]', view).filter(function (e) { return !e.closest('.opening'); });
    var tl = G.timeline({ defaults: { ease: 'expo.out' } });
    if (t.length) tl.from(t, { autoAlpha: 0, y: 40, filter: 'blur(6px)', duration: 1.4 }, 0.05);
    if (ins.length) tl.from(ins, { autoAlpha: 0, y: 18, duration: 1, stagger: 0.07 }, 0.3);
  }
  function reveals(view) {
    if (io) io.disconnect();
    if (!motion || !('IntersectionObserver' in window)) return;
    var els = $$('[data-in-view], .reveal-up, .fcard, .scene, .logrow, .ph-item', view).filter(function (e) { return !e.closest('.reel-strip'); });
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, fr = el.classList.contains('ph-item') ? $('.fr', el) : null;
        if (fr) {
          G.set(el, { autoAlpha: 1 });
          G.fromTo(fr, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut', clearProps: 'clipPath' });
          G.fromTo($('img', fr), { scale: 1.18 }, { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'transform' });
        } else {
          G.to(el, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    els.forEach(function (el) { G.set(el, el.classList.contains('ph-item') ? { autoAlpha: 0 } : { autoAlpha: 0, y: 30 }); io.observe(el); });
  }


  /* ---------- fit big headings to their space (wide display face) ---------- */
  var FIT = 'h1.disp, h2.disp, h3.disp, .op-name, .folder-txt h3, .opt .disp, .next-film .disp, .fd-hero h1, .scene h2, .fcard h3, .album-t';
  function fitText(root) {
    $$(FIT, root || document).forEach(function (el) {
      if (!el.offsetParent && el !== document.body) return;
      el.style.fontSize = '';
      var w = el.clientWidth; if (!w) return;
      if (el.scrollWidth > w + 1) {
        var fs = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = Math.floor(fs * w / el.scrollWidth * 0.97) + 'px';
      }
    });
  }
  function fitCurrent() { fitText($('.view[data-view="' + current + '"]')); fitText($('.menu')); }
  addEventListener('resize', function () { clearTimeout(window.__ft); window.__ft = setTimeout(fitCurrent, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitCurrent(); });

  /* ---------- router + slate transition ---------- */
  var slate = $('.slate');
  function route() { var h = location.hash.replace('#', ''); return ROUTES.indexOf(h) > -1 ? h : (h ? null : 'home'); }
  function show(name, first) {
    var view = $('.view[data-view="' + name + '"]');
    pauseAll();
    $$('.view').forEach(function (v) { v.hidden = v !== view; });
    document.title = name === 'home' ? 'Kishore — Photographer & Videographer, Hyderabad' : view.dataset.title + ' — Kishore';
    document.body.dataset.route = name;
    var navKey = name.indexOf('film-') === 0 ? 'films' : (name === 'design-system' ? '' : name);
    $$('[data-nav]').forEach(function (a) { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    scrollTo(0, 0); current = name;
    fitText(view);
    if (hv) { if (name === 'home' && !reduce) { var p = hv.play(); if (p && p.catch) p.catch(function () {}); } else hv.pause(); }
    if (!first) $('#main').focus({ preventScroll: true });
    if (name === 'home') openingSequence(); else intro(view);
    reveals(view); onScroll();
  }
  function go(name) {
    if (!name || name === current || busy) return;
    closeMenu(true); closeLb(); exitTheatre();
    if (!motion) { show(name); return; }
    busy = true;
    var v = $('.view[data-view="' + name + '"]');
    $('.sc', slate).textContent = 'SC ' + v.dataset.sc + ' · ' + tcode(performance.now() / 1000 % 60);
    $('.t', slate).textContent = name === 'home' ? 'Home' : v.dataset.title;
    G.timeline({ onComplete: function () { busy = false; } })
      .set($('.bar i', slate), { scaleX: 0 })
      .to(slate, { autoAlpha: 1, duration: 0.45, ease: 'power2.inOut' })
      .from([$('.sc', slate), $('.t', slate)], { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, '-=0.15')
      .to($('.bar i', slate), { scaleX: 1, duration: 0.5, ease: 'power2.inOut' }, '<')
      .add(function () { show(name); })
      .to(slate, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut' }, '+=0.05');
  }
  addEventListener('hashchange', function () {
    var h = location.hash.replace('#', '');
    if (h === 'enquiry') { var e = $('#enquiry'); if (current !== 'contact') { go('contact'); setTimeout(function () { $('#enquiry').scrollIntoView(); }, 1300); } else e.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
    var r = route(); if (r) go(r);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-scroll]'); if (!b) return;
    var t = b.dataset.scroll;
    if (t === 'top') { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    var el = $(t, $('.view[data-view="' + current + '"]')); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- menu ---------- */
  var menu = $('#menu'), mb = $('.menu-btn'), mvid = $('.menu-media video');
  function openMenu() {
    menu.hidden = false; fitText(menu); mb.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('#menu-close').focus();
    if (canHover && mvid && !reduce) { if (!mvid.src) mvid.src = mvid.dataset.src; var p = mvid.play(); if (p && p.catch) p.catch(function () {}); }
    if (motion) { G.from(menu, { autoAlpha: 0, duration: 0.5 }); G.from($$('.menu-links a'), { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', delay: 0.15 }); }
  }
  function closeMenu(silent) { if (menu.hidden) return; menu.hidden = true; mb.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; if (mvid) mvid.pause(); if (!silent) mb.focus(); }
  mb.addEventListener('click', openMenu);
  $('#menu-close').addEventListener('click', function () { closeMenu(); });
  menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); trap(e, menu); });
  $$('.menu-links a').forEach(function (a) { a.addEventListener('click', function () { if (a.getAttribute('href') === '#' + current) closeMenu(); }); });
  function trap(e, root) {
    if (e.key !== 'Tab') return;
    var f = $$('a[href],button,input,textarea,[tabindex]:not([tabindex="-1"])', root).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return; var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }

  /* ---------- film player ---------- */
  var theatre = null;
  function pauseAll(except) { $$('.player video, [data-prev] video').forEach(function (v) { if (v !== except && !v.paused) v.pause(); }); }
  function exitTheatre() { if (theatre) { theatre.classList.remove('theatre'); document.body.style.overflow = ''; theatre = null; } }
  $$('.player').forEach(function (pl) {
    var v = $('video', pl), big = $('.big', pl), pp = $('.p-play', pl), rng = $('input', pl), cur = $('.cur', pl), mute = $('.p-mute', pl), full = $('.p-full', pl);
    var idle;
    function play() { pauseAll(v); pl.classList.add('started'); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    function toggle() { if (v.paused) play(); else v.pause(); }
    big.addEventListener('click', play);
    pp.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    v.addEventListener('play', function () { pl.classList.add('playing'); pp.setAttribute('aria-label', 'Pause'); pp.innerHTML = PAUSE; });
    v.addEventListener('pause', function () { pl.classList.remove('playing'); pp.setAttribute('aria-label', 'Play'); pp.innerHTML = PLAYI; });
    v.addEventListener('timeupdate', function () { var p = v.duration ? v.currentTime / v.duration : 0; rng.value = Math.round(p * 1000); rng.style.setProperty('--p', (p * 100).toFixed(2) + '%'); cur.textContent = fmt(v.currentTime); });
    v.addEventListener('ended', function () { pl.classList.remove('started'); });
    v.addEventListener('error', function () { big.querySelector('.credit').textContent = 'Video could not load — try again'; pl.classList.remove('started'); });
    rng.addEventListener('input', function () { if (v.duration) v.currentTime = rng.value / 1000 * v.duration; });
    mute.addEventListener('click', function () { v.muted = !v.muted; mute.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute'); mute.style.opacity = v.muted ? 0.5 : 1; });
    full.addEventListener('click', function () {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (theatre === pl) { exitTheatre(); return; }
      var ok = false;
      try { if (pl.requestFullscreen) { pl.requestFullscreen().then(function () { ok = true; }, function () { theatre = pl; pl.classList.add('theatre'); document.body.style.overflow = 'hidden'; }); ok = true; } } catch (x) {}
      if (!ok && v.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); ok = true; } catch (x) {} }
      if (!ok) { theatre = pl; pl.classList.add('theatre'); document.body.style.overflow = 'hidden'; }
    });
    pl.addEventListener('keydown', function (e) {
      if (e.target === rng && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      var k = e.key.toLowerCase();
      if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (k === 'm') mute.click(); else if (k === 'f') full.click();
      else if (k === 'arrowright') v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
      else if (k === 'arrowleft') v.currentTime = Math.max(0, v.currentTime - 5);
      else if (k === 'escape') exitTheatre();
    });
    pl.addEventListener('mousemove', function () { pl.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(function () { pl.classList.add('idle'); }, 2200); });
  });
  var PAUSE = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M4 3h3.5v12H4zM10.5 3H14v12h-3.5z"/></svg>';
  var PLAYI = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M5 3l10 6-10 6z"/></svg>';
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-play]'); if (!b) return;
    var pl = document.getElementById(b.dataset.play); if (!pl) return;
    pl.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(function () { $('.big', pl).click(); $('.p-play', pl).focus({ preventScroll: true }); }, reduce ? 0 : 500);
  });

  /* ---------- animated thumbnails (hover preview, muted, lazy) ---------- */
  if (canHover && !reduce) {
    $$('[data-prev]').forEach(function (card) {
      var host = card.classList.contains('media') ? card : $('.fthumb', card), wrap = card.classList.contains('media') ? card.closest('.scene') : card;
      var v = null;
      card.addEventListener('mouseenter', function () {
        if (!v) { v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.setAttribute('aria-hidden', 'true'); v.src = card.dataset.prev; host.insertBefore(v, host.children[1] || null); }
        pauseAll(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); wrap.classList.add('previewing');
      });
      card.addEventListener('mouseleave', function () { if (v) v.pause(); wrap.classList.remove('previewing'); });
    });
  }

  /* ---------- filters ---------- */
  $$('[data-albums]').forEach(function (g) {
    var view = g.closest('.view');
    g.addEventListener('click', function (e) {
      var c = e.target.closest('[data-f]'); if (!c) return;
      $$('[data-f]', g).forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      var f = c.dataset.f, grid = $('[data-items]', view), items = Array.prototype.slice.call(grid.children);
      items.forEach(function (it) { it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f); });
      var now = $('.album-now span', view); if (now) now.textContent = $('.album-t', c).textContent;
      var vis = items.filter(function (it) { return !it.classList.contains('is-hidden'); });
      if (motion) G.fromTo(vis, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.03, ease: 'expo.out' });
      else vis.forEach(function (v) { v.style.opacity = 1; v.style.visibility = 'visible'; });
      var top = $('.album-now', view).getBoundingClientRect().top + scrollY - 110;
      if (scrollY < top - 40 || scrollY > top + 200) scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- lightbox ---------- */
  var lb = $('#lb'), lbImg = $('#lb-img'), list = [], idx = 0, opener = null;
  function render() {
    var k = list[idx], p = PHOTOS[k];
    lbImg.src = 'img/' + k + '.jpg'; lbImg.alt = p.a;
    $('#lb-title').textContent = p.t; $('#lb-meta').textContent = p.m;
    $('#lb-count').textContent = 'FRAME ' + (idx + 1 < 10 ? '0' : '') + (idx + 1) + ' / ' + (list.length < 10 ? '0' : '') + list.length + ' · ' + p.c.toUpperCase();
    if (motion) G.fromTo(lbImg, { autoAlpha: 0, scale: 0.985 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
  }
  function openLb(keys, i, from) { list = keys; idx = Math.max(0, i); opener = from; lb.hidden = false; document.body.style.overflow = 'hidden'; render(); $('#lb-close').focus(); }
  function closeLb() { if (lb.hidden) return; lb.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); }
  function step(d) { idx = (idx + d + list.length) % list.length; render(); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.ph-item');
    if (t) { var scope = t.closest('.ph-grid'); var vis = $$('.ph-item', scope).filter(function (x) { return !x.classList.contains('is-hidden'); }); openLb(vis.map(function (x) { return x.dataset.k; }), vis.indexOf(t), t); return; }
    var s = e.target.closest('[data-set]'); if (s) openLb(s.dataset.set.split(','), 0, s);
  });
  $('#lb-close').addEventListener('click', closeLb);
  $('#lb-prev').addEventListener('click', function () { step(-1); });
  $('#lb-next').addEventListener('click', function () { step(1); });
  lb.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); else trap(e, lb); });
  var tx = 0;
  $('#lb-stage').addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  $('#lb-stage').addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && theatre) exitTheatre(); });

  /* ---------- contact ---------- */
  var HINT = { employment: ['Role and team', 'Role, team, start date, where the work lives…', 'Full-time employment'], freelance: ['Shoot details', 'Date, location, what needs covering, deliverables…', 'Freelance project'], agency: ['Brief', 'Agency, client, deliverables, timeline…', 'Agency opportunity'], brand: ['Brief', 'Brand, product, platforms, film or stills, timeline…', 'Brand collaboration'] };
  var ftype = 'employment';
  function setType(t) { ftype = HINT[t] ? t : 'employment'; $$('#enq .chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.type === ftype ? 'true' : 'false'); }); $('#msg-l').textContent = HINT[ftype][0]; $('#f-msg').placeholder = HINT[ftype][1]; }
  $$('#enq .chip').forEach(function (c) { c.addEventListener('click', function () { setType(c.dataset.type); }); });
  $$('.opt[data-type]').forEach(function (a) { a.addEventListener('click', function () { setType(a.dataset.type); }); });
  $('#enq').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, n = f.name.value.trim(), em = f.email.value.trim(), m = f.message.value.trim(), o = f.org.value.trim();
    if (!n || !m || !/^\S+@\S+\.\S+$/.test(em)) { $('#f-err').textContent = 'Please add your name, a valid email and a short message.'; return; }
    $('#f-err').textContent = '';
    $('#f-out').textContent = 'Hi Kishore,\n\n[' + HINT[ftype][2] + ']' + (o ? ' — ' + o : '') + '\n\n' + m + '\n\n' + n + '\n' + em;
    $('#f-done').hidden = false; $('#f-copy').focus();
  });
  $('#f-copy').addEventListener('click', function () {
    var b = this; try { navigator.clipboard.writeText($('#f-out').textContent).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy message'; }, 1800); }, function () { b.textContent = 'Select the text above to copy'; }); } catch (x) { b.textContent = 'Select the text above to copy'; }
  });

  /* ---------- boot ---------- */
  show(route() || 'home', true);
})();
