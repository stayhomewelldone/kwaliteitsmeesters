/* KwaliteitsMeesters v5: router, de afdaling (scroll-hero), onthullingen,
   kiezer, mini-check, formulier. Geen frameworks. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
  var smooth = function (p, e0, e1) { var t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------ router */
  var TITLES = {
    home: 'KwaliteitsMeesters | Senior QHSE-advies en veiligheidscultuur',
    diensten: 'Expertise | KwaliteitsMeesters',
    scl: 'Safety Culture Ladder, trede 3 | KwaliteitsMeesters',
    dashboard: 'Meting en dashboard | KwaliteitsMeesters',
    kennis: 'Kennis uit de auditpraktijk | KwaliteitsMeesters',
    overons: 'Over ons | KwaliteitsMeesters',
    professionals: 'Werken bij | KwaliteitsMeesters',
    faq: 'Veelgestelde vragen | KwaliteitsMeesters',
    downloads: 'Downloads | KwaliteitsMeesters',
    contact: 'Contact | KwaliteitsMeesters'
  };
  var current = null;

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/');
    var page = parts[0] || 'home';
    if (!document.getElementById('page-' + page)) { page = 'home'; }
    return { page: page, anchor: parts[1] || null };
  }

  function showPage(page, anchor, opts) {
    opts = opts || {};
    var el = document.getElementById('page-' + page);
    if (!el) { return; }
    var changed = current !== page;
    if (changed) {
      $$('.page').forEach(function (p) { p.classList.remove('is-active'); p.hidden = true; });
      el.hidden = false;
      el.classList.add('is-active');
      $$('.nav a[data-page]').forEach(function (a) {
        if (a.dataset.page === page) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
      });
      document.title = TITLES[page] || TITLES.home;
      current = page;
      closeMenu();
    }
    var target = anchor ? document.getElementById(anchor) : null;
    if (target) {
      var y = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: y, behavior: (reduceMQ.matches || changed) ? 'auto' : 'smooth' });
      if (!opts.noFocus) { focusInto(target); }
    } else if (changed) {
      window.scrollTo(0, 0);
      var h1 = $('h1', el);
      if (!opts.initial && h1) { focusInto(h1); }
    } else if (!target) {
      /* zelfde pagina, geen anker: terug naar boven */
      window.scrollTo({ top: 0, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    }
    if (changed) {
      setTimeout(watchReveals, 40);
      applyHeroMode();
    }
  }

  function focusInto(node) {
    if (!node.hasAttribute('tabindex')) { node.setAttribute('tabindex', '-1'); }
    node.focus({ preventScroll: true });
  }

  function route(opts) { var r = parseHash(); showPage(r.page, r.anchor, opts); }
  window.addEventListener('hashchange', function () { route(); });

  /* skiplink: nooit door de router laten lopen */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) { return; }
    var href = a.getAttribute('href');
    if (href === '#') { return; }
    if (href === '#main') { e.preventDefault(); focusInto($('#main')); return; }
    if (href === location.hash) { e.preventDefault(); route(); }
  });

  /* ------------------------------------------------------------- menu + head */
  var nav = $('#nav');
  var burger = $('#burger');
  function closeMenu() {
    if (!nav) { return; }
    nav.classList.remove('open');
    if (burger) { burger.setAttribute('aria-expanded', 'false'); }
  }
  if (burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); burger.focus(); } });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) { closeMenu(); } });
  }
  var head = $('.site-head');
  var headState = false;
  function headTick() {
    var s = window.scrollY > 20;
    if (s !== headState) { headState = s; head.classList.toggle('scrolled', s); }
  }
  window.addEventListener('scroll', headTick, { passive: true });
  headTick();

  /* ----------------------------------------------------------- onthullingen */
  var revealIO = null;
  if ('IntersectionObserver' in window) {
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        var el = en.target;
        el.classList.add('in');
        if (el.classList.contains('rv-stagger')) {
          setTimeout(function () { el.classList.add('done'); }, 1400);
        }
        revealIO.unobserve(el);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  }
  function watchReveals() {
    $$('.rv:not(.in), .rv-stagger:not(.in), .draw:not(.in), [data-reveal]:not(.in)').forEach(function (el) {
      if (el.closest('.page') && !el.closest('.page').classList.contains('is-active')) { return; }
      if (revealIO && !reduceMQ.matches && !document.body.classList.contains('pinned')) { revealIO.observe(el); }
      else { el.classList.add('in'); el.classList.add('done'); }
    });
  }
  /* getekende lijnen: meet de lengte eenmalig */
  $$('.draw').forEach(function (svg) {
    $$('path, line, polyline, circle, rect', svg).forEach(function (s) {
      if (s.getTotalLength) { try { s.style.setProperty('--len', Math.ceil(s.getTotalLength() + 2)); } catch (e) { /* geen lengte */ } }
    });
  });

  /* ------------------------------------------------------- levend / pauze */
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('paused', document.hidden);
  });
  var liveIO = null;
  if ('IntersectionObserver' in window) {
    liveIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('live', en.isIntersecting); });
    }, { threshold: 0.05 });
    $$('[data-live], .sec').forEach(function (el) { liveIO.observe(el); });
  } else {
    $$('[data-live], .sec').forEach(function (el) { el.classList.add('live'); });
  }

  /* --------------------------------------------------------- de afdaling */
  var hero = $('#hero');
  var stage = hero ? $('.stage', hero) : null;
  var scene = hero ? $('.scene', hero) : null;
  var back = hero ? $('.scene-back', hero) : null;
  var sky = hero ? $('.sky', hero) : null;
  var cue = hero ? $('.cue', hero) : null;
  var bands = hero ? $$('.band', hero).map(function (b) {
    return { el: b, a: parseFloat(b.dataset.a), b: parseFloat(b.dataset.b), ramp: b.dataset.ramp ? parseFloat(b.dataset.ramp) : null, op: -1, k: -1, on: false, off: false };
  }) : [];
  var gauge = hero ? $('.gauge', hero) : null;
  var reads = gauge ? $$('.read', gauge) : [];
  var bob = gauge ? $('.bob', gauge) : null;
  var plumb = gauge ? $('.plumb', gauge) : null;
  var kloof = gauge ? $('.kloof', gauge) : null;
  var READS = [{ at: 0.03, v: 3.4 }, { at: 0.70, v: 2.6 }];
  var gaugeLevel = -1, gaugeSettle = false, cueOff = false;

  var scrubOn = false, rafId = null, lastTick = 0, target = 0, shown = 0, lastY = -1, heroOnScreen = true;
  var travel = 0, loadK = 0, loadT0 = 0;

  function measure() {
    if (!hero || !stage) { return; }
    travel = Math.max(1, scene.offsetHeight - stage.offsetHeight);
  }
  function heroProgress() {
    var r = hero.getBoundingClientRect();
    var range = hero.offsetHeight - stage.offsetHeight;
    return clamp(-r.top / Math.max(1, range), 0, 1);
  }
  function gaugeTop(v) { /* 1..5 -> 100%..0% */ return ((5 - v) / 4 * 100) + '%'; }

  function apply(p, now) {
    /* camera */
    var y = p * travel;
    if (Math.abs(y - lastY) >= 0.5) {
      lastY = y;
      scene.style.transform = 'translate3d(0,' + (-y).toFixed(1) + 'px,0)';
      if (back) { back.style.transform = 'translate3d(0,' + (-y * 0.7).toFixed(1) + 'px,0)'; }
      if (sky) { sky.style.transform = 'translate3d(0,' + (-y * 0.45).toFixed(1) + 'px,0)'; }
    }
    /* banden */
    if (now && loadT0 && loadK < 1) { loadK = clamp((now - loadT0) / 1100, 0, 1); loadK = loadK * loadK * (3 - 2 * loadK); }
    bands.forEach(function (bd, i) {
      var f = Math.min(0.02, (bd.b - bd.a) / 3);
      var op = (i === 0 ? 1 : smooth(p, bd.a, bd.a + f)) * (i === bands.length - 1 ? 1 : (1 - smooth(p, bd.b - f, bd.b)));
      var ramp = bd.ramp || Math.min(0.025, (bd.b - bd.a) * 0.35);
      var k = clamp((p - bd.a) / ramp, 0, 1);
      if (i === 0) { k = Math.max(k, loadK); }
      if (Math.abs(op - bd.op) > 0.01 || (op === 0 && bd.op !== 0) || (op === 1 && bd.op !== 1)) { bd.op = op; bd.el.style.opacity = op.toFixed(3); }
      if (Math.abs(k - bd.k) > 0.008 || (k === 1 && bd.k !== 1) || (k === 0 && bd.k !== 0)) { bd.k = k; bd.el.style.setProperty('--k', k.toFixed(3)); }
      var on = op > 0.5;
      if (on !== bd.on) {
        bd.on = on;
        bd.el.classList.toggle('is-on', on);
        if (on) { bd.el.removeAttribute('aria-hidden'); } else { bd.el.setAttribute('aria-hidden', 'true'); }
      }
      var off = op <= 0.001;
      if (off !== bd.off) {
        bd.off = off;
        bd.el.classList.toggle('is-off', off);
        try { bd.el.inert = off; } catch (err) { /* oudere browser */ }
      }
    });
    /* peilschaal */
    if (gauge) {
      var lvl = -1;
      for (var i = 0; i < READS.length; i++) { if (p >= READS[i].at) { lvl = i; } }
      if (lvl !== gaugeLevel) {
        gaugeLevel = lvl;
        reads.forEach(function (r, j) {
          r.classList.toggle('is-on', j <= lvl);
          r.classList.toggle('prev', j < lvl);
        });
        var v = lvl < 0 ? 3.4 : READS[lvl].v;
        if (bob) { bob.style.top = gaugeTop(v); bob.classList.remove('swing'); void bob.offsetWidth; bob.classList.add('swing'); }
        if (plumb) { plumb.style.height = 'calc(100vh + ' + gaugeTop(v) + ')'; }
      }
      var settle = p > 0.84;
      if (settle !== gaugeSettle) { gaugeSettle = settle; if (kloof) { kloof.classList.toggle('is-on', settle); } }
    }
    if (cue) { var off = p > 0.03; if (off !== cueOff) { cueOff = off; cue.classList.toggle('is-off', off); } }
  }

  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    var k = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    var converged = Math.abs(target - shown) < 0.0005 && loadK >= 1;
    if (converged) { shown = target; rafId = null; lastTick = 0; } else { rafAt = now; rafId = requestAnimationFrame(tick); }
    apply(shown, now);
  }
  var rafAt = 0;
  function onScroll() {
    target = heroProgress();
    var now = performance.now();
    if (rafId !== null && now - rafAt > 160) {
      /* de animatielus staat stil (verborgen tabblad of gesmoorde rAF): schrijf direct */
      cancelAnimationFrame(rafId); rafId = null; lastTick = 0;
      shown = target; loadK = 1;
      apply(shown, now);
      return;
    }
    if (rafId === null && heroOnScreen) { rafAt = now; rafId = requestAnimationFrame(tick); }
  }
  function onResize() {
    measure();
    lastY = -1;
    bands.forEach(function (b) { b.op = -1; b.k = -1; });
    if (scrubOn) { target = heroProgress(); shown = target; apply(shown); }
  }

  var GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  var MQLS = GATES.map(function (q) { return matchMedia(q); });

  function enableScrub() {
    if (scrubOn || !hero) { return; }
    scrubOn = true;
    measure();
    lastY = -1; gaugeLevel = -1; gaugeSettle = false; cueOff = false;
    bands.forEach(function (b) { b.op = -1; b.k = -1; b.on = false; });
    if (!loadT0) { loadT0 = performance.now(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    target = heroProgress(); shown = target;
    apply(shown, performance.now());
    if (rafId === null) { rafAt = performance.now(); rafId = requestAnimationFrame(tick); }
    unpinFinalStates();
  }
  function disableScrub() {
    if (!scrubOn) { return; }
    scrubOn = false;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function applyHeroMode() {
    if (!hero) { return; }
    var gated = MQLS.some(function (m) { return m.matches; });
    var onHome = current === 'home';
    if (gated || !onHome) { disableScrub(); } else { enableScrub(); }
  }
  MQLS.forEach(function (m) { m.addEventListener('change', applyHeroMode); });
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        heroOnScreen = en.isIntersecting;
        if (stage) { stage.classList.toggle('live', en.isIntersecting && !reduceMQ.matches); }
        if (heroOnScreen && scrubOn) { onScroll(); }
      });
    }, { threshold: 0 }).observe(hero);
  } else if (stage) { stage.classList.add('live'); }

  /* reduced motion, live in beide richtingen */
  var pinnedEls = [];
  function pinToFinalStates() {
    document.body.classList.add('pinned');
    $$('.rv, .rv-stagger, .draw, [data-reveal]').forEach(function (el) {
      if (!el.classList.contains('in')) { pinnedEls.push(el); }
      el.classList.add('in'); el.classList.add('done');
    });
    if (stage) { stage.classList.remove('live'); }
  }
  function unpinFinalStates() {
    document.body.classList.remove('pinned');
    pinnedEls.forEach(function (el) { el.classList.remove('in'); el.classList.remove('done'); });
    pinnedEls = [];
    if (stage) { stage.classList.toggle('live', heroOnScreen && !reduceMQ.matches); }
  }
  reduceMQ.addEventListener('change', function (e) {
    if (e.matches) { pinToFinalStates(); disableScrub(); }
    else { unpinFinalStates(); applyHeroMode(); watchReveals(); }
  });
  if (reduceMQ.matches) { pinToFinalStates(); }

  /* ------------------------------------------------------------ de kiezer */
  var RECS = {
    scl: [
      ['De route naar trede 3', 'Nulmeting in twee lagen, gesprekken op de werkvloer, een verbeterplan op routines. Begeleiding tot en met de audit.', '#scl'],
      ['Eerst meten', 'De veiligheidscultuur-indicator als losse licentie: twee vragenlijsten, dashboard en rapport, met een uur toelichting door een senior.', '#dashboard'],
      ['Auditvoorbereiding', 'Generale repetitie door adviseurs die elders zelf als auditor toetsen. Wat er op de auditdag gevraagd wordt, weet u dan al.', '#scl/vormen']
    ],
    cultuur: [
      ['Cultuur en gedrag', 'Meldcultuur, aanspreekgedrag, gedragsobservaties en werkplekinspecties met een leerdoel, vertaald naar vaste routines.', '#diensten'],
      ['Leiderschap in de lijn', 'Ontwikkeling voor uitvoerders en voormannen. Daar wordt het dagelijkse klimaat bepaald.', '#diensten'],
      ['Meet eerst de kloof', 'Waar het kantoor hoger scoort dan de werkvloer, bestaat het beleid wel maar leeft het niet. Daar begint het werk.', '#dashboard']
    ],
    iso: [
      ['Managementsystemen', 'ISO 45001, VCA en geïntegreerde systemen, slank ingericht op uw werkelijke processen.', '#diensten'],
      ['Interne audits met gedragscomponent', 'Uitgevoerd door auditoren die ook bij certificerende trajecten toetsen. Bevindingen waar u iets mee kunt.', '#diensten'],
      ['VCA-MAX', 'Het VCA-certificaat plus de Module Gedrag. Sinds 1 juli 2026 voor mkb tot 250 medewerkers een ViA-bewijsmiddel. Ons adviesaanbod is in ontwikkeling.', '#scl/vcamax']
    ],
    audit: [
      ['GAP-analyse', 'Waar u staat ten opzichte van de norm en van de praktijk. Zonder wensdenken.', '#diensten'],
      ['Gedragsaudit', 'Verder dan het systeem: wat is er op de werkvloer zichtbaar en hoorbaar?', '#diensten'],
      ['RI&E en risicoanalyses', 'Een samenhangend stelsel van risicobeoordelingen met een vast actualisatieritme.', '#diensten']
    ],
    interim: [
      ['Veiligheidskundige (MVK/HVK)', 'Tijdelijke of structurele invulling door een senior die de eerste week al meedraait.', '#diensten'],
      ['KAM-coördinator', 'Continuïteit voor uw systeem en certificeringen bij verlof, groei of vertrek.', '#diensten'],
      ['Coaching van uw eigen KAM’er', 'Uw mensen trekken het traject, wij kijken mee. Eén of twee dagen per maand, of wekelijks online.', '#scl/vormen']
    ]
  };
  var SECT = {
    'Bouw & infra': 'In bouw en infra werken wij met de keten van hoofd- en onderaannemers, met UAV-gc-contracten en met de eisen die publieke opdrachtgevers via de ViA-afspraak stellen.',
    'Installatietechniek': 'In de installatietechniek kennen wij de praktijk van montageploegen, service en onderhoud, en de eisen van de branche en haar opdrachtgevers.',
    'Industrie & productie': 'In productieomgevingen kennen wij de ploegendiensten en de dagelijkse afweging tussen productie en veiligheid.',
    'Groen & buitenruimte': 'In de groensector kennen wij het seizoenswerk, het solitaire werken en de eisen in aanbestedingen.',
    'Maritiem & water': 'In het maritieme werk kennen wij de wisselende locaties, het werken op en rond water en de strenge regimes die daarbij horen.',
    'Energie & nuts': 'In energie en nuts kennen wij de hoge veiligheidslat van netbeheerders en drinkwaterbedrijven en de ketenverplichtingen die daaruit volgen voor aannemers.',
    'een andere sector': 'Onze aanpak is opgebouwd rond cultuur en borging, niet rond één branche. Onze seniors schakelen snel in een nieuwe context.'
  };
  var VRAAG = { scl: 'de Safety Culture Ladder', cultuur: 'veiligheidscultuur en gedrag', iso: 'ISO 45001 of VCA', audit: 'een audit of nulmeting', interim: 'QHSE-capaciteit' };
  var selS = null, selV = null;
  var chooser = $('#chooser');
  if (chooser) {
    chooser.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) {
        var q = chip.closest('.q');
        $$('.chip', q).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        if (q.dataset.q === '1') { selS = chip.dataset.v; $('#q2').hidden = false; }
        else { selV = chip.dataset.v; }
        if (selS && selV) { renderSel(); }
        return;
      }
      if (e.target.closest('.reset')) { resetSel(); }
    });
  }
  function renderSel() {
    var out = $('#sel-out');
    if (!out.classList.contains('is-on')) {
      out.classList.add('is-on');
      setTimeout(fillSel, 40);
      setTimeout(function () { out.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth', block: 'nearest' }); }, 80);
      return;
    }
    fillSel();
  }
  function fillSel() {
    $('#sel-s').textContent = selS;
    $('#sel-v').textContent = VRAAG[selV] || selV;
    var recs = RECS[selV] || [];
    $('#recs').innerHTML = recs.map(function (r) {
      return '<div class="rec"><h4>' + r[0] + '</h4><p>' + r[1] + '</p><a class="tlink" href="' + r[2] + '">Lees meer</a></div>';
    }).join('');
    $('#sector-note').textContent = SECT[selS] || '';
  }
  function resetSel() {
    selS = null; selV = null;
    $$('#chooser .chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    $('#q2').hidden = true;
    $('#sel-out').classList.remove('is-on');
  }

  /* ----------------------------------------------------------- mini-check */
  var MC = [null, null, null];
  var check = $('#check');
  if (check) {
    check.addEventListener('click', function (e) {
      var opt = e.target.closest('.opt');
      if (opt) {
        var q = opt.closest('.q');
        $$('.opt', q).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        opt.setAttribute('aria-pressed', 'true');
        MC[parseInt(q.dataset.i, 10)] = opt.dataset.t;
        var n = MC.filter(function (x) { return x !== null; }).length;
        $('#mc-prog').textContent = n + ' van 3 beantwoord';
        $('#mc-reset').hidden = n === 0;
        if (n === 3) { mcResult(); }
        return;
      }
      if (e.target.closest('#mc-reset')) { mcReset(); }
    });
  }
  function mcResult() {
    var vals = MC.filter(function (x) { return x !== 'x'; }).map(Number);
    var R = $('#mc-result'), sc = $('#mc-score'), chip = $('#mc-chip'), vt = $('#mc-vt'), vx = $('#mc-vx'), mk = $('#mc-mk');
    if (vals.length < 2) {
      sc.textContent = '–'; chip.textContent = 'Weinig zicht'; chip.style.background = ''; chip.style.color = '';
      mk.style.left = '-999px';
      vt.textContent = 'Weinig zicht is zelf een bevinding.';
      vx.textContent = 'Als het lastig is te zeggen wat er meestal gebeurt, dan is dat het signaal. Vaak is er wel iets ingericht, maar is het niet bekend bij de mensen om wie het gaat. In onze metingen telt "weet niet" daarom mee als aparte uitkomst. Een hoog aandeel is meestal het eerste dat wij met de sturende laag bespreken.';
    } else {
      var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      avg = Math.round(avg * 10) / 10;
      var s = avg.toFixed(1).replace('.', ',');
      sc.textContent = s;
      mk.style.left = ((avg - 1) / 4 * 100) + '%';
      var kleur, bg, fg, titel, tekst;
      if (avg < 2) { kleur = 'Rood'; bg = '#F1D9D6'; fg = '#7A2E20'; titel = 'De basis vraagt eerst aandacht.'; tekst = 'Dit beeld past bij een organisatie die vooral reageert nadat er iets is gebeurd. Begin klein: maak melden veilig en laat op elke melding zichtbaar iets volgen. Trede 3 is nog niet in beeld, de eerste stappen wel. Die zijn goed te organiseren.'; }
      else if (avg < 2.7) { kleur = 'Oranje'; bg = '#F3E3C4'; fg = '#7A5514'; titel = 'Geregeld op papier, kwetsbaar in de praktijk.'; tekst = 'Dit is het beeld dat wij het vaakst zien vlak voor een SCL-traject. Er is van alles ingericht, maar het leeft wisselend op de werkvloer. In onze auditpraktijk zakken organisaties hier vrijwel altijd op borging en samenhang. Een nulmeting laat zien welke routines als eerste vastigheid nodig hebben.'; }
      else if (avg < 3.4) { kleur = 'Lichtgroen'; bg = '#E1EBD3'; fg = '#3E6B2A'; titel = 'Het fundament voor trede 3 staat.'; tekst = 'Let op de klassieke valkuil: betrokkenheid is er, maar het oordeel valt op borging en een gesloten leercyclus. Eén thema dat terugvalt kan het verschil maken. Meet per thema waar het kwetsbaar is en breng de bewijslast op orde voordat de auditor komt.'; }
      else { kleur = 'Groen'; bg = '#CFE0CF'; fg = '#2E5220'; titel = 'Sterk beeld. Maak het nu aantoonbaar.'; tekst = 'De vraag verschuift van "doen we het goed?" naar "is dit persoonsonafhankelijk en herleidbaar?". Dat bepaalt of dit beeld de audit doorstaat, en of trede 4 in beeld komt. Een meting over beide lagen laat zien of iedereen dit beeld deelt.'; }
      chip.textContent = kleur + ' · ' + s; chip.style.background = bg; chip.style.color = fg;
      vt.textContent = titel; vx.textContent = tekst;
    }
    if (!R.classList.contains('is-on')) {
      R.classList.add('is-on');
      var fill = R.innerHTML;
      R.innerHTML = '';
      setTimeout(function () { R.innerHTML = fill; }, 40);
      setTimeout(function () { R.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth', block: 'nearest' }); }, 90);
    }
  }
  function mcReset() {
    MC = [null, null, null];
    $$('#check .opt').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
    $('#mc-prog').textContent = '0 van 3 beantwoord';
    $('#mc-reset').hidden = true;
    $('#mc-result').classList.remove('is-on');
  }

  /* ------------------------------------------------------------- formulier */
  var form = $('#contactform');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) { return; }
      var f = form;
      var s = encodeURIComponent('[' + f.onderwerp.value + '] Bericht via de website van ' + f.naam.value);
      var b = encodeURIComponent(f.bericht.value + '\n\n' + f.naam.value + (f.organisatie.value ? (', ' + f.organisatie.value) : '') + '\n' + f.email.value + (f.telefoon && f.telefoon.value ? ('\n' + f.telefoon.value) : ''));
      window.location.href = 'mailto:info@kwaliteitsmeesters.eu?subject=' + s + '&body=' + b;
      form.classList.add('sent');
      var done = $('.done', form);
      if (done) { focusInto(done); }
    });
  }

  /* ------------------------------------------------------------------ start */
  route({ initial: true });
  watchReveals();
  applyHeroMode();
})();
