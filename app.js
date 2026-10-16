/* =====================================================================
   APLIKASI JIMPITAN RONDA
   RT 01 / RW 04 Margorejo, Banyuanyar, Banjarsari, Surakarta
   ===================================================================== */
(function () {
  'use strict';

  /* --- polyfill kecil utk WebView lawas --- */
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      var el = this;
      while (el && el.nodeType === 1) { if (el.matches(s)) return el; el = el.parentElement; }
      return null;
    };
  }
  if (!Element.prototype.matches) Element.prototype.matches = Element.prototype.msMatchesSelector;

  var A = window.Android || null;
  /* iPhone/iPad: aplikasi berjalan sebagai PWA lewat Safari, bukan APK */
  var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var TERPASANG = window.navigator.standalone === true ||
                  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { var n = (r || document).querySelectorAll(s); return Array.prototype.slice.call(n); }

  /* ========================= UTILITAS ========================= */
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
             'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLNS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function num(n) {
    n = Math.round(Number(n) || 0);
    var neg = n < 0; n = Math.abs(n);
    var s = String(n), out = '';
    while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
    return (neg ? '-' : '') + s + out;
  }
  function rp(n) { return 'Rp ' + num(n); }
  function angka(v) { var d = String(v == null ? '' : v).replace(/[^0-9-]/g, ''); return d === '' || d === '-' ? 0 : parseInt(d, 10); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function ym(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function parseISO(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2] || 1); }
  function tglPanjang(iso) { var d = parseISO(iso); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
  function tglPendek(iso) { var d = parseISO(iso); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function namaBulan(iso) { var d = parseISO(iso + '-01'); return BLN[d.getMonth()] + ' ' + d.getFullYear(); }
  function addDays(iso, n) { var d = parseISO(iso); d.setDate(d.getDate() + n); return ymd(d); }
  function jamKini() { var d = new Date(); return pad(d.getHours()) + '.' + pad(d.getMinutes()); }
  /* Malam ronda: sebelum jam 04.00 masih dihitung tanggal kemarin */
  function tanggalRonda() {
    var d = new Date();
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);
    return ymd(d);
  }
  function norm(s) { return String(s == null ? '' : s).trim().toUpperCase(); }
  /* gabung potongan keterangan, bagian kosong dilewati (mis. blok/gang tidak diisi) */
  function gab() {
    var a = [], i;
    for (i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== null && v !== undefined && String(v) !== '') a.push(v);
    }
    return a.join(' · ');
  }

  /* ========================= PENYIMPANAN ========================= */
  var KEY = 'jimpitan_rt01_rw04_margorejo_v1';

  function kosong() {
    return {
      v: 1,
      set: {
        rt: '', rw: '', kampung: '', kel: '', kec: '', kota: '',
        ketua: '', bendahara: '', koor: '',
        saldoAwal: 0, nominalDefault: 1000,
        prefiks: 'JMP',
        autoCadang: true,        /* cadangkan otomatis tiap hari */
        cadangTerakhir: '',      /* ISO waktu cadangan terakhir berhasil */
        cadangNama: '',          /* nama berkas tujuan (tampilan saja) */
        webURL: '',              /* alamat situs warga, mis. https://nama.github.io/jimpitan-rt/ */
        ghUser: '', ghRepo: '', ghToken: '', ghBranch: 'main',
        autoTerbit: false,       /* terbitkan ke web tiap kali kirim laporan */
        salam: 'Matur nuwun kagem Bapak/Ibu warga ingkang sampun paring jimpitan 🙏',
        siap: false,
        tema: 'gelap', rincian: true, beruntun: true, suara: true, tampilBelum: true
      },
      rumah: [], setor: [], kas: [], lunas: []
    };
  }

  function muat() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        var d = kosong();
        d.set = merge(d.set, o.set || {});
        d.rumah = (o.rumah || []).map(function (r) {
          r.cara = r.cara === 'bulanan' ? 'bulanan' : 'harian';
          delete r.bulanan;
          return r;
        });
        d.lunas = o.lunas || [];
        /* Data lama: setoran borongan yang bernominal diubah menjadi penanda LUNAS
           tanpa nominal, supaya tidak ikut terhitung di kas. */
        d.setor = [];
        (o.setor || []).forEach(function (x) {
          if (x.jenis === 'bulanan') {
            var per = x.periode || String(x.tgl).slice(0, 7);
            var ada = d.lunas.some(function (l) { return l.rumahId === x.rumahId && l.periode === per; });
            if (!ada) d.lunas.push({ id: uid(), rumahId: x.rumahId, periode: per, tgl: x.tgl, ts: x.ts || 0 });
          } else {
            x.jenis = 'harian';
            d.setor.push(x);
          }
        });
        d.kas = o.kas || [];
        return d;
      }
    } catch (e) { }
    return kosong();   /* pemasangan baru selalu mulai kosong */
  }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) if (b[k] !== undefined) o[k] = b[k]; return o; }

  var DB = muat();
  function simpan() {
    _pb = null;
    try { localStorage.setItem(KEY, JSON.stringify(DB)); }
    catch (e) { toast('Penyimpanan penuh / gagal menyimpan'); }
  }
  /* simpan langsung saat pertama kali dipasang supaya ID rumah tetap konsisten */
  try { if (!localStorage.getItem(KEY)) simpan(); } catch (e) { }

  /* ========================= QUERY ========================= */
  function aktif() { return DB.rumah.filter(function (r) { return r.aktif !== false; }); }
  function byId(id) { for (var i = 0; i < DB.rumah.length; i++) if (DB.rumah[i].id === id) return DB.rumah[i]; return null; }
  function byKode(k) {
    var n = norm(k); if (!n) return null;
    for (var i = 0; i < DB.rumah.length; i++) if (DB.rumah[i].kode && norm(DB.rumah[i].kode) === n) return DB.rumah[i];
    return null;
  }
  function setorTgl(t) { return DB.setor.filter(function (s) { return s.tgl === t; }); }
  /* --- pembeda rumah harian vs rumah bulanan (borongan) --- */
  function isBulanan(r) { return !!r && r.cara === 'bulanan'; }
  function jenisSetor(s) { return s.jenis === 'bulanan' ? 'bulanan' : 'harian'; }
  function rumahHarian() { return aktif().filter(function (r) { return !isBulanan(r); }); }
  function rumahBulanan() { return aktif().filter(isBulanan); }
  function periodeDari(t) { return String(t).slice(0, 7); }
  function sudahSetor(t, id) {
    return DB.setor.some(function (s) { return s.tgl === t && s.rumahId === id && jenisSetor(s) === 'harian'; });
  }
  /* Rumah borongan hanya ditandai LUNAS / BELUM per bulan — tanpa nominal,
     dan TIDAK ikut dihitung dalam kas jimpitan. */
  function lunasBulan(per, id) {
    return DB.lunas.some(function (l) { return l.periode === per && l.rumahId === id; });
  }
  function tandaiLunas(id, per) {
    if (lunasBulan(per, id)) return false;
    DB.lunas.push({ id: uid(), rumahId: id, periode: per, tgl: S.tgl, ts: Date.now() });
    simpan(); return true;
  }
  function hapusLunas(id, per) {
    DB.lunas = DB.lunas.filter(function (l) { return !(l.periode === per && l.rumahId === id); });
    simpan();
  }
  function totalTgl(t) { return setorTgl(t).reduce(function (a, s) { return a + (Number(s.nominal) || 0); }, 0); }
  function totalSemuaJimpitan() { return DB.setor.reduce(function (a, s) { return a + (Number(s.nominal) || 0); }, 0); }
  function kasMasuk() { return DB.kas.filter(function (k) { return k.jenis === 'masuk'; }).reduce(function (a, k) { return a + k.nominal; }, 0); }
  function kasKeluar() { return DB.kas.filter(function (k) { return k.jenis === 'keluar'; }).reduce(function (a, k) { return a + k.nominal; }, 0); }
  function saldo() { return (Number(DB.set.saldoAwal) || 0) + totalSemuaJimpitan() + kasMasuk() - kasKeluar(); }
  /* Urutan blok mengikuti urutan pendataan (rute keliling ronda), bukan abjad */
  var _pb = null;
  function petaBlok() {
    var m = {}, n = 0;
    DB.rumah.forEach(function (r) { var b = r.blok || ''; if (!(b in m)) m[b] = n++; });
    return m;
  }
  function urutRumah(a, b) {
    if (!_pb) _pb = petaBlok();
    var ia = _pb[a.blok || ''], ib = _pb[b.blok || ''];
    if (ia === undefined) ia = 9999; if (ib === undefined) ib = 9999;
    if (ia !== ib) return ia - ib;
    var na = angka(a.no), nb = angka(b.no);
    if (na !== nb) return na - nb;
    return String(a.no).localeCompare(String(b.no));
  }
  function initial(nm) {
    var s = String(nm || '').replace(/^(Bp\.?|Ibu|Bpk\.?|Sdr\.?|H\.|Hj\.)\s*/i, '').trim();
    return (s.charAt(0) || '?').toUpperCase();
  }

  /* ========================= STATE UI ========================= */
  var S = {
    tab: 'ronda',
    tgl: tanggalRonda(),
    cari: '',
    filterBlok: 'semua',
    rekap: 'harian',
    bulan: ym(new Date()),
    rekapTgl: tanggalRonda()
  };

  /* ========================= TOAST ========================= */
  var toastT = null;
  function toast(m) {
    var el = $('#toast'); el.textContent = m; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function vib(ms) {
    try { if (A && A.vibrate) A.vibrate(ms || 55); else if (navigator.vibrate) navigator.vibrate(ms || 55); } catch (e) { }
  }
  var AC = null;
  function beep(tipe) {
    if (!DB.set.suara) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var o = AC.createOscillator(), g = AC.createGain();
      o.connect(g); g.connect(AC.destination);
      o.type = 'sine';
      o.frequency.value = tipe === 'ok' ? 1046 : tipe === 'warn' ? 660 : 320;
      var t = AC.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (tipe === 'ok' ? 0.16 : 0.30));
      o.start(t); o.stop(t + 0.33);
      if (tipe === 'ok') {
        var o2 = AC.createOscillator(), g2 = AC.createGain();
        o2.connect(g2); g2.connect(AC.destination); o2.type = 'sine'; o2.frequency.value = 1568;
        g2.gain.setValueAtTime(0.0001, t + 0.10);
        g2.gain.exponentialRampToValueAtTime(0.22, t + 0.12);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o2.start(t + 0.10); o2.stop(t + 0.3);
      }
    } catch (e) { }
  }

  /* ========================= SHEET ========================= */
  function sheet(judul, html) {
    $('#sheetTitle').textContent = judul;
    $('#sheetBody').innerHTML = html;
    $('#sheetWrap').classList.remove('hidden');
    $('#sheet').scrollTop = 0;
  }
  function tutupSheet() { $('#sheetWrap').classList.add('hidden'); $('#sheetBody').innerHTML = ''; }
  function konfirm(judul, pesan, labelOk, aksi, bahaya) {
    window.__konfirmAksi = aksi;
    sheet(judul,
      '<p style="margin:0 0 16px;color:var(--mut);line-height:1.6">' + pesan + '</p>' +
      '<div class="row-btn" style="margin:0">' +
      '<button class="btn" data-act="tutupSheet">Batal</button>' +
      '<button class="btn ' + (bahaya ? 'btn-danger' : 'btn-primary') + '" data-act="konfirmYa">' + esc(labelOk) + '</button>' +
      '</div>');
  }

  /* ========================= IKON ========================= */
  var I = {
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2m0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23m4.52-6.16c-.25-.12-1.47-.72-1.69-.81s-.39-.12-.56.12-.64.81-.79.98-.29.19-.54.06-1.05-.39-2-1.23c-.74-.66-1.24-1.47-1.38-1.72s-.02-.38.11-.5c.11-.11.25-.29.37-.44s.17-.25.25-.41.04-.31-.02-.44-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31s-.87.85-.87 2.07.89 2.4 1.02 2.57 1.76 2.68 4.26 3.76c.6.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18s.21-1.08.15-1.18-.23-.19-.48-.31"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    cari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>',
    kosong: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 12h8"/></svg>',
    unduh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5M4 21h16"/></svg>'
  };

  /* ========================= TAB ========================= */
  function pilihTab(t) {
    S.tab = t;
    $$('#tabbar .tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === t); });
    $$('.view').forEach(function (v) { v.classList.add('hidden'); });
    $('#view-' + t).classList.remove('hidden');
    document.getElementById('main').scrollTop = 0;
    window.scrollTo(0, 0);
    render();
  }
  $$('#tabbar .tab').forEach(function (b) {
    b.addEventListener('click', function () { pilihTab(b.getAttribute('data-tab')); });
  });

  function render() {
    var s = DB.set;
    $('#abSub').textContent = labelRT().replace(' — ', ' · ') || 'belum diatur — ketuk tab Atur';
    if (S.tab === 'ronda') { $('#abTitle').textContent = 'Jimpitan Ronda'; viewRonda(); }
    if (S.tab === 'rumah') { $('#abTitle').textContent = 'Data Rumah'; viewRumah(); }
    if (S.tab === 'rekap') { $('#abTitle').textContent = 'Rekapitulasi'; viewRekap(); }
    if (S.tab === 'kas') { $('#abTitle').textContent = 'Kas Ronda'; viewKas(); }
    if (S.tab === 'atur') { $('#abTitle').textContent = 'Pengaturan'; viewAtur(); }
    document.body.classList.toggle('terang', DB.set.tema === 'terang');
  }

  /* ========================= VIEW: RONDA ========================= */
  function barTanggal(tgl, act) {
    return '<div class="datebar">' +
      '<button data-act="' + act + 'Prev">' + I.left + '</button>' +
      '<div class="dmid"><b>' + esc(tglPanjang(tgl)) + '</b><small>ketuk untuk pilih tanggal</small>' +
      '<input type="date" value="' + tgl + '" data-act="' + act + 'Pick"></div>' +
      '<button data-act="' + act + 'Next">' + I.right + '</button>' +
      '</div>';
  }

  function viewRonda() {
    var tgl = S.tgl, per = periodeDari(tgl);
    var rs = rumahHarian().slice().sort(urutRumah);
    var rbl = rumahBulanan().slice().sort(urutRumah);
    var sudah = rs.filter(function (r) { return sudahSetor(tgl, r.id); });
    var belum = rs.filter(function (r) { return !sudahSetor(tgl, r.id); });
    var lunasB = rbl.filter(function (r) { return lunasBulan(per, r.id); });
    var total = totalTgl(tgl);
    var target = rs.reduce(function (a, r) { return a + (Number(r.nominal) || 0); }, 0);
    var pct = rs.length ? Math.round(sudah.length / rs.length * 100) : 0;

    var h = '';
    h += barTanggal(tgl, 'tgl');

    h += '<div class="hero">' +
      '<div class="lbl">Jimpitan malam ini</div>' +
      '<div class="amt">' + rp(total) + ' <small>/ ' + rp(target) + '</small></div>' +
      '<div class="prog"><i style="width:' + pct + '%"></i></div>' +
      '<div class="foot"><span>' + sudah.length + ' dari ' + rs.length + ' rumah' + (rbl.length ? ' (harian)' : '') + '</span><span>' + pct + '%</span></div>' +

      '</div>';

    h += '<div class="grid2">' +
      '<div class="mini ok"><div class="k">Sudah setor</div><div class="v">' + sudah.length + ' <span style="font-size:13px;color:var(--mut)">rumah</span></div></div>' +
      '<div class="mini bad"><div class="k">Belum setor</div><div class="v">' + belum.length + ' <span style="font-size:13px;color:var(--mut)">rumah</span></div></div>' +
      '</div>';
    if (rbl.length) {
      var semuaLunas = lunasB.length === rbl.length;
      h += '<div class="mini ' + (semuaLunas ? 'ok' : 'warn') + ' saldo-row" data-act="panelBulanan">' +
        '<div><div class="k">Borongan bulanan · ' + esc(namaBulan(per)) + '</div>' +
        '<div class="v" style="font-size:18px">' + lunasB.length + ' / ' + rbl.length +
        ' <span style="font-size:13px;color:var(--mut);font-weight:600">rumah lunas</span></div></div>' +
        '<div class="pill ' + (semuaLunas ? 'g' : 'a') + '">kelola ›</div></div>';
    }
    h += '<div class="mini info saldo-row" data-act="keKas">' +
      '<div><div class="k">Saldo kas ronda hari ini</div><div class="v">' + rp(saldo()) + '</div></div>' +
      '<div class="pill b">lihat kas ›</div></div>';

    h += '<button class="btn btn-primary btn-block btn-scan" data-act="scanKumpul">' + I.scan + ' SCAN BARCODE</button>';
    h += '<div class="row-btn" style="margin-top:10px">' +
      '<button class="btn" data-act="inputManual">Input Manual</button>' +
      '<button class="btn btn-wa" data-act="kirimWaHarian">' + I.wa + ' Kirim WA</button>' +
      '</div>';

    h += '<div class="sec-title">Sudah setor &middot; ' + sudah.length + ' rumah</div>';
    if (!sudah.length) {
      h += '<div class="card"><div class="empty">' + I.kosong + '<p>Belum ada setoran malam ini.<br>Tekan <b>SCAN BARCODE</b> untuk mulai keliling.</p></div></div>';
    } else {
      var daftar = setorTgl(tgl).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      h += '<div class="list">';
      daftar.forEach(function (s) {
        var r = byId(s.rumahId) || { no: '?', nama: '(rumah dihapus)', blok: '' };
        h += '<div class="li tap" data-act="editSetor" data-id="' + s.id + '">' +
          '<div class="av ok">' + esc(r.no) + '</div>' +
          '<div class="mid"><b>' + esc(r.nama) + '</b><small>' +
          gab(esc(r.blok), esc(s.jam || ''), s.manual ? 'manual' : '') + '</small></div>' +
          '<div class="end"><span class="amt g">' + rp(s.nominal) + '</span></div>' +
          '</div>';
      });
      h += '</div>';
    }

    h += '<div class="sec-title">Belum setor &middot; ' + belum.length + ' rumah</div>';
    if (!belum.length) {
      h += '<div class="card"><div class="empty"><p>🎉 Alhamdulillah, semua rumah sudah setor malam ini.</p></div></div>';
    } else {
      h += '<div class="list">';
      belum.forEach(function (r) {
        h += '<div class="li">' +
          '<div class="av no">' + esc(r.no) + '</div>' +
          '<div class="mid"><b>' + esc(r.nama) + '</b><small>' + gab(esc(r.blok), rp(r.nominal), r.kode ? '' : '<span style="color:var(--amb)">belum ada barcode</span>') + '</small></div>' +
          '<div class="end"><button class="btn btn-sm" data-act="setorCepat" data-id="' + r.id + '">Setor</button></div>' +
          '</div>';
      });
      h += '</div>';
    }
    h += '<p class="note">Catatan: setoran setelah tengah malam (sebelum pukul 04.00) otomatis masuk ke tanggal ronda malam sebelumnya.' +
      (rbl.length ? ' Rumah bertanda <b>BORONGAN</b> (' + rbl.length + ' rumah) membayar langsung ke bendahara sekali sebulan — hanya dicatat <b>Lunas / Belum</b>, nominalnya tidak masuk hitungan kas jimpitan.' : '') + '</p>';

    $('#view-ronda').innerHTML = h;
  }

  /* ========================= VIEW: RUMAH ========================= */
  function viewRumah() {
    var bloks = [];
    DB.rumah.forEach(function (r) { if (r.blok && bloks.indexOf(r.blok) < 0) bloks.push(r.blok); });
    bloks.sort();

    var q = norm(S.cari);
    var list = DB.rumah.slice().sort(urutRumah).filter(function (r) {
      if (S.filterBlok === 'nokode' && r.kode) return false;
      if (S.filterBlok === 'adakode' && !r.kode) return false;
      if (S.filterBlok === 'fharian' && isBulanan(r)) return false;
      if (S.filterBlok === 'fbulanan' && !isBulanan(r)) return false;
      if (['semua', 'nokode', 'adakode', 'fharian', 'fbulanan'].indexOf(S.filterBlok) < 0 && r.blok !== S.filterBlok) return false;
      if (!q) return true;
      return norm(r.nama).indexOf(q) >= 0 || norm(r.no).indexOf(q) >= 0 || norm(r.kode).indexOf(q) >= 0;
    });
    var tanpaKode = DB.rumah.filter(function (r) { return !r.kode; }).length;
    var nBulanan = DB.rumah.filter(isBulanan).length;

    var h = '';
    if (!DB.rumah.length) {
      h += '<div class="card"><div class="empty"><p><b>Belum ada data rumah.</b><br><br>' +
        'Tekan tombol <b>+</b> di pojok kanan bawah untuk menambahkan rumah satu per satu ' +
        '(nomor, nama kepala keluarga, dan nominal jimpitannya).<br><br>' +
        'Sesudah itu, menu <b>Buat QR &amp; Cetak Stiker</b> bisa membuatkan barcode untuk tiap rumah.</p></div></div>';
      h += '<button class="fab" data-act="tambahRumah">' + I.plus + '</button>';
      $('#view-rumah').innerHTML = h;
      return;
    }
    h += '<div class="grid3">' +
      '<div class="mini"><div class="k">Total</div><div class="v">' + DB.rumah.length + '</div></div>' +
      '<div class="mini info"><div class="k">Borongan</div><div class="v">' + nBulanan + '</div></div>' +
      '<div class="mini ' + (tanpaKode ? 'warn' : 'ok') + '"><div class="k">Tanpa kode</div><div class="v">' + tanpaKode + '</div></div>' +
      '</div>';

    h += '<div class="row-btn">' +
      '<button class="btn btn-amber" data-act="daftarMassal">' + I.scan + ' Daftar Barcode</button>' +
      '<button class="btn" data-act="nominalMassal">Nominal Massal</button>' +
      '</div>';
    h += '<button class="btn btn-block" style="margin-top:9px" data-act="panelQR">' +
      I.unduh + ' Buat QR &amp; Cetak Stiker</button>';

    h += '<div class="search">' + I.cari +
      '<input class="inp" id="qCari" placeholder="Cari nama / nomor / kode…" value="' + esc(S.cari) + '">' +
      '</div>';

    h += '<div class="chips">';
    h += '<button class="chip ' + (S.filterBlok === 'semua' ? 'on' : '') + '" data-act="fblok" data-id="semua">Semua</button>';
    bloks.forEach(function (b) {
      h += '<button class="chip ' + (S.filterBlok === b ? 'on' : '') + '" data-act="fblok" data-id="' + esc(b) + '">' + esc(b) + '</button>';
    });
    h += '<button class="chip ' + (S.filterBlok === 'fharian' ? 'on' : '') + '" data-act="fblok" data-id="fharian">Tiap malam</button>';
    h += '<button class="chip ' + (S.filterBlok === 'fbulanan' ? 'on' : '') + '" data-act="fblok" data-id="fbulanan">Borongan bulanan</button>';
    h += '<button class="chip ' + (S.filterBlok === 'nokode' ? 'on' : '') + '" data-act="fblok" data-id="nokode">Belum ada barcode</button>';
    h += '<button class="chip ' + (S.filterBlok === 'adakode' ? 'on' : '') + '" data-act="fblok" data-id="adakode">Sudah ada barcode</button>';
    h += '</div>';

    if (!list.length) {
      h += '<div class="card"><div class="empty">' + I.kosong + '<p>Tidak ada data yang cocok.</p></div></div>';
    } else {
      h += '<div class="list">';
      list.forEach(function (r) {
        var rb2 = isBulanan(r);
        h += '<div class="li tap" data-act="editRumah" data-id="' + r.id + '">' +
          '<div class="av">' + esc(r.no) + '</div>' +
          '<div class="mid"><b>' + esc(r.nama) + (rb2 ? ' <span class="pill b">BORONGAN</span>' : '') +
          (r.aktif === false ? ' <span class="pill n">nonaktif</span>' : '') + '</b>' +
          '<small>' + gab(esc(r.blok), r.kode ? '🏷️ ' + esc(r.kode) : '<span style="color:var(--amb)">belum ada barcode</span>') + '</small></div>' +
          '<div class="end col">' + (rb2
            ? '<span class="pill b">borongan</span>'
            : '<span class="amt">' + rp(r.nominal) + '</span><small>/malam</small>') + '</div>' +
          '</div>';
      });
      h += '</div>';
    }
    h += '<p class="note">Ketuk salah satu rumah untuk mengubah nama, nominal, atau mendaftarkan kode barcode-nya.</p>';
    h += '<div style="height:52px"></div>';
    h += '<button class="fab" data-act="tambahRumah">' + I.plus + '</button>';

    $('#view-rumah').innerHTML = h;
    var inp = $('#qCari');
    if (inp) {
      inp.addEventListener('input', function () {
        S.cari = inp.value;
        var pos = inp.selectionStart;
        viewRumah();
        var n = $('#qCari'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } }
      });
    }
  }

  function formRumah(r) {
    var baru = !r;
    r = r || {
      id: '', no: '', nama: '', blok: '', kode: '',
      nominal: DB.set.nominalDefault, cara: 'harian', aktif: true
    };
    var fb = isBulanan(r);
    var bloks = [];
    DB.rumah.forEach(function (x) { if (x.blok && bloks.indexOf(x.blok) < 0) bloks.push(x.blok); });
    var h = '<input type="hidden" id="fId" value="' + esc(r.id) + '">' +
      '<div class="inp-grp" style="margin-bottom:12px">' +
      '<div class="field" style="flex:0 0 32%;margin:0"><label>No. Rumah</label><input class="inp" id="fNo" value="' + esc(r.no) + '" placeholder="01"></div>' +
      '<div class="field" style="flex:1;margin:0"><label>Nama Kepala Keluarga</label><input class="inp" id="fNama" value="' + esc(r.nama) + '" placeholder="Bp. Sutrisno"></div>' +
      '</div>' +
      '<div class="field"><label>Cara setor jimpitan</label>' +
      '<div class="seg" id="fCara" data-val="' + (fb ? 'bulanan' : 'harian') + '">' +
      '<button type="button" class="' + (fb ? '' : 'on') + '" data-act="segCara" data-id="harian">Tiap malam</button>' +
      '<button type="button" class="' + (fb ? 'on' : '') + '" data-act="segCara" data-id="bulanan">Borongan bulanan</button>' +
      '</div></div>' +
      '<div class="field" id="wrapHarian"' + (fb ? ' style="display:none"' : '') + '>' +
      '<label>Nominal jimpitan per malam (Rp)</label>' +
      '<input class="inp" id="fNominal" inputmode="numeric" value="' + num(r.nominal) + '"></div>' +
      '<div class="field" id="wrapBulanan"' + (fb ? '' : ' style="display:none"') + '>' +
      '<div style="background:var(--blu-bg);border-radius:12px;padding:12px 13px;font-size:13px;line-height:1.6;color:var(--tx)">' +
      'Rumah ini membayar <b>borongan sekali sebulan</b> langsung ke bendahara.<br>' +
      '• Tidak dihitung "belum setor" tiap malam<br>' +
      '• Hanya ditandai <b>LUNAS / BELUM</b> tiap bulan — <b>tanpa nominal</b><br>' +
      '• <b>Tidak</b> ikut dihitung dalam kas jimpitan<br>' +
      '• Barcode-nya tetap bisa di-scan untuk menandai lunas' +
      '</div></div>' +
      '<div class="field"><label>Keterangan / Blok <span style="font-weight:400">(opsional)</span></label><input class="inp" id="fBlok" list="blokList" value="' + esc(r.blok) + '" placeholder="boleh dikosongkan">' +
      '<datalist id="blokList">' + bloks.map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist></div>' +
      '<div class="field"><label>Kode barcode stiker rumah</label>' +
      '<div class="inp-grp"><input class="inp" id="fKode" value="' + esc(r.kode) + '" placeholder="scan atau ketik kode">' +
      '<button class="btn btn-amber" data-act="scanKeField" style="flex:0 0 auto">' + I.scan + '</button></div></div>' +
      '<div class="switch"><div class="t"><b>Rumah aktif</b><small>Nonaktif = tidak ikut dihitung</small></div>' +
      '<div class="sw ' + (r.aktif !== false ? 'on' : '') + '" id="fAktif" data-act="togAktif"><i></i></div></div>' +
      '<div style="height:14px"></div>' +
      '<button class="btn btn-primary btn-block" data-act="simpanRumah">Simpan</button>';
    if (!baru) h += '<button class="btn btn-danger btn-block" style="margin-top:9px" data-act="hapusRumah" data-id="' + r.id + '">Hapus rumah ini</button>';
    sheet(baru ? 'Tambah Rumah' : 'Ubah Data Rumah', h);
  }

  /* ========================= VIEW: REKAP ========================= */
  function viewRekap() {
    var h = '<div class="chips">' +
      ['harian', 'bulanan', 'rumah'].map(function (m) {
        var lbl = m === 'harian' ? 'Harian' : m === 'bulanan' ? 'Bulanan' : 'Per Rumah';
        return '<button class="chip ' + (S.rekap === m ? 'on' : '') + '" data-act="frekap" data-id="' + m + '">' + lbl + '</button>';
      }).join('') + '</div>';

    if (S.rekap === 'harian') h += rekapHarian();
    else if (S.rekap === 'bulanan') h += rekapBulanan();
    else h += rekapPerRumah();

    $('#view-rekap').innerHTML = h;
  }

  function rekapHarian() {
    var tgl = S.rekapTgl;
    var rs = rumahHarian().slice().sort(urutRumah);
    var sudah = rs.filter(function (r) { return sudahSetor(tgl, r.id); });
    var belum = rs.filter(function (r) { return !sudahSetor(tgl, r.id); });
    var tot = totalTgl(tgl);
    var h = barTanggal(tgl, 'rtgl');
    h += '<div class="card"><div class="kv"><span>Jimpitan terkumpul</span><b style="color:var(--grn)">' + rp(tot) + '</b></div>' +
      '<div class="kv"><span>Rumah setor</span><b>' + sudah.length + ' / ' + rs.length + '</b></div>' +
      '<div class="kv"><span>Rata-rata per rumah</span><b>' + rp(sudah.length ? tot / sudah.length : 0) + '</b></div>' +
      '<div class="kv"><span>Belum setor</span><b style="color:var(--red)">' + belum.length + ' rumah</b></div></div>';

    h += '<div class="row-btn">' +
      '<button class="btn btn-wa" data-act="kirimWaHarianRekap">' + I.wa + ' Kirim WA</button>' +
      '<button class="btn" data-act="csvHarian">' + I.unduh + ' CSV</button></div>';

    h += '<div class="sec-title">Daftar setoran</div>';
    if (!sudah.length) h += '<div class="card"><div class="empty"><p>Tidak ada setoran pada tanggal ini.</p></div></div>';
    else {
      h += '<div class="list">';
      setorTgl(tgl).slice().sort(function (a, b) { var ra = byId(a.rumahId) || {}, rb = byId(b.rumahId) || {}; return angka(ra.no) - angka(rb.no); })
        .forEach(function (s) {
          var r = byId(s.rumahId) || { no: '?', nama: '(dihapus)', blok: '' };
          h += '<div class="li tap" data-act="editSetor" data-id="' + s.id + '"><div class="av ok">' + esc(r.no) + '</div>' +
            '<div class="mid"><b>' + esc(r.nama) + '</b><small>' +
            gab(esc(r.blok), esc(s.jam || '')) + '</small></div>' +
            '<div class="end"><span class="amt g">' + rp(s.nominal) + '</span></div></div>';
        });
      h += '</div>';
    }

    h += '<div class="sec-title">Belum setor</div>';
    if (!belum.length) h += '<div class="card"><div class="empty"><p>Semua rumah sudah setor 👍</p></div></div>';
    else {
      h += '<div class="list">';
      belum.forEach(function (r) {
        h += '<div class="li"><div class="av no">' + esc(r.no) + '</div><div class="mid"><b>' + esc(r.nama) + '</b><small>' + esc(r.blok || '') + '</small></div>' +
          '<div class="end"><span class="pill r">belum</span></div></div>';
      });
      h += '</div>';
    }
    return h;
  }

  function hariDiBulan(bln) {
    var map = {}, out = [];
    DB.setor.forEach(function (s) { if (String(s.tgl).indexOf(bln) === 0) map[s.tgl] = (map[s.tgl] || 0) + s.nominal; });
    for (var k in map) out.push({ tgl: k, total: map[k] });
    out.sort(function (a, b) { return a.tgl < b.tgl ? -1 : 1; });
    return out;
  }

  function rekapBulanan() {
    var bln = S.bulan;
    var hari = hariDiBulan(bln);
    var tot = hari.reduce(function (a, x) { return a + x.total; }, 0);
    var maks = hari.reduce(function (a, x) { return Math.max(a, x.total); }, 1);

    var h = '<div class="datebar"><button data-act="blnPrev">' + I.left + '</button>' +
      '<div class="dmid"><b>' + esc(namaBulan(bln)) + '</b><small>ketuk untuk pilih bulan</small>' +
      '<input type="month" value="' + bln + '" data-act="blnPick"></div>' +
      '<button data-act="blnNext">' + I.right + '</button></div>';

    h += '<div class="hero" style="background:linear-gradient(140deg,#1D4ED8,#0E7490)">' +
      '<div class="lbl">Total jimpitan ' + esc(namaBulan(bln)) + '</div>' +
      '<div class="amt">' + rp(tot) + '</div>' +
      '<div class="foot"><span>' + hari.length + ' malam ronda</span><span>rata-rata ' + rp(hari.length ? tot / hari.length : 0) + '/malam</span></div></div>';

    h += '<div class="row-btn"><button class="btn btn-wa" data-act="kirimWaBulanan">' + I.wa + ' Kirim WA</button>' +
      '<button class="btn" data-act="csvBulanan">' + I.unduh + ' CSV</button></div>';

    h += '<div class="sec-title">Grafik per malam</div><div class="card">';
    if (!hari.length) h += '<div class="empty"><p>Belum ada data pada bulan ini.</p></div>';
    else hari.forEach(function (x) {
      var d = parseISO(x.tgl);
      h += '<div class="bar"><div class="d">' + pad(d.getDate()) + ' ' + BLNS[d.getMonth()] + '</div>' +
        '<div class="t"><i style="width:' + Math.max(4, Math.round(x.total / maks * 100)) + '%"></i></div>' +
        '<div class="n">' + rp(x.total) + '</div></div>';
    });
    h += '</div>';

    var rbl = rumahBulanan().slice().sort(urutRumah);
    if (rbl.length) {
      var lunasB = rbl.filter(function (r) { return lunasBulan(bln, r.id); });
      h += '<div class="sec-title">Borongan bulanan (di luar kas jimpitan)</div>';
      h += '<div class="card"><div class="kv"><span>Lunas</span><b style="color:var(--grn)">' + lunasB.length + ' rumah</b></div>' +
        '<div class="kv"><span>Belum lunas</span><b style="color:var(--red)">' + (rbl.length - lunasB.length) + ' rumah</b></div></div>';
      h += '<div class="list">';
      rbl.forEach(function (r) {
        var lu = lunasBulan(bln, r.id);
        h += '<div class="li"><div class="av ' + (lu ? 'ok' : 'no') + '">' + esc(r.no) + '</div>' +
          '<div class="mid"><b>' + esc(r.nama) + '</b><small>' + (lu ? 'sudah lunas' : 'belum lunas') + '</small></div>' +
          '<div class="end"><span class="pill ' + (lu ? 'g' : 'r') + '">' + (lu ? 'LUNAS' : 'BELUM') + '</span></div></div>';
      });
      h += '</div>';
    }
    return h;
  }

  function rekapPerRumah() {
    var bln = S.bulan;
    var stat = {};
    DB.setor.forEach(function (s) {
      if (String(s.tgl).indexOf(bln) !== 0) return;
      if (!stat[s.rumahId]) stat[s.rumahId] = { n: 0, t: 0 };
      stat[s.rumahId].n++; stat[s.rumahId].t += s.nominal;
    });
    var malam = hariDiBulan(bln).length;
    var rs = aktif().slice().sort(urutRumah);

    var h = '<div class="datebar"><button data-act="blnPrev">' + I.left + '</button>' +
      '<div class="dmid"><b>' + esc(namaBulan(bln)) + '</b><small>' + malam + ' malam ronda</small>' +
      '<input type="month" value="' + bln + '" data-act="blnPick"></div>' +
      '<button data-act="blnNext">' + I.right + '</button></div>';

    h += '<div class="row-btn"><button class="btn btn-wa" data-act="kirimWaPerRumah">' + I.wa + ' Kirim WA</button>' +
      '<button class="btn" data-act="csvPerRumah">' + I.unduh + ' CSV</button></div>';

    h += '<div class="list">';
    rs.forEach(function (r) {
      var st = stat[r.id] || { n: 0, t: 0 };
      if (isBulanan(r)) {
        var lu = lunasBulan(bln, r.id);
        h += '<div class="li"><div class="av ' + (lu ? 'ok' : 'no') + '">' + esc(r.no) + '</div>' +
          '<div class="mid"><b>' + esc(r.nama) + ' <span class="pill b">BORONGAN</span></b><small>bayar langsung ke bendahara</small></div>' +
          '<div class="end"><span class="pill ' + (lu ? 'g' : 'r') + '">' + (lu ? 'LUNAS' : 'BELUM') + '</span></div></div>';
        return;
      }
      var pc = malam ? Math.round(st.n / malam * 100) : 0;
      var cls = pc >= 80 ? 'g' : pc >= 50 ? 'a' : 'r';
      h += '<div class="li"><div class="av">' + esc(r.no) + '</div>' +
        '<div class="mid"><b>' + esc(r.nama) + '</b><small>' + st.n + ' dari ' + malam + ' malam · <span class="pill ' + cls + '">' + pc + '%</span></small></div>' +
        '<div class="end"><span class="amt">' + rp(st.t) + '</span></div></div>';
    });
    h += '</div>';
    return h;
  }

  /* ========================= VIEW: KAS ========================= */
  function viewKas() {
    var h = '<div class="hero" style="background:linear-gradient(140deg,#7C3AED,#1D4ED8)">' +
      '<div class="lbl">Saldo kas ronda saat ini</div>' +
      '<div class="amt">' + rp(saldo()) + '</div>' +
      '<div class="foot"><span>per ' + esc(tglPendek(ymd(new Date()))) + '</span><span>RT ' + esc(DB.set.rt) + '/RW ' + esc(DB.set.rw) + '</span></div></div>';

    h += '<div class="row-btn">' +
      '<button class="btn" style="background:var(--grn-bg);color:var(--grn);border-color:transparent" data-act="kasBaru" data-id="masuk">+ Pemasukan</button>' +
      '<button class="btn btn-danger" data-act="kasBaru" data-id="keluar">− Pengeluaran</button></div>';
    h += '<button class="btn btn-wa btn-block" data-act="kirimWaKas" style="margin-bottom:12px">' + I.wa + ' Laporkan saldo ke grup WA</button>';

    h += '<div class="sec-title">Ringkasan</div><div class="card">' +
      '<div class="kv"><span>Saldo awal</span><b>' + rp(DB.set.saldoAwal) + '</b></div>' +
      '<div class="kv"><span>Jimpitan masuk (' + DB.setor.length + ' setoran)</span><b style="color:var(--grn)">+ ' + rp(totalSemuaJimpitan()) + '</b></div>' +
      '<div class="kv"><span>Pemasukan lain</span><b style="color:var(--grn)">+ ' + rp(kasMasuk()) + '</b></div>' +
      '<div class="kv"><span>Pengeluaran</span><b style="color:var(--red)">− ' + rp(kasKeluar()) + '</b></div>' +
      '<div class="kv" style="border-top:2px solid var(--line);margin-top:4px;padding-top:11px"><span><b>Saldo akhir</b></span><b style="font-size:17px">' + rp(saldo()) + '</b></div>' +
      '</div>';

    h += '<div class="sec-title">Mutasi kas (di luar jimpitan)</div>';
    if (!DB.kas.length) {
      h += '<div class="card"><div class="empty"><p>Belum ada catatan pemasukan / pengeluaran lain.</p></div></div>';
    } else {
      var ks = DB.kas.slice().sort(function (a, b) { return a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : (b.ts || 0) - (a.ts || 0); });
      h += '<div class="list">';
      ks.forEach(function (k) {
        h += '<div class="li"><div class="av ' + (k.jenis === 'masuk' ? 'ok' : 'no') + '">' + (k.jenis === 'masuk' ? '+' : '−') + '</div>' +
          '<div class="mid"><b>' + esc(k.ket) + '</b><small>' + esc(tglPendek(k.tgl)) + '</small></div>' +
          '<div class="end"><span class="amt ' + (k.jenis === 'masuk' ? 'g' : 'r') + '">' + rp(k.nominal) + '</span>' +
          '<button class="xbtn" data-act="hapusKas" data-id="' + k.id + '">' + I.x + '</button></div></div>';
      });
      h += '</div>';
    }
    $('#view-kas').innerHTML = h;
  }

  /* ========================= VIEW: PENGATURAN ========================= */
  function viewAtur() {
    var s = DB.set;
    function f(id, lbl, val, ph, tipe) {
      return '<div class="field"><label>' + lbl + '</label><input class="inp" data-set="' + id + '" ' +
        (tipe === 'num' ? 'inputmode="numeric"' : '') + ' value="' + esc(val) + '" placeholder="' + esc(ph || '') + '"></div>';
    }
    var h = '<div class="sec-title">Identitas RT</div><div class="card">' +
      '<div class="inp-grp" style="margin-bottom:12px">' +
      '<div class="field" style="flex:1;margin:0"><label>RT</label><input class="inp" data-set="rt" value="' + esc(s.rt) + '"></div>' +
      '<div class="field" style="flex:1;margin:0"><label>RW</label><input class="inp" data-set="rw" value="' + esc(s.rw) + '"></div>' +
      '</div>' +
      f('kampung', 'Kampung / Dukuh', s.kampung, 'nama kampung') +
      f('kel', 'Kelurahan / Desa', s.kel, 'nama kelurahan') +
      f('kec', 'Kecamatan', s.kec, 'nama kecamatan') +
      f('kota', 'Kota / Kabupaten', s.kota, 'nama kota') +
      f('ketua', 'Ketua RT', s.ketua, 'nama ketua RT') +
      f('bendahara', 'Bendahara', s.bendahara, 'nama bendahara') +
      f('koor', 'Koordinator ronda', s.koor, 'nama koordinator') +
      '</div>';

    h += '<div class="sec-title">Keuangan</div><div class="card">' +
      f('saldoAwal', 'Saldo awal kas (Rp)', num(s.saldoAwal), '0', 'num') +
      f('nominalDefault', 'Nominal jimpitan harian default (Rp)', num(s.nominalDefault), '1000', 'num') +
      '<p class="note" style="margin-top:0">Hanya dipakai untuk rumah baru. Nominal tiap rumah diatur sendiri-sendiri di menu <b>Rumah</b>. Rumah <b>borongan</b> tidak punya nominal dan tidak dihitung dalam kas.</p></div>';

    h += '<div class="sec-title">Barcode &amp; laporan</div><div class="card">' +
      f('prefiks', 'Awalan kode QR buatan aplikasi', s.prefiks || 'JMP', 'JMP') +
      '<p class="note" style="margin-top:0">Dipakai saat menu <b>Rumah → Buat QR &amp; Cetak Stiker</b> membuatkan kode, contoh: <b>' +
      esc((s.prefiks || 'JMP').toUpperCase()) + '-001</b>. Ganti kalau RT tetangga memakai aplikasi yang sama.</p>' +
      '<div class="field"><label>Salam penutup laporan WhatsApp</label>' +
      '<textarea class="inp" data-set="salam" rows="3" style="resize:vertical;font:inherit">' + esc(s.salam || '') + '</textarea></div>' +
      '<p class="note" style="margin-top:0">Kosongkan kalau tidak perlu. Bawaan memakai bahasa Jawa — silakan ganti sesuai daerah masing-masing.</p></div>';

    h += '<div class="sec-title">Tampilan &amp; Scan</div><div class="card">' +
      swc('tema', 'Mode terang', 'Tema putih untuk siang hari', s.tema === 'terang') +
      swc('beruntun', 'Scan beruntun', 'Kamera tetap menyala setelah berhasil scan', s.beruntun) +
      swc('suara', 'Bunyi & getar', 'Nada saat scan berhasil / gagal', s.suara) +
      swc('rincian', 'Sertakan rincian di WA', 'Tampilkan daftar nama di laporan WhatsApp', s.rincian) +
      '</div>';

    h += '<div class="sec-title">Halaman web untuk warga</div><div class="card">' +
      '<p class="note" style="margin:0 0 10px">Laporan bisa dibuka warga lewat <b>tautan di grup WA</b> — ' +
      'tidak perlu memasang aplikasi. Isi alamat situs RT yang sudah diunggah ke GitHub Pages.</p>' +
      '<div class="field"><label>Alamat situs RT</label>' +
      '<input class="inp" data-set="webURL" placeholder="https://namaanda.github.io/jimpitan-rt/" value="' + esc(s.webURL || '') + '"></div>';
    if (alamatWarga()) {
      h += '<div class="kv"><span>Halaman warga</span><b style="color:var(--grn);word-break:break-all">' + esc(alamatWarga()) + '</b></div>' +
        '<div class="row-btn" style="margin-top:10px">' +
        '<button class="btn" data-act="salinLinkWarga">Salin tautan</button>' +
        '<button class="btn" data-act="bukaWarga">Buka halaman</button></div>' +
        '<button class="btn btn-wa btn-block" style="margin-top:9px" data-act="kirimLinkWarga">' + I.wa + ' Kirim tautan ke grup</button>' +
        '<p class="note">Tautan sudah berisi laporan hari ini — warga langsung melihat isinya tanpa aplikasi apa pun.</p>';
      h += '<div style="border-top:1px solid var(--line);margin:14px 0 0;padding-top:12px">' +
        '<b style="font-size:14px">Terbitkan otomatis <span class="pill" style="background:var(--blu-bg);color:var(--blu);font-size:10px;padding:2px 7px;border-radius:999px">lanjutan</span></b>' +
        '<p class="note" style="margin:5px 0 10px">Supaya alamat di atas <b>selalu berisi laporan terbaru</b> tanpa harus kirim tautan baru. ' +
        'Perlu token GitHub — caranya ada di panduan.</p>' +
        '<div class="field" style="margin-bottom:8px"><label>Nama pengguna GitHub</label>' +
        '<input class="inp" data-set="ghUser" placeholder="namaanda" value="' + esc(s.ghUser || '') + '"></div>' +
        '<div class="field" style="margin-bottom:8px"><label>Nama repositori</label>' +
        '<input class="inp" data-set="ghRepo" placeholder="jimpitan-rt" value="' + esc(s.ghRepo || '') + '"></div>' +
        '<div class="field" style="margin-bottom:8px"><label>Token GitHub</label>' +
        '<input class="inp" type="password" data-set="ghToken" placeholder="github_pat_…" value="' + esc(s.ghToken || '') + '"></div>' +
        swc('autoTerbit', 'Terbitkan tiap kirim laporan', 'Otomatis saat menekan Kirim ke WhatsApp', s.autoTerbit) +
        '<button class="btn btn-block" style="margin-top:10px" data-act="terbitSekarang">Terbitkan laporan sekarang</button>' +
        (s.webTerbit ? '<p class="note">Terakhir diterbitkan: <b>' + esc(waktuSingkat(s.webTerbit)) + '</b></p>' : '') +
        '</div>';
    }
    h += '</div>';

    h += '<div class="sec-title">Data</div><div class="card">';
    if (adaFiturCadangan()) {
      var lokA = lokasiCadangan();
      h += '<button class="btn btn-primary btn-block" data-act="panelCadangan">☁️ Cadangan ke Google Drive</button>' +
        '<p class="note" style="margin-top:7px">' + (lokA
          ? 'Tujuan: <b>' + esc(lokA) + '</b><br>Terakhir: <b>' +
            (DB.set.cadangTerakhir ? esc(waktuSingkat(DB.set.cadangTerakhir)) : 'belum pernah') + '</b>' +
            (DB.set.autoCadang ? ' · otomatis <b>aktif</b>' : ' · otomatis <b>mati</b>')
          : '<span style="color:var(--amb)">Belum diatur</span> — pilih lokasinya sekali, lalu cadangan jalan sendiri tiap hari.') +
        '</p>';
    }
    h += '<button class="btn btn-block" data-act="backup">' + I.unduh + ' Cadangkan data (.json)</button>' +
      '<button class="btn btn-block" style="margin-top:9px" data-act="restore">Pulihkan dari cadangan</button>' +
      '<button class="btn btn-block" style="margin-top:9px" data-act="csvSemua">' + I.unduh + ' Ekspor semua setoran (CSV)</button>' +
      '<button class="btn btn-danger btn-block" style="margin-top:9px" data-act="resetSetoran">Hapus semua data setoran</button>' +
      '<button class="btn btn-danger btn-block" style="margin-top:9px" data-act="resetTotal">Reset total (pabrik)</button>' +
      '</div>';

    h += '<div class="sec-title">Tentang</div><div class="card">' +
      '<div class="kv"><span>Aplikasi</span><b>Jimpitan Ronda</b></div>' +
      '<div class="kv"><span>Wilayah</span><b>RT ' + esc(s.rt) + ' / RW ' + esc(s.rw) + ' ' + esc(s.kampung) + '</b></div>' +
      '<div class="kv"><span>Versi</span><b>' + esc(A && A.appVersion ? A.appVersion() : '1.7.0') +
      (A ? '' : (IOS ? ' · iPhone' : ' · web')) + '</b></div>' +
      '<div class="kv"><span>Data tersimpan</span><b>' + DB.rumah.length + ' rumah · ' + DB.setor.length + ' setoran</b></div>' +
      '<div class="kv"><span>Cara setor</span><b>' + DB.rumah.filter(function (r) { return !isBulanan(r); }).length +
      ' harian · ' + DB.rumah.filter(isBulanan).length + ' borongan</b></div>' +
      '<p class="note">Semua data tersimpan di dalam HP ini saja (offline). Rutin lakukan <b>Cadangkan data</b> agar aman bila HP diganti.</p></div>';

    if (IOS && !TERPASANG) {
      h += '<button class="btn btn-primary btn-block" style="margin-top:9px" data-act="panduanIOS">' +
        '📱 Pasang di Layar Utama iPhone</button>';
    }

    $('#view-atur').innerHTML = h;

    $$('[data-set]').forEach(function (el) {
      el.addEventListener('change', function () {
        var k = el.getAttribute('data-set');
        var numerik = (k === 'saldoAwal' || k === 'nominalDefault');
        if (k === 'prefiks') {
          DB.set.prefiks = (el.value || 'JMP').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'JMP';
          el.value = DB.set.prefiks;
          simpan(); render();
          return;
        }
        DB.set[k] = numerik ? angka(el.value) : el.value;
        if (numerik) el.value = num(DB.set[k]);
        simpan(); render();
      });
    });
  }
  function swc(id, judul, sub, on) {
    return '<div class="switch"><div class="t"><b>' + judul + '</b><small>' + sub + '</small></div>' +
      '<div class="sw ' + (on ? 'on' : '') + '" data-act="togSet" data-id="' + id + '"><i></i></div></div>';
  }

  /* ========================= LAPORAN WHATSAPP ========================= */
  var GARIS = '━━━━━━━━━━━━━━━';
  /* gabungkan hanya bagian yang terisi — identitas RT bebas dikosongkan */
  function gabKoma() {
    var a = [], i;
    for (i = 0; i < arguments.length; i++) if (arguments[i]) a.push(arguments[i]);
    return a.join(', ');
  }
  function labelRT() {
    var s = DB.set, t = '';
    if (s.rt) t += 'RT ' + s.rt;
    if (s.rw) t += (t ? ' / ' : '') + 'RW ' + s.rw;
    if (s.kampung) t += (t ? ' — ' : '') + s.kampung;
    return t;
  }
  function kop() {
    var s = DB.set, t = '*LAPORAN JIMPITAN RONDA*\n';
    var l = labelRT();
    if (l) t += '*' + l + '*\n';
    var w = gabKoma(s.kel, s.kec, s.kota);
    if (w) t += w + '\n';
    return t + GARIS + '\n';
  }
  function kaki() {
    var s = DB.set, t = '\n' + GARIS + '\n🏦 *SALDO KAS RT : ' + rp(saldo()) + '*\n';
    if (s.bendahara) t += '_Bendahara: ' + s.bendahara + '_\n';
    if (s.salam) t += '\n' + s.salam + '\n';
    t += '_Dibuat otomatis oleh Aplikasi Jimpitan' + (labelRT() ? ' ' + labelRT() : '') + '_';
    return t;
  }

  function lapHarian(tgl) {
    var per = periodeDari(tgl);
    var rs = rumahHarian().slice().sort(urutRumah);
    var rbl = rumahBulanan().slice().sort(urutRumah);
    var sudah = rs.filter(function (r) { return sudahSetor(tgl, r.id); });
    var belum = rs.filter(function (r) { return !sudahSetor(tgl, r.id); });
    var tot = totalTgl(tgl);
    var pct = rs.length ? Math.round(sudah.length / rs.length * 100) : 0;

    var t = kop();
    t += '🗓️ ' + tglPanjang(tgl) + '\n';
    t += '⏰ Dilaporkan pukul ' + jamKini() + ' WIB\n\n';
    t += '💰 *Jimpitan malam ini : ' + rp(tot) + '*\n';
    t += '🏠 Sudah setor : ' + sudah.length + ' dari ' + rs.length + ' rumah\n';
    t += '⚪ Belum setor : ' + belum.length + ' rumah\n';
    t += '📊 Pencapaian : ' + pct + '%\n';

    if (DB.set.rincian && sudah.length) {
      t += '\n*RINCIAN SETORAN*\n';
      setorTgl(tgl).slice().sort(function (a, b) {
          var ra = byId(a.rumahId) || {}, rb = byId(b.rumahId) || {}; return angka(ra.no) - angka(rb.no);
        }).forEach(function (s) {
          var r = byId(s.rumahId) || { no: '?', nama: '(dihapus)' };
          t += r.no + '. ' + r.nama + ' — ' + rp(s.nominal) + '\n';
        });
    }
    if (DB.set.rincian && belum.length) {
      t += '\n*BELUM SETOR*\n';
      belum.forEach(function (r) { t += '• ' + r.no + '. ' + r.nama + '\n'; });
    }
    if (rbl.length) {
      var lunasB = rbl.filter(function (r) { return lunasBulan(per, r.id); });
      t += '\n*BORONGAN BULANAN ' + namaBulan(per).toUpperCase() + '*\n';
      t += '_(bayar langsung ke bendahara, di luar kas jimpitan)_\n';
      t += 'Lunas ' + lunasB.length + ' dari ' + rbl.length + ' rumah\n';
      if (DB.set.rincian) rbl.forEach(function (r) {
        t += (lunasBulan(per, r.id) ? '✅ ' : '⬜ ') + r.no + '. ' + r.nama + '\n';
      });
    }
    if (DB.set.koor) t += '\n🧑‍🤝‍🧑 Petugas ronda: ' + DB.set.koor + '\n';
    return t + kaki();
  }

  function lapBulanan(bln) {
    var hari = hariDiBulan(bln);
    var tot = hari.reduce(function (a, x) { return a + x.total; }, 0);
    var t = kop();
    t += '🗓️ *REKAP BULAN ' + namaBulan(bln).toUpperCase() + '*\n\n';
    t += '💰 Total jimpitan : *' + rp(tot) + '*\n';
    t += '🌙 Jumlah malam ronda : ' + hari.length + '\n';
    t += '📈 Rata-rata per malam : ' + rp(hari.length ? tot / hari.length : 0) + '\n';
    if (DB.set.rincian && hari.length) {
      t += '\n*RINCIAN PER MALAM*\n';
      hari.forEach(function (x) { t += tglPendek(x.tgl) + ' — ' + rp(x.total) + '\n'; });
    }
    var rbl = rumahBulanan().slice().sort(urutRumah);
    if (rbl.length) {
      var lunasB = rbl.filter(function (r) { return lunasBulan(bln, r.id); });
      t += '\n*BORONGAN BULANAN*\n';
      t += '_(bayar langsung ke bendahara, di luar kas jimpitan)_\n';
      t += 'Lunas : ' + lunasB.length + ' dari ' + rbl.length + ' rumah\n';
      if (DB.set.rincian) rbl.forEach(function (r) {
        t += (lunasBulan(bln, r.id) ? '✅ ' : '⬜ ') + r.no + '. ' + r.nama + '\n';
      });
    }
    t += '\n*RINGKASAN KAS*\n';
    t += 'Saldo awal : ' + rp(DB.set.saldoAwal) + '\n';
    t += 'Jimpitan masuk : ' + rp(totalSemuaJimpitan()) + '\n';
    t += 'Pemasukan lain : ' + rp(kasMasuk()) + '\n';
    t += 'Pengeluaran : ' + rp(kasKeluar()) + '\n';
    return t + kaki();
  }

  function lapPerRumah(bln) {
    var stat = {}, malam = hariDiBulan(bln).length;
    DB.setor.forEach(function (s) {
      if (String(s.tgl).indexOf(bln) !== 0) return;
      if (!stat[s.rumahId]) stat[s.rumahId] = { n: 0, t: 0 };
      stat[s.rumahId].n++; stat[s.rumahId].t += s.nominal;
    });
    var t = kop();
    t += '🗓️ *REKAP PER RUMAH — ' + namaBulan(bln).toUpperCase() + '*\n';
    t += '🌙 ' + malam + ' malam ronda\n\n';
    aktif().slice().sort(urutRumah).forEach(function (r) {
      var st = stat[r.id] || { n: 0, t: 0 };
      if (isBulanan(r)) {
        t += r.no + '. ' + r.nama + ' — BORONGAN ' + (lunasBulan(bln, r.id) ? '✅ LUNAS' : '⬜ BELUM') + '\n';
      } else {
        t += r.no + '. ' + r.nama + ' — ' + st.n + '/' + malam + ' malam · ' + rp(st.t) + '\n';
      }
    });
    return t + kaki();
  }

  function lapKas() {
    var s = DB.set;
    var t = kop();
    t += '🏦 *LAPORAN KAS RONDA*\n';
    t += '📅 Per ' + tglPanjang(ymd(new Date())) + '\n\n';
    t += 'Saldo awal : ' + rp(s.saldoAwal) + '\n';
    t += 'Jimpitan masuk : ' + rp(totalSemuaJimpitan()) + '\n';
    t += 'Pemasukan lain : ' + rp(kasMasuk()) + '\n';
    t += 'Pengeluaran : ' + rp(kasKeluar()) + '\n';
    t += GARIS + '\n';
    t += '💼 *SALDO AKHIR : ' + rp(saldo()) + '*\n';
    if (DB.kas.length && s.rincian) {
      t += '\n*MUTASI TERAKHIR*\n';
      DB.kas.slice().sort(function (a, b) { return a.tgl < b.tgl ? 1 : -1; }).slice(0, 15).forEach(function (k) {
        t += tglPendek(k.tgl) + ' ' + (k.jenis === 'masuk' ? '(+)' : '(−)') + ' ' + k.ket + ' : ' + rp(k.nominal) + '\n';
      });
    }
    if (s.bendahara) t += '\n_Bendahara: ' + s.bendahara + '_';
    if (s.ketua) t += '\n_Mengetahui Ketua RT: ' + s.ketua + '_';
    return t;
  }

  function pratinjauKirim(judul, teks, tgl) {
    window.__teksLaporan = teks;
    window.__linkLaporan = '';
    var adaWeb = !!alamatWarga();
    sheet(judul,
      '<pre class="rep">' + esc(teks) + '</pre>' +
      (adaWeb ? '<div id="infoLink" class="note" style="margin:10px 0 0">🔗 Menyiapkan tautan web untuk warga…</div>' : '') +
      '<div class="row-btn" style="margin:12px 0 0">' +
      '<button class="btn" data-act="salinLaporan">Salin teks</button>' +
      '<button class="btn" data-act="bagikanLain">Bagikan…</button></div>' +
      '<button class="btn btn-wa btn-block" style="margin-top:9px" data-act="kirimWaSekarang">' + I.wa + ' Kirim ke WhatsApp</button>' +
      '<p class="note">Setelah WhatsApp terbuka, pilih <b>grup RT</b> tujuan lalu tekan kirim.' +
      (adaWeb ? ' Tautan halaman web warga ikut terkirim.' : '') + '</p>');

    if (!adaWeb) return;
    linkWarga(tgl).then(function (u) {
      if (!u) return;
      window.__linkLaporan = u;
      window.__teksLaporan = teks + '\n🔗 *Lihat rincian lengkap di web:*\n' + u + '\n';
      var pre = $('#sheetWrap .rep'); if (pre) pre.textContent = window.__teksLaporan;
      var info = $('#infoLink');
      if (info) info.innerHTML = '🔗 Tautan warga siap — ikut terkirim ke grup. ' +
        '<a href="#" data-act="salinLink" style="color:var(--grn)">salin saja</a>';
      if (DB.set.autoTerbit) terbitkanWeb(tgl).then(function (h) {
        var i2 = $('#infoLink');
        if (i2) i2.innerHTML = h.ok
          ? '✅ Laporan juga sudah diterbitkan ke halaman web warga.'
          : '⚠️ Tautan siap, tapi gagal menerbitkan ke web: ' + esc(h.pesan);
      });
    }).catch(function () {
      var info = $('#infoLink');
      if (info) info.textContent = '⚠️ Tautan web gagal dibuat — laporan teks tetap bisa dikirim.';
    });
  }

  /* ========================= LAPORAN WEB UNTUK WARGA =========================
     Dua cara, dua-duanya jalan di hosting statis seperti GitHub Pages:
       1. TAUTAN  — seluruh isi laporan dipadatkan lalu ditempel di belakang #
                    pada alamat .../warga/. Tanpa server, tanpa unggah apa pun.
       2. TERBIT  — berkas data/laporan.json didorong ke repositori GitHub lewat
                    API resmi, sehingga alamat tetap .../warga/ selalu berisi
                    laporan terbaru. Sifatnya pilihan, perlu token sekali atur. */

  function tglTerakhirBulan(bln) {
    var h = hariDiBulan(bln);
    return h.length ? h[h.length - 1].tgl : (periodeDari(S.tgl) === bln ? S.tgl : bln + '-01');
  }

  /* ringkasan yang boleh dilihat umum — tidak memuat token, kode barcode, atau pengaturan */
  function snapshotWarga(tgl) {
    tgl = tgl || S.tgl;
    var bln = periodeDari(tgl), st = DB.set;
    var rs = rumahHarian().slice().sort(urutRumah);
    var sudah = [], belum = [];
    rs.forEach(function (r) {
      var x = null;
      DB.setor.forEach(function (y) {
        if (y.tgl === tgl && y.rumahId === r.id && jenisSetor(y) === 'harian') x = y;
      });
      if (x) sudah.push([r.no, r.nama, Number(x.nominal) || 0, x.jam || '']);
      else belum.push([r.no, r.nama]);
    });

    var stat = {};
    DB.setor.forEach(function (x) {
      if (String(x.tgl).indexOf(bln) !== 0) return;
      if (!stat[x.rumahId]) stat[x.rumahId] = { n: 0, t: 0 };
      stat[x.rumahId].n++; stat[x.rumahId].t += Number(x.nominal) || 0;
    });
    var malam = hariDiBulan(bln);

    return {
      v: 1,
      ts: new Date().toISOString(),
      tgl: tgl,
      bln: bln,
      rt: {
        rt: st.rt, rw: st.rw, kampung: st.kampung, kel: st.kel, kec: st.kec, kota: st.kota,
        ketua: st.ketua, bendahara: st.bendahara, koor: st.koor
      },
      h: { tot: totalTgl(tgl), sudah: sudah, belum: belum },
      b: {
        tot: malam.reduce(function (a, x) { return a + x.total; }, 0),
        malam: malam.map(function (x) { return [x.tgl, x.total]; }),
        bor: rumahBulanan().slice().sort(urutRumah).map(function (r) {
          return [r.no, r.nama, lunasBulan(bln, r.id) ? 1 : 0];
        })
      },
      k: {
        awal: Number(st.saldoAwal) || 0, jimp: totalSemuaJimpitan(),
        masuk: kasMasuk(), keluar: kasKeluar(), saldo: saldo(),
        mut: DB.kas.slice().sort(function (a, b) { return a.tgl < b.tgl ? 1 : -1; }).slice(0, 20)
          .map(function (k) { return [k.tgl, k.jenis, k.ket, k.nominal]; })
      },
      pr: rumahHarian().slice().sort(urutRumah).map(function (r) {
        var x = stat[r.id] || { n: 0, t: 0 };
        return [r.no, r.nama, x.n, malam.length, x.t];
      })
    };
  }

  function b64url(arr) {
    var bin = '', i, CH = 8192;
    for (i = 0; i < arr.length; i += CH) bin += String.fromCharCode.apply(null, arr.subarray(i, i + CH));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /* padatkan dengan deflate bawaan browser; kalau tak ada, kirim apa adanya */
  function padatkan(teks) {
    var bytes = new TextEncoder().encode(teks);
    if (!self.CompressionStream) return Promise.resolve('p' + b64url(bytes));
    try {
      var aliran = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Response(aliran).arrayBuffer().then(function (buf) {
        return 'z' + b64url(new Uint8Array(buf));
      });
    } catch (e) { return Promise.resolve('p' + b64url(bytes)); }
  }

  function alamatWarga() {
    var u = String(DB.set.webURL || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    u = u.replace(/\/+$/, '').replace(/\/(index\.html)?$/i, '').replace(/\/warga$/i, '');
    return u + '/warga/';
  }

  function linkWarga(tgl) {
    var dasar = alamatWarga();
    if (!dasar) return Promise.resolve('');
    return padatkan(JSON.stringify(snapshotWarga(tgl))).then(function (kode) { return dasar + '#' + kode; });
  }

  function bukaURL(u) {
    try {
      var a = document.createElement('a');
      a.href = u; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(function () { a.parentNode && a.parentNode.removeChild(a); }, 300);
    } catch (e) { window.open(u, '_blank'); }
  }

  function salinTeks(t, pesan) {
    if (A && A.copyText) { A.copyText(t); toast(pesan || 'Disalin'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t)
        .then(function () { toast(pesan || 'Disalin'); })
        .catch(function () { salinManual(t); });
      return;
    }
    salinManual(t);
  }
  /* sebagian browser menolak penyalinan otomatis — sediakan teksnya agar bisa disalin sendiri */
  function salinManual(t) {
    sheet('Salin sendiri',
      '<p class="note" style="margin-top:0">Browser tidak mengizinkan penyalinan otomatis. ' +
      'Tekan lama teks di bawah ini, lalu pilih <b>Pilih semua → Salin</b>.</p>' +
      '<textarea class="inp" rows="5" readonly onclick="this.select()" ' +
      'style="font:12px/1.6 ui-monospace,monospace;word-break:break-all;resize:vertical">' + esc(t) + '</textarea>' +
      '<button class="btn btn-block" style="margin-top:10px" data-act="tutupSheet">Tutup</button>');
  }

  function b64teks(t) {
    return b64url(new TextEncoder().encode(t)).replace(/-/g, '+').replace(/_/g, '/');
  }

  /* dorong laporan ke repositori GitHub (opsional) */
  function terbitkanWeb(tgl) {
    var st = DB.set;
    if (!st.ghUser || !st.ghRepo || !st.ghToken) return Promise.resolve({ ok: false, pesan: 'BELUMDIATUR' });
    var cabang = st.ghBranch || 'main';
    var api = 'https://api.github.com/repos/' + encodeURIComponent(st.ghUser) + '/' +
      encodeURIComponent(st.ghRepo) + '/contents/data/laporan.json';
    var hdr = {
      'Authorization': 'Bearer ' + st.ghToken,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };
    var isi = b64teks(JSON.stringify(snapshotWarga(tgl)));

    return fetch(api + '?ref=' + encodeURIComponent(cabang) + '&t=' + Date.now(), { headers: hdr })
      .then(function (r) {
        if (r.status === 401) throw new Error('TOKEN');
        if (r.status === 403) throw new Error('TOLAK');
        return r.status === 200 ? r.json().then(function (j) { return j.sha; }) : null;
      })
      .then(function (sha) {
        var body = { message: 'Laporan jimpitan ' + (tgl || '') + ' — ' + new Date().toISOString(), content: isi, branch: cabang };
        if (sha) body.sha = sha;
        return fetch(api, { method: 'PUT', headers: hdr, body: JSON.stringify(body) });
      })
      .then(function (r) {
        if (r.ok) { DB.set.webTerbit = new Date().toISOString(); simpan(); return { ok: true }; }
        return r.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.message || ('HTTP ' + r.status));
        });
      })
      .catch(function (e) {
        var m = String(e && e.message || e);
        if (/Failed to fetch|NetworkError|Load failed/i.test(m)) m = 'JARINGAN';
        return { ok: false, pesan: m };
      });
  }

  /* ========================= CADANGAN KE GOOGLE DRIVE =========================
     Memakai Storage Access Framework bawaan Android: user memilih SEKALI mau
     menaruh berkas di mana (Google Drive / OneDrive / penyimpanan HP), izinnya
     disimpan permanen, lalu cadangan berikutnya menimpa berkas yang sama
     secara otomatis — tanpa perlu akun Google Cloud atau kunci API. */

  function namaBerkasCadangan() {
    var l = (DB.set.rt || DB.set.rw)
      ? ('-RT' + (DB.set.rt || '0') + 'RW' + (DB.set.rw || '0'))
      : '';
    return 'jimpitan' + l + '.json';
  }
  function isiCadangan() { return JSON.stringify(DB); }

  function adaFiturCadangan() { return !!(A && A.cadangkanSekarang); }
  function lokasiCadangan() {
    try { return (A && A.lokasiCadangan) ? (A.lokasiCadangan() || '') : ''; } catch (e) { return ''; }
  }

  function waktuSingkat(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso), kini = new Date();
      var sama = d.toDateString() === kini.toDateString();
      var jam = ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
      return sama ? 'hari ini ' + jam : tglPendek(ymd(d)) + ' ' + jam;
    } catch (e) { return iso; }
  }

  function cadanganBerhasil(nama) {
    DB.set.cadangTerakhir = new Date().toISOString();
    if (nama) DB.set.cadangNama = nama;
    simpan();
  }

  /* cadangkan tanpa mengganggu (dipanggil otomatis) */
  function cadangDiamDiam() {
    if (!adaFiturCadangan() || !DB.set.autoCadang) return;
    if (!lokasiCadangan()) return;
    var t = DB.set.cadangTerakhir ? new Date(DB.set.cadangTerakhir) : null;
    if (t && (Date.now() - t.getTime()) < 20 * 60 * 60 * 1000) return;   /* maks sehari sekali */
    var res;
    try { res = A.cadangkanSekarang(isiCadangan()); } catch (e) { return; }
    if (String(res).indexOf('OK:') === 0) {
      cadanganBerhasil(String(res).slice(3));
      toast('☁️ Cadangan harian tersimpan');
      if (S.tab === 'atur') render();
    }
  }

  /* dipanggil Java setelah user memilih lokasi */
  window.onCadanganSelesai = function (res) {
    res = String(res == null ? '' : res);
    if (res.indexOf('OK:') === 0) {
      cadanganBerhasil(res.slice(3));
      render();
      if (!$('#sheetWrap').classList.contains('hidden')) ACT.panelCadangan();
      toast('✔ Cadangan tersimpan di ' + res.slice(3));
      return;
    }
    if (res.indexOf('ERR:Dibatalkan') === 0) return;
    toast('Gagal: ' + res.replace(/^ERR:/, ''));
  };

  /* ========================= QR & LEMBAR STIKER ========================= */
  /* Untuk RT yang warganya belum punya stiker barcode: aplikasi membuatkan
     kode unik sendiri, lalu mencetaknya jadi lembar stiker A4. */

  function kodeOtomatis(r, dipakai) {
    var pre = (DB.set.prefiks || 'JMP').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!pre) pre = 'JMP';
    var dasar = String(r.no || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (!dasar) dasar = String(DB.rumah.indexOf(r) + 1);
    while (dasar.length < 3) dasar = '0' + dasar;
    var kode = pre + '-' + dasar, i = 1;
    while (dipakai[kode]) { kode = pre + '-' + dasar + '-' + (++i); }
    dipakai[kode] = true;
    return kode;
  }

  function buatKodeKosong() {
    var dipakai = {};
    DB.rumah.forEach(function (r) { if (r.kode) dipakai[r.kode] = true; });
    var c = 0;
    DB.rumah.forEach(function (r) {
      if (!r.kode) { r.kode = kodeOtomatis(r, dipakai); c++; }
    });
    if (c) simpan();
    return c;
  }

  function svgQR(teks) {
    try {
      var q = qrcode(0, 'M');
      q.addData(String(teks));
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) { return '<div style="font:700 9px sans-serif">' + esc(teks) + '</div>'; }
  }

  /* Lembar A4: 4 kolom x 5 baris = 20 stiker per halaman */
  function lembarStiker(daftar) {
    var judul = 'JIMPITAN' + (labelRT() ? ' ' + labelRT().replace(' — ', ' · ') : '');
    var css =
      '@page{size:A4;margin:10mm}' +
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#111}' +
      '.grid{display:flex;flex-wrap:wrap}' +
      '.c{width:25%;height:55.4mm;padding:3mm 2.2mm 2mm;border:0.3mm dashed #c8c8c8;' +
      'display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}' +
      '.t{font-size:7pt;font-weight:700;line-height:1.15;letter-spacing:.01em}' +
      '.r{width:22mm;height:0.5mm;background:#1FA85A;margin:1.1mm 0 0}' +
      '.no{font-size:6pt;font-weight:700;color:#8A8A8A;margin-top:1.1mm;letter-spacing:.06em}' +
      '.q{width:29mm;height:29mm;margin-top:1.4mm}' +
      '.q svg{width:100%;height:100%;display:block}' +
      '.nm{font-size:8.4pt;font-weight:700;margin-top:2.6mm;line-height:1.2;word-break:break-word}' +
      '.kd{font-size:5.8pt;color:#8A8A8A;margin-top:auto;padding-top:1mm;letter-spacing:.04em}';
    var h = '';
    daftar.forEach(function (r) {
      h += '<div class="c">' +
        '<div class="t">' + esc(judul) + '</div><div class="r"></div>' +
        '<div class="no">RUMAH NO. ' + esc(r.no) + '</div>' +
        '<div class="q">' + svgQR(r.kode) + '</div>' +
        '<div class="nm">' + esc(r.nama) + '</div>' +
        '<div class="kd">' + esc(r.kode) + '</div>' +
        '</div>';
    });
    var sisa = (4 - (daftar.length % 4)) % 4, i;
    for (i = 0; i < sisa; i++) h += '<div class="c" style="border-color:transparent"></div>';
    return '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
      '<title>Stiker QR Jimpitan</title><style>' + css + '</style></head>' +
      '<body><div class="grid">' + h + '</div></body></html>';
  }

  /* ========================= EKSPOR ========================= */
  /* BOM hanya untuk CSV (biar Excel membaca huruf ber-aksen dengan benar).
     Berkas .json TIDAK boleh ber-BOM, karena JSON.parse akan gagal saat dipulihkan. */
  var BERKAS = null;   /* berkas terakhir, untuk dicoba ulang / dibagikan */

  function isiBerkas(nama, isi, mime) {
    var json = /\.json$/i.test(nama) || String(mime || '').indexOf('json') >= 0;
    return json ? isi : '\ufeff' + isi;
  }

  function unduh(nama, isi, mime) {
    mime = mime || 'text/csv';
    var data = isiBerkas(nama, isi, mime);
    BERKAS = { nama: nama, isi: data, mime: mime };

    if (A && A.simpanBerkas) {
      var res = '';
      try { res = A.simpanBerkas(nama, data, mime); } catch (e) { res = 'ERR:' + (e && e.message ? e.message : e); }
      hasilSimpan(res);
      return;
    }
    if (A && A.saveToDownloads) {              /* versi lama */
      try { hasilSimpan(A.saveToDownloads(nama, data, mime)); } catch (e) { sheetBerkas('' + e); }
      return;
    }
    /* iPhone: unduhan biasa sering gagal di mode standalone -> pakai lembar Bagikan
       (Simpan ke File, kirim WhatsApp, iCloud Drive, e-mail, dsb.) */
    if (IOS && navigator.canShare) {
      try {
        var berkas = new File([data], nama, { type: mime });
        if (navigator.canShare({ files: [berkas] })) {
          navigator.share({ files: [berkas], title: nama })
            .then(function () { toast('✔ Berkas dibagikan'); })
            .catch(function (err) {
              if (!err || err.name !== 'AbortError') unduhBlob(nama, data, mime);
            });
          return;
        }
      } catch (e) { /* lanjut ke cara biasa */ }
    }
    unduhBlob(nama, data, mime);
  }

  function unduhBlob(nama, data, mime) {
    try {
      var b = new Blob([data], { type: mime });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = nama;
      a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('Berkas diunduh');
    } catch (e) { sheetBerkas('' + e); }
  }

  function hasilSimpan(res) {
    res = res == null ? '' : String(res);
    if (res.indexOf('OK:') === 0) { toast('✔ Tersimpan di ' + res.slice(3)); return; }
    if (res.indexOf('OK2:') === 0) {
      sheet('Berkas tersimpan', '<p style="margin-top:0;line-height:1.6">Berkas tidak bisa ditulis ke folder <b>Download</b>, jadi disimpan di folder aplikasi:</p>' +
        '<div class="card" style="word-break:break-all;font-size:12px">' + esc(res.slice(4)) + '</div>' +
        '<p class="note">Agar mudah dipindah, kirim saja berkasnya lewat WhatsApp / Drive / e-mail.</p>' +
        '<button class="btn btn-primary btn-block" data-act="bagikanBerkas">Kirim / bagikan berkas</button>' +
        '<button class="btn btn-block" style="margin-top:9px" data-act="tutupSheet">Tutup</button>');
      return;
    }
    if (res.indexOf('ERR:IZIN') === 0) { toast('Menunggu izin penyimpanan…'); return; }
    sheetBerkas(res.replace(/^ERR:/, ''));
  }

  function cetak(daftar) {
    daftar = (daftar || []).filter(function (r) { return !!r.kode; });
    if (!daftar.length) { toast('Belum ada rumah berkode'); return; }
    var html = lembarStiker(daftar);
    tutupSheet();
    if (A && A.cetakHalaman) { A.cetakHalaman(html, 'Stiker QR Jimpitan'); return; }

    /* iPhone (PWA) & browser: window.open sering diblokir di mode standalone,
       jadi dicetak lewat iframe tersembunyi. */
    try {
      var lama = document.getElementById('bingkaiCetak');
      if (lama) lama.remove();
      var f = document.createElement('iframe');
      f.id = 'bingkaiCetak';
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0';
      document.body.appendChild(f);
      var d = f.contentWindow.document;
      d.open(); d.write(html); d.close();
      setTimeout(function () {
        try {
          f.contentWindow.focus();
          f.contentWindow.print();
        } catch (e2) { toast('Tidak bisa membuka dialog cetak'); }
      }, 500);
      toast(IOS ? 'Pilih ikon Bagikan → Cetak' : 'Menyiapkan dialog cetak…');
    } catch (e) { toast('Tidak bisa membuka halaman cetak'); }
  }

  /* dipanggil Java setelah user menjawab dialog izin tulis */
  window.onBerkasSelesai = function (res) { hasilSimpan(res); };

  function sheetBerkas(pesan) {
    sheet('Gagal menyimpan berkas',
      '<p style="margin-top:0;line-height:1.6">Android menolak menyimpan ke folder <b>Download</b>' +
      (pesan ? ' <span style="color:var(--mut)">(' + esc(pesan) + ')</span>' : '') + '.</p>' +
      '<p style="line-height:1.6;margin-top:0">Coba salah satu cara berikut:</p>' +
      '<button class="btn btn-primary btn-block" data-act="bagikanBerkas">Kirim / bagikan berkas</button>' +
      '<p class="note">Pilih WhatsApp, Google Drive, atau e-mail — berkas langsung terkirim tanpa perlu izin penyimpanan.</p>' +
      '<button class="btn btn-block" style="margin-top:9px" data-act="ulangiSimpan">Coba simpan lagi</button>' +
      (BERKAS && /\.csv$/i.test(BERKAS.nama) ? '<button class="btn btn-block" style="margin-top:9px" data-act="salinBerkas">Salin isi berkas</button>' : '') +
      '<button class="btn btn-block" style="margin-top:9px" data-act="tutupSheet">Tutup</button>');
  }
  function csvEsc(v) { var s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csvSetoran(rows, judul) {
    var out = judul + '\n\nTanggal;No Rumah;Nama KK;Keterangan;Kode Barcode;Nominal;Jam\n';
    rows.forEach(function (s) {
      var r = byId(s.rumahId) || { no: '?', nama: '(dihapus)', blok: '', kode: '' };
      out += [tglPendek(s.tgl), r.no, r.nama, r.blok, r.kode, Number(s.nominal) || 0, s.jam || '']
        .map(csvEsc).join(';') + '\n';
    });
    var tot = rows.reduce(function (a, s) { return a + (Number(s.nominal) || 0); }, 0);
    out += ';;;;TOTAL;' + tot + ';\n';
    return out;
  }
  /* blok status borongan untuk CSV bulanan */
  function csvBorongan(per) {
    var rbl = rumahBulanan().slice().sort(urutRumah);
    if (!rbl.length) return '';
    var lu = rbl.filter(function (r) { return lunasBulan(per, r.id); }).length;
    var out = '\n\nBORONGAN BULANAN ' + namaBulan(per).toUpperCase() +
      ' (tidak dihitung dalam kas jimpitan)\n';
    out += 'Lunas;' + lu + ' dari ' + rbl.length + ' rumah\n\n';
    out += 'No;Nama KK;Keterangan;Kode Barcode;Status\n';
    rbl.forEach(function (r) {
      out += [r.no, r.nama, r.blok, r.kode, lunasBulan(per, r.id) ? 'LUNAS' : 'BELUM'].map(csvEsc).join(';') + '\n';
    });
    return out;
  }

  /* ========================= SCANNER ========================= */
  var qr = null, SC = { mode: 'kumpul', targets: [], idx: 0, count: 0, nilai: 0, cb: null };
  var lastCode = '', lastAt = 0, torchOn = false;

  function izinKamera() {
    return new Promise(function (res) {
      if (!A || !A.hasCameraPermission) { res(true); return; }
      if (A.hasCameraPermission()) { res(true); return; }
      window.onCameraPermission = function (g) { res(!!g); };
      A.requestCameraPermission();
    });
  }

  function bukaScanner(mode, opt) {
    opt = opt || {};
    if (typeof Html5Qrcode === 'undefined') { toast('Modul scanner tidak termuat'); return; }
    izinKamera().then(function (ok) {
      if (!ok) {
        sheet('Izin kamera diperlukan',
          '<p style="color:var(--mut);line-height:1.6">Aplikasi membutuhkan izin kamera untuk membaca barcode rumah. ' +
          'Silakan aktifkan izin kamera lewat pengaturan aplikasi.</p>' +
          '<button class="btn btn-primary btn-block" data-act="bukaPengaturanApp">Buka Pengaturan Aplikasi</button>');
        return;
      }
      if (mode !== 'cari') tutupSheet();
      SC.mode = mode; SC.targets = opt.targets || []; SC.idx = 0; SC.count = 0; SC.nilai = 0; SC.cb = opt.cb || null;
      lastCode = ''; lastAt = 0; torchOn = false;
      $('#scanTorch').classList.remove('on');
      $('#scanTitle').textContent = mode === 'daftar' ? 'Daftarkan Barcode' : mode === 'cari' ? 'Scan Kode' : 'Scan Jimpitan';
      $('#scanSub').textContent = mode === 'daftar' ? 'Scan stiker milik rumah berikut' : 'Arahkan ke stiker barcode rumah';
      $('#scanToast').classList.add('hidden');
      $('#scanOverlay').classList.remove('hidden');
      updCounter();
      if (A && A.keepAwake) A.keepAwake(true);

      qr = new Html5Qrcode('reader', { verbose: false, useBarCodeDetectorIfSupported: true });
      var cfg = {
        fps: 12,
        qrbox: function (w, h) {
          var ww = Math.floor(Math.min(w, 420) * 0.82);
          return { width: ww, height: Math.floor(Math.min(ww * 0.55, h * 0.6)) };
        },
        disableFlip: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      };
      qr.start({ facingMode: 'environment' }, cfg, onDecode, function () { })
        .catch(function () {
          return qr.start({ facingMode: 'user' }, cfg, onDecode, function () { });
        })
        .catch(function (e) {
          toast('Kamera tidak bisa dibuka');
          tutupScanner();
        });
    });
  }

  function tutupScanner() {
    $('#scanOverlay').classList.add('hidden');
    if (A && A.keepAwake) A.keepAwake(false);
    if (qr) {
      try {
        qr.stop().then(function () { try { qr.clear(); } catch (e) { } qr = null; })
          .catch(function () { qr = null; });
      } catch (e) { qr = null; }
    }
    render();
  }

  function scanToast(tipe, judul, sub) {
    var el = $('#scanToast');
    el.className = 'scan-toast ' + tipe;
    el.innerHTML = '<b>' + esc(judul) + '</b>' + (sub ? '<small>' + sub + '</small>' : '');
    el.classList.remove('hidden');
  }
  function updCounter() {
    var el = $('#scanCounter');
    if (SC.mode === 'daftar') {
      var sisa = SC.targets.length - SC.idx;
      var nx = SC.targets[SC.idx] ? byId(SC.targets[SC.idx]) : null;
      el.innerHTML = 'Terdaftar <b>' + SC.count + '</b> · sisa ' + sisa +
        (nx ? '<br>Scan stiker untuk: <b>' + esc(nx.no + '. ' + nx.nama) + '</b>' : '');
      $('#scanSub').textContent = nx ? nx.no + '. ' + nx.nama : 'Selesai';
    } else if (SC.mode === 'kumpul') {
      var rs = rumahHarian();
      var sdh = rs.filter(function (r) { return sudahSetor(S.tgl, r.id); }).length;
      var rbb = rumahBulanan(), pr = periodeDari(S.tgl);
      var lb = rbb.filter(function (r) { return lunasBulan(pr, r.id); }).length;
      el.innerHTML = 'Malam ini: <b>' + rp(totalTgl(S.tgl)) + '</b> · ' + sdh + '/' + rs.length + ' rumah' +
        (rbb.length ? '<br>Borongan bulanan: ' + lb + '/' + rbb.length + ' lunas' : '');
    } else el.innerHTML = '';
  }

  function onDecode(text) {
    var kode = norm(text), now = Date.now();
    if (!kode) return;
    if (kode === lastCode && now - lastAt < 2500) return;
    lastCode = kode; lastAt = now;
    if (SC.mode === 'kumpul') prosesKumpul(kode);
    else if (SC.mode === 'daftar') prosesDaftar(kode);
    else if (SC.mode === 'cari') { var cb = SC.cb; tutupScanner(); if (cb) cb(kode); }
  }

  function catatSetoran(r, nominal, manual) {
    var bl = isBulanan(r);
    var rec = {
      id: uid(), tgl: S.tgl, rumahId: r.id,
      nominal: angka(nominal), jam: jamKini(), ts: Date.now(), manual: !!manual,
      jenis: bl ? 'bulanan' : 'harian'
    };
    if (bl) rec.periode = periodeDari(S.tgl);
    DB.setor.push(rec);
    simpan();
  }

  function prosesKumpul(kode) {
    var r = byKode(kode);
    if (!r) {
      beep('err'); vib(220);
      window.__kodeBaru = kode;
      scanToast('err', 'Kode belum terdaftar', esc(kode) +
        '<br><button class="btn btn-sm" style="margin-top:8px;background:#fff;color:#111" data-act="daftarkanKodeIni">Daftarkan ke rumah…</button>');
      return;
    }
    if (r.aktif === false) { beep('warn'); scanToast('warn', r.no + '. ' + r.nama, 'Rumah berstatus nonaktif'); return; }
    if (isBulanan(r)) {
      var per = periodeDari(S.tgl);
      if (lunasBulan(per, r.id)) {
        beep('warn'); vib(90);
        scanToast('warn', r.no + '. ' + r.nama, 'Borongan ' + namaBulan(per) + ' <b>SUDAH LUNAS</b>');
        return;
      }
      tandaiLunas(r.id, per);
      SC.count++;
      beep('ok'); vib(60);
      scanToast('ok', '✔ ' + r.no + '. ' + r.nama,
        'BORONGAN ' + namaBulan(per).toUpperCase() + ' ditandai <b>LUNAS</b>');
      updCounter();
      if (!DB.set.beruntun) setTimeout(tutupScanner, 900);
      return;
    }
    if (sudahSetor(S.tgl, r.id)) {
      beep('warn'); vib(90);
      scanToast('warn', r.no + '. ' + r.nama, 'Sudah setor malam ini (' + rp(nominalTersimpan(r.id)) + ')');
      return;
    }
    catatSetoran(r, r.nominal, false);
    SC.count++; SC.nilai += angka(r.nominal);
    beep('ok'); vib(60);
    scanToast('ok', '✔ ' + r.no + '. ' + r.nama, esc(r.blok || '') + ' — <b>' + rp(r.nominal) + '</b> tercatat');
    updCounter();
    if (!DB.set.beruntun) setTimeout(tutupScanner, 900);
  }
  function nominalTersimpan(id) {
    var f = DB.setor.filter(function (s) { return s.tgl === S.tgl && s.rumahId === id && jenisSetor(s) === 'harian'; });
    return f.length ? f[0].nominal : 0;
  }

  function prosesDaftar(kode) {
    var tid = SC.targets[SC.idx];
    if (!tid) { tutupScanner(); return; }
    var dup = byKode(kode);
    if (dup && dup.id !== tid) {
      beep('err'); vib(220);
      scanToast('err', 'Kode sudah dipakai', 'Terdaftar pada ' + esc(dup.no + '. ' + dup.nama));
      return;
    }
    var r = byId(tid);
    r.kode = kode; simpan();
    SC.count++; SC.idx++;
    beep('ok'); vib(60);
    if (SC.idx >= SC.targets.length) {
      scanToast('ok', '✔ Selesai!', SC.count + ' barcode berhasil didaftarkan');
      setTimeout(tutupScanner, 1400);
    } else {
      var nx = byId(SC.targets[SC.idx]);
      scanToast('ok', '✔ ' + r.no + '. ' + r.nama, 'Berikutnya: <b>' + esc(nx.no + '. ' + nx.nama) + '</b>');
      updCounter();
    }
  }

  $('#scanClose').addEventListener('click', tutupScanner);
  $('#scanTorch').addEventListener('click', function () {
    if (!qr) return;
    qr.applyVideoConstraints({ advanced: [{ torch: !torchOn }] }).then(function () {
      torchOn = !torchOn; $('#scanTorch').classList.toggle('on', torchOn);
    }).catch(function () { toast('Senter tidak didukung perangkat ini'); });
  });
  $('#scanManual').addEventListener('click', function () {
    var k = window.prompt('Ketik kode barcode yang tertera pada stiker:');
    if (k) { lastCode = ''; onDecode(k); }
  });

  /* ========================= AKSI ========================= */
  var ACT = {
    /* --- tanggal ronda --- */
    tglPrev: function () { S.tgl = addDays(S.tgl, -1); render(); },
    tglNext: function () { S.tgl = addDays(S.tgl, 1); render(); },
    rtglPrev: function () { S.rekapTgl = addDays(S.rekapTgl, -1); render(); },
    rtglNext: function () { S.rekapTgl = addDays(S.rekapTgl, 1); render(); },
    blnPrev: function () { var d = parseISO(S.bulan + '-01'); d.setMonth(d.getMonth() - 1); S.bulan = ym(d); render(); },
    blnNext: function () { var d = parseISO(S.bulan + '-01'); d.setMonth(d.getMonth() + 1); S.bulan = ym(d); render(); },

    /* --- scan --- */
    scanKumpul: function () { bukaScanner('kumpul'); },
    daftarMassal: function () {
      var belum = DB.rumah.slice().sort(urutRumah).filter(function (r) { return !r.kode; });
      var semua = DB.rumah.slice().sort(urutRumah);
      sheet('Daftarkan Barcode',
        '<p style="color:var(--mut);line-height:1.6;margin-top:0">Mode ini memandu Bapak/Ibu men-scan stiker barcode satu per satu. ' +
        'Setelah satu rumah berhasil, aplikasi otomatis lanjut ke rumah berikutnya.</p>' +
        '<button class="btn btn-primary btn-block" data-act="mulaiDaftar" data-id="belum">Scan rumah yang belum punya barcode (' + belum.length + ')</button>' +
        '<button class="btn btn-block" style="margin-top:9px" data-act="mulaiDaftar" data-id="semua">Ulangi semua rumah (' + semua.length + ')</button>');
    },
    mulaiDaftar: function (jenis) {
      var l = DB.rumah.slice().sort(urutRumah);
      if (jenis === 'belum') l = l.filter(function (r) { return !r.kode; });
      if (!l.length) { toast('Semua rumah sudah punya barcode'); return; }
      tutupSheet();
      bukaScanner('daftar', { targets: l.map(function (r) { return r.id; }) });
    },
    scanKeField: function () {
      bukaScanner('cari', {
        cb: function (kode) {
          setTimeout(function () {
            var el = $('#fKode'); if (el) { el.value = kode; toast('Kode terbaca: ' + kode); }
          }, 350);
        }
      });
      /* sheet tetap terbuka di belakang scanner */
    },
    daftarkanKodeIni: function () {
      var kode = window.__kodeBaru;
      tutupScanner();
      setTimeout(function () { pilihRumahUntukKode(kode); }, 400);
    },

    /* --- setoran --- */
    inputManual: function () {
      var belum = rumahHarian().slice().sort(urutRumah).filter(function (r) { return !sudahSetor(S.tgl, r.id); });
      var h = '<p style="color:var(--mut);margin-top:0">Pilih rumah yang menyetor (untuk barcode rusak / tidak terbaca).</p>';
      if (!belum.length) h += '<div class="empty"><p>Semua rumah sudah setor.</p></div>';
      else {
        h += '<div class="list">';
        belum.forEach(function (r) {
          h += '<div class="li tap" data-act="setorCepat" data-id="' + r.id + '"><div class="av">' + esc(r.no) + '</div>' +
            '<div class="mid"><b>' + esc(r.nama) + '</b><small>' + gab(esc(r.blok), rp(r.nominal)) + '</small></div>' +
            '<div class="end"><span class="amt">' + rp(r.nominal) + '</span></div></div>';
        });
        h += '</div>';
      }
      sheet('Input Manual — ' + tglPendek(S.tgl), h);
    },
    setorCepat: function (id) {
      var r = byId(id); if (!r) return;
      if (sudahSetor(S.tgl, id)) { toast('Rumah ini sudah setor malam ini'); return; }
      catatSetoran(r, r.nominal, true);
      beep('ok'); vib(50);
      toast('✔ ' + r.nama + ' — ' + rp(r.nominal));
      tutupSheet(); render();
    },
    editSetor: function (id) {
      var s = null; DB.setor.forEach(function (x) { if (x.id === id) s = x; });
      if (!s) return;
      var r = byId(s.rumahId) || { no: '?', nama: '(dihapus)' };
      sheet('Setoran ' + r.no + '. ' + r.nama,
        '<input type="hidden" id="sId" value="' + s.id + '">' +
        '<div class="kv"><span>Tanggal</span><b>' + esc(tglPanjang(s.tgl)) + '</b></div>' +
        '<div class="kv"><span>Jam catat</span><b>' + esc(s.jam || '-') + '</b></div>' +
        '<div class="field" style="margin-top:14px"><label>Nominal (Rp)</label>' +
        '<input class="inp" id="sNominal" inputmode="numeric" value="' + num(s.nominal) + '"></div>' +
        '<button class="btn btn-primary btn-block" data-act="simpanSetor">Simpan perubahan</button>' +
        '<button class="btn btn-danger btn-block" style="margin-top:9px" data-act="hapusSetor" data-id="' + s.id + '">Hapus setoran ini</button>');
    },
    simpanSetor: function () {
      var id = $('#sId').value, n = angka($('#sNominal').value);
      DB.setor.forEach(function (x) { if (x.id === id) x.nominal = n; });
      simpan(); tutupSheet(); render(); toast('Setoran diperbarui');
    },
    hapusSetor: function (id) {
      DB.setor = DB.setor.filter(function (x) { return x.id !== id; });
      simpan(); tutupSheet(); render(); toast('Setoran dihapus');
    },

    /* --- rumah --- */
    tambahRumah: function () { formRumah(null); },
    editRumah: function (id) { formRumah(byId(id)); },
    togAktif: function (_, el) { el.classList.toggle('on'); },
    simpanRumah: function () {
      var id = $('#fId').value;
      var cara = $('#fCara').getAttribute('data-val') === 'bulanan' ? 'bulanan' : 'harian';
      var data = {
        no: $('#fNo').value.trim(), nama: $('#fNama').value.trim(),
        blok: $('#fBlok').value.trim(), kode: norm($('#fKode').value),
        nominal: angka($('#fNominal').value) || DB.set.nominalDefault,
        cara: cara,
        aktif: $('#fAktif').classList.contains('on')
      };
      if (!data.nama) { toast('Nama kepala keluarga wajib diisi'); return; }
      if (data.kode) {
        var dup = byKode(data.kode);
        if (dup && dup.id !== id) { toast('Kode sudah dipakai ' + dup.no + '. ' + dup.nama); return; }
      }
      if (id) { var r = byId(id); for (var k in data) r[k] = data[k]; }
      else { data.id = uid(); DB.rumah.push(data); }
      simpan(); tutupSheet(); render(); toast('Data rumah tersimpan');
    },
    hapusRumah: function (id) {
      var r = byId(id); if (!r) return;
      konfirm('Hapus rumah?', 'Data <b>' + esc(r.nama) + '</b> beserta riwayat setorannya akan dihapus permanen.',
        'Ya, hapus', function () {
          DB.rumah = DB.rumah.filter(function (x) { return x.id !== id; });
          DB.setor = DB.setor.filter(function (x) { return x.rumahId !== id; });
          simpan(); tutupSheet(); render(); toast('Rumah dihapus');
        }, true);
    },
    fblok: function (b) { S.filterBlok = b; render(); },
    nominalMassal: function () {
      var bloks = [];
      DB.rumah.forEach(function (r) { if (r.blok && bloks.indexOf(r.blok) < 0) bloks.push(r.blok); });
      sheet('Atur Nominal Massal',
        '<div class="field"><label>Terapkan ke</label><select class="inp" id="mTarget">' +
        '<option value="semua">Semua rumah (' + DB.rumah.length + ')</option>' +
        '<option value="fharian">Rumah jimpitan harian saja (' + DB.rumah.filter(function (r) { return !isBulanan(r); }).length + ')</option>' +
        bloks.map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Nominal baru (Rp)</label><input class="inp" id="mNominal" inputmode="numeric" value="' + num(DB.set.nominalDefault) + '"></div>' +
        '<button class="btn btn-primary btn-block" data-act="terapkanNominal">Terapkan</button>');
    },
    terapkanNominal: function () {
      var t = $('#mTarget').value, n = angka($('#mNominal').value), c = 0;
      DB.rumah.forEach(function (r) {
        if (isBulanan(r)) return;               // rumah borongan tidak punya nominal
        var kena = (t === 'semua') || (t === 'fharian') || (r.blok === t);
        if (!kena) return;
        r.nominal = n; c++;
      });
      simpan(); tutupSheet(); render(); toast(c + ' rumah diperbarui');
    },

    /* --- kas --- */
    kasBaru: function (jenis) {
      sheet(jenis === 'masuk' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran',
        '<input type="hidden" id="kJenis" value="' + jenis + '">' +
        '<div class="field"><label>Tanggal</label><input class="inp" type="date" id="kTgl" value="' + ymd(new Date()) + '"></div>' +
        '<div class="field"><label>Keterangan</label><input class="inp" id="kKet" placeholder="' +
        (jenis === 'masuk' ? 'Sumbangan warga / donasi' : 'Beli kopi & gula ronda') + '"></div>' +
        '<div class="field"><label>Nominal (Rp)</label><input class="inp" id="kNom" inputmode="numeric" placeholder="0"></div>' +
        '<button class="btn btn-primary btn-block" data-act="simpanKas">Simpan</button>');
    },
    simpanKas: function () {
      var ket = $('#kKet').value.trim(), n = angka($('#kNom').value);
      if (!ket) { toast('Keterangan wajib diisi'); return; }
      if (n <= 0) { toast('Nominal harus lebih dari 0'); return; }
      DB.kas.push({ id: uid(), tgl: $('#kTgl').value || ymd(new Date()), jenis: $('#kJenis').value, ket: ket, nominal: n, ts: Date.now() });
      simpan(); tutupSheet(); render(); toast('Mutasi kas tersimpan');
    },
    hapusKas: function (id) {
      DB.kas = DB.kas.filter(function (k) { return k.id !== id; });
      simpan(); render(); toast('Mutasi dihapus');
    },

    /* --- laporan --- */
    kirimWaHarian: function () { pratinjauKirim('Laporan ' + tglPendek(S.tgl), lapHarian(S.tgl), S.tgl); },
    kirimWaHarianRekap: function () { pratinjauKirim('Laporan ' + tglPendek(S.rekapTgl), lapHarian(S.rekapTgl), S.rekapTgl); },
    kirimWaBulanan: function () { pratinjauKirim('Rekap ' + namaBulan(S.bulan), lapBulanan(S.bulan), tglTerakhirBulan(S.bulan)); },
    kirimWaPerRumah: function () { pratinjauKirim('Rekap per rumah', lapPerRumah(S.bulan), tglTerakhirBulan(S.bulan)); },
    kirimWaKas: function () { pratinjauKirim('Laporan Kas', lapKas(), S.tgl); },
    salinLink: function () { if (window.__linkLaporan) salinTeks(window.__linkLaporan, 'Tautan disalin'); },
    kirimWaSekarang: function () {
      var t = window.__teksLaporan || '';
      if (A && A.shareWhatsApp) { A.shareWhatsApp(t); tutupSheet(); }
      else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
    },
    bagikanLain: function () {
      var t = window.__teksLaporan || '';
      if (A && A.shareText) { A.shareText(t); tutupSheet(); }
      else if (navigator.share) navigator.share({ text: t });
      else toast('Fitur berbagi tidak tersedia');
    },
    salinLaporan: function () { salinTeks(window.__teksLaporan || '', 'Teks laporan disalin'); },

    /* --- ekspor --- */
    csvHarian: function () {
      unduh('jimpitan-' + S.rekapTgl + '.csv',
        csvSetoran(setorTgl(S.rekapTgl), 'LAPORAN JIMPITAN RT ' + DB.set.rt + ' RW ' + DB.set.rw + ' ' + DB.set.kampung + ' - ' + tglPanjang(S.rekapTgl)));
    },
    csvBulanan: function () {
      var rows = DB.setor.filter(function (s) { return String(s.tgl).indexOf(S.bulan) === 0; })
        .sort(function (a, b) { return a.tgl < b.tgl ? -1 : 1; });
      unduh('jimpitan-' + S.bulan + '.csv',
        csvSetoran(rows, 'REKAP JIMPITAN ' + namaBulan(S.bulan) + ' - RT ' + DB.set.rt + ' RW ' + DB.set.rw + ' ' + DB.set.kampung) +
        csvBorongan(S.bulan));
    },
    csvSemua: function () {
      unduh('jimpitan-semua.csv',
        csvSetoran(DB.setor.slice().sort(function (a, b) { return a.tgl < b.tgl ? -1 : 1; }),
          'SELURUH DATA JIMPITAN RT ' + DB.set.rt + ' RW ' + DB.set.rw + ' ' + DB.set.kampung));
    },
    csvPerRumah: function () {
      var stat = {}, malam = hariDiBulan(S.bulan).length;
      DB.setor.forEach(function (s) {
        if (String(s.tgl).indexOf(S.bulan) !== 0) return;
        if (!stat[s.rumahId]) stat[s.rumahId] = { n: 0, t: 0 };
        stat[s.rumahId].n++; stat[s.rumahId].t += s.nominal;
      });
      var out = 'REKAP PER RUMAH ' + namaBulan(S.bulan) + ' (' + malam + ' malam ronda)\n\n' +
        'No;Nama KK;Cara Setor;Nominal Harian;Status Borongan;Keterangan;Kode;Jml Setor;Total\n';
      aktif().slice().sort(urutRumah).forEach(function (r) {
        var st = stat[r.id] || { n: 0, t: 0 };
        var bl = isBulanan(r);
        out += [r.no, r.nama, bl ? 'Borongan' : 'Harian', bl ? '-' : (Number(r.nominal) || 0),
                bl ? (lunasBulan(S.bulan, r.id) ? 'LUNAS' : 'BELUM') : '-',
                r.blok, r.kode, bl ? '-' : st.n, bl ? '-' : st.t].map(csvEsc).join(';') + '\n';
      });
      unduh('rekap-rumah-' + S.bulan + '.csv', out);
    },
    backup: function () {
      unduh('backup-jimpitan-' + ymd(new Date()) + '.json', JSON.stringify(DB), 'application/json');
    },
    restore: function () {
      if (A && A.pickBackupFile) { A.pickBackupFile(); return; }
      /* iPhone / web: ambil berkas lewat pemilih berkas bawaan */
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json,text/plain';
      inp.style.display = 'none';
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () { window.onBackupLoaded(String(fr.result || '')); };
        fr.onerror = function () { toast('Gagal membaca berkas'); };
        fr.readAsText(f);
        setTimeout(function () { inp.remove(); }, 1000);
      });
      document.body.appendChild(inp);
      inp.click();
    },
    bagikanBerkas: function () {
      if (!BERKAS) { toast('Tidak ada berkas'); return; }
      if (A && A.bagikanBerkas) { tutupSheet(); A.bagikanBerkas(BERKAS.nama, BERKAS.isi, BERKAS.mime); return; }
      try {
        var f = new File([BERKAS.isi], BERKAS.nama, { type: BERKAS.mime });
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
          tutupSheet();
          navigator.share({ files: [f], title: BERKAS.nama }).catch(function () { });
          return;
        }
      } catch (e) { }
      unduhBlob(BERKAS.nama, BERKAS.isi, BERKAS.mime);
    },
    ulangiSimpan: function () {
      if (!BERKAS) return;
      tutupSheet();
      unduh(BERKAS.nama, BERKAS.isi.replace(/^\ufeff/, ''), BERKAS.mime);
    },
    salinBerkas: function () {
      if (!BERKAS) return;
      var t = BERKAS.isi.replace(/^\ufeff/, '');
      if (A && A.copyText) { A.copyText(t); toast('Isi berkas disalin'); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(t); toast('Isi berkas disalin'); }
      else toast('Tidak bisa menyalin');
    },
    panelQR: function () {
      var tanpa = DB.rumah.filter(function (r) { return !r.kode; });
      var punya = DB.rumah.filter(function (r) { return !!r.kode; });
      if (!DB.rumah.length) {
        sheet('Buat QR & Cetak Stiker',
          '<div class="empty"><p>Belum ada rumah.<br>Tambahkan rumah dulu lewat tombol <b>+</b>.</p></div>' +
          '<button class="btn btn-block" data-act="tutupSheet">Tutup</button>');
        return;
      }
      sheet('Buat QR & Cetak Stiker',
        '<p style="margin-top:0;line-height:1.6;color:var(--mut)">Untuk RT yang warganya <b>belum punya stiker barcode</b>. ' +
        'Aplikasi membuatkan kode unik tiap rumah, lalu menyusunnya jadi lembar stiker A4 siap cetak ' +
        '(20 stiker per halaman).</p>' +
        '<div class="card">' +
        '<div class="kv"><span>Total rumah</span><b>' + DB.rumah.length + '</b></div>' +
        '<div class="kv"><span>Sudah punya kode</span><b style="color:var(--grn)">' + punya.length + '</b></div>' +
        '<div class="kv"><span>Belum punya kode</span><b style="color:' + (tanpa.length ? 'var(--amb)' : 'var(--grn)') + '">' + tanpa.length + '</b></div>' +
        '<div class="kv"><span>Awalan kode</span><b>' + esc((DB.set.prefiks || 'JMP').toUpperCase()) + '-001</b></div>' +
        '</div>' +
        (tanpa.length
          ? '<button class="btn btn-primary btn-block" data-act="isiKode">Buatkan kode untuk ' + tanpa.length + ' rumah</button>'
          : '<p class="note" style="margin-top:0">Semua rumah sudah punya kode 👍</p>') +
        '<div class="sec-title">Cetak lembar stiker</div>' +
        '<button class="btn btn-block" data-act="cetakSemua">Cetak semua (' + DB.rumah.length + ' stiker)</button>' +
        (tanpa.length < DB.rumah.length
          ? '<button class="btn btn-block" style="margin-top:9px" data-act="cetakBaru">Cetak yang sudah berkode (' + punya.length + ')</button>'
          : '') +
        '<p class="note">Akan muncul dialog cetak Android — pilih printer, atau <b>Simpan sebagai PDF</b> untuk dicetak di tempat fotokopi.</p>' +
        '<button class="btn btn-block" style="margin-top:9px" data-act="tutupSheet">Tutup</button>');
    },
    isiKode: function () {
      var c = buatKodeKosong();
      render(); ACT.panelQR();
      toast(c ? '✔ ' + c + ' kode dibuat' : 'Semua rumah sudah punya kode');
    },
    cetakSemua: function () { cetak(DB.rumah.slice().sort(urutRumah)); },
    cetakBaru: function () {
      cetak(DB.rumah.filter(function (r) { return !!r.kode; }).sort(urutRumah));
    },

    panelCadangan: function () {
      if (!adaFiturCadangan()) {
        sheet('Cadangan otomatis',
          '<p style="margin-top:0;line-height:1.7">Fitur ini hanya ada di <b>aplikasi Android</b>. ' +
          'Di iPhone, pakai <b>Cadangkan data</b> lalu pilih <b>Simpan ke File → Google Drive</b> pada menu Bagikan.</p>' +
          '<button class="btn btn-block" data-act="tutupSheet">Tutup</button>');
        return;
      }
      var lok = lokasiCadangan();
      var h = '<p style="margin-top:0;line-height:1.7;color:var(--mut)">Berkas cadangan <b>.json</b> disimpan ke ' +
        '<b>Google Drive</b> (atau penyimpanan lain yang Bapak pilih). Pilih lokasinya <b>sekali saja</b> — ' +
        'selanjutnya aplikasi menimpa berkas yang sama secara otomatis.</p>';

      if (lok) {
        h += '<div class="card">' +
          '<div class="kv"><span>Berkas tujuan</span><b style="color:var(--grn);word-break:break-all">' + esc(lok) + '</b></div>' +
          '<div class="kv"><span>Cadangan terakhir</span><b>' +
          (DB.set.cadangTerakhir ? esc(waktuSingkat(DB.set.cadangTerakhir)) : '<span style="color:var(--amb)">belum pernah</span>') +
          '</b></div>' +
          '<div class="kv"><span>Isi cadangan</span><b>' + DB.rumah.length + ' rumah · ' + DB.setor.length + ' setoran</b></div>' +
          '</div>';
        h += swc('autoCadang', 'Cadangkan otomatis', 'Sekali sehari saat aplikasi dibuka', DB.set.autoCadang);
        h += '<button class="btn btn-primary btn-block" style="margin-top:12px" data-act="cadangSekarang">Cadangkan sekarang</button>';
        h += '<button class="btn btn-block" style="margin-top:9px" data-act="gantiLokasiCadangan">Ganti lokasi / berkas</button>';
        h += '<p class="note">Buka aplikasi <b>Google Drive</b> untuk memastikan berkasnya ada. Kalau HP hilang atau diganti, ' +
          'unduh berkas itu lalu pakai <b>Pulihkan dari cadangan</b>.</p>';
      } else {
        h += '<div class="card"><div class="empty"><p>Belum ada lokasi cadangan dipilih.</p></div></div>';
        h += '<button class="btn btn-primary btn-block" data-act="gantiLokasiCadangan">Pilih lokasi di Google Drive</button>';
        h += '<p class="note">Akan muncul jendela penyimpanan Android. Ketuk menu <b>☰</b> di kiri atas, ' +
          'pilih <b>Drive</b>, tentukan foldernya, lalu tekan <b>Simpan</b>. ' +
          'Kalau Google Drive tidak muncul di daftar, pastikan aplikasi Drive sudah terpasang dan sudah login.</p>';
      }
      h += '<button class="btn btn-block" style="margin-top:9px" data-act="tutupSheet">Tutup</button>';
      sheet('Cadangan ke Google Drive', h);
    },
    gantiLokasiCadangan: function () {
      if (!adaFiturCadangan()) return;
      tutupSheet();
      try { A.pilihLokasiCadangan(namaBerkasCadangan(), isiCadangan()); }
      catch (e) { toast('Gagal membuka pemilih berkas'); }
    },
    cadangSekarang: function () {
      if (!adaFiturCadangan()) return;
      var res;
      try { res = String(A.cadangkanSekarang(isiCadangan())); }
      catch (e) { toast('Gagal: ' + e); return; }
      if (res.indexOf('OK:') === 0) {
        cadanganBerhasil(res.slice(3));
        render(); ACT.panelCadangan();
        toast('✔ Cadangan diperbarui');
      } else if (res.indexOf('ERR:BELUMDIPILIH') === 0) {
        ACT.gantiLokasiCadangan();
      } else if (res.indexOf('ERR:IZINHILANG') === 0) {
        render(); ACT.panelCadangan();
        toast('Izin ke berkas hilang — pilih ulang lokasinya');
      } else {
        toast('Gagal: ' + res.replace(/^ERR:/, ''));
      }
    },

    salinLinkWarga: function () {
      toast('Menyiapkan tautan…');
      linkWarga(S.tgl).then(function (u) { if (u) salinTeks(u, 'Tautan laporan disalin'); });
    },
    bukaWarga: function () {
      linkWarga(S.tgl).then(function (u) { if (u) bukaURL(u); });
    },
    kirimLinkWarga: function () {
      toast('Menyiapkan tautan…');
      linkWarga(S.tgl).then(function (u) {
        if (!u) return;
        var t = '*LAPORAN JIMPITAN RONDA*\n' + (labelRT() || '') + '\n' +
          tglPanjang(S.tgl) + '\n\n' +
          'Jimpitan terkumpul: *' + rp(totalTgl(S.tgl)) + '*\n' +
          'Saldo kas: *' + rp(saldo()) + '*\n\n' +
          'Rincian lengkap bisa dilihat semua warga di sini:\n' + u + '\n';
        if (A && A.shareWhatsApp) A.shareWhatsApp(t);
        else bukaURL('https://wa.me/?text=' + encodeURIComponent(t));
      });
    },
    terbitSekarang: function () {
      toast('Menerbitkan…');
      terbitkanWeb(S.tgl).then(function (h) {
        if (h.ok) { render(); toast('✔ Laporan terbit di halaman warga'); return; }
        var m = h.pesan;
        if (m === 'BELUMDIATUR') m = 'Nama pengguna, repositori, dan token harus diisi dulu';
        else if (m === 'TOKEN') m = 'Token ditolak — pastikan token benar dan belum kedaluwarsa';
        else if (m === 'TOLAK') m = 'Token tidak punya izin menulis ke repositori itu';
        else if (m === 'JARINGAN') m = 'Tidak ada koneksi internet';
        else if (/Not Found/i.test(m)) m = 'Repositori tidak ditemukan — periksa nama pengguna & repositori';
        sheet('Gagal menerbitkan',
          '<p style="margin-top:0;line-height:1.7">' + esc(m) + '</p>' +
          '<p class="note">Tautan laporan tetap bisa dikirim ke grup WA seperti biasa — ' +
          'cara itu tidak butuh token sama sekali.</p>' +
          '<button class="btn btn-block" data-act="tutupSheet">Tutup</button>');
      });
    },

    mulaiPakai: function () {
      ['rt', 'rw', 'kampung', 'kota'].forEach(function (k) {
        var el = $('#w_' + k); if (el) DB.set[k] = el.value.trim();
      });
      var nd = $('#w_nominalDefault');
      if (nd) DB.set.nominalDefault = angka(nd.value) || 1000;
      DB.set.siap = true; simpan(); tutupSheet(); pilihTab('rumah');
      toast('Identitas tersimpan — sekarang tambahkan rumah');
      if (IOS && !TERPASANG && !DB.set.hideIOS) setTimeout(panduanPasangIOS, 900);
    },
    lewatiSambutan: function () {
      DB.set.siap = true; simpan(); tutupSheet();
      if (IOS && !TERPASANG && !DB.set.hideIOS) setTimeout(panduanPasangIOS, 500);
    },
    janganIngatkan: function () { DB.set.hideIOS = true; simpan(); tutupSheet(); },
    panduanIOS: function () { panduanPasangIOS(); },

    resetSetoran: function () {
      konfirm('Hapus semua setoran?', 'Seluruh riwayat setoran jimpitan akan dihapus. Data rumah dan kas tetap aman.',
        'Ya, hapus', function () { DB.setor = []; DB.lunas = []; simpan(); tutupSheet(); render(); toast('Riwayat setoran dihapus'); }, true);
    },
    resetTotal: function () {
      konfirm('Reset total?', 'Semua data (rumah, setoran, kas, pengaturan) akan dikembalikan ke kondisi awal. Tindakan ini tidak bisa dibatalkan.',
        'Ya, reset', function () {
          try { localStorage.removeItem(KEY); } catch (e) { }
          DB = muat(); simpan(); tutupSheet(); pilihTab('ronda'); toast('Data direset');
          setTimeout(sambutan, 420);
        }, true);
    },

    /* --- lain-lain --- */
    frekap: function (m) { S.rekap = m; render(); },
    keKas: function () { pilihTab('kas'); },
    segCara: function (v) {
      var seg = $('#fCara'); if (!seg) return;
      seg.setAttribute('data-val', v);
      $$('#fCara button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-id') === v); });
      $('#wrapHarian').style.display = (v === 'bulanan') ? 'none' : '';
      $('#wrapBulanan').style.display = (v === 'bulanan') ? '' : 'none';
    },
    panelBulanan: function () {
      var per = periodeDari(S.tgl);
      var rbl = rumahBulanan().slice().sort(urutRumah);
      var lunasB = rbl.filter(function (r) { return lunasBulan(per, r.id); });
      var h = '<p style="color:var(--mut);margin-top:0;line-height:1.6">Rumah berikut membayar jimpitan <b>borongan sekali sebulan</b> langsung ke bendahara, jadi tidak dicatat tiap malam. Di sini hanya ditandai <b>Lunas / Belum</b> — nominalnya tidak ikut dihitung dalam kas jimpitan.</p>' +
        '<div class="card"><div class="kv"><span>Periode</span><b>' + esc(namaBulan(per)) + '</b></div>' +
        '<div class="kv"><span>Sudah lunas</span><b style="color:var(--grn)">' + lunasB.length + ' rumah</b></div>' +
        '<div class="kv"><span>Belum lunas</span><b style="color:var(--red)">' + (rbl.length - lunasB.length) + ' rumah</b></div></div>';
      if (!rbl.length) {
        h += '<div class="empty"><p>Belum ada rumah bertanda Borongan.<br>Atur lewat tab <b>Rumah</b> → pilih rumah → <b>Cara setor: Borongan bulanan</b>.</p></div>';
      } else {
        h += '<div class="list">';
        rbl.forEach(function (r) {
          var lu = lunasBulan(per, r.id);
          h += '<div class="li"><div class="av ' + (lu ? 'ok' : 'no') + '">' + esc(r.no) + '</div>' +
            '<div class="mid"><b>' + esc(r.nama) + '</b><small>' + (lu ? 'sudah lunas ' + esc(namaBulan(per)) : 'belum lunas') + '</small></div>' +
            '<div class="end">' + (lu
              ? '<span class="pill g">LUNAS</span><button class="xbtn" data-act="batalBulanan" data-id="' + r.id + '">' + I.x + '</button>'
              : '<button class="btn btn-sm btn-primary" data-act="terimaBulanan" data-id="' + r.id + '">Tandai Lunas</button>') +
            '</div></div>';
        });
        h += '</div>';
      }
      sheet('Borongan Bulanan · ' + namaBulan(per), h);
    },
    terimaBulanan: function (id) {
      var r = byId(id); if (!r) return;
      var per = periodeDari(S.tgl);
      if (!tandaiLunas(id, per)) { toast('Sudah lunas'); return; }
      beep('ok'); vib(50);
      toast('✔ ' + r.nama + ' LUNAS ' + namaBulan(per));
      render(); ACT.panelBulanan();
    },
    batalBulanan: function (id) {
      hapusLunas(id, periodeDari(S.tgl));
      render(); ACT.panelBulanan(); toast('Tanda lunas dibatalkan');
    },
    togSet: function (k, el) {
      if (k === 'tema') DB.set.tema = DB.set.tema === 'terang' ? 'gelap' : 'terang';
      else DB.set[k] = !DB.set[k];
      simpan(); el.classList.toggle('on'); render();
    },
    tutupSheet: function () { tutupSheet(); },
    konfirmYa: function () { if (window.__konfirmAksi) window.__konfirmAksi(); },
    bukaPengaturanApp: function () { if (A && A.openAppSettings) A.openAppSettings(); tutupSheet(); }
  };

  function pilihRumahUntukKode(kode) {
    var l = DB.rumah.slice().sort(urutRumah);
    window.__kodeBaru = kode;
    var h = '<p style="color:var(--mut);margin-top:0">Kode <b>' + esc(kode) + '</b> belum terdaftar. Pilih rumah pemiliknya:</p>' +
      '<div class="list">';
    l.forEach(function (r) {
      h += '<div class="li tap" data-act="pasangKode" data-id="' + r.id + '"><div class="av">' + esc(r.no) + '</div>' +
        '<div class="mid"><b>' + esc(r.nama) + '</b><small>' + gab(esc(r.blok), r.kode ? 'sudah punya kode ' + esc(r.kode) : 'belum ada kode') + '</small></div></div>';
    });
    h += '</div>';
    sheet('Daftarkan Barcode', h);
  }
  ACT.pasangKode = function (id) {
    var r = byId(id); if (!r) return;
    r.kode = window.__kodeBaru; simpan();
    tutupSheet(); render();
    toast('Kode ' + r.kode + ' → ' + r.nama);
  };

  /* --- delegasi event --- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (!ACT[act]) return;
    e.preventDefault();
    ACT[act](el.getAttribute('data-id'), el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'tglPick' && el.value) { S.tgl = el.value; render(); }
    if (act === 'rtglPick' && el.value) { S.rekapTgl = el.value; render(); }
    if (act === 'blnPick' && el.value) { S.bulan = el.value; render(); }
  });

  $('#sheetBg').addEventListener('click', tutupSheet);
  $('#sheetClose').addEventListener('click', tutupSheet);
  $('#btnHeaderAction').addEventListener('click', function () {
    if (S.tab === 'kas') ACT.kirimWaKas();
    else if (S.tab === 'rekap') {
      if (S.rekap === 'bulanan') ACT.kirimWaBulanan();
      else if (S.rekap === 'rumah') ACT.kirimWaPerRumah();
      else ACT.kirimWaHarianRekap();
    } else ACT.kirimWaHarian();
  });

  /* --- tombol kembali Android --- */
  window.onAndroidBack = function () {
    if (!$('#scanOverlay').classList.contains('hidden')) { tutupScanner(); return true; }
    if (!$('#sheetWrap').classList.contains('hidden')) { tutupSheet(); return true; }
    if (S.tab !== 'ronda') { pilihTab('ronda'); return true; }
    return false;
  };

  /* --- pulihkan cadangan dari Android --- */
  window.onBackupLoaded = function (txt) {
    try {
      /* buang BOM / spasi di depan — berkas lama sempat tersimpan ber-BOM */
      txt = String(txt == null ? '' : txt).replace(/^\ufeff/, '').trim();
      var o = JSON.parse(txt);
      if (!o || !o.rumah) throw new Error('format');
      var nLunas = (o.lunas || []).length +
        (o.setor || []).filter(function (x) { return x && x.jenis === 'bulanan'; }).length;
      konfirm('Pulihkan data?', 'Berkas berisi <b>' + (o.rumah || []).length + ' rumah</b>, <b>' +
        (o.setor || []).length + ' setoran</b>' + (nLunas ? ' dan <b>' + nLunas + ' tanda lunas borongan</b>' : '') +
        '. Data saat ini akan diganti.',
        'Ya, pulihkan', function () {
          try {
            /* lewat localStorage supaya semua migrasi di muat() ikut dijalankan */
            localStorage.setItem(KEY, JSON.stringify(o));
            DB = muat();
            simpan();
          } catch (e2) {
            DB = merge(kosong(), o);
            DB.set = merge(kosong().set, o.set || {});
            simpan();
          }
          tutupSheet(); pilihTab('ronda'); toast('✔ Data berhasil dipulihkan');
        });
    } catch (e) {
      sheet('Berkas cadangan tidak terbaca',
        '<p style="margin-top:0;line-height:1.6">Berkas yang dipilih bukan cadangan Jimpitan yang sah.</p>' +
        '<p class="note">Pastikan memilih berkas <b>backup-jimpitan-*.json</b>, bukan berkas CSV atau berkas lain.</p>' +
        '<button class="btn btn-block" data-act="tutupSheet">Tutup</button>');
    }
  };

  /* ========================= SAMBUTAN RT BARU ========================= */
  function sambutan() {
    var s = DB.set;
    function fd(k, lbl, val, ph) {
      return '<div class="field"><label>' + lbl + '</label>' +
        '<input class="inp" id="w_' + k + '" value="' + esc(val || '') + '" placeholder="' + esc(ph) + '"></div>';
    }
    sheet('Selamat datang 👋',
      '<p style="margin-top:0;line-height:1.6;color:var(--mut)">Aplikasi pencatat <b>jimpitan ronda</b> untuk RT mana pun. ' +
      'Isi dulu identitas RT Bapak/Ibu — dipakai sebagai kop laporan WhatsApp.</p>' +
      '<div class="card">' +
      '<div class="inp-grp" style="margin-bottom:12px">' +
      '<div class="field" style="flex:1;margin:0"><label>RT</label><input class="inp" id="w_rt" value="' + esc(s.rt) + '" placeholder="01"></div>' +
      '<div class="field" style="flex:1;margin:0"><label>RW</label><input class="inp" id="w_rw" value="' + esc(s.rw) + '" placeholder="04"></div>' +
      '</div>' +
      fd('kampung', 'Kampung / Dukuh', s.kampung, 'nama kampung') +
      fd('kota', 'Kota / Kabupaten', s.kota, 'nama kota') +
      fd('nominalDefault', 'Nominal jimpitan per malam (Rp)', num(s.nominalDefault), '1000') +
      '</div>' +
      '<p class="note">Semua ini bisa diubah kapan saja lewat tab <b>Atur</b>. Kelurahan, kecamatan, nama ketua dan bendahara juga ada di sana.</p>' +
      '<button class="btn btn-primary btn-block" data-act="mulaiPakai">Simpan &amp; mulai pakai</button>' +
      '<button class="btn btn-block" style="margin-top:9px" data-act="lewatiSambutan">Nanti saja</button>');
  }

  /* ========================= iPhone: pasang ke Layar Utama ========================= */
  function panduanPasangIOS() {
    sheet('Pasang di Layar Utama 📱',
      '<p style="margin-top:0;line-height:1.7">Supaya Jimpitan Ronda punya ikon sendiri di iPhone, jalan layar penuh, ' +
      'dan <b>tetap bisa dipakai tanpa internet</b> — pasang dulu lewat Safari:</p>' +
      '<div class="card" style="line-height:1.8">' +
      '<div><b>1.</b> Tekan tombol <b>Bagikan</b> di bawah Safari (kotak dengan panah ke atas).</div>' +
      '<div><b>2.</b> Geser ke bawah, pilih <b>Tambah ke Layar Utama</b>.</div>' +
      '<div><b>3.</b> Tekan <b>Tambah</b> di pojok kanan atas.</div>' +
      '<div><b>4.</b> Buka aplikasi lewat <b>ikon baru</b> itu, bukan lewat Safari lagi.</div>' +
      '</div>' +
      '<p class="note">Penting: <b>kamera untuk scan barcode hanya aktif</b> kalau alamatnya <b>https</b> ' +
      'dan dibuka lewat ikon Layar Utama. Kalau Safari bertanya izin kamera, pilih <b>Izinkan</b>.</p>' +
      '<button class="btn btn-primary btn-block" data-act="tutupSheet">Mengerti</button>' +
      '<button class="btn btn-block" style="margin-top:9px" data-act="janganIngatkan">Jangan tampilkan lagi</button>');
  }

  /* --- mulai --- */
  render();
  if (!DB.set.siap && !DB.rumah.length) setTimeout(sambutan, 420);
  else if (IOS && !TERPASANG && !DB.set.hideIOS) setTimeout(panduanPasangIOS, 700);

  /* cadangan otomatis harian ke Google Drive (Android) */
  setTimeout(cadangDiamDiam, 2500);

  /* service worker: hanya untuk versi web/iPhone, bukan APK Android */
  if (!A && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    });
  }
})();
