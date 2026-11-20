(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var hasGsap = typeof window.gsap !== 'undefined';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = hasGsap && !reduce;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var ROUTES = $$('.view').map(function (v) { return v.getAttribute('data-view'); });
  var current = null, triggers = [], busy = false;
  var curtain = $('.curtain'), curtainWord = $('.curtain .d');

  /* ---------------- scroll progress ---------------- */
  var prog = $('#prog');
  function onScroll() {
    var h = document.documentElement, max = h.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    document.body.classList.toggle('past-hero', window.scrollY > 560);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- view animations ---------------- */
  function killTriggers() { triggers.forEach(function (t) { t.kill(); }); triggers = []; if (io) { io.disconnect(); io = null; } }

  function intro(view) {
    if (!motion) return;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    var rises = $$('[data-rise]', view), ins = $$('[data-in]', view), curs = $$('[data-curtain-in]', view);
    if (rises.length) tl.from(rises, { yPercent: 108, duration: 1.15, stagger: 0.12 }, 0.05);
    curs.forEach(function (c, i) {
      tl.fromTo(c, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power3.inOut' }, 0.2 + i * 0.1);
      var img = $('img', c); if (img) tl.from(img, { scale: 1.2, duration: 2, ease: 'expo.out' }, 0.2 + i * 0.1);
    });
    if (ins.length) tl.from(ins, { autoAlpha: 0, y: 22, duration: 1, stagger: 0.08 }, 0.45);
  }

  var io = null;
  function reveal(el) {
    if (el.hasAttribute('data-curtain')) {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut', clearProps: 'clipPath' });
    } else {
      gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: el.classList.contains('tile') ? (Array.prototype.indexOf.call(el.parentNode.children, el) % 3) * 0.06 : 0, clearProps: 'transform,opacity,visibility' });
    }
  }
  function scrollFx(view) {
    if (!motion) return;
    var els = $$('[data-reveal], .tile', view), curs = $$('[data-curtain]', view);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (!en.isIntersecting) return; io.unobserve(en.target); var t = en.target;
          if (t._cur) { t._cur.forEach(reveal); t._cur = null; } if (t.hasAttribute('data-reveal') || t.classList.contains('tile')) reveal(t); });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
      els.forEach(function (el) { gsap.set(el, { autoAlpha: 0, y: 36 }); io.observe(el); });
      curs.forEach(function (el) { var w = el.parentElement; w._cur = (w._cur || []).concat(el); gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' }); io.observe(w); });
    }
    if (window.ScrollTrigger) {
      $$('.par', view).forEach(function (el) {
        var img = $('img', el); if (!img) return;
        gsap.set(img, { scale: 1.16 });
        var tw = gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        triggers.push(tw.scrollTrigger);
      });
      ScrollTrigger.refresh();
    }
  }
  function refreshLater() { if (window.ScrollTrigger) ScrollTrigger.refresh(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshLater);
  window.addEventListener('load', refreshLater);

  /* ---------------- router ---------------- */
  function routeFromHash() {
    var h = (location.hash || '').replace('#', '');
    return ROUTES.indexOf(h) > -1 ? h : (h === '' ? 'home' : null);
  }

  function show(name, first) {
    var view = $('.view[data-view="' + name + '"]');
    $$('.view').forEach(function (v) { v.hidden = v !== view; });
    document.title = view.getAttribute('data-title');
    $$('[data-nav]').forEach(function (a) {
      var story = view.querySelector('.opener') !== null; if (a.getAttribute('data-nav') === name || (story && a.getAttribute('data-nav') === 'selected-work')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    killTriggers();
    current = name;
    document.body.setAttribute('data-route', name);
    if (!first) $('#main').focus({ preventScroll: true });
    intro(view); scrollFx(view); onScroll();
  }

  function go(name) {
    if (!name || name === current || busy) return;
    closeMenu(true); closeLb();
    if (!motion) { show(name); return; }
    busy = true;
    var tv = $('.view[data-view="' + name + '"]'); curtainWord.textContent = name === 'home' ? 'Home' : tv.getAttribute('data-title').split(' — ')[0];
    gsap.timeline({ onComplete: function () { busy = false; } })
      .set(curtain, { transformOrigin: '50% 100%' })
      .to(curtain, { scaleY: 1, duration: 0.6, ease: 'power3.inOut' })
      .to(curtainWord, { autoAlpha: 1, duration: 0.25 }, '-=0.2')
      .add(function () { show(name); })
      .set(curtain, { transformOrigin: '50% 0%' })
      .to(curtainWord, { autoAlpha: 0, duration: 0.2 })
      .to(curtain, { scaleY: 0, duration: 0.7, ease: 'power3.inOut' }, '<');
  }

  window.addEventListener('hashchange', function () {
    var r = routeFromHash();
    if (r) go(r);
  });

  /* in-page scroll buttons */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-scroll]');
    if (!b) return;
    var t = b.getAttribute('data-scroll');
    if (t === 'top') { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    var el = $(t, $('.view[data-view="' + current + '"]')) || $(t);
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------------- menu ---------------- */
  var menu = $('#site-menu'), menuBtn = $('.menu-btn');
  function openMenu() { menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('#menu-close').focus();
    if (motion) gsap.from($$('.menu .big'), { yPercent: 60, autoAlpha: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', delay: 0.25 }); }
  function closeMenu(silent) { if (menu.hidden) return; menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; if (!silent) menuBtn.focus(); }
  menuBtn.addEventListener('click', openMenu);
  $('#menu-close').addEventListener('click', function () { closeMenu(); });
  menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); trap(e, menu); });
  $$('.menu a[href^="#"]').forEach(function (a) { a.addEventListener('click', function () { if (a.getAttribute('href') === '#' + current) closeMenu(); }); });

  function trap(e, root) {
    if (e.key !== 'Tab') return;
    var f = $$('a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])', root).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- filters ---------------- */
  $$('.chips[data-scope]').forEach(function (group) {
    var view = group.closest('.view');
    group.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      var f = c.getAttribute('data-f');
      $$('.chip', group).forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      var tiles = $$('.tile', view);
      tiles.forEach(function (t) { t.classList.toggle('is-hidden', f !== 'all' && t.getAttribute('data-cat') !== f); });
      var vis = tiles.filter(function (t) { return !t.classList.contains('is-hidden'); });
      if (motion) gsap.fromTo(vis, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.03, ease: 'expo.out' });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ---------------- lightbox ---------------- */
  var lb = $('#lb'), lbImg = $('#lb-img'), list = [], idx = 0, opener = null;
  function render() {
    var k = list[idx], p = window.PHOTOS[k];
    lbImg.src = 'img/' + k + '.jpg'; lbImg.alt = p.a;
    $('#lb-title').textContent = p.t; $('#lb-meta').textContent = p.m;
    $('#lb-count').textContent = (idx + 1) + ' / ' + list.length + ' · ' + p.c;
    if (motion) gsap.fromTo(lbImg, { autoAlpha: 0, scale: 0.98 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
  }
  function openLb(keys, i, from) {
    list = keys; idx = i; opener = from || null;
    lb.hidden = false; document.body.style.overflow = 'hidden'; render(); $('#lb-close').focus();
  }
  function closeLb() { if (lb.hidden) return; lb.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); }
  function step(d) { idx = (idx + d + list.length) % list.length; render(); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.tile');
    if (t) {
      var view = t.closest('.view');
      var vis = $$('.tile', view).filter(function (x) { return !x.classList.contains('is-hidden'); });
      openLb(vis.map(function (x) { return x.getAttribute('data-k'); }), vis.indexOf(t), t);
      return;
    }
    var o = e.target.closest('[data-open]');
    if (o) {
      var sec = o.closest('section');
      var keys = $$('img', sec).map(function (im) { var m = im.getAttribute('src').match(/\/([\w]+)\.jpg$/); return m && m[1]; }).filter(function (k, i, a) { return k && window.PHOTOS[k] && a.indexOf(k) === i; });
      openLb(keys, 0, o);
    }
  });
  $('#lb-close').addEventListener('click', closeLb);
  $('#lb-prev').addEventListener('click', function () { step(-1); });
  $('#lb-next').addEventListener('click', function () { step(1); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); else trap(e, lb);
  });
  var tx = 0;
  $('#lb-stage').addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  $('#lb-stage').addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }, { passive: true });

  /* ---------------- project hover preview ---------------- */
  $$('.plist .row').forEach(function (r) {
    var on = function () { var i = r.getAttribute('data-prev'); $$('.pv').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-pv') === i); }); };
    r.addEventListener('mouseenter', on); r.addEventListener('focus', on);
  });

  /* ---------------- cursor ---------------- */
  var cur = $('.cursor');
  if (motion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { xTo(e.clientX); yTo(e.clientY); });
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest('.tile, .next, .collage a, .story-grid > a');
      gsap.to(cur, { scale: t ? 1 : 0, autoAlpha: t ? 1 : 0, duration: 0.35, ease: 'expo.out' });
      if (t) cur.textContent = t.classList.contains('tile') ? 'View' : 'Open';
    });
  }

  /* ---------------- contact form ---------------- */
  var HINTS = { employment: ['Role and team', 'Role, team, start date, where the work lives…', 'Employment'], freelance: ['Shoot details', 'Date, location, what needs covering, deliverables…', 'Freelance'], brand: ['Brief', 'Product, platforms, reel or stills, timeline…', 'Brand collaboration'], partnership: ['Idea', 'What you want to make together…', 'Creative partnership'] };
  var ftype = 'employment';
  function setType(t) {
    ftype = HINTS[t] ? t : 'employment';
    $$('#enq .chip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-type') === ftype ? 'true' : 'false'); });
    $('#msg-l').textContent = HINTS[ftype][0]; $('#f-msg').placeholder = HINTS[ftype][1];
  }
  $$('#enq .chip').forEach(function (c) { c.addEventListener('click', function () { setType(c.getAttribute('data-type')); }); });
  $$('.opt[data-type]').forEach(function (a) { a.addEventListener('click', function () { setType(a.getAttribute('data-type')); }); });
  $('#enq').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, name = f.name.value.trim(), email = f.email.value.trim(), msg = f.message.value.trim(), org = f.org.value.trim();
    var err = $('#f-err');
    if (!name || !msg || !/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Please add your name, a valid email and a short message.'; return; }
    err.textContent = '';
    $('#f-out').textContent = 'Hi Kishor,\n\n[' + HINTS[ftype][2] + ']' + (org ? ' — ' + org : '') + '\n\n' + msg + '\n\n' + name + '\n' + email;
    $('#f-done').hidden = false; $('#f-copy').focus();
  });
  $('#f-copy').addEventListener('click', function () {
    var b = this, txt = $('#f-out').textContent;
    var ok = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy message'; }, 1800); };
    try { navigator.clipboard.writeText(txt).then(ok, function () { b.textContent = 'Select the text above to copy'; }); }
    catch (x) { b.textContent = 'Select the text above to copy'; }
  });

  /* ---------------- boot ---------------- */
  var start = routeFromHash() || 'home';
  if (motion) { gsap.set(curtain, { scaleY: 0 }); }
  show(start, true);
  window.addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
})();
