/* Tutorial Generator Sertifikat Bapperida
 * - Intro bergerak (dengan tombol Lewati) saat pertama kali dibuka
 * - Tur sorotan interaktif langsung di elemen asli halaman
 * - Menu panduan lengkap bergambar
 * Tidak mengubah logika generator sertifikat sama sekali.
 */
(function () {
  'use strict';

  var SEEN_KEY = 'bapperida_tutorial_seen_v1';
  var memSeen = false;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function isSeen() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return memSeen; } }
  function markSeen() { memSeen = true; try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function field(sel) { var e = q(sel); return e ? e.closest('.field') : null; }

  /* ---------- Pengelola lapisan (fokus, kunci gulir) ---------- */
  var lockCount = 0, prevOverflow = '';
  function lockScroll() { if (lockCount++ === 0) { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } }
  function unlockScroll() { if (lockCount > 0 && --lockCount === 0) document.body.style.overflow = prevOverflow; }
  function focusables(root) {
    return qa('button:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])', root).filter(function (e) { return e.offsetParent !== null || e === document.activeElement; });
  }
  function trapTab(root, e) {
    var f = focusables(root); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Pewaktu untuk animasi intro ---------- */
  var T = { list: [], set: function (fn, ms) { var id = setTimeout(fn, ms); T.list.push(id); return id; }, clear: function () { T.list.forEach(clearTimeout); T.list = []; } };

  /* ======================================================================
   *  1. INTRO BERGERAK
   * ==================================================================== */
  var intro = null, introIdx = 0, introRunning = false, lastFocus = null;

  function buildIntro() {
    if (intro) return;
    intro = mk('div', 'tw-ov', '');
    intro.hidden = true;
    intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); intro.setAttribute('aria-labelledby', 'tw-intro-title');
    intro.innerHTML =
      '<div class="tw-intro-card">' +
        '<button class="tw-x" type="button" data-act="skip" aria-label="Lewati tutorial">&#10005;</button>' +
        '<span class="tw-badge">Tutorial singkat</span>' +
        '<h2 id="tw-intro-title">Selamat datang! &#128075;</h2>' +
        '<p class="tw-sub">Buat sertifikat magang dalam 4 langkah mudah. Lihat dulu demonya, atau lewati bila sudah paham.</p>' +
        '<div class="tw-stage" aria-hidden="true">' +
          '<div class="tw-mpanel">' +
            '<div class="tw-mrow" data-r="logo"><span class="tw-mlabel">Logo 1</span><div class="tw-mfile"><i>Choose File</i><span>No file chosen</span><em>logo.png</em></div></div>' +
            '<div class="tw-mrow" data-r="name"><span class="tw-mlabel">Nama penerima</span><div class="tw-minput"><span class="tw-typed"></span><i class="tw-caret"></i></div></div>' +
            '<div class="tw-mrow" data-r="size"><span class="tw-mlabel">Ukuran</span><div class="tw-mslider"><i class="tw-thumb"></i></div></div>' +
            '<div class="tw-mbtn" data-r="btn">Unduh Sertifikat PNG</div>' +
          '</div>' +
          '<div class="tw-mcert">' +
            '<div class="tw-mlogo"></div>' +
            '<div class="tw-mtitle">SERTIFIKAT</div><div class="tw-mnum">Nomor : 400.14.5.4/012/BAPPERIDA</div>' +
            '<div class="tw-mgiven">Diberikan kepada</div><div class="tw-mname"><span class="tw-mn"></span></div>' +
            '<div class="tw-mlines"><i></i><i></i><i></i></div><div class="tw-msig"></div>' +
            '<div class="tw-mpng">PNG</div><div class="tw-mok">&#10003; Tersimpan</div>' +
          '</div>' +
          '<div class="tw-hand" style="transform:translate(60%,150px)">&#128070;</div>' +
        '</div>' +
        '<div class="tw-cap"><div class="tw-capn">1</div><div class="tw-captext"><b></b><span></span></div></div>' +
        '<div class="tw-dots"><i></i><i></i><i></i><i></i></div>' +
        '<div class="tw-intro-actions">' +
          '<button class="tw-btn g" type="button" data-act="skip">Lewati</button>' +
          '<button class="tw-btn o" type="button" data-act="tour">Mulai tur interaktif &#9654;</button>' +
        '</div>' +
        '<p class="tw-intro-foot">Tutorial bisa dibuka lagi kapan saja lewat tombol <b>Tutorial</b>.</p>' +
      '</div>';
    document.body.appendChild(intro);
    intro.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) { var a = b.getAttribute('data-act'); if (a === 'skip') closeIntro(true); if (a === 'tour') { closeIntro(true, true); startTour(0); } }
    });
    intro.addEventListener('keydown', function (e) { if (e.key === 'Tab') trapTab(intro, e); });
  }

  var SCENES = [
    { t: 'Unggah logo', d: 'Pilih file PNG transparan, logo langsung muncul.' },
    { t: 'Ketik nama dan isi', d: 'Ganti teks contoh dengan data peserta magang.' },
    { t: 'Atur ukuran dan posisi', d: 'Geser slider atau klik tombol arah sampai pas.' },
    { t: 'Unduh sebagai PNG', d: 'Periksa dulu, lalu klik Unduh Sertifikat PNG.' }
  ];

  function moveHand(stage, target, offY) {
    var hand = q('.tw-hand', stage), sr = stage.getBoundingClientRect(), tr = target.getBoundingClientRect();
    var x = tr.left - sr.left + Math.min(tr.width * 0.55, tr.width - 14) - 11;
    var y = tr.top - sr.top + tr.height * 0.5 + (offY || 4);
    hand.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    hand.classList.remove('tap'); void hand.offsetWidth; hand.classList.add('tap');
  }

  function playScene(i) {
    if (!introRunning) return;
    introIdx = i % SCENES.length;
    var stage = q('.tw-stage', intro), sc = SCENES[introIdx];
    q('.tw-capn', intro).textContent = introIdx + 1;
    var cap = q('.tw-captext', intro);
    var clone = cap.cloneNode(true); clone.querySelector('b').textContent = sc.t; clone.querySelector('span').textContent = sc.d;
    cap.parentNode.replaceChild(clone, cap);
    qa('.tw-dots i', intro).forEach(function (d, k) { d.classList.toggle('on', k === introIdx); });

    var typed = q('.tw-typed', stage), mn = q('.tw-mn', stage), NAME = 'Shokhifahtul Jannah';
    if (introIdx === 0) {
      stage.classList.remove('logo-in', 'size-up', 'press', 'save');
      typed.textContent = ''; mn.textContent = '';
      T.set(function () { moveHand(stage, q('.tw-mfile', stage)); }, 150);
      T.set(function () { stage.classList.add('logo-in'); }, 1300);
    } else if (introIdx === 1) {
      T.set(function () { moveHand(stage, q('.tw-minput', stage)); }, 100);
      NAME.split('').forEach(function (_, k) {
        T.set(function () { typed.textContent = mn.textContent = NAME.slice(0, k + 1); }, reduce ? 900 : 1100 + k * 75);
      });
    } else if (introIdx === 2) {
      T.set(function () { moveHand(stage, q('.tw-mslider', stage), 2); }, 100);
      T.set(function () { stage.classList.add('size-up'); }, 1100);
    } else {
      T.set(function () { moveHand(stage, q('.tw-mbtn', stage), 6); }, 100);
      T.set(function () { stage.classList.add('press'); }, 1100);
      T.set(function () { stage.classList.remove('press'); stage.classList.add('save'); }, 1450);
    }
    T.set(function () { playScene(introIdx + 1); }, 3900);
  }

  function showIntro() {
    buildIntro();
    lastFocus = document.activeElement;
    intro.hidden = false; lockScroll(); hideFab(true);
    introRunning = true; playScene(0);
    var b = q('[data-act="tour"]', intro); if (b) b.focus();
  }
  function closeIntro(mark, keepLock) {
    if (!intro || intro.hidden) return;
    introRunning = false; T.clear(); intro.hidden = true; unlockScroll();
    if (mark) markSeen();
    if (!keepLock) { hideFab(false); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
  }

  /* ======================================================================
   *  2. TUR SOROTAN INTERAKTIF
   * ==================================================================== */
  var STEPS = [
    { sec: 'mengenal', top: true, els: function () { return [q('.panel')]; }, title: 'Panel Pengaturan', text: 'Semua kolom isian ada di sini: logo, nama, isi sertifikat, penandatangan, dan tombol. Gulir panel ke bawah untuk melihat semuanya.' },
    { sec: 'mengenal', top: true, els: function () { return [q('section.preview')]; }, title: 'Pratinjau Sertifikat', text: 'Hasil sertifikat tampil langsung di sini. Setiap perubahan di panel langsung terlihat. Di HP, pratinjau berada di atas panel.' },
    { sec: 'tombol', els: function () { return [field('#uploadTemplateBtn')]; }, title: 'Template latar (opsional)', text: 'Template bawaan sudah dipakai otomatis. Ganti hanya bila punya desain latar sendiri, berupa gambar landscape 16:9.' },
    { sec: 'logo', els: function () { return [q('#logo1')]; }, title: 'Unggah logo', text: 'Ada 4 slot logo. Klik <b>Choose File</b>, lalu pilih gambar dari perangkat Anda. Pakai <b>PNG berlatar transparan</b> agar tidak muncul kotak putih.' },
    { sec: 'logo', els: function () { var f = field('#logo1'); return [q('.size-control', f), q('.logo-position', f)]; }, title: 'Ukuran dan posisi logo', text: 'Geser slider <b>Ukuran</b> untuk memperbesar atau memperkecil. Klik panah untuk menggeser logo sedikit demi sedikit. <b>Tengah</b> mengembalikan ke posisi bawaan.' },
    { sec: 'isi', els: function () { return [field('#judul')]; }, title: 'Judul sertifikat', text: 'Berisi \u201cSERTIFIKAT\u201d. Ganti bila ingin judul lain, misalnya \u201cPIAGAM PENGHARGAAN\u201d.' },
    { sec: 'nama', els: function () { return [field('#name')]; }, title: 'Nama penerima', text: 'Hapus \u201cNama Penerima\u201d, lalu ketik nama peserta magang. Garis di bawah nama mengikuti posisinya. Nama terlalu panjang? Kecilkan dengan slider <b>Ukuran</b>.' },
    { sec: 'isi', els: function () { return [field('#body')]; }, title: 'Isi / keterangan', text: 'Ganti semua bagian dalam kurung siku <b>[ ]</b> dengan data sebenarnya, <b>termasuk kurung sikunya</b>. Teks di dalam tanda petik \u201c \u201d otomatis tebal, jadi tulis nama karya di sana.' },
    { sec: 'isi', els: function () { return [field('#period')]; }, title: 'Tanggal pelaksanaan', text: 'Kalimat berwarna oranye, misalnya \u201cTerhitung mulai tanggal 1 Juli 2026 s.d. 30 September 2026\u201d.' },
    { sec: 'ttd', els: function () { return [field('#tanggalTtd'), field('#jabatanTtd')]; }, title: 'Tanggal dan jabatan penandatangan', text: 'Isi tanggal penandatanganan (misalnya \u201cSumber, 5 Oktober 2026\u201d) dan jabatan pejabat yang menandatangani.' },
    { sec: 'isi', els: function () { return [field('#number')]; }, title: 'Nomor sertifikat', text: 'Cukup ketik nomornya, misalnya <code>400.14.5.4/012/BAPPERIDA</code>. Tulisan \u201cNomor :\u201d di depannya sudah otomatis.' },
    { sec: 'ttd', els: function () { return [field('#penandatangan'), field('#tte')]; }, title: 'Nama penandatangan dan TTE', text: 'Ketik nama pejabat, lalu unggah gambar tanda tangan elektronik (PNG transparan). TTE ditempatkan di atas nama dan bisa diatur ukuran serta posisinya.' },
    { sec: 'teks', els: function () { return [q('.text-control[data-text="name"]')]; }, title: 'Ukuran dan posisi teks', text: 'Setiap kolom teks punya slider <b>Ukuran</b> dan tombol arah. Pakai hanya bila ada teks yang terlalu rapat, terpotong, atau tidak rapi.' },
    { sec: 'unduh', els: function () { return [q('.actions')]; }, title: 'Unduh sertifikat', text: '<b>Periksa dulu</b> ejaan nama, nomor, tanggal, dan jabatan, karena setelah diunduh teks tidak bisa diedit. Lalu klik <b>Unduh Sertifikat PNG</b>.' },
    { sec: 'tombol', els: function () { return [q('#saveLast').closest('.history-actions'), q('#exportCfg').closest('.history-actions')]; }, title: 'Tombol penyimpanan', text: 'Simpan Terakhir, Urungkan, Ulangi, serta Ekspor dan Impor Pengaturan untuk cadangan. Hati-hati dengan <b>Atur Ulang</b>: semua data tersimpan ikut terhapus.' }
  ];

  var tour = { open: false, i: 0, block: null, spot: null, hand: null, pop: null, raf: 0, onScroll: null };

  function buildTour() {
    if (tour.block) return;
    tour.block = mk('div', 'tw-block');
    tour.spot = mk('div', 'tw-spot');
    tour.hand = mk('div', 'tw-tourhand', '<span>&#128070;</span>');
    tour.pop = mk('div', 'tw-pop');
    tour.pop.setAttribute('role', 'dialog'); tour.pop.setAttribute('aria-live', 'polite'); tour.pop.setAttribute('aria-label', 'Tur panduan');
    [tour.block, tour.spot, tour.hand, tour.pop].forEach(function (n) { n.hidden = true; document.body.appendChild(n); });
    var stop = function (e) { e.preventDefault(); };
    tour.block.addEventListener('wheel', stop, { passive: false });
    tour.block.addEventListener('touchmove', stop, { passive: false });
    tour.pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      var a = b.getAttribute('data-t');
      if (a === 'next') { if (tour.i >= STEPS.length - 1) endTour(true); else goStep(tour.i + 1); }
      else if (a === 'prev') goStep(tour.i - 1);
      else if (a === 'skip') endTour(true);
      else if (a === 'more') { var sec = STEPS[tour.i].sec; endTour(true, true); openMenu(sec); }
    });
    tour.pop.addEventListener('keydown', function (e) { if (e.key === 'Tab') trapTab(tour.pop, e); });
    tour.onScroll = function () { placeTour(); };
  }

  function unionRect(els) {
    var r = null;
    els.forEach(function (e) {
      if (!e) return; var b = e.getBoundingClientRect();
      if (!r) r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      else { r.left = Math.min(r.left, b.left); r.top = Math.min(r.top, b.top); r.right = Math.max(r.right, b.right); r.bottom = Math.max(r.bottom, b.bottom); }
    });
    return r;
  }

  function placeTour() {
    if (!tour.open) return;
    var step = STEPS[tour.i], els = step.els().filter(Boolean);
    var r = unionRect(els); if (!r) return;
    var vw = window.innerWidth, vh = window.innerHeight, m = 8, pad = 7;
    var sheet = vw <= 700;
    tour.pop.classList.toggle('tw-sheet', sheet);
    var popH = tour.pop.offsetHeight, popW = tour.pop.offsetWidth;
    var bottomLimit = sheet ? vh - popH - 20 : vh - m;
    var L = Math.max(r.left, m), T0 = Math.max(r.top, m), R = Math.min(r.right, vw - m), B = Math.min(r.bottom, bottomLimit);
    if (R <= L || B <= T0) { L = vw / 2 - 30; R = vw / 2 + 30; T0 = vh / 3; B = vh / 3 + 40; }
    var s = tour.spot.style;
    s.left = (L - pad) + 'px'; s.top = (T0 - pad) + 'px'; s.width = (R - L + pad * 2) + 'px'; s.height = (B - T0 + pad * 2) + 'px';
    var h = tour.hand.style;
    h.left = Math.max(8, Math.min(R - 26, vw - 46)) + 'px'; h.top = Math.max(8, Math.min(B - 12, vh - 50)) + 'px';

    if (!sheet) {
      var x, y, gap = 16;
      if (R + pad + gap + popW <= vw - 12) { x = R + pad + gap; y = Math.min(Math.max(T0, 12), vh - popH - 12); }
      else if (L - pad - gap - popW >= 12) { x = L - pad - gap - popW; y = Math.min(Math.max(T0, 12), vh - popH - 12); }
      else if (B + pad + gap + popH <= vh - 12) { x = Math.min(Math.max(L, 12), vw - popW - 12); y = B + pad + gap; }
      else if (T0 - pad - gap - popH >= 12) { x = Math.min(Math.max(L, 12), vw - popW - 12); y = T0 - pad - gap - popH; }
      else { x = Math.max(12, R - popW - 16); y = Math.max(12, B - popH - 16); }
      tour.pop.style.left = x + 'px'; tour.pop.style.top = y + 'px';
    } else {
      tour.pop.style.left = ''; tour.pop.style.top = '';
      // Pastikan elemen tidak tertutup lembar bawah: gulir bila perlu.
      if (!step.top && r.top > bottomLimit - 40 && !tour.adjusted) { tour.adjusted = true; window.scrollBy({ top: r.top - 90, behavior: reduce ? 'auto' : 'smooth' }); }
    }
  }

  function trackTour(ms) {
    cancelAnimationFrame(tour.raf);
    var end = performance.now() + ms;
    (function loop() { placeTour(); if (performance.now() < end && tour.open) tour.raf = requestAnimationFrame(loop); })();
  }

  function renderPop() {
    var step = STEPS[tour.i], last = tour.i === STEPS.length - 1;
    tour.pop.innerHTML =
      '<div class="tw-bar"><i style="width:' + Math.round((tour.i + 1) / STEPS.length * 100) + '%"></i></div>' +
      '<div class="tw-n">Langkah ' + (tour.i + 1) + ' dari ' + STEPS.length + '</div>' +
      '<h3>' + step.title + '</h3><p>' + step.text + '</p>' +
      '<button class="tw-more" type="button" data-t="more">Lihat panduan bergambar &rsaquo;</button>' +
      '<div class="tw-pop-actions">' +
        '<button class="tw-btn g" type="button" data-t="skip">' + (last ? 'Tutup' : 'Lewati') + '</button><span class="sp"></span>' +
        '<button class="tw-btn s" type="button" data-t="prev"' + (tour.i === 0 ? ' disabled' : '') + '>&lsaquo; Kembali</button>' +
        '<button class="tw-btn o" type="button" data-t="next">' + (last ? 'Selesai &#10003;' : 'Lanjut &rsaquo;') + '</button>' +
      '</div>';
  }

  function goStep(i) {
    tour.i = Math.max(0, Math.min(STEPS.length - 1, i)); tour.adjusted = false;
    var step = STEPS[tour.i], els = step.els().filter(Boolean);
    renderPop();
    var behavior = reduce ? 'auto' : 'smooth';
    if (window.innerWidth <= 700 && els[0]) {
      // HP: halaman bergulir sebagai satu kesatuan. Hitung posisi tujuan sekali saja.
      var y = window.pageYOffset + els[0].getBoundingClientRect().top - 90;
      window.scrollTo({ top: Math.max(0, y), behavior: behavior });
    } else if (step.top) {
      var p = q('.panel'); if (p) p.scrollTo({ top: 0, behavior: behavior });
      window.scrollTo({ top: 0, behavior: behavior });
    } else if (els[0]) {
      els[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: behavior });
    }
    placeTour(); trackTour(reduce ? 120 : 900);
    var nb = q('[data-t="next"]', tour.pop); if (nb) nb.focus({ preventScroll: true });
  }

  function startTour(i) {
    buildTour();
    if (tour.open) return;
    closeMenu(true);
    lastFocus = document.activeElement;
    tour.open = true;
    [tour.block, tour.spot, tour.hand, tour.pop].forEach(function (n) { n.hidden = false; });
    hideFab(true);
    window.addEventListener('scroll', tour.onScroll, true);
    window.addEventListener('resize', tour.onScroll);
    goStep(i || 0);
  }
  function endTour(mark, silent) {
    if (!tour.open) return;
    tour.open = false; cancelAnimationFrame(tour.raf);
    [tour.block, tour.spot, tour.hand, tour.pop].forEach(function (n) { n.hidden = true; });
    window.removeEventListener('scroll', tour.onScroll, true);
    window.removeEventListener('resize', tour.onScroll);
    if (mark) markSeen();
    if (!silent) { hideFab(false); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
  }

  /* ======================================================================
   *  3. MENU PANDUAN LENGKAP
   * ==================================================================== */
  function fig(file, w, h, cap) {
    return '<figure class="tw-fig"><img src="tutorial/' + file + '.jpg" width="' + w + '" height="' + h + '" loading="lazy" alt="' + cap.replace(/"/g, '&quot;') + '" data-zoom><figcaption>' + cap + ' &middot; ketuk gambar untuk memperbesar</figcaption></figure>';
  }
  function tryBtn(sec, label) { return '<div class="tw-try"><button class="tw-btn o" type="button" data-try="' + sec + '">&#9654; ' + (label || 'Coba langsung di halaman') + '</button></div>'; }

  var SECTIONS = [
    { id: 'mengenal', ic: '&#129517;', t: 'Mengenal tampilan', html:
      '<p class="tw-lead">Panduan lengkap membuat sertifikat magang: mengatur logo, mengubah nama dan isi sertifikat, sampai mengunduh hasilnya sebagai gambar PNG.</p>' +
      '<p>Halaman terbagi dua bagian:</p>' +
      '<ol class="tw-steps"><li><b>Panel Pengaturan Sertifikat</b> berisi semua kolom isian, pengaturan logo, ukuran, posisi, dan tombol.</li>' +
      '<li><b>Pratinjau Sertifikat</b> menampilkan hasil sertifikat secara langsung. Setiap perubahan di panel langsung terlihat di pratinjau.</li></ol>' +
      fig('01-tampilan', 1280, 920, 'Dua bagian halaman: panel pengaturan (1) dan pratinjau (2)') +
      '<div class="tw-tip"><b>&#128241;</b><div>Di HP, pratinjau tampil <b>di atas</b> panel pengaturan, jadi gulir ke atas untuk melihat hasilnya.</div></div>' +
      '<div class="tw-tip"><b>&#128274;</b><div>Semua proses berjalan di browser Anda. Data tidak dikirim ke mana pun, kecuali admin menekan tombol <b>Simpan ke Server</b>.</div></div>' +
      tryBtn('mengenal', 'Mulai tur dari awal') },

    { id: 'logo', ic: '&#128444;&#65039;', t: 'Mengatur logo', html:
      '<p class="tw-lead">Di bagian atas panel ada empat slot logo: Logo 1, Logo 2, Logo 3, dan Logo 4.</p>' +
      '<p>Secara bawaan, <b>Logo 1</b> adalah lambang Kabupaten Cirebon dan <b>Logo 2</b> adalah logo Bapperida. Logo 3 dan Logo 4 kosong dan bisa dipakai bila diperlukan.</p>' +
      '<h4>Mengganti atau menambah logo</h4>' +
      '<ol class="tw-steps"><li>Di bawah judul slot logo yang diinginkan, klik tombol <b>pilih file</b> (Choose File).</li><li>Pilih gambar logo dari perangkat Anda.</li><li>Logo langsung muncul di pratinjau.</li></ol>' +
      fig('03-logo-unggah', 1200, 785, 'Contoh: logo ditambahkan ke slot Logo 3') +
      '<h4>Mengatur ukuran dan posisi logo</h4>' +
      '<ul class="tw-list"><li>Geser slider <b>Ukuran</b> ke kanan untuk memperbesar dan ke kiri untuk memperkecil. Rentangnya 50% sampai 170%.</li>' +
      '<li>Klik <b>&#9650; Atas</b>, <b>&#9660; Bawah</b>, <b>&#9664; Kiri</b>, atau <b>Kanan &#9654;</b> untuk menggeser logo. Satu klik menggeser sedikit, jadi klik berulang sampai pas.</li>' +
      '<li>Klik <b>&#9679; Tengah</b> untuk mengembalikan logo ke posisi bawaannya.</li></ul>' +
      fig('04-logo-ukuran-posisi', 1200, 785, 'Slider ukuran (1), tombol arah (2), tombol tengah (3)') +
      '<div class="tw-tip"><b>&#128161;</b><div><b>Tips logo</b><ul>' +
      '<li>Pakai file <b>PNG dengan latar transparan</b> agar tidak muncul kotak putih di atas template.</li>' +
      '<li>Gunakan gambar yang cukup tajam, tetapi tidak perlu berukuran sangat besar.</li>' +
      '<li>Logo yang tinggi atau lebar otomatis disesuaikan ke dalam kotak slotnya tanpa gepeng.</li></ul></div></div>' +
      tryBtn('logo') },

    { id: 'nama', ic: '&#9997;&#65039;', t: 'Mengubah nama penerima', html:
      '<p class="tw-lead">Nama penerima adalah bagian yang paling sering Anda ganti untuk setiap sertifikat.</p>' +
      '<ol class="tw-steps"><li>Cari kolom <b>Nama penerima</b>.</li><li>Hapus tulisan \u201cNama Penerima\u201d, lalu ketik nama peserta magang.</li><li>Periksa di pratinjau. Garis di bawah nama mengikuti posisi nama.</li></ol>' +
      fig('05-nama-penerima', 1200, 785, 'Kolom nama (1), hasil di pratinjau (2), slider ukuran (3)') +
      '<p>Nama yang panjang tetap bisa dipakai. Bila terlalu lebar, kecilkan sedikit dengan slider <b>Ukuran</b> di bawah kolom nama.</p>' +
      '<div class="tw-tip"><b>&#128161;</b><div>Tulisan \u201cDiberikan kepada\u201d di atas nama punya kolom sendiri bernama <b>Tulisan di atas nama penerima</b>. Anda bisa mengubah kata-katanya dan mengatur ukuran serta posisinya tanpa mempengaruhi nama.</div></div>' +
      tryBtn('nama') },

    { id: 'isi', ic: '&#128221;', t: 'Mengubah isi sertifikat', html:
      '<p class="tw-lead">Judul, nomor, kalimat utama, dan tanggal pelaksanaan masing-masing punya kolom sendiri.</p>' +
      '<h4>Judul sertifikat</h4>' +
      '<p>Kolom <b>Tulisan judul sertifikat</b> berisi \u201cSERTIFIKAT\u201d. Ganti bila ingin judul lain, misalnya \u201cPIAGAM PENGHARGAAN\u201d.</p>' +
      fig('06-judul', 1200, 785, 'Kolom judul (1) dan hasilnya di pratinjau (2)') +
      '<h4>Nomor sertifikat</h4>' +
      '<p>Isi kolom <b>Nomor sertifikat</b> dengan nomor yang sesuai, misalnya <code>400.14.5.4/012/BAPPERIDA</code>. Tulisan \u201cNomor :\u201d di depannya sudah otomatis, jadi cukup ketik nomornya saja.</p>' +
      fig('09-nomor', 1200, 785, 'Kolom nomor (1) dan hasilnya (2)') +
      '<h4>Isi / keterangan sertifikat</h4>' +
      '<p>Kolom ini berisi kalimat utama, misalnya:</p>' +
      '<div class="tw-tip"><b>&#128196;</b><div><i>Mahasiswa [Nama Perguruan Tinggi] Program Studi [Program Studi] telah melaksanakan kegiatan magang di [Nama Instansi], Kabupaten Cirebon, dengan menghasilkan karya \u201c[Nama Karya]\u201d.</i></div></div>' +
      '<ol class="tw-steps"><li>Ganti semua bagian dalam kurung siku <code>[ ]</code> dengan data sebenarnya, <b>termasuk kurung sikunya</b>.</li>' +
      '<li>Teks dibungkus ke baris berikutnya secara otomatis. Anda tidak perlu menekan Enter.</li>' +
      '<li>Tulisan di dalam tanda petik \u201c \u201d otomatis dicetak <b>tebal</b>. Karena itu, tulis nama karya di dalam tanda petik.</li>' +
      '<li>Isi yang terlalu panjang akan memakan lebih dari tiga baris. Baris tanggal pelaksanaan akan turun otomatis agar tidak bertumpuk.</li></ol>' +
      fig('07-isi', 1200, 785, 'Kolom isi (1); nama karya di dalam tanda petik tampil tebal (2)') +
      '<h4>Tanggal pelaksanaan</h4>' +
      '<p>Kolom ini berisi kalimat berwarna oranye, misalnya \u201cTerhitung mulai tanggal 1 Juli 2026 s.d. 30 September 2026\u201d.</p>' +
      fig('08-tanggal-pelaksanaan', 1200, 785, 'Kolom tanggal pelaksanaan (1) dan hasilnya (2)') +
      tryBtn('isi') },

    { id: 'ttd', ic: '&#128395;&#65039;', t: 'Data penandatangan', html:
      '<p class="tw-lead">Bagian ini ada di kanan bawah sertifikat.</p>' +
      '<ul class="tw-list"><li><b>Tanggal penandatanganan</b>: misalnya \u201cSumber, 5 Oktober 2026\u201d.</li>' +
      '<li><b>Jabatan penandatangan</b>: misalnya \u201cKepala Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah (Bapperida) Kabupaten Cirebon\u201d.</li>' +
      '<li><b>Nama Penandatangan</b>: nama pejabat penandatangan.</li>' +
      '<li><b>Upload TTE / Tanda Tangan Elektronik</b>: pilih gambar tanda tangan. TTE akan ditempatkan di atas nama penandatangan.</li></ul>' +
      fig('10-tanggal-jabatan', 1200, 785, 'Tanggal penandatanganan (1) dan jabatan penandatangan (2)') +
      '<h4>Nama penandatangan dan TTE</h4>' +
      '<p>Atur ukuran dan posisi TTE dengan slider dan tombol arah seperti pada logo. Gunakan <b>PNG transparan</b>.</p>' +
      fig('11-penandatangan-tte', 1200, 785, 'Nama penandatangan (1), unggah TTE (2), ukuran TTE (3)') +
      tryBtn('ttd') },

    { id: 'teks', ic: '&#8596;&#65039;', t: 'Ukuran & posisi teks', html:
      '<p class="tw-lead">Setiap kolom teks punya slider <b>Ukuran</b> dan tombol arah di bawahnya.</p>' +
      '<ul class="tw-list"><li>Slider memperbesar atau memperkecil teks (50% sampai 200%).</li>' +
      '<li>Tombol <b>&#9650; &#9660; &#9664; &#9654;</b> menggeser teks sedikit demi sedikit.</li>' +
      '<li>Tombol <b>&#9679; Tengah</b> mengembalikan teks ke posisi bawaan.</li></ul>' +
      fig('12-ukuran-posisi-teks', 1200, 785, 'Slider ukuran (1), tombol arah (2), hasil di pratinjau (3)') +
      '<div class="tw-warn"><b>&#9888;&#65039;</b><div>Lakukan pengaturan ini hanya bila ada teks yang <b>terlalu rapat, terpotong, atau tidak rapi</b> di pratinjau.</div></div>' +
      tryBtn('teks') },

    { id: 'unduh', ic: '&#11015;&#65039;', t: 'Memeriksa & mengunduh', html:
      '<p class="tw-lead">Langkah terakhir: pastikan semuanya benar, lalu unduh sebagai gambar PNG.</p>' +
      '<ol class="tw-steps"><li>Periksa pratinjau dengan teliti: ejaan nama, nomor, nama instansi, tanggal, dan jabatan. <b>Setelah diunduh, teks tidak bisa diedit lagi.</b></li>' +
      '<li>Klik tombol <b>Unduh Sertifikat PNG</b>.</li>' +
      '<li>File PNG tersimpan di perangkat Anda (biasanya di folder Downloads).</li>' +
      '<li>Untuk sertifikat berikutnya, cukup ganti nama, nomor, dan isi seperlunya, lalu unduh lagi.</li></ol>' +
      fig('13-unduh', 1200, 785, 'Tombol unduh (1) dan pratinjau yang diperiksa (2)') +
      '<div class="tw-tip"><b>&#128424;&#65039;</b><div>Hasil unduhan berupa gambar <b>landscape</b> dengan ukuran mengikuti template. File ini bisa dicetak atau dikirim lewat WhatsApp dan email.</div></div>' +
      tryBtn('unduh') },

    { id: 'tombol', ic: '&#129520;', t: 'Fungsi tombol lainnya', html:
      '<p class="tw-lead">Tombol-tombol pendukung untuk menyimpan, membatalkan, mencadangkan, dan mengganti template.</p>' +
      '<ul class="tw-list"><li><b>Simpan Terakhir</b>: menyimpan keadaan sertifikat sekarang di browser ini. Penyimpanan otomatis juga aktif, jadi isian tidak hilang saat halaman ditutup.</li>' +
      '<li><b>Urungkan</b>: membatalkan perubahan terakhir.</li>' +
      '<li><b>Ulangi</b>: mengembalikan perubahan yang tadi diurungkan.</li>' +
      '<li><b>Atur Ulang</b>: mengembalikan semua pengaturan ke tampilan bawaan (logo, ukuran, posisi, dan isian).</li>' +
      '<li><b>Ekspor Pengaturan</b>: mengunduh semua pengaturan menjadi satu file JSON sebagai cadangan atau untuk dipindah ke perangkat lain.</li>' +
      '<li><b>Impor Pengaturan</b>: memuat kembali file JSON hasil ekspor.</li></ul>' +
      fig('14-tombol-lain', 1200, 785, 'Simpan (1), urungkan (2), ulangi (3), atur ulang (4), ekspor (5), impor (6)') +
      '<div class="tw-warn"><b>&#9888;&#65039;</b><div><b>Atur Ulang</b> juga menghapus data yang tersimpan di browser. Pakai dengan hati-hati, dan buat cadangan lewat <b>Ekspor Pengaturan</b> lebih dulu.</div></div>' +
      '<h4>Upload Template Sertifikat</h4>' +
      '<p>Mengganti gambar latar sertifikat. Gunakan gambar <b>landscape dengan perbandingan 16:9</b>. Template bawaan sudah tersedia dan dipakai otomatis.</p>' +
      fig('02-template', 1200, 785, 'Tombol upload template (1) dan hasilnya di pratinjau (2)') +
      tryBtn('tombol') },

    { id: 'faq', ic: '&#10067;', t: 'Pertanyaan umum', html:
      '<p class="tw-lead">Jawaban cepat untuk kendala yang sering muncul.</p>' +
      '<div class="tw-faq">' +
      '<details open><summary>Logo tampil dengan kotak putih</summary><div>Pakai file <b>PNG berlatar transparan</b>.</div></details>' +
      '<details><summary>Tulisan menumpuk atau terpotong</summary><div>Perkecil ukuran teks yang bermasalah atau geser dengan tombol arah.</div></details>' +
      '<details><summary>Tampilan di browser lain berbeda</summary><div>Pengaturan tersimpan per browser. Pakai <b>Ekspor</b> dan <b>Impor Pengaturan</b> untuk memindahkannya, atau hubungi pengembang.</div></details>' +
      '<details><summary>Pengaturan hilang setelah membersihkan data browser</summary><div>Itu normal. Simpan cadangan dengan <b>Ekspor Pengaturan</b>.</div></details>' +
      '<details><summary>Tombol Unduh tidak bekerja</summary><div>Pastikan browser mengizinkan unduhan dari situs ini, lalu coba lagi. Disarankan memakai <b>Chrome atau Edge</b> versi terbaru.</div></details>' +
      '</div>' },

    { id: 'kontak', ic: '&#128222;', t: 'Hubungi pengembang', html:
      '<p class="tw-lead">Bila ada kendala, pertanyaan, atau permintaan perubahan pada web ini, silakan hubungi pengembang.</p>' +
      '<div class="tw-contact">' +
      '<a href="mailto:shokhifahtulj@gmail.com"><b>&#9993;&#65039;</b><span>Email<small>shokhifahtulj@gmail.com</small></span></a>' +
      '<a href="https://wa.me/6281393626981" target="_blank" rel="noopener"><b>&#128172;</b><span>WhatsApp<small>081393626981</small></span></a>' +
      '</div>' }
  ];

  var menu = null, curSec = 'mengenal';

  function buildMenu() {
    if (menu) return;
    menu = mk('div', 'tw-ov'); menu.hidden = true;
    menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-modal', 'true'); menu.setAttribute('aria-labelledby', 'tw-menu-title');
    var nav = SECTIONS.map(function (s) { return '<button type="button" data-sec="' + s.id + '"><span class="ic">' + s.ic + '</span><span>' + s.t + '</span></button>'; }).join('');
    menu.innerHTML =
      '<div class="tw-menu-card">' +
        '<div class="tw-menu-head"><div class="tw-ttl"><h2 id="tw-menu-title">&#128214; Panduan Penggunaan</h2><p>Tutorial lengkap bergambar, dari mengatur logo sampai mengunduh sertifikat.</p></div>' +
        '<button class="tw-btn" type="button" data-act="replay">&#9654;<span class="lbl">&nbsp;Putar tur interaktif</span></button>' +
        '<button class="tw-x" type="button" data-act="close" aria-label="Tutup panduan">&#10005;</button></div>' +
        '<div class="tw-menu-body"><nav class="tw-nav" aria-label="Daftar topik">' + nav + '</nav><div class="tw-content" tabindex="-1"></div></div>' +
      '</div>';
    document.body.appendChild(menu);
    menu.addEventListener('click', function (e) {
      if (e.target === menu) { closeMenu(); return; }
      var z = e.target.closest('img[data-zoom]'); if (z) { openLightbox(z.src, z.alt); return; }
      var s = e.target.closest('[data-sec]'); if (s) { showSection(s.getAttribute('data-sec'), true); return; }
      var t = e.target.closest('[data-try]'); if (t) { var sec = t.getAttribute('data-try'); closeMenu(true); startTour(Math.max(0, STEPS.map(function (x) { return x.sec; }).indexOf(sec))); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'close') closeMenu(); else if (act === 'replay') { closeMenu(true); startTour(0); }
    });
    menu.addEventListener('keydown', function (e) { if (e.key === 'Tab') trapTab(menu, e); });
  }

  function showSection(id, focus) {
    var idx = 0; SECTIONS.forEach(function (s, i) { if (s.id === id) idx = i; });
    var s = SECTIONS[idx]; curSec = s.id;
    qa('.tw-nav button', menu).forEach(function (b) { var on = b.getAttribute('data-sec') === s.id; b.classList.toggle('on', on); if (on) { b.setAttribute('aria-current', 'true'); b.scrollIntoView({ block: 'nearest', inline: 'center' }); } else b.removeAttribute('aria-current'); });
    var c = q('.tw-content', menu), prev = SECTIONS[idx - 1], next = SECTIONS[idx + 1];
    c.innerHTML = '<section class="tw-sec"><h3 class="tw-h">' + s.ic + ' ' + s.t + '</h3>' + s.html + '</section>' +
      '<div class="tw-pager"><div>' + (prev ? '<button class="tw-btn s" type="button" data-sec="' + prev.id + '">&lsaquo; ' + prev.t + '</button>' : '') + '</div><div>' + (next ? '<button class="tw-btn p" type="button" data-sec="' + next.id + '">' + next.t + ' &rsaquo;</button>' : '<button class="tw-btn p" type="button" data-act="close">Selesai &#10003;</button>') + '</div></div>';
    c.scrollTo({ top: 0, behavior: 'auto' });
    if (focus) c.focus({ preventScroll: true });
  }

  function openMenu(sec) {
    buildMenu();
    if (!menu.hidden) { showSection(sec || curSec); return; }
    lastFocus = document.activeElement;
    menu.hidden = false; lockScroll(); hideFab(true);
    showSection(sec || curSec);
    var x = q('[data-act="close"]', menu); if (x) x.focus();
  }
  function closeMenu(silent) {
    if (!menu || menu.hidden) return;
    menu.hidden = true; unlockScroll();
    if (!silent) { hideFab(false); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
  }

  /* ---------- Lightbox gambar ---------- */
  var lb = null;
  function openLightbox(src, alt) {
    if (!lb) {
      lb = mk('div', 'tw-ov tw-lb', '<button class="tw-x" type="button" aria-label="Tutup gambar">&#10005;</button><img alt="">');
      lb.hidden = true; document.body.appendChild(lb);
      lb.addEventListener('click', closeLightbox);
    }
    var im = q('img', lb); im.src = src; im.alt = alt || '';
    lb.hidden = false; q('.tw-x', lb).focus();
  }
  function closeLightbox() { if (lb && !lb.hidden) { lb.hidden = true; if (menu && !menu.hidden) { var x = q('[data-act="close"]', menu); if (x) x.focus(); } } }

  /* ---------- Tombol pembuka ---------- */
  var fab = null;
  function hideFab(v) { if (fab) fab.classList.toggle('tw-hidden', !!v); }

  function init() {
    var hb = q('#openTutorial');
    if (hb) hb.addEventListener('click', function () { openMenu(); });
    fab = mk('button', 'tw-fab', '<b>?</b><span class="lbl">Tutorial</span>');
    fab.type = 'button'; fab.setAttribute('aria-label', 'Buka tutorial');
    fab.addEventListener('click', function () { openMenu(); });
    document.body.appendChild(fab);

    document.addEventListener('keydown', function (e) {
      if (lb && !lb.hidden) { if (e.key === 'Escape') { e.stopPropagation(); closeLightbox(); } return; }
      if (tour.open) {
        if (e.key === 'Escape') endTour(true);
        else if (e.key === 'ArrowRight') { if (tour.i < STEPS.length - 1) goStep(tour.i + 1); }
        else if (e.key === 'ArrowLeft') goStep(tour.i - 1);
        return;
      }
      if (intro && !intro.hidden) { if (e.key === 'Escape') closeIntro(true); return; }
      if (menu && !menu.hidden && e.key === 'Escape') closeMenu();
    }, true);

    var params = new URLSearchParams(location.search);
    var force = params.has('tutorial'), skip = params.has('notutorial');
    if (!skip && (force || !isSeen())) {
      var go = function () { setTimeout(function () { if (!isSeen() || force) showIntro(); }, 700); };
      if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
    }
  }

  window.BapperidaTutorial = { openMenu: openMenu, startTour: startTour, showIntro: showIntro, reset: function () { try { localStorage.removeItem(SEEN_KEY); } catch (e) {} memSeen = false; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
