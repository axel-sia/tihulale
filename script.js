/* migrasi nama sektor lama -> nama baru */
(() => { try {
  const M = {'Sektor 1':'Sektor Sion','Sektor 2':'Sektor Galelia','Sektor 3':'Sektor Ebenhaezer','Sektor 4':'Sektor Getsemany','Sektor 5':'Sektor Tiberias','Sektor 6':'Sektor Betlehem'};
  const w = JSON.parse(localStorage.getItem('gpm_warga') || 'null');
  if (Array.isArray(w)) { let ch = false; w.forEach(r => { if (M[r.sektor]) { r.sektor = M[r.sektor]; ch = true; } }); if (ch) localStorage.setItem('gpm_warga', JSON.stringify(w)); }
  const p = JSON.parse(localStorage.getItem('gpm_profil') || 'null');
  if (p && typeof p.sektor === 'string' && /^Sektor [1-6]$/m.test(p.sektor)) { p.sektor = p.sektor.replace(/^Sektor ([1-6])$/gm, (m) => M[m] || m); localStorage.setItem('gpm_profil', JSON.stringify(p)); }
} catch (e) {} })();

  // Navbar: bayangan saat scroll
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 40));

  // Menu mobile
  const nav = document.getElementById('nav');
  document.getElementById('menuBtn').onclick = () => nav.classList.toggle('open');
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  // Menu aktif sesuai posisi scroll
  const links = document.querySelectorAll('nav a.link');
  const secs = [...links].map(l => document.querySelector(l.getAttribute('href')));
  window.addEventListener('scroll', () => {
    let cur = -1;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < 140) cur = i; });
    links.forEach((l, i) => l.classList.toggle('active', i === cur));
  });

  // Efek mengetik
  const text = 'Sejak Tahun 1935.', el = document.getElementById('typed');
  let i = 0, del = false;
  (function type(){
    el.textContent = text.slice(0, i);
    if (!del && i === text.length) { del = true; return setTimeout(type, 2500); }
    if (del && i === 0) del = false;
    i += del ? -1 : 1;
    setTimeout(type, del ? 40 : 110);
  })();

  // Salin rekening
  const toast = document.getElementById('toast');
  document.getElementById('copyBtn').onclick = () => {
    const no = document.getElementById('rekNo').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(no) : Promise.reject())
      .catch(() => { const t = document.createElement('textarea'); t.value = no; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); })
      .finally(() => { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); });
  };

  // Slider agenda
  const slider = document.getElementById('slider');
  const step = () => slider.querySelector('.news').offsetWidth + 28;
  document.getElementById('next').onclick = () => slider.scrollBy({ left: step(), behavior: 'smooth' });
  document.getElementById('prev').onclick = () => slider.scrollBy({ left: -step(), behavior: 'smooth' });

  document.getElementById('year').textContent = new Date().getFullYear();

/* ================= AKUN, LOGIN & DASHBOARD ================= */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DB = {
  get(k, d) { try { let r = localStorage.getItem('gpm_' + k); if (r && r.includes('PHMJ')) r = r.split('Pekerja Harian Majelis Jemaat (PHMJ)').join('Ketua Majelis Jemaat').split('Ketua Majelis Jemaat (PHMJ)').join('Ketua Majelis Jemaat').split('Intervensi Ketua PHMJ').join('Intervensi Ketua Majelis Jemaat').split('Ketua PHMJ').join('Ketua Majelis Jemaat').split('PHMJ').join('Ketua Majelis Jemaat'); const v = JSON.parse(r); return v ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem('gpm_' + k, JSON.stringify(v)); }
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const rnd = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
const norm = s => String(s || '').trim().toLowerCase();
const rp = n => 'Rp ' + (+n || 0).toLocaleString('id-ID');
const fmtD = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-';
const SEKTOR = ['Sektor Sion','Sektor Galelia','Sektor Ebenhaezer','Sektor Getsemany','Sektor Tiberias','Sektor Betlehem'];
const LBL = {admin:'Admin', bendahara:'Bendahara', ketua:'Ketua Majelis Jemaat', sekretaris:'Sekretaris', adminsektor:'Admin Sektor', aktif:'Aktif', menunggu:'Menunggu', nonaktif:'Nonaktif'};
const chip = (k, t) => `<span class="chip c-${String(k).toLowerCase().replace(/\s+/g, '-')}">${esc(t || LBL[k] || k)}</span>`;

const t2 = $('#toast2'); let t2t;
function say(m) { t2.textContent = m; t2.classList.add('show'); clearTimeout(t2t); t2t = setTimeout(() => t2.classList.remove('show'), 2800); }

/* ---------- Keamanan: hash password (PBKDF2 + salt) ---------- */
async function hash(text, salt) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(text), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:enc.encode(salt), iterations:100000, hash:'SHA-256'}, key, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 5381; const s = salt + text;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'f' + h;
  }
}
const strong = p => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/* ---------- Data pengguna & sesi ---------- */
const users = () => DB.get('users', []);
const saveUsers = u => DB.set('users', u);
/* hapus akun peran lama (warga jemaat & pengurus); Admin tidak pernah dihapus */
const purgeOld = () => { try { const l = users(); const k = l.filter(x => x.role !== 'warga' && x.role !== 'pengurus'); if (k.length !== l.length) saveUsers(k); } catch {} };
purgeOld();
const findUser = q => { q = norm(q); return users().find(u => u.username === q || norm(u.email) === q); };
const sid = () => sessionStorage.getItem('gpm_sid') || localStorage.getItem('gpm_sid');
const me = () => { const id = sid(); return (id && users().find(u => u.id === id && u.status === 'aktif')) || null; };
function setSid(id, remember) { clearSid(); (remember ? localStorage : sessionStorage).setItem('gpm_sid', id); }
function clearSid() { sessionStorage.removeItem('gpm_sid'); localStorage.removeItem('gpm_sid'); }
const canFin = u => u.role === 'ketua' && u.financeAccess;

/* ---------- Batas percobaan login ---------- */
const lockLeft = () => { const l = DB.get('lock', {n:0, until:0}); return l.until > Date.now() ? Math.ceil((l.until - Date.now()) / 1000) : 0; };
function failed() { const l = DB.get('lock', {n:0, until:0}); l.n++; if (l.n >= 5) { l.until = Date.now() + 60000; l.n = 0; } DB.set('lock', l); }
const okReset = () => DB.set('lock', {n:0, until:0});

/* ---------- Modal Auth ---------- */
let fgUser = null;
function msg(type, text) {
  const a = $('#authAlert');
  if (!text) { a.hidden = true; return; }
  a.className = 'alert ' + type; a.textContent = text; a.hidden = false;
}
const TT = {Login:['Masuk Sistem', 'Gunakan akun Anda'], Reg:['Buat Akun', 'Daftar sebagai bendahara, sekretaris, ketua majelis jemaat, atau admin sektor'], Forgot:['Lupa Password', 'Atur ulang dengan pertanyaan keamanan']};
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('#fReg [name=tipe]')) $('#sektorWrap').hidden = e.target.value !== 'adminsektor'; });
function authView(v) {
  ['Login', 'Reg', 'Forgot'].forEach(x => $('#f' + x).hidden = x !== v);
  $('#authTitle').textContent = TT[v][0]; $('#authSub').textContent = TT[v][1];
  msg();
  const first = !users().length;
  if (v === 'Reg') { $('#tipeWrap').hidden = first; $('#sektorWrap').hidden = first || $('#fReg [name=tipe]').value !== 'adminsektor'; if (first) msg('info', 'Belum ada akun. Akun pertama otomatis menjadi Admin.'); }
  if (v === 'Login' && first) msg('info', 'Belum ada akun. Klik "Daftar sekarang" — akun pertama otomatis menjadi Admin.');
  if (v === 'Forgot') { fgUser = null; $('#fgStep1').hidden = false; $('#fgStep2').hidden = true; $('#fForgot').reset(); }
}
function openAuth(v) { authView(v || 'Login'); $('#authModal').classList.add('open'); }
function closeAuth() { $('#authModal').classList.remove('open'); }
function refreshNav() {
  const b = $('#navLogin'); if (!b) return;
  b.innerHTML = me() ? '<i class="fa-solid fa-gauge"></i> Dashboard' : '<i class="fa-solid fa-user-lock"></i> Login';
  if (window.renderAgenda) renderAgenda();
  if (window.renderRenungan) renderRenungan();
  if (window.renderWarta) renderWarta();
  if (window.renderRekening) renderRekening();
  if (window.renderFotoBangun) renderFotoBangun();
  if (window.renderPanitia) renderPanitia();
}

$$('[data-auth]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); me() ? openDash() : openAuth('Login'); }));
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) authView(g.dataset.go);
  const c = e.target.closest('[data-close]'); if (c) c.closest('.mbg').classList.remove('open');
  const p = e.target.closest('.pw button');
  if (p) { const i = p.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; p.innerHTML = `<i class="fa-regular fa-eye${show ? '-slash' : ''}"></i>`; }
  if (e.target.classList.contains('mbg')) e.target.classList.remove('open');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.mbg.open').forEach(m => m.classList.remove('open')); });

/* ---------- Daftar ---------- */
$('#fReg').addEventListener('submit', async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const nama = f.nama.trim(), username = norm(f.username), email = norm(f.email);
  if (nama.length < 3) return msg('err', 'Nama lengkap minimal 3 karakter.');
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return msg('err', 'Username 3–20 karakter: huruf kecil, angka, titik atau underscore.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return msg('err', 'Format email tidak valid.');
  if (!strong(f.pw)) return msg('err', 'Password minimal 8 karakter dan mengandung huruf serta angka.');
  if (f.pw !== f.pw2) return msg('err', 'Konfirmasi password tidak sama.');
  if (norm(f.ans).length < 2) return msg('err', 'Isi jawaban pertanyaan keamanan.');
  const list = users();
  if (list.some(u => u.username === username)) return msg('err', 'Username sudah dipakai.');
  if (list.some(u => norm(u.email) === email)) return msg('err', 'Email sudah terdaftar.');
  const first = !list.length;
  const role = first ? 'admin' : (['ketua', 'sekretaris', 'bendahara', 'adminsektor'].includes(f.tipe) ? f.tipe : 'bendahara');
  const status = first ? 'aktif' : 'menunggu';
  const sektor = role === 'adminsektor' ? (SEKTOR.includes(f.sektor) ? f.sektor : SEKTOR[0]) : '';
  const salt = rnd();
  list.push({id:uid(), nama, username, email, role, sektor, status, financeAccess:false, salt,
    hash: await hash(f.pw, salt), question:f.q, answer: await hash(norm(f.ans), salt), created:new Date().toISOString()});
  saveUsers(list);
  e.target.reset(); authView('Login');
  msg('ok', first ? 'Akun Admin berhasil dibuat. Silakan masuk.' : 'Pendaftaran terkirim. Akun ' + LBL[role] + ' aktif setelah disetujui Admin.');
});

/* ---------- Login ---------- */
$('#fLogin').addEventListener('submit', async e => {
  e.preventDefault();
  const w = lockLeft(); if (w) return msg('err', `Terlalu banyak percobaan. Coba lagi dalam ${w} detik.`);
  const f = Object.fromEntries(new FormData(e.target));
  const u = findUser(f.id);
  const ok = u && (await hash(f.pw, u.salt)) === u.hash;
  if (!ok) { failed(); return msg('err', 'Username/email atau password salah.'); }
  if (u.status === 'menunggu') return msg('info', 'Akun Anda masih menunggu persetujuan Admin.');
  if (u.status !== 'aktif') return msg('err', 'Akun Anda dinonaktifkan. Hubungi Admin.');
  okReset(); setSid(u.id, !!f.remember);
  e.target.reset(); closeAuth(); refreshNav(); openDash();
  say('Shalom, ' + u.nama.split(' ')[0] + '!');
});

/* ---------- Lupa password ---------- */
$('#fgFind').onclick = () => {
  const u = findUser($('#fgId').value);
  if (!u) return msg('err', 'Akun tidak ditemukan.');
  fgUser = u.id; $('#fgQ').textContent = 'Pertanyaan: ' + u.question;
  $('#fgStep1').hidden = true; $('#fgStep2').hidden = false; msg();
};
$('#fForgot').addEventListener('submit', async e => {
  e.preventDefault();
  if (!fgUser) return $('#fgFind').click();
  const w = lockLeft(); if (w) return msg('err', `Terlalu banyak percobaan. Coba lagi dalam ${w} detik.`);
  const f = Object.fromEntries(new FormData(e.target));
  const list = users(), u = list.find(x => x.id === fgUser);
  if (!u) return msg('err', 'Akun tidak ditemukan.');
  if ((await hash(norm(f.ans), u.salt)) !== u.answer) { failed(); return msg('err', 'Jawaban keamanan salah.'); }
  if (!strong(f.pw)) return msg('err', 'Password baru minimal 8 karakter dan mengandung huruf serta angka.');
  if (f.pw !== f.pw2) return msg('err', 'Konfirmasi password tidak sama.');
  u.hash = await hash(f.pw, u.salt); saveUsers(list); okReset();
  authView('Login'); msg('ok', 'Password berhasil diubah. Silakan masuk dengan password baru.');
});

/* ---------- Form umum (tambah / ubah) ---------- */
function openForm(title, fields, vals, onSave) {
  $('#fmTitle').textContent = title; $('#fmAlert').hidden = true;
  $('#fmForm').innerHTML = fields.map(f => {
    const v = vals[f.k] ?? '';
    let inp;
    if (f.t === 'select') inp = `<select name="${f.k}"${f.ro ? ' disabled' : ''}>${f.o.map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (f.t === 'textarea') inp = `<textarea name="${f.k}" rows="${f.rows || 3}">${esc(v)}</textarea>`;
    else if (f.t === 'pdf') inp = `<input type="file" accept="application/pdf" data-pdf="${f.k}"><input type="hidden" name="${f.k}" value="${esc(v)}"><input type="hidden" name="${f.k}Nama" value="${esc(vals[f.k + 'Nama'] ?? '')}"><small class="pdfinfo" style="display:block;margin-top:6px;color:var(--muted)"></small><button type="button" class="lk" data-rmpdf hidden style="border:0;background:none;margin-top:6px;font:inherit;font-size:13px;cursor:pointer;color:#b91c1c">Hapus berkas</button>`;
    else if (f.t === 'image') inp = `<input type="file" accept="image/*" data-img="${f.k}"><input type="hidden" name="${f.k}" value="${esc(v)}"><img class="imgprev" alt="Pratinjau" hidden><button type="button" class="lk" data-rmimg hidden style="border:0;background:none;margin-top:6px;font:inherit;font-size:13px;cursor:pointer;color:#b91c1c">Hapus foto</button>`;
    else inp = `<input name="${f.k}" type="${f.t || 'text'}" value="${esc(v)}" ${f.req ? 'required' : ''} ${f.t === 'number' ? 'min="0" step="1"' : ''}>`;
    return `<div class="fg"><label>${esc(f.l)}</label>${inp}</div>`;
  }).join('') + '<button class="btn btn-blue btn-block">Simpan</button>';
  $$('#fmForm [data-img]').forEach(inp => {
    const hid = $('#fmForm [name="' + inp.dataset.img + '"]'), box = inp.parentElement;
    const prev = box.querySelector('.imgprev'), rm = box.querySelector('[data-rmimg]');
    const show = () => { prev.hidden = rm.hidden = !hid.value; if (hid.value) prev.src = hid.value; };
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      if (!/^image\//.test(file.type)) return say('File harus berupa gambar.');
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onload = () => {
          const sc = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          hid.value = c.toDataURL('image/jpeg', .8); show();
        };
        im.onerror = () => say('Gambar tidak bisa dibaca.');
        im.src = r.result;
      };
      r.readAsDataURL(file);
    };
    rm.onclick = () => { hid.value = ''; inp.value = ''; show(); };
    show();
  });
  $$('#fmForm [data-pdf]').forEach(inp => {
    const k = inp.dataset.pdf, hid = $('#fmForm [name="' + k + '"]'), nm = $('#fmForm [name="' + k + 'Nama"]'), box = inp.parentElement;
    const info = box.querySelector('.pdfinfo'), rm = box.querySelector('[data-rmpdf]');
    const show = () => { rm.hidden = !hid.value; info.textContent = hid.value ? (nm.value || 'Berkas PDF tersimpan') : 'Belum ada berkas'; };
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      if (file.type !== 'application/pdf') { inp.value = ''; return say('File harus berformat PDF.'); }
      if (file.size > 2 * 1024 * 1024) { inp.value = ''; return say('Ukuran PDF maksimal 2 MB.'); }
      const r = new FileReader();
      r.onload = () => { hid.value = r.result; nm.value = file.name; show(); };
      r.onerror = () => say('Berkas tidak bisa dibaca.');
      r.readAsDataURL(file);
    };
    rm.onclick = () => { hid.value = ''; nm.value = ''; inp.value = ''; show(); };
    show();
  });
  $('#fmForm').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    Object.keys(d).forEach(k => d[k] = String(d[k]).trim());
    const err = await onSave(d);
    if (err) { const a = $('#fmAlert'); a.textContent = err; a.hidden = false; }
    else $('#formModal').classList.remove('open');
  };
  $('#formModal').classList.add('open');
}

/* ---------- Konfigurasi data (CRUD) ---------- */
const CFG = {
  warga: {col:'warga', add:'Tambah Warga', empty:'Belum ada data warga.',
    fields:[{k:'nama', l:'Nama Kepala Keluarga / Warga', req:1},
      {k:'sektor', l:'Sektor', t:'select', o:['Sektor Sion','Sektor Galelia','Sektor Ebenhaezer','Sektor Getsemany','Sektor Tiberias','Sektor Betlehem']},
      {k:'kategori', l:'Kategori', t:'select', o:['Kepala Keluarga','Janda','Duda','Pemuda','Anak']},
      {k:'status', l:'Status', t:'select', o:['Aktif','Pindah','Meninggal']},
      {k:'telp', l:'No. Telepon'}, {k:'alamat', l:'Alamat', t:'textarea'}],
    cols:[{t:'Nama', f:r => `<b>${esc(r.nama)}</b>`}, {t:'Sektor / Kategori', f:r => esc(r.sektor + ' - ' + r.kategori)},
      {t:'Status', f:r => chip(r.status)}, {t:'Telepon', f:r => esc(r.telp || '-')}],
    sort:(a, b) => a.nama.localeCompare(b.nama)},
  surat: {col:'surat', add:'Tambah Surat', empty:'Belum ada arsip surat.',
    fields:[{k:'nomor', l:'Nomor Surat', req:1}, {k:'tanggal', l:'Tanggal', t:'date', req:1},
      {k:'jenis', l:'Jenis', t:'select', o:['Surat Masuk','Surat Keluar']},
      {k:'perihal', l:'Perihal', req:1}, {k:'ket', l:'Keterangan', t:'textarea'}],
    cols:[{t:'Nomor', f:r => esc(r.nomor)}, {t:'Tanggal', f:r => fmtD(r.tanggal)}, {t:'Jenis', f:r => chip(r.jenis)},
      {t:'Perihal', f:r => `<b>${esc(r.perihal)}</b>${r.ket ? '<br><small style="color:var(--muted)">' + esc(r.ket) + '</small>' : ''}`},
      {t:'Persetujuan', f:r => { const st = r.status || 'Menunggu'; return chip(st, st === 'Menunggu' ? 'Menunggu Persetujuan' : st) + (r.oleh ? `<br><small style="color:var(--muted)">${esc(r.oleh)}${r.tglSetuju ? ' · ' + fmtD(r.tglSetuju) : ''}</small>` : ''); }}],
    sort:(a, b) => b.tanggal.localeCompare(a.tanggal)},
  agenda: {col:'agenda', add:'Tambah Agenda', empty:'Belum ada agenda.', prepend:true,
    fields:[{k:'judul', l:'Judul Agenda / Kegiatan', req:1},
      {k:'kategori', l:'Kategori', t:'select', o:['Jadwal Ibadah','Hari Besar','Pembangunan','Pelayanan','Pengumuman']},
      {k:'waktu', l:'Tanggal / Waktu', req:1}, {k:'deskripsi', l:'Deskripsi', t:'textarea'},
      {k:'foto', l:'Foto (opsional)', t:'image'}],
    cols:[{t:'Judul', f:r => `<b>${esc(r.judul)}</b>`}, {t:'Kategori', f:r => chip(r.kategori)},
      {t:'Tanggal / Waktu', f:r => esc(r.waktu)}, {t:'Foto', f:r => r.foto ? '<i class="fa-solid fa-image"></i>' : '-'}],
    sort:() => 0},
  renungan: {col:'renungan', add:'Tambah Renungan', empty:'Belum ada renungan.', prepend:true,
    fields:[{k:'tanggal', l:'Tanggal', t:'date', req:1}, {k:'judul', l:'Judul Renungan', req:1},
      {k:'ayat', l:'Bacaan / Ayat (mis. Mazmur 23:1-6)', req:1}, {k:'teks', l:'Isi Ayat (opsional)', t:'textarea'},
      {k:'isi', l:'Isi Renungan', t:'textarea', rows:9}, {k:'doa', l:'Doa (opsional)', t:'textarea'},
      {k:'penulis', l:'Penulis / Pelayan Firman (opsional)'}],
    cols:[{t:'Tanggal', f:r => fmtD(r.tanggal)}, {t:'Judul', f:r => `<b>${esc(r.judul)}</b>`},
      {t:'Bacaan', f:r => esc(r.ayat)}, {t:'Penulis', f:r => esc(r.penulis || '-')}],
    sort:(a, b) => b.tanggal.localeCompare(a.tanggal)},
  fotoberanda: {col:'fotoberanda', add:'Tambah Foto Beranda', empty:'Belum ada foto.', prepend:true,
    fields:[{k:'foto', l:'Foto', t:'image', req:1}, {k:'ket', l:'Keterangan (opsional)'}], cols:[], sort:() => 0},
  fotobangun: {col:'fotobangun', add:'Tambah Foto Pembangunan', empty:'Belum ada foto pembangunan.', prepend:true,
    fields:[{k:'foto', l:'Foto', t:'image', req:1}, {k:'ket', l:'Keterangan (opsional)'}],
    cols:[{t:'Foto', f:r => r.foto ? `<img src="${esc(r.foto)}" alt="" style="width:84px;height:60px;object-fit:cover;border-radius:8px">` : '-'}, {t:'Keterangan', f:r => esc(r.ket || '-')}],
    sort:() => 0},
  panitia: {col:'panitia', add:'Tambah Anggota Panitia', empty:'Belum ada anggota panitia pembangunan.',
    fields:[{k:'jabatan', l:'Jabatan (mis. Ketua Panitia)', req:1}, {k:'nama', l:'Nama Lengkap', req:1}],
    cols:[{t:'Jabatan', f:r => esc(r.jabatan)}, {t:'Nama', f:r => `<b>${esc(r.nama)}</b>`}], sort:() => 0},
  warta: {col:'warta', add:'Tambah Warta', empty:'Belum ada warta jemaat.', prepend:true,
    fields:[{k:'tanggal', l:'Tanggal Ibadah', t:'date', req:1}, {k:'judul', l:'Judul / Tema Ibadah', req:1},
      {k:'bacaan', l:'Bacaan Alkitab (opsional)'}, {k:'ibadah', l:'Jadwal Ibadah & Pelayan Firman', t:'textarea', rows:5},
      {k:'pengumuman', l:'Pengumuman', t:'textarea', rows:7}, {k:'syukur', l:'Ucapan Syukur & Turut Berduka (opsional)', t:'textarea', rows:4},
      {k:'kolekte', l:'Hasil Persembahan Minggu Lalu (Rp, opsional)', t:'number'},
      {k:'penulis', l:'Disusun oleh (opsional)'}],
    cols:[{t:'Tanggal', f:r => fmtD(r.tanggal)}, {t:'Judul', f:r => `<b>${esc(r.judul)}</b>`},
      {t:'Persembahan', f:r => r.kolekte ? rp(r.kolekte) : '-'}, {t:'Disusun oleh', f:r => esc(r.penulis || '-')}],
    sort:(a, b) => b.tanggal.localeCompare(a.tanggal)},
  uang: {col:'uang', add:'Tambah Transaksi', empty:'Belum ada transaksi.',
    fields:[{k:'tanggal', l:'Tanggal', t:'date', req:1}, {k:'uraian', l:'Uraian', req:1},
      {k:'jenis', l:'Jenis', t:'select', o:['Pemasukan','Pengeluaran']}, {k:'jumlah', l:'Jumlah (Rp)', t:'number', req:1}],
    cols:[{t:'Tanggal', f:r => fmtD(r.tanggal)}, {t:'Uraian', f:r => `<b>${esc(r.uraian)}</b>`},
      {t:'Jenis', f:r => chip(r.jenis)}, {t:'Jumlah', f:r => rp(r.jumlah)}],
    sort:(a, b) => b.tanggal.localeCompare(a.tanggal),
    top: data => {
      const m = data.filter(x => x.jenis === 'Pemasukan').reduce((s, x) => s + +x.jumlah, 0);
      const k = data.filter(x => x.jenis === 'Pengeluaran').reduce((s, x) => s + +x.jumlah, 0);
      return `<div class="stats"><div class="stat"><div class="si"><i class="fa-solid fa-arrow-down"></i></div><div><b>${rp(m)}</b><small>Pemasukan</small></div></div>
        <div class="stat"><div class="si"><i class="fa-solid fa-arrow-up"></i></div><div><b>${rp(k)}</b><small>Pengeluaran</small></div></div>
        <div class="stat"><div class="si"><i class="fa-solid fa-scale-balanced"></i></div><div><b>${rp(m - k)}</b><small>Saldo</small></div></div></div>`;
    }}
};

function vCrud(c, u) {
  const own = u && u.role === 'adminsektor' && ['warga', 'agendasektor'].includes(c.col);
  const ro = u && ((u.role === 'ketua' && (c.col === 'warga' || c.col === 'surat')) || (u.role === 'bendahara' && ['warga', 'surat', 'agenda', 'renungan'].includes(c.col)) || (u.role === 'sekretaris' && ['agenda', 'renungan'].includes(c.col)));
  const apv = ro && u.role === 'ketua' && c.col === 'surat';
  let data = DB.get(c.col, []).slice().sort(c.sort);
  if (own) data = data.filter(x => x.sektor === u.sektor);
  return (ro ? `<div class="panel" style="padding:14px 20px"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> ${apv ? 'Sebagai Ketua Majelis Jemaat, Anda dapat melihat arsip surat dan memberi <b>persetujuan</b> (setujui / tolak).' : (u.role === 'bendahara' || u.role === 'sekretaris') ? 'Sebagai ' + LBL[u.role] + ', Anda hanya dapat <b>melihat</b> data ini.' : 'Sebagai Ketua Majelis Jemaat, Anda hanya dapat <b>melihat</b> data warga.'}</div>` : '') + (own && c.col === 'agendasektor' ? `<div class="panel" style="padding:14px 20px"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> Anda mengelola agenda <b>${esc(u.sektor)}</b>. Agenda yang diajukan tampil di beranda publik akan muncul di bagian Agenda &amp; Kegiatan setelah <b>disetujui Admin atau Ketua</b>. Mengubah agenda yang sudah tayang akan meminta persetujuan ulang.</div>` : own ? `<div class="panel" style="padding:14px 20px"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> Anda mengelola <b>${esc(u.sektor)}</b>. Admin Sektor dapat menambah dan memperbarui data warga di sektornya (warga baru otomatis masuk ke sektor ini).</div>` : '') + (c.top ? c.top(data) : '') + `<div class="panel"><div class="tools">
    <input data-search placeholder="Cari data...">${c.col === 'surat' && u && ['admin', 'sekretaris'].includes(u.role) ? `<button class="btn btn-gold btn-sm" data-act="srekap"><i class="fa-solid fa-print"></i> Cetak Rekap Surat</button>` : ''}${ro ? '' : `<button class="btn btn-blue btn-sm" data-act="add"><i class="fa-solid fa-plus"></i> ${c.add}</button>`}</div>
    <div class="tblwrap"><table class="tbl"><thead><tr>${c.cols.map(x => `<th>${x.t}</th>`).join('')}${ro && !apv ? '' : '<th></th>'}</tr></thead><tbody>
    ${data.length ? data.map(r => `<tr>${c.cols.map(x => `<td>${x.f(r)}</td>`).join('')}${ro && !apv ? '' : `<td style="white-space:nowrap">
      ${c.col === 'warga' && u && u.role === 'admin' && r.apv === 'Menunggu' ? `<button class="ib grn" data-act="wgapp" data-id="${r.id}" title="Setujui data ini"><i class="fa-solid fa-check"></i></button><button class="ib red" data-act="wgrej" data-id="${r.id}" title="Tolak"><i class="fa-solid fa-xmark"></i></button>` : ''}${own && c.col === 'warga' ? `<button class="ib" data-act="wgpindah" data-id="${r.id}" title="Ajukan pindah sektor (perlu persetujuan Admin Utama)"><i class="fa-solid fa-right-left"></i></button>` : ''}${c.col === 'warga' && u && u.role === 'admin' && r.pindahReq && r.pindahReq.status === 'Menunggu' ? `<button class="ib grn" data-act="wgpvapp" data-id="${r.id}" title="Setujui pindah ke ${esc(r.pindahReq.tujuan)}"><i class="fa-solid fa-right-left"></i></button><button class="ib red" data-act="wgpvrej" data-id="${r.id}" title="Tolak pindah sektor"><i class="fa-solid fa-ban"></i></button>` : ''}${c.col === 'agendasektor' && u && ['admin', 'ketua'].includes(u.role) ? `<button class="ib grn" data-act="skapp" data-id="${r.id}" title="Setujui & tayangkan"${r.status === 'Disetujui' || r.tayang !== 'Ya' ? ' disabled' : ''}><i class="fa-solid fa-check"></i></button><button class="ib red" data-act="skrej" data-id="${r.id}" title="Tolak"${r.status === 'Ditolak' || r.tayang !== 'Ya' ? ' disabled' : ''}><i class="fa-solid fa-xmark"></i></button>` : ''}${c.col === 'surat' && u && ['admin', 'sekretaris'].includes(u.role) ? `<button class="ib" data-act="sprint" data-id="${r.id}" title="${r.jenis === 'Surat Masuk' ? 'Cetak lembar disposisi' : 'Cetak surat keluar'}"><i class="fa-solid fa-print"></i></button>` : ''}${c.col === 'surat' && u && ['admin', 'sekretaris'].includes(u.role) && r.jenis === 'Surat Masuk' ? `<button class="ib grn" data-act="disp" data-id="${r.id}" title="Disposisi"><i class="fa-solid fa-share"></i></button>` : ''}${apv ? `<button class="ib grn" data-act="sapp" data-id="${r.id}" title="Setujui"${r.status === 'Disetujui' ? ' disabled' : ''}><i class="fa-solid fa-check"></i></button><button class="ib red" data-act="stolak" data-id="${r.id}" title="Tolak"${r.status === 'Ditolak' ? ' disabled' : ''}><i class="fa-solid fa-xmark"></i></button>` : `<button class="ib" data-act="edit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button>
      ${own && c.col === 'warga' ? '' : `<button class="ib red" data-act="del" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>`}`}</td>`}</tr>`).join('')
      : `<tr><td colspan="${c.cols.length + 1}" class="empty">${c.empty}</td></tr>`}
    </tbody></table></div></div>`;
}

/* ---------- Tampilan dashboard ---------- */
const MENU = [
  {id:'home', label:'Beranda', icon:'house', roles:['admin','bendahara','ketua','sekretaris','adminsektor']},
  {id:'warga', label:'Data Warga', icon:'users', roles:['admin','ketua','sekretaris','adminsektor']},
  {id:'surat', label:'Arsip Surat', icon:'folder-open', roles:['admin','ketua','sekretaris']},
  {id:'agenda', label:'Agenda & Kegiatan', icon:'calendar-days', roles:['admin']},
  {id:'renungan', label:'Renungan Harian', icon:'book-open', roles:['admin','ketua']},
  {id:'rekening', label:'Rekening Pembangunan', icon:'building-columns', roles:['admin']},
  {id:'fotobangun', label:'Foto Pembangunan', icon:'images', roles:['admin']},
  {id:'panitia', label:'Panitia Pembangunan', icon:'people-group', roles:['admin']},
  {id:'warta', label:'Warta Jemaat', icon:'newspaper', roles:[]},
  {id:'uang', label:'Keuangan', icon:'wallet', roles:['ketua']},
  {id:'akun', label:'Kelola Akun', icon:'user-gear', roles:['admin']},
  {id:'akses', label:'Akses Keuangan', icon:'user-shield', roles:['bendahara']},
  {id:'profil', label:'Profil Saya', icon:'id-card', roles:['admin','bendahara','ketua','sekretaris','adminsektor']}
];
const stat = (i, n, l) => `<div class="stat"><div class="si"><i class="fa-solid fa-${i}"></i></div><div><b>${n}</b><small>${l}</small></div></div>`;

function rnToday() {
  const d = new Date(), t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const l = DB.get('renungan', []).slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return l.find(r => r.tanggal <= t) || l[l.length - 1] || null;
}
function rnPanel() {
  const r = rnToday();
  if (!r) return `<div class="panel"><h3><i class="fa-solid fa-book-open" style="color:var(--blue)"></i> Renungan Harian</h3><p>Belum ada renungan.</p></div>`;
  return `<div class="panel" style="border-left:5px solid var(--gold)"><small style="color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px"><i class="fa-solid fa-book-open"></i> Renungan Harian · ${fmtD(r.tanggal)}</small>
    <h3 style="margin:6px 0 10px;font-size:22px">${esc(r.judul)}</h3>
    <div style="background:#fff8e1;border-radius:12px;padding:12px 16px;margin-bottom:14px"><b style="color:#92400e"><i class="fa-solid fa-book-bible"></i> ${esc(r.ayat)}</b>${r.teks ? `<p style="font-style:italic;white-space:pre-line;margin-top:4px">${esc(r.teks)}</p>` : ''}</div>
    <p style="white-space:pre-line;line-height:1.8;color:#374151">${esc(r.isi)}</p>
    ${r.doa ? `<div style="margin-top:14px;background:#eef4ff;border-radius:12px;padding:12px 16px;color:#1e3a8a"><b><i class="fa-solid fa-hands-praying"></i> Doa</b><p style="white-space:pre-line;font-style:italic">${esc(r.doa)}</p></div>` : ''}
    ${r.penulis ? `<p style="margin-top:12px;font-size:13.5px;color:var(--muted)"><i class="fa-solid fa-pen-nib"></i> ${esc(r.penulis)}</p>` : ''}
    <div class="btns"><button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="rnall"><i class="fa-solid fa-clock-rotate-left"></i> Renungan Hari Lain</button></div></div>`;
}
function wtPanel() {
  const d = new Date(), t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const l = DB.get('warta', []).slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const r = l.find(x => x.tanggal <= t) || l[l.length - 1];
  if (!r) return '';
  const b = (ic, tt, v) => v ? `<h4 style="margin:14px 0 4px;color:var(--blue)"><i class="fa-solid fa-${ic}"></i> ${tt}</h4><p style="white-space:pre-line;line-height:1.8;color:#374151">${esc(v)}</p>` : '';
  return `<div class="panel" style="border-left:5px solid var(--blue)"><small style="color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px"><i class="fa-solid fa-newspaper"></i> Warta Jemaat · ${fmtD(r.tanggal)}</small>
    <h3 style="margin:6px 0 4px;font-size:22px">${esc(r.judul)}</h3>
    ${r.bacaan ? `<p style="color:#92400e;font-weight:600"><i class="fa-solid fa-book-bible"></i> ${esc(r.bacaan)}</p>` : ''}
    ${b('church', 'Jadwal Ibadah', r.ibadah)}${b('bullhorn', 'Pengumuman', r.pengumuman)}${b('heart', 'Syukur & Turut Berduka', r.syukur)}
    ${r.kolekte ? `<p style="margin-top:12px"><b>Persembahan minggu lalu:</b> ${rp(r.kolekte)}</p>` : ''}</div>`;
}
function fbrBlock(u) {
  const list = DB.get('fotoberanda', []), k = u.role === 'ketua';
  if (!list.length && !k) return '';
  return (k ? `<div class="btns" style="margin:0 0 14px"><button class="btn btn-blue btn-sm" data-act="fbadd"><i class="fa-solid fa-image"></i> Tambah Foto</button></div>` : '') +
    (list.length ? `<div class="fbr">${list.map(r => `<figure><img src="${esc(r.foto)}" alt="${esc(r.ket || 'Foto')}">${k ? `<div class="tl"><button class="ib" data-act="fbedit" data-id="${r.id}" title="Ubah keterangan"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="fbdel" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></div>` : ''}${r.ket ? `<figcaption>${esc(r.ket)}</figcaption>` : ''}</figure>`).join('')}</div>`
      : `<div class="panel" style="text-align:center;color:var(--muted)"><i class="fa-solid fa-images" style="font-size:30px;margin-bottom:8px"></i><p>Belum ada foto. Klik "Tambah Foto" untuk mengunggah.</p></div>`);
}
function vHome(u) {
  const w = DB.get('warga', []), s = DB.get('surat', []), us = users();
  let h = fbrBlock(u) + `<div class="panel"><h3>Shalom, ${esc(u.nama)}</h3><p>Anda masuk sebagai ${chip(u.role)}. ${
    u.role === 'adminsektor' ? 'Tambah dan perbarui data warga ' + esc(u.sektor) + ' melalui menu Data Warga, serta kelola agenda & kegiatan sektor melalui menu Agenda Sektor.' : 'Kelola data pelayanan jemaat melalui menu di samping.'}</p></div>` + wtPanel() + (u.role === 'sekretaris' ? '' : rnPanel());
  {
    h += '<div class="stats">';
    if (u.role === 'adminsektor') h += stat('users', w.filter(x => x.status === 'Aktif' && x.sektor === u.sektor).length, 'Warga Aktif ' + esc(u.sektor));
    else h += stat('users', w.filter(x => x.status === 'Aktif').length, 'Warga Aktif') + stat('envelope', s.length, 'Arsip Surat') + (u.role === 'ketua' ? stat('file-signature', s.filter(x => (x.status || 'Menunggu') === 'Menunggu').length, 'Surat Menunggu Persetujuan') : '');
    if (u.role === 'admin') h += stat('user-clock', us.filter(x => x.status === 'menunggu').length, 'Menunggu Persetujuan') + stat('user-group', us.length, 'Total Akun');
    h += '</div>';
  }
  if (u.role !== 'sekretaris' && u.role !== 'ketua') h += `<div class="panel"><h3>Agenda Jemaat</h3><ul class="agl">
    <li><i class="fa-solid fa-church"></i><div><b>Ibadah Raya Minggu</b><br><small>Setiap Minggu, 09.00 WIT</small></div></li>
    <li><i class="fa-solid fa-music"></i><div><b>Latihan Paduan Suara</b><br><small>Setiap Kamis, 19.00 WIT</small></div></li>
    <li><i class="fa-solid fa-hands-holding-circle"></i><div><b>Kerja Bakti Gedung Gereja</b><br><small>Sabtu, 08.00 WIT</small></div></li></ul></div>`;
  if (u.role === 'admin') h += `<div class="panel"><h3>Cadangan Data</h3>
    <p>Data tersimpan di browser perangkat ini. Unduh cadangan secara berkala dan simpan dengan aman (berisi data akun).</p>
    <div class="btns"><button class="btn btn-blue btn-sm" data-act="backup"><i class="fa-solid fa-download"></i> Unduh Cadangan</button>
    <button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="restore"><i class="fa-solid fa-upload"></i> Pulihkan dari File</button>
    <input type="file" id="restoreFile" accept=".json" hidden></div></div>`;
  return h;
}
function vLocked() {
  return `<div class="lockbox"><i class="fa-solid fa-lock"></i><b>Modul Keuangan Terkunci</b>
    <p style="color:#b91c1c">Hanya dapat diakses jika disetujui oleh Admin / Bendahara Jemaat.</p></div>`;
}
function vAkun(u) {
  return `<div class="panel"><div class="tools"><span style="color:var(--muted)">Akun yang dibuat Admin langsung aktif.</span><button class="btn btn-blue btn-sm" data-act="newuser"><i class="fa-solid fa-user-plus"></i> Tambah Akun</button></div><div class="tblwrap"><table class="tbl"><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th><th>Akses Keuangan</th><th></th></tr></thead><tbody>
  ${users().map(x => { const self = x.id === u.id; return `<tr>
    <td><b>${esc(x.nama)}</b><br><small style="color:var(--muted)">${esc(x.email)}</small></td><td>${esc(x.username)}</td>
    <td>${self ? chip(x.role) : `<select class="sel" data-chg="role" data-id="${x.id}">${['bendahara','sekretaris','ketua','adminsektor','admin'].map(r => `<option value="${r}" ${x.role === r ? 'selected' : ''}>${LBL[r]}</option>`).join('')}</select>`}${x.role === 'adminsektor' ? `<br><select class="sel" data-chg="sektor" data-id="${x.id}" style="margin-top:6px">${SEKTOR.map(o => `<option ${x.sektor === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : ''}</td>
    <td>${chip(x.status)}</td>
    <td>${x.role === 'ketua' ? `<button class="ib ${x.financeAccess ? 'grn' : ''}" data-act="fin" data-id="${x.id}" title="${x.financeAccess ? 'Cabut akses' : 'Beri akses'}"><i class="fa-solid fa-${x.financeAccess ? 'lock-open' : 'lock'}"></i></button>` : x.role === 'admin' ? 'Penuh' : '-'}</td>
    <td style="white-space:nowrap">
      ${x.status === 'menunggu' ? `<button class="ib grn" data-act="approve" data-id="${x.id}" title="Setujui"><i class="fa-solid fa-check"></i></button>` : ''}
      ${self ? '' : `<button class="ib" data-act="toggle" data-id="${x.id}" title="${x.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}"><i class="fa-solid fa-${x.status === 'aktif' ? 'user-slash' : 'user-check'}"></i></button>`}
      <button class="ib" data-act="reset" data-id="${x.id}" title="Reset password"><i class="fa-solid fa-key"></i></button>
      ${self ? '' : `<button class="ib red" data-act="rmuser" data-id="${x.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>`}
    </td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}
function vAkses(u) {
  const list = users().filter(x => x.role === 'ketua' && x.status === 'aktif');
  return `<div class="panel"><h3>Akses Modul Keuangan</h3><p style="margin-bottom:14px">Beri atau cabut akses Keuangan untuk Ketua Majelis Jemaat. Bendahara dan Admin selalu punya akses penuh.</p>
  <div class="tblwrap"><table class="tbl"><thead><tr><th>Ketua Majelis</th><th>Akses Keuangan</th><th></th></tr></thead><tbody>
  ${list.length ? list.map(x => `<tr><td><b>${esc(x.nama)}</b><br><small style="color:var(--muted)">${esc(x.email)}</small></td>
    <td>${x.financeAccess ? chip('aktif', 'Diizinkan') : chip('nonaktif', 'Terkunci')}</td>
    <td><button class="ib ${x.financeAccess ? 'grn' : ''}" data-act="fin" data-id="${x.id}" title="${x.financeAccess ? 'Cabut akses' : 'Beri akses'}"><i class="fa-solid fa-${x.financeAccess ? 'lock-open' : 'lock'}"></i></button></td></tr>`).join('')
    : '<tr><td colspan="3" class="empty">Belum ada Ketua Majelis aktif.</td></tr>'}
  </tbody></table></div></div>`;
}
function vProfil(u) {
  return `<div class="panel" style="max-width:560px"><h3 style="margin-bottom:14px">Data Akun</h3>
    <form id="fProf"><div class="fg"><label>Nama Lengkap</label><input name="nama" value="${esc(u.nama)}" required></div>
    <div class="fg"><label>Email</label><input type="email" name="email" value="${esc(u.email)}" required></div>
    <div class="fg"><label>Username</label><input value="${esc(u.username)}" disabled></div>
    <button class="btn btn-blue btn-sm">Simpan Perubahan</button></form></div>
    <div class="panel" style="max-width:560px"><h3 style="margin-bottom:14px">Ubah Password</h3>
    <form id="fPass"><div class="fg"><label>Password Lama</label><input type="password" name="old" required autocomplete="current-password"></div>
    <div class="fg"><label>Password Baru</label><input type="password" name="pw" required autocomplete="new-password"></div>
    <div class="fg"><label>Ulangi Password Baru</label><input type="password" name="pw2" required autocomplete="new-password"></div>
    <button class="btn btn-blue btn-sm">Ubah Password</button></form></div>`;
}
const VIEWS = {akses:vAkses, home:vHome, warga:u => vCrud(CFG.warga, u), surat:u => vCrud(CFG.surat, u), agenda:u => vCrud(CFG.agenda, u), renungan:u => vCrud(CFG.renungan, u), warta:() => vCrud(CFG.warta),
  fotobangun:() => vCrud(CFG.fotobangun),
  panitia:() => vCrud(CFG.panitia),
  rekening:() => { const r = getRek(); return `<div class="panel"><h3><i class="fa-solid fa-building-columns" style="color:var(--blue)"></i> Persembahan Kasih Pembangunan Gereja</h3>
    <p style="margin:8px 0 14px">Data ini tampil di section Pembangunan pada halaman utama.</p>
    <p><b>Bank:</b> ${esc(r.bank)}</p><p><b>Nomor Rekening:</b> ${esc(r.no)}</p><p><b>Atas Nama:</b> ${esc(r.an)}</p>
    <div class="btns"><button class="btn btn-blue btn-sm" data-act="rek"><i class="fa-solid fa-pen"></i> Ubah Rekening</button></div></div>`; },
  uang:u => canFin(u) ? vCrud(CFG.uang) : vLocked(), akun:vAkun, profil:vProfil};

let cur = 'home';
function openDash() {
  if (!me()) return openAuth('Login');
  cur = 'home'; $('#dash').classList.add('open'); document.body.style.overflow = 'hidden'; renderDash();
}
function closeDash() { $('#dash').classList.remove('open'); document.body.style.overflow = ''; }
function renderDash() {
  const u = me();
  if (!u) { closeDash(); refreshNav(); return; }
  const items = MENU.filter(m => m.roles.includes(u.role));
  if (!items.some(m => m.id === cur)) cur = 'home';
  $('#menu').innerHTML = items.map(m => `<button data-v="${m.id}" class="${m.id === cur ? 'on' : ''}"><i class="fa-solid fa-${m.icon}"></i><span>${m.label}</span>${m.id === 'uang' && !canFin(u) ? '<i class="fa-solid fa-lock" style="font-size:11px;margin-left:auto"></i>' : ''}</button>`).join('');
  $('#dTitle').textContent = items.find(m => m.id === cur).label;
  $('#dUser').innerHTML = esc(u.nama) + ' ' + chip(u.role);
  $('#dBody').innerHTML = VIEWS[cur](u);
  if (window.renderBuletin) renderBuletin();
  if (window.renderSaldoPub) renderSaldoPub();
  if (window.renderAgenda) renderAgenda();
  if (window.renderRenungan) renderRenungan();
  if (window.renderWarta) renderWarta();
  if (window.renderRekening) renderRekening();
  if (window.renderFotoBangun) renderFotoBangun();
  if (window.renderPanitia) renderPanitia();
}
$('#menu').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { cur = b.dataset.v; renderDash(); } });
$('#toSite').onclick = closeDash;
$('#logout').onclick = () => { clearSid(); closeDash(); refreshNav(); say('Anda telah keluar.'); };

/* ---------- Aksi di dashboard ---------- */
const put = (col, l) => { try { DB.set(col, l); return null; } catch { return 'Penyimpanan browser penuh. Gunakan berkas/foto yang lebih kecil atau hapus data lama.'; } };
const clean = d => { const o = {...d}; Object.keys(o).forEach(k => o[k] = String(o[k]).trim()); return o; };
const REKDEF = {bank:'Bank Rakyat Indonesia (BRI)', no:'0000000000000000', an:'Panitia Pembangunan Gereja Beth Eden'};
const getRek = () => ({...REKDEF, ...(DB.get('rekening', {}) || {})});
window.renderRekening = () => {
  const r = getRek(), set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('rekBank', r.bank); set('rekNo', r.no); set('rekAn', r.an);
  const a = document.getElementById('rekAdm'); if (a) a.hidden = !adminU();
};
window.renderFotoBangun = () => {
  const w = document.getElementById('fbWrap'); if (!w) return;
  const list = DB.get('fotobangun', []), adm = adminU();
  w.hidden = !list.length && !adm;
  document.getElementById('fbAdm').hidden = !adm;
  document.getElementById('fbGrid').innerHTML = list.length ? list.map(r => `<figure class="fb-item"><img src="${esc(r.foto)}" alt="${esc(r.ket || 'Foto pembangunan gereja')}" loading="lazy">
    ${adm ? `<div class="fb-tools"><button class="ib" data-fb="edit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-fb="del" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></div>` : ''}
    ${r.ket ? `<figcaption>${esc(r.ket)}</figcaption>` : ''}</figure>`).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">Belum ada foto. Klik "Tambah Foto" untuk mengunggah.</p>';
};
function pntChart(list, adm, esc) {
  const tools = r => adm ? `<div class="tl2"><button class="ib" data-pnt="edit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-pnt="del" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></div>` : '';
  const B = {pel:[], ket:[], wket:[], sek:[], wsek:[], ben:[], wben:[]}, G = {}, order = [];
  const grp = (k, n) => G[k] || (order.push(k), G[k] = {name:n, items:[]});
  list.forEach(r => {
    const j = String(r.jabatan || '').trim(), l = j.toLowerCase();
    const m = j.match(/\b(seksi|sie|bidang|divisi)\s+(.+)$/i);
    if (m) { const nm = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + ' ' + m[2].trim(); const role = j.slice(0, m.index).trim() || 'Anggota'; grp(nm.toLowerCase(), nm).items.push({r, role}); }
    else if (/pelindung|penasihat|penasehat|pembina|penanggung jawab/.test(l)) B.pel.push(r);
    else if (/wakil.*ketua|ketua\s*(ii|2)\b/.test(l)) B.wket.push(r);
    else if (/ketua/.test(l)) B.ket.push(r);
    else if (/wakil.*sekretaris|sekretaris\s*(ii|2)\b/.test(l)) B.wsek.push(r);
    else if (/sekretaris/.test(l)) B.sek.push(r);
    else if (/wakil.*bendahara|bendahara\s*(ii|2)\b/.test(l)) B.wben.push(r);
    else if (/bendahara/.test(l)) B.ben.push(r);
    else grp('~anggota', 'Anggota').items.push({r, role: j || 'Anggota'});
  });
  const nd = (r, c) => `<div class="nd${c ? ' ' + c : ''}"><b>${esc(r.jabatan)}</b><small>${esc(r.nama)}</small>${tools(r)}</div>`;
  const row = (a, c) => a.length ? `<div class="row">${a.map(r => nd(r, c)).join('')}</div>` : '';
  const stack = a => a.map(r => nd(r)).join('<div class="ln"></div>');
  const cols = [[...B.sek, ...B.wsek], [...B.ben, ...B.wben]].filter(c => c.length);
  const w = r => /ketua|koordinator/i.test(r.role) ? (/wakil/i.test(r.role) ? 1 : 0) : /wakil/i.test(r.role) ? 1 : /sekretaris|bendahara/i.test(r.role) ? 2 : 3;
  const groups = order.map(k => G[k]).sort((a, b) => (a.name === 'Anggota') - (b.name === 'Anggota'));
  const parts = [
    row(B.pel, 'gold'), row(B.ket, 'top'), row(B.wket),
    cols.length ? `<div class="brn">${cols.map(c => `<div class="col">${stack(c)}</div>`).join('')}</div>` : '',
    groups.length ? `<div class="sk"><div class="sk-t">Seksi &amp; Anggota Panitia</div><div class="sk-g">${groups.map(g => `<div class="grp"><div class="grp-h">${esc(g.name)}</div>${g.items.map((x, i) => [x, i]).sort((a, b) => w(a[0]) - w(b[0]) || a[1] - b[1]).map(([x]) => `<div class="mem"><small>${esc(x.role)}</small><b>${esc(x.r.nama)}</b>${tools(x.r)}</div>`).join('')}</div>`).join('')}</div></div>` : ''
  ].filter(Boolean);
  return parts.join('<div class="ln"></div>');
}
window.renderPanitia = () => {
  const w = document.getElementById('pntWrap'); if (!w) return;
  const list = DB.get('panitia', []), adm = adminU();
  w.hidden = !list.length && !adm;
  document.getElementById('pntAdm').hidden = !adm;
  document.getElementById('pntGrid').innerHTML = list.length ? pntChart(list, adm, esc) : '<p style="text-align:center;color:var(--muted)">Belum ada anggota panitia. Klik "Tambah Anggota Panitia".</p>';
};
const staff = () => { const u = me(); return u && ['admin', 'bendahara', 'ketua', 'sekretaris'].includes(u.role) && (cur !== 'uang' || canFin(u)) && (cur !== 'fotobangun' || u.role === 'admin') && (cur !== 'panitia' || u.role === 'admin') && (cur !== 'fotoberanda' || u.role === 'ketua') && !(u.role === 'ketua' && (cur === 'warga' || cur === 'surat')) && !(u.role === 'bendahara' && ['warga', 'surat', 'agenda', 'renungan'].includes(cur)) && !(u.role === 'sekretaris' && ['agenda', 'renungan'].includes(cur)) && !(u.role === 'ketua' && ['agenda', 'agendasektor', 'ibadah'].includes(cur)) && cur !== 'warta' && !(cur === 'ibadah' && !['admin', 'sekretaris'].includes(u.role)) ? u : null; };
const adminU = () => { const u = me(); return u && u.role === 'admin' ? u : null; };
const upd = (id, fn) => { const l = users(), x = l.find(y => y.id === id); if (x) { fn(x, l); saveUsers(l); } renderDash(); };

const ACT = {
  rek() {
    if (!adminU()) return;
    openForm('Rekening Pembangunan Gereja', [{k:'bank', l:'Nama Bank', req:1}, {k:'no', l:'Nomor Rekening', req:1}, {k:'an', l:'Atas Nama (A.N.)', req:1}], getRek(), d => {
      if (!/^[0-9 .\-]{5,}$/.test(d.no)) return 'Nomor rekening hanya boleh berisi angka (minimal 5 digit).';
      const e = put('rekening', {bank:d.bank, no:d.no, an:d.an}); if (e) return e;
      renderDash(); renderRekening(); say('Nomor rekening disimpan.');
    });
  },
  add() {
    const au = me(), sk = !!(au && au.role === 'adminsektor' && au.sektor && cur === 'warga');
    if (!sk && !staff()) return; const c = CFG[cur];
    openForm(c.add, sk ? c.fields.map(f => f.k === 'sektor' ? {...f, ro:true, l:'Sektor (otomatis sesuai akun Anda)'} : f) : c.fields, sk ? {status:'Aktif', sektor:au.sektor} : {}, d => { if (c.fields.some(f => f.t === 'image' && f.req && !d[f.k])) return 'Pilih foto terlebih dahulu.'; if (c.beforeSave) { const er = c.beforeSave(d, null); if (er) return er; } const l = DB.get(c.col, []); const it = {id:uid(), ...(c.col === 'surat' ? {status:'Menunggu'} : {}), ...clean(d)}; if (sk) it.sektor = au.sektor; c.prepend ? l.unshift(it) : l.push(it); const e = put(c.col, l); if (e) return e; renderDash(); say('Data ditambahkan.'); });
  },
  edit(id) {
    const u = me(), c = CFG[cur], item = c && DB.get(c.col, []).find(x => x.id === id); if (!item) return;
    const sk = u && u.role === 'adminsektor' && cur === 'warga' && item.sektor === u.sektor;
    if (!sk && !staff()) return;
    openForm('Ubah Data', sk ? c.fields.map(f => f.k === 'sektor' ? {...f, ro:true, l:'Sektor (otomatis sesuai akun Anda)'} : f) : c.fields, item, d => { if (c.beforeSave) { const er = c.beforeSave(d, item); if (er) return er; } const l = DB.get(c.col, []); const i = l.findIndex(x => x.id === id); l[i] = {...l[i], ...clean(d)}; if (sk) l[i].sektor = u.sektor; const e = put(c.col, l); if (e) return e; renderDash(); say('Data diperbarui.'); });
  },
  del(id) {
    if (!staff() || !confirm('Hapus data ini?')) return; const c = CFG[cur];
    DB.set(c.col, DB.get(c.col, []).filter(x => x.id !== id)); renderDash(); say('Data dihapus.');
  },
  fbadd() { const o = cur; cur = 'fotoberanda'; try { ACT.add(); } finally { cur = o; } },
  fbedit(id) { const o = cur; cur = 'fotoberanda'; try { const u = me(), item = DB.get('fotoberanda', []).find(x => x.id === id); if (!u || u.role !== 'ketua' || !item) return;
    openForm('Ubah Foto', CFG.fotoberanda.fields, item, d => { const l = DB.get('fotoberanda', []), i = l.findIndex(x => x.id === id); l[i] = {...l[i], ...clean(d)}; const e = put('fotoberanda', l); if (e) return e; renderDash(); say('Foto diperbarui.'); }); } finally { cur = o; } },
  fbdel(id) { const u = me(); if (!u || u.role !== 'ketua' || !confirm('Hapus foto ini?')) return; DB.set('fotoberanda', DB.get('fotoberanda', []).filter(x => x.id !== id)); renderDash(); say('Foto dihapus.'); },
  sapp(id) { const u = me(); if (u && u.role === 'ketua') { const l = DB.get('surat', []), x = l.find(y => y.id === id); if (x) { x.status = 'Disetujui'; x.oleh = u.nama; x.tglSetuju = new Date().toISOString().slice(0, 10); DB.set('surat', l); renderDash(); say('Surat disetujui.'); } } },
  stolak(id) { const u = me(); if (u && u.role === 'ketua') { const l = DB.get('surat', []), x = l.find(y => y.id === id); if (x) { x.status = 'Ditolak'; x.oleh = u.nama; x.tglSetuju = new Date().toISOString().slice(0, 10); DB.set('surat', l); renderDash(); say('Surat ditolak.'); } } },
  approve(id) { if (adminU()) { upd(id, x => x.status = 'aktif'); say('Akun disetujui.'); } },
  toggle(id) { const a = adminU(); if (a && a.id !== id) upd(id, x => x.status = x.status === 'aktif' ? 'nonaktif' : 'aktif'); },
  fin(id) { const a = me(); if (a && (a.role === 'admin' || a.role === 'bendahara')) upd(id, x => { if (x.role === 'ketua') x.financeAccess = !x.financeAccess; }); },
  newuser() {
    if (!adminU()) return;
    const RL = {'Sekretaris':'sekretaris', 'Ketua Majelis Jemaat':'ketua', 'Admin Sektor':'adminsektor', 'Bendahara':'bendahara', 'Admin':'admin'};
    openForm('Tambah Akun', [
      {k:'nama', l:'Nama Lengkap', req:1}, {k:'username', l:'Username (huruf kecil/angka)', req:1}, {k:'email', l:'Email', t:'email', req:1},
      {k:'peran', l:'Peran', t:'select', o:['Sekretaris','Ketua Majelis Jemaat','Admin Sektor','Bendahara','Admin']},
      {k:'sektor', l:'Sektor (khusus Admin Sektor)', t:'select', o:SEKTOR},
      {k:'pw', l:'Password sementara (min. 8 karakter, huruf & angka)', req:1},
      {k:'q', l:'Pertanyaan Keamanan', t:'select', o:['Nama ibu kandung Anda?','Nama sekolah dasar Anda?','Nama hewan peliharaan pertama Anda?','Di desa/kota mana Anda lahir?','Nama sahabat masa kecil Anda?']},
      {k:'ans', l:'Jawaban Pertanyaan Keamanan', req:1}
    ], {}, async d => {
      const nama = d.nama.trim(), username = norm(d.username), email = norm(d.email), list = users();
      if (nama.length < 3) return 'Nama minimal 3 karakter.';
      if (!/^[a-z0-9_.]{3,20}$/.test(username)) return 'Username 3–20 karakter: huruf kecil, angka, titik atau underscore.';
      if (!/^\S+@\S+\.\S+$/.test(email)) return 'Format email tidak valid.';
      if (!strong(d.pw)) return 'Password minimal 8 karakter dan mengandung huruf serta angka.';
      if (norm(d.ans).length < 2) return 'Isi jawaban pertanyaan keamanan.';
      if (list.some(x => x.username === username)) return 'Username sudah dipakai.';
      if (list.some(x => norm(x.email) === email)) return 'Email sudah terdaftar.';
      const salt = rnd(), role = RL[d.peran] || 'bendahara';
      list.push({id:uid(), nama, username, email, role, sektor: role === 'adminsektor' ? d.sektor : '', status:'aktif', financeAccess:false, salt,
        hash: await hash(d.pw, salt), question:d.q, answer: await hash(norm(d.ans), salt), created:new Date().toISOString()});
      saveUsers(list); renderDash(); say('Akun ' + d.peran + ' dibuat. Berikan username dan password sementara kepada pemiliknya.');
    });
  },
  reset(id) {
    if (!adminU()) return; const x = users().find(y => y.id === id); if (!x) return;
    openForm('Reset Password: ' + x.username, [{k:'pw', l:'Password sementara (min. 8 karakter, huruf & angka)', req:1}], {}, async d => {
      if (!strong(d.pw)) return 'Password minimal 8 karakter dan mengandung huruf serta angka.';
      const l = users(), t = l.find(y => y.id === id); t.hash = await hash(d.pw, t.salt); saveUsers(l);
      say('Password direset. Beritahu pengguna untuk menggantinya.');
    });
  },
  rmuser(id) {
    const a = adminU(); if (!a || a.id === id || !confirm('Hapus akun ini secara permanen?')) return;
    saveUsers(users().filter(x => x.id !== id)); renderDash(); say('Akun dihapus.');
  },
  backup() {
    if (!adminU()) return;
    const d = {users:users(), warga:DB.get('warga', []), surat:DB.get('surat', []), uang:DB.get('uang', []), renungan:DB.get('renungan', []), warta:DB.get('warta', []), rekening:DB.get('rekening', null), fotobangun:DB.get('fotobangun', []), ...Object.fromEntries(MORE.map(k => [k, DB.get(k, [])])), pelkesmeta:DB.get('pelkesmeta', {}), nomorcfg:DB.get('nomorcfg', {}), fotoberanda:DB.get('fotoberanda', []), agenda:DB.get('agenda', []), dibuat:new Date().toISOString()};
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], {type:'application/json'}));
    a.download = 'cadangan-gereja-beth-eden-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  restore() { if (adminU()) $('#restoreFile').click(); },
  rnall() { closeDash(); setTimeout(() => { const e = document.getElementById('renungan'); if (e) e.scrollIntoView({behavior:'smooth'}); }, 50); }
};
$('#dBody').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset.id); });
$('#dBody').addEventListener('input', e => {
  if (e.target.hasAttribute('data-search')) {
    const q = norm(e.target.value);
    $$('#dBody .tbl tbody tr').forEach(tr => tr.hidden = !!q && !tr.textContent.toLowerCase().includes(q));
  }
});
$('#dBody').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.chg === 'role') { const a = adminU(); if (a && a.id !== t.dataset.id) upd(t.dataset.id, x => { x.role = t.value; if (t.value === 'adminsektor') x.sektor = x.sektor || SEKTOR[0]; }); else renderDash(); }
  if (t.dataset.chg === 'sektor') { const a = adminU(); if (a && SEKTOR.includes(t.value)) upd(t.dataset.id, x => { if (x.role === 'adminsektor') x.sektor = t.value; }); else renderDash(); }
  if (t.id === 'restoreFile' && t.files[0] && adminU()) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!Array.isArray(d.users) || !d.users.some(x => x.role === 'admin')) throw 0;
        if (!confirm('Semua data saat ini akan diganti dengan isi file cadangan. Lanjutkan?')) return;
        ['users', 'warga', 'surat', 'uang', 'renungan', 'warta', 'agenda'].forEach(k => { if (k === 'agenda' || k === 'renungan' || k === 'warta') { if (Array.isArray(d[k])) DB.set(k, d[k]); } else DB.set(k, Array.isArray(d[k]) ? d[k] : []); }); if (d.rekening && typeof d.rekening === 'object') DB.set('rekening', d.rekening); if (Array.isArray(d.fotobangun)) DB.set('fotobangun', d.fotobangun); MORE.forEach(k => { if (Array.isArray(d[k])) DB.set(k, d[k]); }); if (d.pelkesmeta) DB.set('pelkesmeta', d.pelkesmeta); if (d.nomorcfg) DB.set('nomorcfg', d.nomorcfg); if (Array.isArray(d.fotoberanda)) DB.set('fotoberanda', d.fotoberanda);
        purgeOld(); say('Data berhasil dipulihkan.'); renderDash();
      } catch { say('File cadangan tidak valid.'); }
    };
    r.readAsText(t.files[0]);
  }
});
$('#dBody').addEventListener('submit', async e => {
  e.preventDefault(); const u = me(); if (!u) return;
  const f = Object.fromEntries(new FormData(e.target));
  if (e.target.id === 'fProf') {
    const nama = f.nama.trim(), email = norm(f.email);
    if (nama.length < 3 || !/^\S+@\S+\.\S+$/.test(email)) return say('Nama atau email tidak valid.');
    if (users().some(x => x.id !== u.id && norm(x.email) === email)) return say('Email sudah dipakai akun lain.');
    upd(u.id, x => { x.nama = nama; x.email = email; }); say('Profil diperbarui.');
  }
  if (e.target.id === 'fPass') {
    if ((await hash(f.old, u.salt)) !== u.hash) return say('Password lama salah.');
    if (!strong(f.pw)) return say('Password baru minimal 8 karakter, huruf dan angka.');
    if (f.pw !== f.pw2) return say('Konfirmasi password tidak sama.');
    const nh = await hash(f.pw, u.salt); upd(u.id, x => x.hash = nh); e.target.reset(); say('Password berhasil diubah.');
  }
});

/* ================= MODUL SEKRETARIAT ================= */
const SEKR = ['sekretaris'];
const isSek = () => { const u = me(); return u && SEKR.includes(u.role) ? u : null; };
const TAB = {registrasi:'stat', notulen:'notulen', regj:'Baptis'};
const NT = {edit:null, fs:'Semua'};
const PK = {year:new Date().getFullYear()};
const todayS = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dID = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}); } catch { return d || ''; } };
const nl2br = t => esc(t).replace(/\n/g, '<br>');
const lns = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const tabs = (key, items) => `<div class="tabs">${items.map(([id, l, ic]) => `<button class="${TAB[key] === id ? 'on' : ''}" data-tab="${key}:${id}"><i class="fa-solid fa-${ic}"></i> ${l}</button>`).join('')}</div>`;
const fld = a => a.map(x => ({k:x[0], l:x[1], t:x[2] || undefined, req:x[3] || undefined, rows:x[4] || undefined, o:x[5] || undefined}));

/* ---------- Dokumen: pratinjau, cetak/PDF, Word ---------- */
const PAGECSS = 'body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;color:#000;margin:24px 40px}h1,h2,h3{text-align:center;margin:4px 0}h3{font-size:12pt}table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #000;padding:4px 8px;vertical-align:top;font-size:11pt;text-align:left}.nb td,.nb th{border:0;padding:2px 6px}.c{text-align:center}.r{text-align:right}.kop{text-align:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:14px}.kop b{display:block}.ttd{width:100%;margin-top:28px}.ttd td{border:0;text-align:center;width:50%}ol,ul{margin:4px 0 4px 18px;padding-left:12px}@page{size:A4;margin:18mm}';
const fullHtml = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PAGECSS}</style></head><body>${body}</body></html>`;
const LOGO_GPM = 'data:image/jpeg;base64,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';
const KOP = `<table class="nb" style="width:100%;margin:0 0 14px"><tr><td style="width:92px;padding:0 0 8px;border-bottom:3px double #000;text-align:left;vertical-align:middle"><img src="${LOGO_GPM}" width="84" height="82" alt="Logo GPM"></td><td style="padding:0 0 8px;border-bottom:3px double #000;text-align:center;vertical-align:middle"><div class="kop" style="border:0;padding:0;margin:0"><b>GEREJA PROTESTAN MALUKU</b><b>ANGGOTA PGI</b><b>KLASIS KAIRATU</b><b style="font-size:14pt">JEMAAT TIHULALE</b></div></td><td style="width:92px;padding:0 0 8px;border-bottom:3px double #000"></td></tr></table>`;
function showDoc(title, body) {
  const old = document.getElementById('docView'); if (old) old.remove();
  const o = document.createElement('div'); o.id = 'docView'; o.className = 'docv';
  o.innerHTML = `<div class="docbar"><b>${esc(title)}</b><span><button class="btn btn-blue btn-sm" data-d="print"><i class="fa-solid fa-print"></i> Cetak / PDF</button> <button class="btn btn-gold btn-sm" data-d="word"><i class="fa-solid fa-file-word"></i> Unduh Word</button> <button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-d="close">Tutup</button></span></div><iframe class="docframe" title="Pratinjau dokumen"></iframe>`;
  document.body.appendChild(o);
  const fr = o.querySelector('iframe'); fr.srcdoc = fullHtml(title, body);
  o.addEventListener('click', e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    if (b.dataset.d === 'close') o.remove();
    if (b.dataset.d === 'print') { fr.contentWindow.focus(); fr.contentWindow.print(); }
    if (b.dataset.d === 'word') {
      /* Word: bungkus sebagai MHTML agar logo ikut tampil */
      const html = fullHtml(title, body).split(LOGO_GPM).join('logo.jpg');
      const enc = t => btoa(unescape(encodeURIComponent(t))), wrap = x => x.replace(/.{1,76}/g, '$&\r\n');
      const mht = ['MIME-Version: 1.0', 'Content-Type: multipart/related; boundary="GPM_BATAS"; type="text/html"', '',
        '--GPM_BATAS', 'Content-Type: text/html; charset="utf-8"', 'Content-Transfer-Encoding: base64', 'Content-Location: dokumen.htm', '', wrap(enc(html)),
        '--GPM_BATAS', 'Content-Type: image/jpeg', 'Content-Transfer-Encoding: base64', 'Content-Location: logo.jpg', '', wrap(LOGO_GPM.split(',')[1]),
        '--GPM_BATAS--', ''].join('\r\n');
      const blob = new Blob([mht], {type:'application/msword'}), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = title.replace(/[^\w\-]+/g, '-') + '.doc'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }
  });
}

/* ---------- 1. PERSURATAN: penomoran otomatis, disposisi, SK ---------- */
const MESIN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const NOCFG = () => ({kode:'GPM/JMT-BE', ...(DB.get('nomorcfg', {}) || {})});
function nextNo(jenis, tgl) {
  const d = tgl ? new Date(tgl + 'T00:00:00') : new Date(), th = d.getFullYear(), bl = d.getMonth() + 1;
  const used = [...DB.get('surat', []), ...DB.get('sk', [])].filter(x => x.nojenis === jenis && +x.notahun === th).map(x => +x.nourut || 0);
  const urut = (used.length ? Math.max(...used) : 0) + 1;
  return {nomor:`${String(urut).padStart(3, '0')}/${jenis}/${NOCFG().kode}/${MESIN[bl]}/${th}`, nourut:urut, nojenis:jenis, notahun:th};
}
const DISP = ['Ketua Majelis Jemaat', 'Sekretaris', 'Bendahara', 'Seksi Ibadah', 'Seksi Diakonia', 'Seksi Pembangunan', 'Seksi Pemuda', 'Komisi Perempuan', ...SEKTOR.map(x => x)];
Object.assign(CFG.surat, {
  beforeSave(d, item) {
    if (d.jenis === 'Surat Keluar' && !d.nomor) Object.assign(d, nextNo('SKL', d.tanggal));
    if (!d.nomor) return 'Nomor surat masuk wajib diisi (sesuai nomor dari pengirim).';
  }
});
CFG.surat.fields[0] = {k:'nomor', l:'Nomor Surat (kosongkan untuk penomoran otomatis — khusus Surat Keluar)'};
CFG.surat.cols.splice(3, 0, {t:'Disposisi', f:r => r.jenis !== 'Surat Masuk' ? '-' : r.dispTujuan ? `${esc(r.dispTujuan)}<br>${chip(r.dispStatus || 'Baru')}${r.dispTenggat ? `<br><small style="color:var(--muted)">Tenggat ${fmtD(r.dispTenggat)}</small>` : ''}${r.dispInstruksi ? `<br><small style="color:var(--muted)">${esc(r.dispInstruksi)}</small>` : ''}` : '<small style="color:var(--muted)">Belum didisposisi</small>'});

/* ---------- Cetak Surat Masuk & Surat Keluar (Sekretaris) ---------- */
{ const F = CFG.surat.fields, i = F.findIndex(f => f.k === 'perihal');
  F.splice(i, 0, {k:'pihak', l:'Pengirim (Surat Masuk) / Tujuan (Surat Keluar)'}, {k:'lampiran', l:'Lampiran (mis. 1 berkas, atau kosongkan)'});
  F.splice(F.findIndex(f => f.k === 'ket'), 0, {k:'isi', l:'Isi Surat (khusus Surat Keluar, untuk dicetak; pisahkan paragraf dengan baris kosong)', t:'textarea', rows:6});
  CFG.surat.cols.splice(3, 0, {t:'Pengirim / Tujuan', f:r => esc(r.pihak || '-')}); }
const suratTtd = () => { const u = me(), k = users().find(x => x.role === 'ketua' && x.status !== 'nonaktif');
  return {ketua:k ? k.nama : '................................', sek:u && u.role === 'sekretaris' ? u.nama : (users().find(x => x.role === 'sekretaris' && x.status !== 'nonaktif') || {nama:'................................'}).nama}; };
function suratKeluarHtml(r) {
  const t = suratTtd(), paras = String(r.isi || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  return `${KOP}<table class="nb"><tr><td style="width:100px">Nomor</td><td style="width:12px">:</td><td>${esc(r.nomor)}</td><td class="r">Tihulale, ${esc(dID(r.tanggal))}</td></tr>
  <tr><td>Lampiran</td><td>:</td><td colspan="2">${esc(r.lampiran || '-')}</td></tr><tr><td>Perihal</td><td>:</td><td colspan="2"><b>${esc(r.perihal)}</b></td></tr></table>
  <p style="margin-top:16px">Kepada Yth.<br><b>${esc(r.pihak || '................................')}</b><br>di -<br>&nbsp;&nbsp;&nbsp;&nbsp;Tempat</p>
  <p><i>Salam sejahtera dalam kasih Tuhan Yesus Kristus,</i></p>
  ${paras.length ? paras.map(x => `<p style="text-align:justify;text-indent:30px">${nl2br(x)}</p>`).join('') : '<p>................................................................................................<br>................................................................................................<br>................................................................................................</p>'}
  <p style="text-align:justify;text-indent:30px">Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu/Saudara/i, kami mengucapkan terima kasih. Tuhan Yesus memberkati.</p>
  <table class="ttd"><tr><td colspan="2"><b>PEKERJA HARIAN MAJELIS JEMAAT TIHULALE</b></td></tr><tr><td>Ketua Majelis Jemaat,<br><br><br><br><u><b>${esc(t.ketua)}</b></u></td><td>Sekretaris,<br><br><br><br><u><b>${esc(t.sek)}</b></u></td></tr></table>`;
}
function suratMasukHtml(r) {
  const t = suratTtd(), row = (a, b) => `<tr><td style="width:190px"><b>${a}</b></td><td>${b || '&nbsp;'}</td></tr>`;
  return `${KOP}<h2>LEMBAR DISPOSISI</h2><h3>SURAT MASUK</h3><br>
  <table>${row('Nomor Surat', esc(r.nomor))}${row('Tanggal Surat', esc(dID(r.tanggal)))}${row('Pengirim / Asal Surat', esc(r.pihak))}${row('Lampiran', esc(r.lampiran))}${row('Perihal', '<b>' + esc(r.perihal) + '</b>')}${row('Keterangan', nl2br(r.ket || ''))}</table>
  <h3 style="text-align:left;margin-top:14px">DISPOSISI</h3>
  <table>${row('Diteruskan kepada', esc(r.dispTujuan))}${row('Instruksi / Catatan', nl2br(r.dispInstruksi || ''))}${row('Tenggat', r.dispTenggat ? esc(dID(r.dispTenggat)) : '')}${row('Status Tindak Lanjut', esc(r.dispTujuan ? (r.dispStatus || 'Baru') : ''))}</table>
  <table class="ttd"><tr><td>&nbsp;<br>Ketua Majelis Jemaat,<br><br><br><br><u><b>${esc(t.ketua)}</b></u></td><td>Tihulale, ${esc(dID(todayS()))}<br>Sekretaris,<br><br><br><br><u><b>${esc(t.sek)}</b></u></td></tr></table>`;
}
function suratRekapHtml(l, jenis, dari, sampai) {
  const t = suratTtd(), per = dari || sampai ? `Periode: ${dari ? dID(dari) : '...'} s.d. ${sampai ? dID(sampai) : '...'}` : 'Periode: seluruh arsip';
  const ttl = jenis === 'Semua' ? 'REKAPITULASI SURAT MASUK DAN SURAT KELUAR' : 'BUKU AGENDA ' + jenis.toUpperCase();
  return `${KOP}<h2>${ttl}</h2><p class="c" style="margin:0 0 10px">${esc(per)}</p>
  <table style="font-size:10pt"><tr><th style="width:28px">No</th><th>Nomor</th><th>Tanggal</th>${jenis === 'Semua' ? '<th>Jenis</th>' : ''}<th>Pengirim / Tujuan</th><th>Perihal</th><th>Disposisi / Status</th></tr>
  ${l.length ? l.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.nomor)}</td><td>${esc(fmtD(r.tanggal))}</td>${jenis === 'Semua' ? `<td>${esc(r.jenis)}</td>` : ''}<td>${esc(r.pihak || '-')}</td><td>${esc(r.perihal)}</td><td>${r.jenis === 'Surat Masuk' && r.dispTujuan ? 'Disposisi: ' + esc(r.dispTujuan) + ' (' + esc(r.dispStatus || 'Baru') + ')<br>' : ''}${esc(r.status || 'Menunggu')}</td></tr>`).join('') : `<tr><td colspan="${jenis === 'Semua' ? 7 : 6}" class="c">Tidak ada surat pada kriteria ini.</td></tr>`}</table>
  <p style="font-size:10pt">Jumlah: ${l.length} surat${jenis === 'Semua' ? ' (masuk: ' + l.filter(x => x.jenis === 'Surat Masuk').length + ', keluar: ' + l.filter(x => x.jenis === 'Surat Keluar').length + ')' : ''}</p>
  <table class="ttd"><tr><td></td><td>Tihulale, ${esc(dID(todayS()))}<br>Sekretaris,<br><br><br><br><u><b>${esc(t.sek)}</b></u></td></tr></table>`;
}

const SKF = fld([
  ['jenis', 'Jenis SK', 'select', 0, 0, ['Pengangkatan Panitia', 'Pengangkatan Pelayan']],
  ['nama', 'Nama Panitia / Jabatan Pelayanan (mis. Panitia Natal 2026)', '', 1],
  ['menimbang', 'Menimbang (satu baris per butir)', 'textarea', 0, 4],
  ['mengingat', 'Mengingat (satu baris per butir)', 'textarea', 0, 4],
  ['anggota', 'Susunan (satu baris: Jabatan | Nama)', 'textarea', 0, 7],
  ['masa', 'Masa Tugas / Masa Bakti (mis. 1 Januari s.d. 31 Desember 2026)'],
  ['tanggal', 'Tanggal Ditetapkan', 'date', 1], ['tempat', 'Tempat Ditetapkan'],
  ['sekretaris', 'Nama Sekretaris (penandatangan)']
]);
const SKDEF = {jenis:'Pengangkatan Panitia', tanggal:todayS(), tempat:'Tihulale', sekretaris:(me() || {}).nama || '',
  menimbang:'bahwa untuk kelancaran pelayanan dan pelaksanaan program jemaat dipandang perlu membentuk/mengangkat pelayan sebagaimana dimaksud.\nbahwa nama-nama yang tercantum dalam keputusan ini dipandang cakap dan bersedia melaksanakan tugas pelayanan.',
  mengingat:'Tata Gereja dan peraturan Gereja Protestan Maluku yang berlaku.\nHasil rapat Ketua Majelis Jemaat dan/atau Majelis Jemaat.'};
function skHtml(r) {
  const pan = r.jenis === 'Pengangkatan Panitia', rows = lns(r.anggota).map(l => { const [j, ...n] = l.split('|'); return [j.trim(), n.join('|').trim()]; });
  return `${KOP}<h2>SURAT KEPUTUSAN MAJELIS JEMAAT GPM TIHULALE</h2><p class="c" style="margin:0">Nomor: ${esc(r.nomor)}</p><h3>TENTANG</h3><h3>${pan ? 'PENGANGKATAN PANITIA' : 'PENGANGKATAN PELAYAN'} ${esc(String(r.nama).toUpperCase())}</h3>
  <h3>PEKERJA HARIAN MAJELIS JEMAAT GEREJA BETH EDEN TIHULALE</h3>
  <table class="nb"><tr><td style="width:110px"><b>Menimbang</b></td><td>:</td><td><ol type="a">${lns(r.menimbang).map(x => `<li>${esc(x)}</li>`).join('')}</ol></td></tr>
  <tr><td><b>Mengingat</b></td><td>:</td><td><ol>${lns(r.mengingat).map(x => `<li>${esc(x)}</li>`).join('')}</ol></td></tr></table>
  <h3>MEMUTUSKAN</h3><table class="nb"><tr><td style="width:110px"><b>Menetapkan</b></td><td>:</td><td></td></tr>
  <tr><td><b>PERTAMA</b></td><td>:</td><td>Mengangkat saudara/i yang namanya tercantum di bawah ini sebagai ${pan ? 'susunan <b>' + esc(r.nama) + '</b>' : 'pelayan <b>' + esc(r.nama) + '</b>'} Jemaat Gereja Beth Eden Tihulale:
  <table style="margin-top:6px"><tr><th style="width:40px">No</th><th>Jabatan</th><th>Nama</th></tr>${rows.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${esc(x[0])}</td><td>${esc(x[1])}</td></tr>`).join('') || '<tr><td colspan="3" class="c">(belum diisi)</td></tr>'}</table></td></tr>
  <tr><td><b>KEDUA</b></td><td>:</td><td>${r.masa ? 'Masa tugas berlaku ' + esc(r.masa) + '.' : 'Masa tugas sesuai ketentuan yang berlaku.'}</td></tr>
  <tr><td><b>KETIGA</b></td><td>:</td><td>Yang diangkat melaksanakan tugas dengan penuh tanggung jawab dan melaporkan pelaksanaannya kepada Ketua Majelis Jemaat.</td></tr>
  <tr><td><b>KEEMPAT</b></td><td>:</td><td>Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.</td></tr></table>
  <p style="margin-top:18px">Ditetapkan di : ${esc(r.tempat || 'Tihulale')}<br>Pada tanggal : ${esc(dID(r.tanggal))}</p>
  <table class="ttd"><tr><td></td><td><b>PEKERJA HARIAN MAJELIS JEMAAT</b><br>Sekretaris,<br><br><br><br><u><b>${esc(r.sekretaris || '................................')}</b></u></td></tr></table>`;
}
function vSK() {
  const l = DB.get('sk', []).slice().sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (+b.nourut || 0) - (+a.nourut || 0));
  return `<div class="panel"><div class="tools"><input data-search placeholder="Cari SK..."><span style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="nocfg"><i class="fa-solid fa-gear"></i> Format Nomor</button><button class="btn btn-blue btn-sm" data-act="skadd"><i class="fa-solid fa-plus"></i> Buat SK</button></span></div>
  <div class="alert info" style="margin-bottom:12px"><i class="fa-solid fa-circle-info"></i> SK diterbitkan langsung oleh Sekretaris dan tidak memerlukan persetujuan Ketua Majelis Jemaat.</div><p style="margin-bottom:12px;color:var(--muted);font-size:14px">Penomoran otomatis: <b>No. urut/Jenis/${esc(NOCFG().kode)}/Bulan (Romawi)/Tahun</b>. Contoh: 001/SK/${esc(NOCFG().kode)}/${MESIN[new Date().getMonth() + 1]}/${new Date().getFullYear()}</p>
  <div class="tblwrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Tanggal</th><th>Tentang</th><th></th></tr></thead><tbody>
  ${l.length ? l.map(r => `<tr><td><b>${esc(r.nomor)}</b></td><td>${fmtD(r.tanggal)}</td><td>${esc(r.jenis)}<br><small style="color:var(--muted)">${esc(r.nama)}</small><br>${r.status === 'Disahkan' ? chip('disetujui', 'Disahkan Ketua') : chip('disetujui', 'Diterbitkan Sekretaris') + (r.tglTerbit ? '<br><small style="color:var(--muted)">' + esc(dID(r.tglTerbit)) + '</small>' : '')}</td><td style="white-space:nowrap">
   <button class="ib grn" data-act="skview" data-id="${r.id}" title="Lihat / cetak SK"><i class="fa-solid fa-file-lines"></i></button>
   <button class="ib" data-act="skedit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button>
   <button class="ib red" data-act="skdel" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="4" class="empty">Belum ada SK. Klik "Buat SK".</td></tr>'}
  </tbody></table></div></div>`;
}

/* ---------- 2. REGISTRASI JEMAAT & STATISTIK ---------- */
const REGJ = {
  Baptis:{pref:'BAP', f:[['nama', 'Nama Lengkap (yang dibaptis)', '', 1], ['tglLahir', 'Tanggal Lahir', 'date'], ['ayah', 'Nama Ayah'], ['ibu', 'Nama Ibu'], ['tanggal', 'Tanggal Baptis', 'date', 1], ['tempat', 'Tempat'], ['pelayan', 'Pelayan Firman'], ['saksi1', 'Nama Saksi Pertama'], ['saksi2', 'Nama Saksi Kedua']]},
  Sidi:{pref:'SID', f:[['nama', 'Nama Lengkap', '', 1], ['ayah', 'Nama Ayah'], ['ibu', 'Nama Ibu'], ['tanggal', 'Tanggal Sidi', 'date', 1], ['tempat', 'Tempat'], ['pelayan', 'Pelayan Firman']]},
  Pernikahan:{pref:'NIK', f:[['nama', 'Mempelai Pria', '', 1], ['ayahP', 'Nama Ayah Mempelai Pria'], ['ibuP', 'Nama Ibu Mempelai Pria'], ['nama2', 'Mempelai Wanita', '', 1], ['ayahW', 'Nama Ayah Mempelai Wanita'], ['ibuW', 'Nama Ibu Mempelai Wanita'], ['tanggal', 'Tanggal Pemberkatan Nikah', 'date', 1], ['tempat', 'Tempat'], ['pelayan', 'Pelayan Firman'], ['saksiP1', 'Nama Saksi Pertama dari Mempelai Pria'], ['saksiP2', 'Nama Saksi Kedua dari Mempelai Pria'], ['saksiW1', 'Nama Saksi Pertama dari Mempelai Wanita'], ['saksiW2', 'Nama Saksi Kedua dari Mempelai Wanita']]},
  Kematian:{pref:'KMT', f:[['nama', 'Nama Almarhum/ah', '', 1], ['tanggal', 'Tanggal Meninggal', 'date', 1], ['usia', 'Usia (tahun)', 'number'], ['ket', 'Sebab / Keterangan'], ['tempat', 'Tempat Pemakaman'], ['pelayan', 'Pelayan Ibadah Pemakaman']]}
};
const age = tgl => { if (!tgl) return null; const b = new Date(tgl + 'T00:00:00'), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const ageGrp = a => a === null ? 'Belum diisi' : a <= 12 ? 'Anak (0–12)' : a <= 17 ? 'Remaja (13–17)' : a <= 35 ? 'Pemuda (18–35)' : a <= 59 ? 'Dewasa (36–59)' : 'Lansia (60+)';
const countBy = (arr, fn) => { const m = {}; arr.forEach(x => { const k = fn(x); m[k] = (m[k] || 0) + 1; }); return m; };
function bars(m, order) {
  const keys = order || Object.keys(m), mx = Math.max(1, ...keys.map(k => m[k] || 0));
  return keys.map(k => `<div class="bar-row"><span>${esc(k)}</span><div class="bar-track"><i style="width:${Math.round((m[k] || 0) / mx * 100)}%"></i></div><b>${m[k] || 0}</b></div>`).join('') || '<p style="color:var(--muted)">Belum ada data.</p>';
}
function yearCols(items, years) {
  const m = countBy(items, x => String(x.tanggal || '').slice(0, 4)), mx = Math.max(1, ...years.map(y => m[y] || 0));
  return `<div class="cols">${years.map(y => `<div class="col"><b>${m[y] || 0}</b><span style="height:${Math.round((m[y] || 0) / mx * 100)}px"></span><small>${y}</small></div>`).join('')}</div>`;
}
function statData() {
  const w = DB.get('warga', []), akt = w.filter(x => x.status === 'Aktif');
  return {w, akt, sek:countBy(akt, x => x.sektor || '-'), kat:countBy(akt, x => x.kategori || '-'), usia:countBy(akt, x => ageGrp(age(x.tglLahir))), st:countBy(w, x => x.status || '-')};
}
function vRegistrasi() {
  const t = TAB.registrasi, h = tabs('registrasi', [['stat', 'Statistik', 'chart-pie'], ['register', 'Buku Register Besar', 'book'], ['mutasi', 'Mutasi Jemaat', 'right-left']]);
  const reg = DB.get('register', []), mut = DB.get('mutasi', []), yr = new Date().getFullYear(), years = [yr - 4, yr - 3, yr - 2, yr - 1, yr].map(String);
  if (t === 'stat') {
    const s = statData(), thn = x => String(x.tanggal || '').startsWith(String(yr));
    const kuk = ['Anak (0–12)', 'Remaja (13–17)', 'Pemuda (18–35)', 'Dewasa (36–59)', 'Lansia (60+)', 'Belum diisi'];
    return h + `<div class="stats">${stat('users', s.akt.length, 'Warga Aktif')}${stat('droplet', reg.filter(x => x.jenis === 'Baptis' && thn(x)).length, 'Baptis ' + yr)}${stat('book-bible', reg.filter(x => x.jenis === 'Sidi' && thn(x)).length, 'Sidi ' + yr)}${stat('ring', reg.filter(x => x.jenis === 'Pernikahan' && thn(x)).length, 'Nikah ' + yr)}${stat('cross', reg.filter(x => x.jenis === 'Kematian' && thn(x)).length, 'Kematian ' + yr)}${stat('arrow-right-to-bracket', mut.filter(x => x.jenis === 'Pindah Masuk' && thn(x)).length, 'Pindah Masuk ' + yr)}${stat('arrow-right-from-bracket', mut.filter(x => x.jenis === 'Pindah Keluar' && thn(x)).length, 'Pindah Keluar ' + yr)}</div>
    <div class="chgrid"><div class="panel"><h3>Jemaat per Sektor</h3>${bars(s.sek, SEKTOR)}</div>
    <div class="panel"><h3>Jemaat per Kategori Usia</h3>${bars(s.usia, kuk)}<p style="font-size:12.5px;color:var(--muted);margin-top:8px">Isi tanggal lahir di Data Warga agar kelompok usia terhitung.</p></div>
    <div class="panel"><h3>Jemaat per Kategori</h3>${bars(s.kat)}</div>
    <div class="panel"><h3>Status Warga</h3>${bars(s.st)}</div>
    <div class="panel"><h3>Pertumbuhan: Baptis per Tahun</h3>${yearCols(reg.filter(x => x.jenis === 'Baptis'), years)}</div>
    <div class="panel"><h3>Mutasi Masuk per Tahun</h3>${yearCols(mut.filter(x => x.jenis === 'Pindah Masuk'), years)}</div></div>`;
  }
  if (t === 'register') {
    const j = TAB.regj, l = reg.filter(x => x.jenis === j).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    return h + `<div class="panel"><div class="tools"><span class="tabs" style="margin:0">${Object.keys(REGJ).map(k => `<button class="${k === j ? 'on' : ''}" data-act="regj" data-id="${k}">${k}</button>`).join('')}</span>
    <span style="display:flex;gap:10px"><input data-search placeholder="Cari..."><button class="btn btn-blue btn-sm" data-act="regadd"><i class="fa-solid fa-plus"></i> Catat ${j}</button></span></div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>No. Register</th><th>${j === 'Pernikahan' ? 'Mempelai' : 'Nama'}</th><th>Tanggal</th><th>Tempat / Pelayan</th><th>Keterangan</th><th></th></tr></thead><tbody>
    ${l.length ? l.map(r => `<tr><td><b>${esc(r.noreg)}</b></td><td>${esc(r.nama)}${r.nama2 ? ' &amp; ' + esc(r.nama2) : ''}</td><td>${fmtD(r.tanggal)}</td><td>${esc(r.tempat || '-')}<br><small style="color:var(--muted)">${esc(r.pelayan || '')}</small></td><td>${esc([r.ortu && 'Ortu: ' + r.ortu, r.ayah && 'Ayah: ' + r.ayah, r.ibu && 'Ibu: ' + r.ibu, r.saksi1 && 'Saksi 1: ' + r.saksi1, r.saksi2 && 'Saksi 2: ' + r.saksi2, r.ayahP && 'Ayah Pria: ' + r.ayahP, r.ibuP && 'Ibu Pria: ' + r.ibuP, r.ayahW && 'Ayah Wanita: ' + r.ayahW, r.ibuW && 'Ibu Wanita: ' + r.ibuW, r.saksiP && 'Saksi Pria: ' + r.saksiP, r.saksiW && 'Saksi Wanita: ' + r.saksiW, r.saksiP1 && 'Saksi Pria 1: ' + r.saksiP1, r.saksiP2 && 'Saksi Pria 2: ' + r.saksiP2, r.saksiW1 && 'Saksi Wanita 1: ' + r.saksiW1, r.saksiW2 && 'Saksi Wanita 2: ' + r.saksiW2, r.usia && 'Usia ' + r.usia + ' th', r.ket].filter(Boolean).join(' · ') || '-')}</td>
    <td style="white-space:nowrap"><button class="ib" data-act="regedit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="regdel" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : `<tr><td colspan="6" class="empty">Belum ada catatan ${j}.</td></tr>`}
    </tbody></table></div></div>`;
  }
  const l = mut.slice().sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return h + `<div class="panel"><div class="tools"><span style="color:var(--muted);font-size:14px">Pencatatan mutasi otomatis memperbarui Data Warga (pindah keluar → status "Pindah"; pindah masuk → warga baru ditambahkan).</span><span style="display:flex;gap:10px"><input data-search placeholder="Cari..."><button class="btn btn-blue btn-sm" data-act="mutadd"><i class="fa-solid fa-plus"></i> Catat Mutasi</button></span></div>
  <div class="tblwrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Nama</th><th>Jenis</th><th>Sektor</th><th>Asal / Tujuan</th><th></th></tr></thead><tbody>
  ${l.length ? l.map(r => `<tr><td>${fmtD(r.tanggal)}</td><td><b>${esc(r.nama)}</b></td><td>${chip(r.jenis === 'Pindah Masuk' ? 'aktif' : 'menunggu', r.jenis)}</td><td>${esc(r.sektor || '-')}</td><td>${esc(r.asal || '-')}<br><small style="color:var(--muted)">${esc(r.alasan || '')}</small></td>
  <td><button class="ib red" data-act="mutdel" data-id="${r.id}" title="Hapus catatan"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="6" class="empty">Belum ada catatan mutasi.</td></tr>'}
  </tbody></table></div></div>`;
}

/* ---------- 3. NOTULEN & SIDANG ---------- */
const NTJ = ['Sidang Jemaat', 'Rapat Majelis Jemaat', 'Rapat Ketua Majelis Jemaat'];
const KST = ['Belum', 'Berjalan', 'Selesai'];
const kstChip = s => chip(s === 'Selesai' ? 'disetujui' : s === 'Berjalan' ? 'diproses' : 'menunggu', s);
const allKep = () => DB.get('notulen', []).flatMap(n => (n.keputusan || []).map(k => ({...k, nid:n.id, rapat:n.jenis, judul:n.judul, tanggal:n.tanggal})));
const kstSel = (nid, k) => `<select class="sel" data-kst="${nid}:${k.id}">${KST.map(s => `<option ${k.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
const late = k => k.status !== 'Selesai' && k.target && k.target < todayS();
function notulenHtml(n) {
  return `${KOP}<h2>NOTULEN ${esc(String(n.jenis).toUpperCase())}</h2><h3>${esc(n.judul)}</h3>
  <table class="nb" style="margin-top:10px"><tr><td style="width:120px">Hari/Tanggal</td><td>: ${esc(dID(n.tanggal))}</td></tr><tr><td>Tempat</td><td>: ${esc(n.tempat || '-')}</td></tr><tr><td>Pimpinan Rapat</td><td>: ${esc(n.pimpinan || '-')}</td></tr><tr><td>Notulis</td><td>: ${esc(n.notulis || '-')}</td></tr><tr><td>Peserta</td><td>: ${nl2br(n.peserta || '-')}</td></tr></table>
  <h3 style="text-align:left;margin-top:12px">A. Agenda</h3><p>${nl2br(n.agenda || '-')}</p>
  <h3 style="text-align:left">B. Jalannya Pembahasan</h3><p>${nl2br(n.isi || '-')}</p>
  <h3 style="text-align:left">C. Keputusan</h3><table><tr><th style="width:36px">No</th><th>Keputusan</th><th>Penanggung Jawab</th><th>Target</th><th>Status</th></tr>${(n.keputusan || []).map((k, i) => `<tr><td class="c">${i + 1}</td><td>${esc(k.teks)}</td><td>${esc(k.pj || '-')}</td><td>${k.target ? esc(dID(k.target)) : '-'}</td><td>${esc(k.status)}</td></tr>`).join('') || '<tr><td colspan="5" class="c">Tidak ada keputusan tercatat</td></tr>'}</table>
  <table class="ttd"><tr><td>Pimpinan Rapat,<br><br><br><br><u><b>${esc(n.pimpinan || '................')}</b></u></td><td>Notulis,<br><br><br><br><u><b>${esc(n.notulis || '................')}</b></u></td></tr></table>`;
}
function vNotulen() {
  const h = tabs('notulen', [['notulen', 'Notulen & Arsip', 'clipboard-list'], ['keputusan', 'Matriks Keputusan', 'table-list']]), all = DB.get('notulen', []);
  if (TAB.notulen === 'keputusan') {
    const ks = allKep().filter(k => NT.fs === 'Semua' || (NT.fs === 'Terlambat' ? late(k) : k.status === NT.fs)).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    const A = allKep(), done = A.filter(k => k.status === 'Selesai').length;
    return h + `<div class="stats">${stat('list-check', A.length, 'Total Keputusan')}${stat('circle-check', done, 'Selesai')}${stat('spinner', A.filter(k => k.status === 'Berjalan').length, 'Berjalan')}${stat('triangle-exclamation', A.filter(late).length, 'Lewat Target')}</div>
    <div class="panel"><div class="tools"><input data-search placeholder="Cari keputusan..."><select class="sel" data-fs>${['Semua', ...KST, 'Terlambat'].map(s => `<option ${NT.fs === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Rapat</th><th>Keputusan</th><th>Penanggung Jawab</th><th>Target</th><th>Realisasi</th></tr></thead><tbody>
    ${ks.length ? ks.map(k => `<tr><td><small>${fmtD(k.tanggal)}</small><br><b>${esc(k.rapat)}</b></td><td>${esc(k.teks)}</td><td>${esc(k.pj || '-')}</td><td ${late(k) ? 'style="color:#b91c1c;font-weight:600"' : ''}>${k.target ? fmtD(k.target) : '-'}${late(k) ? '<br><small>Terlambat</small>' : ''}</td><td>${isSek() ? kstSel(k.nid, k) : kstChip(k.status)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Belum ada keputusan.</td></tr>'}
    </tbody></table></div></div>`;
  }
  const n = NT.edit && all.find(x => x.id === NT.edit);
  if (n) return h + `<div class="panel"><div class="tools"><button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="ntback"><i class="fa-solid fa-arrow-left"></i> Kembali ke Arsip</button><span style="display:flex;gap:10px;align-items:center"><small id="ntSaved" style="color:#047857"><i class="fa-solid fa-cloud-arrow-up"></i> Tersimpan otomatis</small><button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="ntmeta"><i class="fa-solid fa-pen"></i> Ubah Info Rapat</button><button class="btn btn-blue btn-sm" data-act="ntview"><i class="fa-solid fa-print"></i> Lihat / Cetak</button></span></div>
  <h3>${esc(n.judul)}</h3><p style="color:var(--muted);margin-bottom:14px">${esc(n.jenis)} · ${esc(dID(n.tanggal))}${n.tempat ? ' · ' + esc(n.tempat) : ''}</p>
  <div class="fg"><label>Agenda</label><textarea data-live="agenda" rows="3">${esc(n.agenda || '')}</textarea></div>
  <div class="fg"><label>Catatan Pembahasan — ketik langsung saat rapat <button type="button" class="btn btn-sm" style="background:#eef2f9;color:var(--blue);padding:4px 12px;margin-left:8px" data-act="ntstamp">+ Sisipkan jam</button></label><textarea data-live="isi" rows="13" id="ntIsi">${esc(n.isi || '')}</textarea></div></div>
  <div class="panel"><h3 style="margin-bottom:12px">Poin Keputusan</h3>
  <form id="fKep" class="kepf"><input name="teks" placeholder="Tulis poin keputusan, tekan Enter" required><input name="pj" placeholder="Penanggung jawab"><input type="date" name="target" title="Target selesai"><button class="btn btn-blue btn-sm">Tambah</button></form>
  <div class="tblwrap"><table class="tbl"><thead><tr><th>#</th><th>Keputusan</th><th>PJ</th><th>Target</th><th>Status</th><th></th></tr></thead><tbody>
  ${(n.keputusan || []).length ? n.keputusan.map((k, i) => `<tr><td>${i + 1}</td><td>${esc(k.teks)}</td><td>${esc(k.pj || '-')}</td><td>${k.target ? fmtD(k.target) : '-'}</td><td>${kstSel(n.id, k)}</td><td><button class="ib red" data-act="kepdel" data-id="${k.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="6" class="empty">Belum ada poin keputusan.</td></tr>'}
  </tbody></table></div></div>`;
  const l = all.slice().sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  return h + `<div class="panel"><div class="tools"><input data-search placeholder="Cari notulen..."><button class="btn btn-blue btn-sm" data-act="ntnew"><i class="fa-solid fa-pen-to-square"></i> Mulai Notulen Baru</button></div>
  <div class="tblwrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Rapat</th><th>Keputusan</th><th></th></tr></thead><tbody>
  ${l.length ? l.map(r => `<tr><td>${fmtD(r.tanggal)}</td><td><b>${esc(r.judul)}</b><br><small style="color:var(--muted)">${esc(r.jenis)}</small></td><td>${(r.keputusan || []).length} poin (${(r.keputusan || []).filter(k => k.status === 'Selesai').length} selesai)</td>
  <td style="white-space:nowrap"><button class="ib grn" data-act="ntview" data-id="${r.id}" title="Lihat / cetak"><i class="fa-solid fa-file-lines"></i></button>${isSek() ? `<button class="ib" data-act="ntopen" data-id="${r.id}" title="Buka editor"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="ntdel" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">Belum ada notulen. Klik "Mulai Notulen Baru".</td></tr>'}
  </tbody></table></div></div>`;
}

/* ---------- 4. LAPORAN PELKES ---------- */
const UNIT = ['Seksi Ibadah', 'Seksi Diakonia', 'Seksi Pembangunan', 'Seksi Pemuda', 'Komisi Perempuan', 'Komisi Anak', 'Ketua Majelis Jemaat', ...SEKTOR];
const PST = ['Direncanakan', 'Berjalan', 'Selesai', 'Tertunda'];
const progLabel = p => `${p.tahun} · ${p.nama}`;
const progs = () => DB.get('program', []);
const real = p => DB.get('uang', []).filter(x => x.jenis === 'Pengeluaran' && x.program === progLabel(p)).reduce((s, x) => s + (+x.jumlah || 0), 0);
const sync = p => { const a = +p.anggaran || 0, r = real(p); return !r ? (p.status === 'Selesai' ? 'Selesai tanpa realisasi' : 'Belum ada realisasi') : a && r > a ? 'Melebihi anggaran' : 'Sesuai anggaran'; };
const syncChip = s => chip(s === 'Melebihi anggaran' ? 'ditolak' : s === 'Sesuai anggaran' ? 'disetujui' : 'menunggu', s);
const pkMeta = y => (DB.get('pelkesmeta', {}) || {})[y] || {};
function vPelkes() {
  const y = String(PK.year), all = progs(), yrs = [...new Set([String(new Date().getFullYear()), ...all.map(p => String(p.tahun))])].sort().reverse(), P = all.filter(p => String(p.tahun) === y);
  const byU = {}; P.forEach(p => (byU[p.unit] = byU[p.unit] || []).push(p));
  const tot = P.reduce((s, p) => s + (+p.anggaran || 0), 0), tr = P.reduce((s, p) => s + real(p), 0), avg = P.length ? Math.round(P.reduce((s, p) => s + (+p.capaian || 0), 0) / P.length) : 0;
  return `<div class="panel"><div class="tools"><span style="display:flex;gap:10px;align-items:center"><b>Tahun Pelayanan</b><select class="sel" data-pky>${yrs.map(v => `<option ${v === y ? 'selected' : ''}>${v}</option>`).join('')}</select></span>
  <span style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="pkmeta"><i class="fa-solid fa-pen"></i> Pendahuluan &amp; Evaluasi</button><button class="btn btn-gold btn-sm" data-act="pkexport"><i class="fa-solid fa-file-export"></i> Draf Laporan (PDF/Word)</button></span></div></div>
  <div class="stats">${stat('list-check', P.length, 'Program ' + y)}${stat('gauge-high', avg + '%', 'Rata-rata Capaian')}${stat('coins', rp(tot), 'Anggaran Program')}${stat('receipt', rp(tr), 'Realisasi (Keuangan)')}</div>
  <div class="panel"><h3 style="margin-bottom:12px">Konsolidasi per Komisi / Sektor</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Komisi / Sektor</th><th>Program</th><th>Rata-rata Capaian</th><th>Anggaran</th><th>Realisasi</th></tr></thead><tbody>
  ${Object.keys(byU).length ? Object.keys(byU).map(u => { const L = byU[u]; return `<tr><td><b>${esc(u)}</b></td><td>${L.length}</td><td>${Math.round(L.reduce((s, p) => s + (+p.capaian || 0), 0) / L.length)}%</td><td>${rp(L.reduce((s, p) => s + (+p.anggaran || 0), 0))}</td><td>${rp(L.reduce((s, p) => s + real(p), 0))}</td></tr>`; }).join('') : '<tr><td colspan="5" class="empty">Belum ada program untuk tahun ini.</td></tr>'}
  </tbody></table></div></div>
  <div class="panel"><div class="tools"><input data-search placeholder="Cari program..."><button class="btn btn-blue btn-sm" data-act="pkadd"><i class="fa-solid fa-plus"></i> Tambah Program</button></div><div class="tblwrap"><table class="tbl"><thead><tr><th>Program</th><th>Komisi / Sektor</th><th>Capaian</th><th>Status</th><th>Anggaran vs Realisasi</th><th></th></tr></thead><tbody>
  ${P.length ? P.map(p => `<tr><td><b>${esc(p.nama)}</b><br><small style="color:var(--muted)">${esc(p.target || '')}</small></td><td>${esc(p.unit)}</td><td>${+p.capaian || 0}%<div class="bar-track" style="margin-top:4px"><i style="display:block;height:6px;width:${Math.min(100, +p.capaian || 0)}%;background:var(--blue)"></i></div></td><td>${chip(p.status === 'Selesai' ? 'disetujui' : p.status === 'Berjalan' ? 'diproses' : 'menunggu', p.status)}</td><td>${rp(p.anggaran)} / ${rp(real(p))}<br>${syncChip(sync(p))}</td>
  <td style="white-space:nowrap"><button class="ib" data-act="pkedit" data-id="${p.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="pkdel" data-id="${p.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="6" class="empty">Belum ada program.</td></tr>'}
  </tbody></table></div><p style="font-size:13px;color:var(--muted);margin-top:10px">Realisasi diambil otomatis dari transaksi Pengeluaran di modul Keuangan yang diberi label program ini oleh Bendahara.</p></div>`;
}
function pelkesHtml(y) {
  y = String(y);
  const P = progs().filter(p => String(p.tahun) === y), m = pkMeta(y), s = statData(), reg = DB.get('register', []).filter(x => String(x.tanggal || '').startsWith(y)), mut = DB.get('mutasi', []).filter(x => String(x.tanggal || '').startsWith(y));
  const byU = {}; P.forEach(p => (byU[p.unit] = byU[p.unit] || []).push(p));
  const nt = DB.get('notulen', []).filter(n => String(n.tanggal || '').startsWith(y)), kp = nt.flatMap(n => (n.keputusan || []).map(k => ({...k, rapat:n.jenis})));
  const tot = P.reduce((a, p) => a + (+p.anggaran || 0), 0), tr = P.reduce((a, p) => a + real(p), 0);
  return `${KOP}<h2>LAPORAN PELAYANAN DAN KESAKSIAN (PELKES)</h2><h3>JEMAAT GEREJA BETH EDEN TIHULALE</h3><h3>TAHUN PELAYANAN ${esc(y)}</h3>
  <h3 style="text-align:left;margin-top:14px">I. PENDAHULUAN</h3><p>${nl2br(m.pendahuluan || 'Puji syukur kepada Tuhan Yesus Kristus Kepala Gereja atas penyertaan-Nya sepanjang tahun pelayanan ' + y + '. Laporan ini disusun sebagai pertanggungjawaban pelayanan dan kesaksian Jemaat kepada Sidang Jemaat.')}</p>
  <h3 style="text-align:left">II. KEADAAN JEMAAT</h3><p>Jumlah warga jemaat aktif: <b>${s.akt.length}</b> orang.</p>
  <table><tr><th>Sektor</th><th class="c">Jumlah Warga Aktif</th></tr>${SEKTOR.map(k => `<tr><td>${esc(k)}</td><td class="c">${s.sek[k] || 0}</td></tr>`).join('')}</table>
  <p>Pelayanan sakramen dan mutasi tahun ${esc(y)}: Baptis <b>${reg.filter(x => x.jenis === 'Baptis').length}</b>, Sidi <b>${reg.filter(x => x.jenis === 'Sidi').length}</b>, Pernikahan <b>${reg.filter(x => x.jenis === 'Pernikahan').length}</b>, Kematian <b>${reg.filter(x => x.jenis === 'Kematian').length}</b>; Pindah Masuk <b>${mut.filter(x => x.jenis === 'Pindah Masuk').length}</b>, Pindah Keluar <b>${mut.filter(x => x.jenis === 'Pindah Keluar').length}</b>.</p>
  <h3 style="text-align:left">III. CAPAIAN PROGRAM PELAYANAN</h3>${Object.keys(byU).length ? Object.keys(byU).map(u => `<p><b>${esc(u)}</b></p><table><tr><th style="width:30px">No</th><th>Program</th><th>Sasaran</th><th class="c">Capaian</th><th>Status</th><th class="r">Anggaran</th><th class="r">Realisasi</th></tr>${byU[u].map((p, i) => `<tr><td class="c">${i + 1}</td><td>${esc(p.nama)}${p.hasil ? '<br><i>' + esc(p.hasil) + '</i>' : ''}</td><td>${esc(p.target || '-')}</td><td class="c">${+p.capaian || 0}%</td><td>${esc(p.status)}</td><td class="r">${rp(p.anggaran)}</td><td class="r">${rp(real(p))}</td></tr>`).join('')}</table>`).join('') : '<p>Belum ada program tercatat.</p>'}
  <h3 style="text-align:left">IV. REKAPITULASI ANGGARAN PROGRAM</h3><p>Total anggaran program: <b>${rp(tot)}</b>; realisasi tercatat pada Keuangan Jemaat: <b>${rp(tr)}</b>; selisih: <b>${rp(tot - tr)}</b>.</p>
  <h3 style="text-align:left">V. KEPUTUSAN SIDANG DAN RAPAT</h3><p>Terdapat <b>${kp.length}</b> poin keputusan pada ${nt.length} sidang/rapat; <b>${kp.filter(k => k.status === 'Selesai').length}</b> telah terealisasi, <b>${kp.filter(k => k.status === 'Berjalan').length}</b> sedang berjalan, <b>${kp.filter(k => k.status === 'Belum').length}</b> belum dilaksanakan.</p>
  <h3 style="text-align:left">VI. EVALUASI DAN REKOMENDASI</h3><p>${nl2br(m.evaluasi || '(belum diisi)')}</p>
  <h3 style="text-align:left">VII. PENUTUP</h3><p>Demikian laporan ini disampaikan. Soli Deo Gloria.</p>
  <table class="ttd"><tr><td>Ketua Majelis Jemaat,<br><br><br><br><u><b>${esc(m.ketua || '................')}</b></u></td><td>Sekretaris,<br><br><br><br><u><b>${esc(m.sekretaris || '................')}</b></u></td></tr></table>`;
}

/* ---------- Pendaftaran ke dashboard ---------- */
const MORE = ['sk', 'register', 'mutasi', 'notulen', 'program'];
/* ---------- Arsip Surat: form Surat Masuk / Keluar + berkas PDF ---------- */
const SRT_KAT = ['Undangan', 'Pemberitahuan', 'Permohonan', 'Laporan', 'Keuangan', 'Pelayanan & Pastoral', 'Edaran', 'Lainnya'];
const srtOkPdf = u => /^data:application\/pdf;base64,[A-Za-z0-9+\/=]+$/.test(u || '');
{ const old = CFG.surat.cols, dispCol = old.find(c => c.t === 'Disposisi'), apvCol = old.find(c => c.t === 'Persetujuan');
  CFG.surat.fields = [
    {k:'jenis', l:'Jenis Surat', t:'select', o:['Surat Masuk', 'Surat Keluar']},
    {k:'pihak', l:'Nama Pengirim (Surat Masuk) / Nama Tujuan (Surat Keluar)', req:1},
    {k:'diterima', l:'Diterima Oleh'},
    {k:'tanggal', l:'Tanggal Surat (tanggal / bulan / tahun)', t:'date', req:1},
    {k:'kategori', l:'Kategori', t:'select', o:SRT_KAT},
    {k:'pdf', l:'Berkas Surat (PDF, maks. 2 MB)', t:'pdf'},
    {k:'ket', l:'Keterangan (opsional)', t:'textarea'}
  ];
  CFG.surat.cols = [
    {t:'Tanggal', f:r => esc(dID(r.tanggal))},
    {t:'Nomor', f:r => `<b>${esc(r.nomor)}</b>`},
    {t:'Jenis', f:r => chip(r.jenis)},
    {t:'Pengirim / Tujuan', f:r => esc(r.pihak || '-') + (r.diterima ? `<br><small style="color:var(--muted)">Diterima: ${esc(r.diterima)}</small>` : '')},
    {t:'Kategori', f:r => `<b>${esc(r.kategori || r.perihal || '-')}</b>${r.ket ? '<br><small style="color:var(--muted)">' + esc(r.ket) + '</small>' : ''}`},
    {t:'Berkas', f:r => srtOkPdf(r.pdf) ? `<button class="ib grn" data-act="sview" data-id="${r.id}" title="Lihat berkas PDF: ${esc(r.pdfNama || 'surat')}"><i class="fa-solid fa-file-pdf"></i></button>` : '<small style="color:var(--muted)">-</small>'},
    dispCol, apvCol
  ];
  CFG.surat.beforeSave = (d, item) => {
    if (d.pdf && !srtOkPdf(d.pdf)) return 'Berkas surat harus berformat PDF.';
    /* Perihal tidak lagi diisi manual: surat baru memakai kategori; surat lama tetap memakai perihalnya. */
    if (!item || !item.perihal || item.perihal === item.kategori) d.perihal = d.kategori;
    /* Nomor surat tidak lagi diisi manual: dibuat otomatis untuk surat baru, nomor lama dipertahankan saat diubah. */
    if (!(item && item.nomor) && !d.nomor) Object.assign(d, nextNo(d.jenis === 'Surat Keluar' ? 'SKL' : 'SML', d.tanggal));
    return null;
  };
}
let srUrl = null;
const srClose = () => { const o = document.getElementById('srView'); if (o) o.remove(); if (srUrl) { URL.revokeObjectURL(srUrl); srUrl = null; } };
const srBlob = u => { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], {type:'application/pdf'}); };
function srOpen(it, dl) {
  if (!it || !srtOkPdf(it.pdf)) return;
  const nama = (it.pdfNama || ('Surat ' + it.nomor)).replace(/\.pdf$/i, '');
  if (dl) { const a = document.createElement('a'), u = URL.createObjectURL(srBlob(it.pdf)); a.href = u; a.download = nama.replace(/[^\w\-]+/g, '-') + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); return; }
  srClose(); srUrl = URL.createObjectURL(srBlob(it.pdf));
  const o = document.createElement('div'); o.id = 'srView'; o.className = 'bl-view';
  o.innerHTML = `<div class="bl-bar"><b>${esc(it.jenis || 'Surat')} · ${esc(it.perihal || it.nomor)}</b><span><button class="btn btn-gold btn-sm" data-sr="unduh"><i class="fa-solid fa-download"></i> Unduh</button> <button class="btn btn-blue btn-sm" data-sr="tutup"><i class="fa-solid fa-xmark"></i> Tutup</button></span></div><iframe title="Berkas surat"></iframe>`;
  o.querySelector('iframe').src = srUrl; document.body.appendChild(o);
  o.addEventListener('click', e => { const b = e.target.closest('[data-sr]'); if (!b) return; if (b.dataset.sr === 'tutup') srClose(); else srOpen(it, true); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') srClose(); });
Object.assign(ACT, {
  sview(id) { const u = me(); if (!u || !['admin', 'sekretaris', 'ketua'].includes(u.role)) return; srOpen(DB.get('surat', []).find(x => x.id === id)); }
});

const at = MENU.findIndex(m => m.id === 'surat') + 1;
MENU.splice(at, 0,
  {id:'sk', label:'Surat Keputusan (SK)', icon:'file-signature', roles:SEKR},
  {id:'registrasi', label:'Registrasi & Statistik', icon:'address-book', roles:SEKR},
  {id:'notulen', label:'Notulen & Sidang', icon:'clipboard-list', roles:SEKR},
  {id:'pelkes', label:'Laporan Pelkes', icon:'chart-column', roles:SEKR});
Object.assign(VIEWS, {sk:vSK, registrasi:vRegistrasi, notulen:vNotulen, pelkes:vPelkes});
// tanggal lahir warga & label program pada transaksi keuangan
CFG.warga.fields.splice(CFG.warga.fields.findIndex(f => f.k === 'telp'), 0, {k:'tglLahir', l:'Tanggal Lahir (opsional, untuk statistik usia)', t:'date'});
{ const base = CFG.uang.fields; Object.defineProperty(CFG.uang, 'fields', {get: () => [...base, {k:'program', l:'Program Pelkes (opsional)', t:'select', o:['-', ...progs().map(progLabel)]}]}); }

const saveCol = (col, l) => { const e = put(col, l); if (e) say(e); return !e; };
Object.assign(ACT, {
  sprint(id) {
    const u = me(); if (!u || !['admin', 'sekretaris'].includes(u.role)) return;
    const it = DB.get('surat', []).find(x => x.id === id); if (!it) return;
    showDoc((it.jenis === 'Surat Masuk' ? 'Disposisi ' : 'Surat Keluar ') + it.nomor, it.jenis === 'Surat Masuk' ? suratMasukHtml(it) : suratKeluarHtml(it));
  },
  srekap() {
    const u = me(); if (!u || !['admin', 'sekretaris'].includes(u.role)) return;
    openForm('Cetak Rekap Surat', fld([['jenis', 'Jenis Surat', 'select', 0, 0, ['Semua', 'Surat Masuk', 'Surat Keluar']], ['dari', 'Dari Tanggal (opsional)', 'date'], ['sampai', 'Sampai Tanggal (opsional)', 'date']]), {jenis:'Semua'}, d => {
      let l = DB.get('surat', []).slice().sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
      if (d.jenis !== 'Semua') l = l.filter(x => x.jenis === d.jenis);
      if (d.dari) l = l.filter(x => x.tanggal >= d.dari);
      if (d.sampai) l = l.filter(x => x.tanggal <= d.sampai);
      showDoc('Rekap ' + d.jenis, suratRekapHtml(l, d.jenis, d.dari, d.sampai));
    });
  },
  disp(id) {
    if (!isSek()) return; const it = DB.get('surat', []).find(x => x.id === id); if (!it) return;
    openForm('Disposisi Surat Masuk', fld([['dispTujuan', 'Diteruskan kepada', 'select', 0, 0, DISP], ['dispInstruksi', 'Instruksi / Catatan', 'textarea', 0, 3], ['dispTenggat', 'Tenggat', 'date'], ['dispStatus', 'Status Tindak Lanjut', 'select', 0, 0, ['Baru', 'Diproses', 'Selesai']]]), it, d => {
      const l = DB.get('surat', []), i = l.findIndex(x => x.id === id); l[i] = {...l[i], ...d}; if (!saveCol('surat', l)) return 'Gagal menyimpan.'; renderDash(); say('Disposisi disimpan.'); });
  },
  nocfg() {
    if (!isSek()) return;
    openForm('Format Penomoran Surat', [{k:'kode', l:'Kode Jemaat/Klasis pada nomor (mis. GPM/KLS-SBB/JMT-BE)', req:1}], NOCFG(), d => { DB.set('nomorcfg', {kode:d.kode.replace(/\s+/g, '')}); renderDash(); say('Format nomor disimpan.'); });
  },
  skadd() {
    if (!isSek()) return;
    openForm('Buat SK', SKF, SKDEF, d => {
      const u = isSek(), l = DB.get('sk', []);
      const sk = {id:uid(), ...d, ...nextNo('SK', d.tanggal), status:'Diterbitkan', oleh:u.nama, tglTerbit:todayS()};
      l.unshift(sk); if (!saveCol('sk', l)) return 'Gagal menyimpan.';
      logA('Terbitkan', 'SK Sekretaris', sk.nomor + ' — ' + sk.nama); renderDash(); say('SK diterbitkan dengan nomor ' + sk.nomor + '.');
    });
  },
  skedit(id) {
    if (!isSek()) return; const it = DB.get('sk', []).find(x => x.id === id); if (!it) return;
    openForm('Ubah SK ' + it.nomor, SKF, it, d => {
      const l = DB.get('sk', []), i = l.findIndex(x => x.id === id);
      l[i] = {...l[i], ...d, status:'Diterbitkan', catatan:'', tglRevisi:todayS()};
      if (!saveCol('sk', l)) return 'Gagal menyimpan.';
      logA('Ubah', 'SK Sekretaris', it.nomor + ' — ' + (d.nama || it.nama)); renderDash(); say('SK diperbarui.');
    });
  },
  skdel(id) {
    if (!isSek()) return; const it = DB.get('sk', []).find(x => x.id === id); if (!it) return;
    if (confirm('Hapus SK ' + it.nomor + '? Nomor urutnya tidak dipakai ulang.')) {
      DB.set('sk', DB.get('sk', []).filter(x => x.id !== id)); logA('Hapus', 'SK Sekretaris', it.nomor + ' — ' + it.nama); renderDash();
    }
  },
  skview(id) { const it = DB.get('sk', []).find(x => x.id === id); if (it) showDoc('SK ' + it.nomor, skHtml(it)); },

  regj(j) { TAB.regj = j; renderDash(); },
  regadd() { ACT.regform(); },
  regedit(id) { ACT.regform(id); },
  regform(id) {
    if (!isSek()) return; const j = TAB.regj, spec = REGJ[j], it = id ? DB.get('register', []).find(x => x.id === id) : null;
    openForm((it ? 'Ubah ' : 'Catat ') + j, fld(spec.f), it || {tanggal:todayS()}, d => {
      const l = DB.get('register', []);
      if (it) { const i = l.findIndex(x => x.id === id); l[i] = {...l[i], ...d}; }
      else { const n = Math.max(0, ...l.filter(x => x.jenis === j).map(x => +x.regurut || 0)) + 1; l.push({id:uid(), jenis:j, regurut:n, noreg:`${spec.pref}-${String(n).padStart(3, '0')}`, ...d});
        if (j === 'Kematian') { const w = DB.get('warga', []), t = w.find(x => norm(x.nama) === norm(d.nama) && x.status === 'Aktif'); if (t) { t.status = 'Meninggal'; DB.set('warga', w); say('Status warga ' + t.nama + ' diubah menjadi Meninggal.'); } } }
      if (!saveCol('register', l)) return 'Gagal menyimpan.'; renderDash(); });
  },
  regdel(id) { if (isSek() && confirm('Hapus catatan register ini?')) { DB.set('register', DB.get('register', []).filter(x => x.id !== id)); renderDash(); } },
  mutadd() {
    if (!isSek()) return;
    openForm('Catat Mutasi Jemaat', fld([['tanggal', 'Tanggal', 'date', 1], ['nama', 'Nama Warga / Kepala Keluarga', '', 1], ['jenis', 'Jenis Mutasi', 'select', 0, 0, ['Pindah Masuk', 'Pindah Keluar']], ['sektor', 'Sektor', 'select', 0, 0, SEKTOR], ['asal', 'Asal (jika masuk) / Tujuan (jika keluar) Jemaat'], ['alasan', 'Alasan / Keterangan']]), {tanggal:todayS()}, d => {
      const m = DB.get('mutasi', []); m.unshift({id:uid(), ...d}); const w = DB.get('warga', []), t = w.find(x => norm(x.nama) === norm(d.nama));
      if (d.jenis === 'Pindah Keluar') { if (t) { t.status = 'Pindah'; say('Data warga ' + t.nama + ' diperbarui: Pindah.'); } else say('Nama belum ada di Data Warga; mutasi tetap dicatat.'); }
      else if (t) { t.status = 'Aktif'; t.sektor = d.sektor; say('Warga ' + t.nama + ' diaktifkan kembali.'); }
      else { w.push({id:uid(), nama:d.nama, sektor:d.sektor, kategori:'Anak', status:'Aktif', telp:'', alamat:''}); say('Warga baru ditambahkan ke Data Warga.'); }
      DB.set('warga', w); if (!saveCol('mutasi', m)) return 'Gagal menyimpan.'; renderDash(); });
  },
  mutdel(id) { if (isSek() && confirm('Hapus catatan mutasi ini? (Data Warga tidak diubah kembali.)')) { DB.set('mutasi', DB.get('mutasi', []).filter(x => x.id !== id)); renderDash(); } },

  ntnew() {
    const u = isSek(); if (!u) return;
    openForm('Notulen Baru', fld([['jenis', 'Jenis Rapat', 'select', 0, 0, NTJ], ['judul', 'Judul / Tema Rapat', '', 1], ['tanggal', 'Tanggal', 'date', 1], ['tempat', 'Tempat'], ['pimpinan', 'Pimpinan Rapat'], ['notulis', 'Notulis'], ['peserta', 'Peserta (satu baris per nama/unsur)', 'textarea', 0, 3]]), {tanggal:todayS(), notulis:u.nama}, d => {
      const l = DB.get('notulen', []), n = {id:uid(), ...d, agenda:'', isi:'', keputusan:[]}; l.unshift(n); if (!saveCol('notulen', l)) return 'Gagal menyimpan.'; NT.edit = n.id; TAB.notulen = 'notulen'; renderDash(); });
  },
  ntmeta() {
    const n = DB.get('notulen', []).find(x => x.id === NT.edit); if (!isSek() || !n) return;
    openForm('Info Rapat', fld([['jenis', 'Jenis Rapat', 'select', 0, 0, NTJ], ['judul', 'Judul / Tema Rapat', '', 1], ['tanggal', 'Tanggal', 'date', 1], ['tempat', 'Tempat'], ['pimpinan', 'Pimpinan Rapat'], ['notulis', 'Notulis'], ['peserta', 'Peserta', 'textarea', 0, 3]]), n, d => {
      const l = DB.get('notulen', []), i = l.findIndex(x => x.id === n.id); l[i] = {...l[i], ...d}; if (!saveCol('notulen', l)) return 'Gagal menyimpan.'; renderDash(); });
  },
  ntopen(id) { if (isSek()) { NT.edit = id; renderDash(); } },
  ntback() { NT.edit = null; renderDash(); },
  ntview(id) { const n = DB.get('notulen', []).find(x => x.id === (id || NT.edit)); if (n) showDoc('Notulen ' + n.judul, notulenHtml(n)); },
  ntdel(id) { if (isSek() && confirm('Hapus notulen ini beserta keputusannya?')) { DB.set('notulen', DB.get('notulen', []).filter(x => x.id !== id)); renderDash(); } },
  ntstamp() { const t = $('#ntIsi'); if (!t) return; const s = '[' + new Date().toTimeString().slice(0, 5) + '] '; t.value += (t.value && !t.value.endsWith('\n') ? '\n' : '') + s; t.focus(); t.dispatchEvent(new Event('input', {bubbles:true})); },
  kepdel(id) { if (!isSek()) return; const l = DB.get('notulen', []), n = l.find(x => x.id === NT.edit); if (n) { n.keputusan = (n.keputusan || []).filter(k => k.id !== id); saveCol('notulen', l); renderDash(); } },

  pkadd() { ACT.pkform(); }, pkedit(id) { ACT.pkform(id); },
  pkform(id) {
    if (!isSek()) return; const it = id ? progs().find(x => x.id === id) : null;
    openForm(it ? 'Ubah Program' : 'Tambah Program Pelayanan', fld([['tahun', 'Tahun Pelayanan', 'number', 1], ['unit', 'Komisi / Seksi / Sektor', 'select', 0, 0, UNIT], ['nama', 'Nama Program / Kegiatan', '', 1], ['target', 'Sasaran / Target'], ['capaian', 'Capaian (%)', 'number', 1], ['status', 'Status', 'select', 0, 0, PST], ['anggaran', 'Anggaran Direncanakan (Rp)', 'number'], ['hasil', 'Hasil / Catatan Evaluasi', 'textarea', 0, 3]]), it || {tahun:PK.year, capaian:0}, d => {
      if (+d.capaian < 0 || +d.capaian > 100) return 'Capaian harus 0–100.';
      const l = progs(); if (it) { const i = l.findIndex(x => x.id === id); l[i] = {...l[i], ...d}; } else l.push({id:uid(), ...d});
      if (!saveCol('program', l)) return 'Gagal menyimpan.'; PK.year = +d.tahun; renderDash(); });
  },
  pkdel(id) { if (isSek() && confirm('Hapus program ini?')) { DB.set('program', progs().filter(x => x.id !== id)); renderDash(); } },
  pkmeta() {
    const y = String(PK.year); if (!isSek()) return;
    openForm('Pendahuluan & Evaluasi ' + y, fld([['pendahuluan', 'Pendahuluan (kosongkan untuk teks bawaan)', 'textarea', 0, 5], ['evaluasi', 'Evaluasi dan Rekomendasi', 'textarea', 0, 6], ['ketua', 'Nama Ketua Majelis Jemaat'], ['sekretaris', 'Nama Sekretaris']]), pkMeta(y), d => { const m = DB.get('pelkesmeta', {}) || {}; m[y] = d; DB.set('pelkesmeta', m); renderDash(); say('Tersimpan.'); });
  },
  pkexport() { showDoc('Laporan Pelkes ' + PK.year, pelkesHtml(PK.year)); }
});

/* ---------- Event tambahan dashboard ---------- */
let ntT = null;
$('#dBody').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { const [k, v] = b.dataset.tab.split(':'); TAB[k] = v; if (k === 'notulen') NT.edit = null; renderDash(); } });
$('#dBody').addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.live || !NT.edit || !isSek()) return;
  clearTimeout(ntT); ntT = setTimeout(() => { const l = DB.get('notulen', []), n = l.find(x => x.id === NT.edit); if (!n) return; n[t.dataset.live] = t.value; if (put('notulen', l)) return say('Penyimpanan penuh.'); const s = $('#ntSaved'); if (s) s.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Tersimpan ' + new Date().toTimeString().slice(0, 8); }, 350);
});
$('#dBody').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.kst && isSek()) { const [nid, kid] = t.dataset.kst.split(':'), l = DB.get('notulen', []), k = (l.find(x => x.id === nid)?.keputusan || []).find(x => x.id === kid); if (k) { k.status = t.value; saveCol('notulen', l); renderDash(); } }
  if (t.hasAttribute('data-fs')) { NT.fs = t.value; renderDash(); }
  if (t.hasAttribute('data-pky')) { PK.year = +t.value; renderDash(); }
});
$('#dBody').addEventListener('submit', e => {
  if (e.target.id !== 'fKep' || !isSek()) return;
  const f = Object.fromEntries(new FormData(e.target)), l = DB.get('notulen', []), n = l.find(x => x.id === NT.edit); if (!n || !f.teks.trim()) return;
  (n.keputusan = n.keputusan || []).push({id:uid(), teks:f.teks.trim(), pj:f.pj.trim(), target:f.target, status:'Belum'}); saveCol('notulen', l); renderDash();
});

/* ================= MODUL BENDAHARA (4 pos terpisah) ================= */
const BEND = ['bendahara'];
const isBend = () => { const u = me(); return u && u.role === 'bendahara' ? u : null; };
const isKetua = () => { const u = me(); return u && u.role === 'ketua' ? u : null; };
const MON = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const SEKSI = ['Seksi Ibadah','Seksi Diakonia','Seksi Pembangunan','AMGPM','Wadah Perempuan','Koinonia','Operasional Ketua Majelis Jemaat & Gedung'];
const KATEG = ['Insentif Pelayan','Operasional Gedung Gereja','Belanja Inventaris','Kegiatan Seksi','Lainnya'];
const METODE = ['Tunai','Transfer Bank'];
const DARJ = ['Diakonia','Kedukaan','Penanggulangan Bencana','Bantuan Kemanusiaan'];
const BD = {year:new Date().getFullYear(), month:'0', mask:true, wk:todayS()};
Object.assign(TAB, {pen:'pundi', kel:'kas', sen:'hitung', lap:'warta'});

const num = x => +x || 0;
const sum = (l, f) => l.reduce((s, x) => s + num(f ? f(x) : x.jumlah), 0);
const col = k => DB.get(k, []);
const yOf = d => String(d || '').slice(0, 4);
const inY = (l, y = BD.year) => l.filter(x => yOf(x.tanggal) === String(y));
const inP = l => inY(l).filter(x => BD.month === '0' || String(x.tanggal).slice(5, 7) === BD.month);
const srt = l => l.slice().sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
const SC = () => ({kas:75, sentral:25, ...(DB.get('sentralcfg', {}) || {})});
const paguY = y => (DB.get('pagu', {}) || {})[y] || {};
const mny = v => BD.mask ? 'Rp •••••' : rp(v);
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/* Log audit: siapa menambah / mengubah / menghapus transaksi */
function logA(aksi, modul, detail) {
  try {
    const u = me(), l = DB.get('auditlog', []);
    l.unshift({id:uid(), waktu:new Date().toISOString(), user:u ? u.nama + ' (' + (LBL[u.role] || u.role) + ')' : '-', aksi, modul, detail});
    DB.set('auditlog', l.slice(0, 1000));
  } catch {}
}

/* ---------- Komponen tampilan ---------- */
const yrs = () => [...new Set([String(new Date().getFullYear()), ...['penerimaan','persepuluhan','pengeluaran','setoran','darurat','disposisi'].flatMap(k => col(k).map(x => yOf(x.tanggal))).filter(Boolean)])].sort().reverse();
const yBar = (extra = '', month = false) => `<div class="panel"><div class="tools"><span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>Tahun</b><select class="sel" data-bdy>${yrs().map(v => `<option ${v === String(BD.year) ? 'selected' : ''}>${v}</option>`).join('')}</select>${month ? `<b>Periode</b><select class="sel" data-bdm><option value="0" ${BD.month === '0' ? 'selected' : ''}>Setahun penuh</option>${MON.map((m, i) => { const v = String(i + 1).padStart(2, '0'); return `<option value="${v}" ${BD.month === v ? 'selected' : ''}>${m}</option>`; }).join('')}</select>` : ''}</span><span style="display:flex;gap:10px;flex-wrap:wrap">${extra}</span></div></div>`;
const tbl = (heads, rows, empty) => `<div class="tblwrap"><table class="tbl"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${heads.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
const rowAct = (c, id, extra = '') => `<td style="white-space:nowrap">${extra}<button class="ib" data-act="bdedit" data-id="${c}:${id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="bddel" data-id="${c}:${id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td>`;
const addBtn = (c, label) => `<button class="btn btn-blue btn-sm" data-act="bdadd" data-id="${c}"><i class="fa-solid fa-plus"></i> ${label}</button>`;
const ghost = (act, ic, label, id = '') => `<button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="${act}" ${id ? `data-id="${id}"` : ''}><i class="fa-solid fa-${ic}"></i> ${label}</button>`;
const search = ph => `<input data-search placeholder="${ph}">`;
const note = t => `<div class="panel" style="padding:14px 20px"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> ${t}</div>`;
const bar = p => `<div class="bar-track" style="min-width:110px"><i style="display:block;height:8px;width:${Math.min(100, p)}%;background:${p >= 100 ? '#dc2626' : p >= 85 ? '#d97706' : '#047857'}"></i></div>`;
const stChip = s => s === 'Menunggu' ? chip('menunggu', s) : s === 'Ditolak' ? chip('ditolak', s) : s === 'Dicairkan' ? chip('adminsektor', s) : chip('disetujui', s);

/* ---------- Konfigurasi koleksi data bendahara ---------- */
const BC = {
  penerimaan: {label:'Penerimaan Ibadah', add:'Catat Penerimaan', def:() => ({tanggal:todayS()}),
    f:() => fld([['tanggal','Tanggal','date',1], ['uraian','Uraian (mis. Ibadah Minggu)','',1], ['metode','Metode Penerimaan','select',0,0,METODE], ['jumlah','Jumlah (Rp)','number',1]]),
    desc:r => `${rp(r.jumlah)} — ${r.uraian}`},
  persepuluhan: {label:'Persepuluhan', add:'Catat Persepuluhan', def:() => ({tanggal:todayS()}),
    f:() => fld([['tanggal','Tanggal Setoran','date',1], ['sektor','Nama Sektor','select',0,0,SEKTOR], ['jumlah','Jumlah (Rp)','number',1]]),
    desc:r => `${r.sektor} ${rp(r.jumlah)}`},
  pengeluaran: {label:'Pengeluaran', add:'Catat Pengeluaran', def:() => ({tanggal:todayS()}),
    f:() => fld([['tanggal','Tanggal','date',1], ['seksi','Seksi / Pos Anggaran','select',0,0,SEKSI], ['kategori','Jenis Belanja','select',0,0,KATEG], ['uraian','Uraian','',1], ['jumlah','Jumlah (Rp)','number',1]]),
    check:(d, old) => paguCheck(d, old && old.id),
    desc:r => `${r.seksi} · ${r.kategori} ${rp(r.jumlah)} — ${r.uraian}`},
  disposisi: {label:'E-Disposisi Dana', add:'Catat Pengajuan Dana', def:() => ({tanggal:todayS()}), init:{status:'Menunggu'}, lock:true,
    f:() => fld([['tanggal','Tanggal Pengajuan','date',1], ['seksi','Seksi / Panitia Pengaju','select',0,0,SEKSI], ['kegiatan','Kegiatan / Keperluan','',1], ['pengaju','Diajukan oleh (nama)'], ['jumlah','Jumlah Diajukan (Rp)','number',1]]),
    desc:r => `${r.seksi}: ${r.kegiatan} ${rp(r.jumlah)}`},
  setoran: {label:'Setoran Sentralisasi', add:'Catat Setoran ke Sinode', def:() => ({tanggal:todayS(), bank:'Rekening Sinode GPM'}),
    f:() => fld([['tanggal','Tanggal Transfer','date',1], ['periode','Periode Setoran (mis. Okt 2026)','',1], ['bank','Rekening Tujuan','',1], ['jumlah','Jumlah (Rp)','number',1], ['bukti','Bukti Transfer (foto/screenshot)','image']]),
    desc:r => `${r.periode} ${rp(r.jumlah)} → ${r.bank}`},
  darurat: {label:'Dana Tanggap Darurat', add:'Catat Penyaluran Dana', def:() => ({tanggal:todayS()}),
    f:() => fld([['tanggal','Tanggal','date',1], ['jenis','Jenis Bantuan','select',0,0,DARJ], ['penerima','Penerima / Peruntukan','',1], ['jumlah','Jumlah (Rp)','number',1], ['ket','Keterangan','textarea',0,3]]),
    desc:r => `${r.jenis} ${rp(r.jumlah)} — ${r.penerima}`}
};

/* Sistem kuota: pengeluaran seksi tidak boleh melebihi pagu tahunan APBJ */
function paguCheck(d, skipId) {
  const y = yOf(d.tanggal), lim = num(paguY(y)[d.seksi]);
  if (!lim) return null;
  const used = sum(col('pengeluaran').filter(x => x.seksi === d.seksi && yOf(x.tanggal) === y && x.id !== skipId));
  return used + num(d.jumlah) > lim ? `Melebihi pagu APBJ ${d.seksi} tahun ${y}. Pagu ${rp(lim)}, terpakai ${rp(used)}, sisa ${rp(lim - used)}.` : null;
}
const paguRows = y => { const pg = paguY(y), E = inY(col('pengeluaran'), y); return SEKSI.map(s => { const lim = num(pg[s]), used = sum(E.filter(x => x.seksi === s)); return {s, lim, used, sisa:lim - used, pct:lim ? Math.round(used / lim * 100) : 0}; }); };
const kasPos = y => { const pen = sum(inY(col('penerimaan'), y)) + sum(inY(col('persepuluhan'), y)), keluar = sum(inY(col('pengeluaran'), y)), set = sum(inY(col('setoran'), y)), dar = sum(inY(col('darurat'), y)); return {pen, keluar, set, dar, saldo:pen - keluar - set - dar}; };

/* ================= POS 1: PENERIMAAN & PERSEPULUHAN ================= */
function vPen() {
  const P = inY(col('penerimaan')), T = inY(col('persepuluhan')), t = TAB.pen;
  let h = yBar(t === 'pundi' ? addBtn('penerimaan', 'Catat Penerimaan') : ghost('bdmask', BD.mask ? 'eye' : 'eye-slash', BD.mask ? 'Tampilkan Nominal' : 'Sembunyikan Nominal') + addBtn('persepuluhan', 'Catat Persepuluhan'))
    + `<div class="stats">${stat('hand-holding-dollar', rp(sum(P) + sum(T)), 'Total Penerimaan ' + BD.year)}${stat('church', rp(sum(P)), 'Kolekte & Penerimaan Ibadah')}${stat('address-card', mny(sum(T)), 'Persepuluhan')}</div>`
    + tabs('pen', [['pundi','Penerimaan Ibadah','church'], ['tithe','Kartu Persepuluhan','address-card']]);
  if (t === 'pundi') {
    h += `
    <div class="panel"><div class="tools">${search('Cari penerimaan...')}</div>${tbl(['Tanggal','Uraian','Metode','Jumlah',''], srt(P).map(r => `<tr><td>${fmtD(r.tanggal)}</td><td><b>${esc(r.uraian)}</b></td><td>${esc(r.metode)}</td><td>${rp(r.jumlah)}</td>${rowAct('penerimaan', r.id)}</tr>`), 'Belum ada penerimaan pada tahun ini.')}</div>`;
  } else {
    const g = {}; T.forEach(x => { const k = x.sektor; const o = g[k] = g[k] || {sektor:x.sektor, m:Array(12).fill(0)}; const mi = +String(x.tanggal).slice(5, 7) - 1; if (mi >= 0 && mi < 12) o.m[mi] += num(x.jumlah); });
    h += note('<b>Kartu Persepuluhan bersifat rahasia.</b> Nominal per sektor disembunyikan secara bawaan; tekan “Tampilkan Nominal” hanya saat diperlukan. Rekap Warta Jemaat hanya memuat total, tanpa nama KK.')
      + `<div class="panel"><h3 style="margin-bottom:12px">Kartu Persepuluhan ${BD.year}</h3><div class="tools">${search('Cari nama sektor...')}</div>${tbl(['Nama Sektor', ...MON, 'Total'], Object.values(g).sort((a, b) => String(a.sektor).localeCompare(String(b.sektor))).map(r => `<tr><td><b>${esc(r.sektor)}</b></td>${r.m.map(v => `<td style="text-align:center">${v ? `<i class="fa-solid fa-circle-check" style="color:#047857" ${BD.mask ? '' : `title="${rp(v)}"`}></i>` : '<span style="color:#cbd5e1">–</span>'}</td>`).join('')}<td><b>${mny(sum(r.m, x => x))}</b></td></tr>`), 'Belum ada setoran persepuluhan pada tahun ini.')}</div>
      <div class="panel"><h3 style="margin-bottom:12px">Riwayat Setoran Persepuluhan</h3>${tbl(['Tanggal','Nama Sektor','Jumlah',''], srt(T).map(r => `<tr><td>${fmtD(r.tanggal)}</td><td><b>${esc(r.sektor)}</b></td><td>${mny(r.jumlah)}</td>${rowAct('persepuluhan', r.id)}</tr>`), 'Belum ada data.')}</div>`;
  }
  return h;
}

/* ================= POS 2: PENGELUARAN & PAGU APBJ ================= */
function vKel() {
  const E = inY(col('pengeluaran')), R = paguRows(BD.year), D = col('disposisi'), t = TAB.kel;
  const tp = sum(R, r => r.lim), tu = sum(E);
  let h = yBar(t === 'kas' ? addBtn('pengeluaran', 'Catat Pengeluaran') : t === 'pagu' ? ghost('pagu', 'sliders', 'Atur Pagu APBJ ' + BD.year) : addBtn('disposisi', 'Catat Pengajuan Dana'))
    + `<div class="stats">${stat('scale-balanced', rp(tp), 'Total Pagu APBJ ' + BD.year)}${stat('receipt', rp(tu), 'Realisasi Belanja')}${stat('piggy-bank', rp(tp - tu), 'Sisa Pagu')}${stat('file-signature', D.filter(x => x.status === 'Menunggu').length, 'Pengajuan Menunggu Ketua')}</div>`
    + tabs('kel', [['kas','Buku Kas Pengeluaran','book'], ['pagu','Kuota Seksi (Pagu APBJ)','gauge-high'], ['disp','E-Disposisi Pencairan','stamp']]);
  if (t === 'kas') {
    h += `<div class="panel"><div class="tools">${search('Cari pengeluaran...')}</div>${tbl(['Tanggal','Seksi','Jenis Belanja','Uraian','Jumlah',''], srt(E).map(r => `<tr><td>${fmtD(r.tanggal)}</td><td>${esc(r.seksi)}</td><td>${esc(r.kategori)}</td><td><b>${esc(r.uraian)}</b></td><td>${rp(r.jumlah)}</td>${rowAct('pengeluaran', r.id)}</tr>`), 'Belum ada pengeluaran pada tahun ini.')}</div>`;
  } else if (t === 'pagu') {
    h += note('Pengeluaran yang membuat total belanja sebuah seksi <b>melebihi pagu tahunan</b> akan ditolak sistem. Seksi yang pagunya belum diatur tidak dibatasi.')
      + `<div class="panel">${tbl(['Seksi / Pos','Pagu APBJ','Terpakai','Sisa','Penggunaan'], R.map(r => `<tr><td><b>${esc(r.s)}</b></td><td>${r.lim ? rp(r.lim) : '<small style="color:var(--muted)">Belum diatur</small>'}</td><td>${rp(r.used)}</td><td>${r.lim ? rp(r.sisa) : '-'}</td><td>${r.lim ? `${bar(r.pct)}<small>${r.pct}%</small>` : '-'}</td></tr>`), '')}</div>`;
  } else {
    h += note('Alur: panitia/seksi mengajukan dana → <b>Ketua Majelis Jemaat</b> menyetujui/menolak lewat menu “Antrean Pengesahan” di akunnya → Bendahara menekan <b>Cairkan</b>, dan pencairan otomatis tercatat di Buku Kas Pengeluaran (tunduk pada pagu).')
      + `<div class="panel"><div class="tools">${search('Cari pengajuan...')}</div>${tbl(['Tanggal','Seksi','Kegiatan','Jumlah','Status',''], srt(D).map(r => `<tr><td>${fmtD(r.tanggal)}</td><td>${esc(r.seksi)}</td><td><b>${esc(r.kegiatan)}</b><br><small style="color:var(--muted)">${esc(r.pengaju || '')}${r.oleh ? ' · ' + esc(r.status) + ' oleh ' + esc(r.oleh) : ''}</small></td><td>${rp(r.jumlah)}</td><td>${stChip(r.status)}</td>${r.status === 'Menunggu' ? rowAct('disposisi', r.id) : r.status === 'Disetujui' ? `<td><button class="btn btn-gold btn-sm" data-act="dcair" data-id="${r.id}"><i class="fa-solid fa-money-bill-transfer"></i> Cairkan</button></td>` : '<td></td>'}</tr>`), 'Belum ada pengajuan dana.')}</div>`;
  }
  return h;
}

/* ================= POS 3: DANA SENTRALISASI GPM ================= */
function vSen() {
  const c = SC(), t = TAB.sen;
  const base = [{n:'Kolekte & Penerimaan Ibadah', v:sum(inP(col('penerimaan')))}, {n:'Persepuluhan', v:sum(inP(col('persepuluhan')))}];
  const total = sum(base, x => x.v), sent = Math.round(total * c.sentral / 100), kas = total - sent;
  const S = inP(col('setoran')), D = inP(col('darurat')), disetor = sum(S);
  let h = yBar(t === 'hitung' ? ghost('sentcfg', 'percent', 'Atur Persentase') : t === 'setor' ? addBtn('setoran', 'Catat Setoran') : addBtn('darurat', 'Catat Penyaluran'), true)
    + `<div class="stats">${stat('coins', rp(total), 'Total Pendapatan Periode')}${stat('church', rp(kas), `Kas Jemaat (${c.kas}%)`)}${stat('share-nodes', rp(sent), `Sentralisasi Klasis/Sinode (${c.sentral}%)`)}${stat('hourglass-half', rp(sent - disetor), 'Sisa Kewajiban Setor')}</div>`
    + tabs('sen', [['hitung','Kalkulator Pembagian','calculator'], ['setor','Setoran & Bukti Transfer','file-invoice'], ['darurat','Dana Tanggap Darurat','hand-holding-heart']]);
  if (t === 'hitung') {
    h += `<div class="panel"><h3 style="margin-bottom:10px">Kalkulator Cepat</h3><input type="number" min="0" data-calc placeholder="Masukkan nominal (Rp)" style="padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font:inherit;width:100%;max-width:320px"><p id="calcOut" style="margin-top:10px;color:var(--muted)">Hasil pembagian ${c.kas}% / ${c.sentral}% tampil di sini.</p></div>
    <div class="panel"><h3 style="margin-bottom:12px">Rincian Pembagian Otomatis (dari data Penerimaan)</h3>${tbl(['Sumber Pendapatan','Jumlah',`Kas Jemaat ${c.kas}%`,`Sentralisasi ${c.sentral}%`], [...base.map(r => { const s = Math.round(r.v * c.sentral / 100); return `<tr><td>${esc(r.n)}</td><td>${rp(r.v)}</td><td>${rp(r.v - s)}</td><td>${rp(s)}</td></tr>`; }), `<tr><td><b>TOTAL</b></td><td><b>${rp(total)}</b></td><td><b>${rp(kas)}</b></td><td><b>${rp(sent)}</b></td></tr>`], '')}</div>`;
  } else if (t === 'setor') {
    h += `<div class="panel"><div class="tools">${search('Cari setoran...')}</div>${tbl(['Tanggal','Periode','Rekening Tujuan','Jumlah','Bukti',''], srt(S).map(r => `<tr><td>${fmtD(r.tanggal)}</td><td><b>${esc(r.periode)}</b></td><td>${esc(r.bank)}</td><td>${rp(r.jumlah)}</td><td>${r.bukti ? `<button class="ib" data-act="buktiview" data-id="${r.id}" title="Lihat bukti"><i class="fa-solid fa-image"></i></button>` : '-'}</td>${rowAct('setoran', r.id)}</tr>`), 'Belum ada setoran pada periode ini.')}</div>`;
  } else {
    h += `<div class="panel"><h3 style="margin-bottom:12px">Rekap per Jenis Bantuan</h3>${tbl(['Jenis','Jumlah Penyaluran','Total'], DARJ.map(k => { const L = D.filter(x => x.jenis === k); return `<tr><td><b>${k}</b></td><td>${L.length}</td><td>${rp(sum(L))}</td></tr>`; }), '')}</div>
    <div class="panel"><div class="tools">${search('Cari penyaluran...')}</div>${tbl(['Tanggal','Jenis','Penerima / Peruntukan','Jumlah',''], srt(D).map(r => `<tr><td>${fmtD(r.tanggal)}</td><td>${esc(r.jenis)}</td><td><b>${esc(r.penerima)}</b>${r.ket ? `<br><small style="color:var(--muted)">${esc(r.ket)}</small>` : ''}</td><td>${rp(r.jumlah)}</td>${rowAct('darurat', r.id)}</tr>`), 'Belum ada penyaluran dana darurat.')}</div>`;
  }
  return h;
}

/* ================= POS 4: PELAPORAN & KONSOLIDASI ================= */
function wartaHtml(end) {
  const e = new Date(end + 'T00:00:00'), s = new Date(e); s.setDate(s.getDate() - 6);
  const a = ymd(s), b = ymd(e), inR = l => l.filter(x => x.tanggal >= a && x.tanggal <= b);
  const P = inR(col('penerimaan')), T = inR(col('persepuluhan')), E = inR(col('pengeluaran'));
  const masuk = sum(P) + sum(T), keluar = sum(E);
  return `${KOP}<h2>REKAPITULASI KEUANGAN MINGGUAN</h2><h3>Pekan ${esc(dID(a))} s.d. ${esc(dID(b))}</h3>
  <h3 style="text-align:left;margin-top:12px">A. PENERIMAAN</h3><table><tr><th>Uraian</th><th class="r">Jumlah</th></tr><tr><td>Kolekte & Penerimaan Ibadah</td><td class="r">${rp(sum(P))}</td></tr><tr><td>Ucapan Syukur Persepuluhan (total)</td><td class="r">${rp(sum(T))}</td></tr><tr><td><b>Total Penerimaan</b></td><td class="r"><b>${rp(masuk)}</b></td></tr></table>
  <h3 style="text-align:left">B. PENGELUARAN</h3><table><tr><th>Tanggal</th><th>Seksi</th><th>Uraian</th><th class="r">Jumlah</th></tr>${E.length ? E.map(x => `<tr><td>${esc(dID(x.tanggal))}</td><td>${esc(x.seksi)}</td><td>${esc(x.uraian)}</td><td class="r">${rp(x.jumlah)}</td></tr>`).join('') : '<tr><td colspan="4">Tidak ada pengeluaran pada pekan ini.</td></tr>'}<tr><td colspan="3"><b>Total Pengeluaran</b></td><td class="r"><b>${rp(keluar)}</b></td></tr></table>
  <p><b>Selisih pekan ini: ${rp(masuk - keluar)}</b></p>
  <table class="ttd"><tr><td></td><td>Bendahara,<br><br><br><br><u><b>${esc((me() || {}).nama || '................')}</b></u></td></tr></table>`;
}
function tahunanHtml(y) {
  const k = kasPos(y), P = inY(col('penerimaan'), y), T = inY(col('persepuluhan'), y), c = SC(), R = paguRows(y), Pr = progs().filter(p => String(p.tahun) === String(y));
  const wajib = Math.round((sum(P) + sum(T)) * c.sentral / 100);
  return `${KOP}<h2>BUKU LAPORAN KEUANGAN TAHUNAN</h2><h3>TAHUN ANGGARAN ${esc(y)}</h3>
  <h3 style="text-align:left;margin-top:12px">I. PENERIMAAN</h3><table><tr><th>Sumber</th><th class="r">Jumlah</th></tr><tr><td>Kolekte & Penerimaan Ibadah</td><td class="r">${rp(sum(P))}</td></tr><tr><td>Persepuluhan</td><td class="r">${rp(sum(T))}</td></tr><tr><td><b>Total Penerimaan</b></td><td class="r"><b>${rp(k.pen)}</b></td></tr></table>
  <h3 style="text-align:left">II. REALISASI PENGELUARAN TERHADAP PAGU APBJ</h3><table><tr><th>Seksi / Pos</th><th class="r">Pagu</th><th class="r">Realisasi</th><th class="r">Sisa</th><th class="c">%</th></tr>${R.map(r => `<tr><td>${esc(r.s)}</td><td class="r">${r.lim ? rp(r.lim) : '-'}</td><td class="r">${rp(r.used)}</td><td class="r">${r.lim ? rp(r.sisa) : '-'}</td><td class="c">${r.lim ? r.pct + '%' : '-'}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="r"><b>${rp(sum(R, r => r.lim))}</b></td><td class="r"><b>${rp(k.keluar)}</b></td><td class="r"></td><td></td></tr></table>
  <h3 style="text-align:left">III. REALISASI PROGRAM</h3>${Pr.length ? `<table><tr><th>Program</th><th>Komisi / Sektor</th><th class="r">Anggaran</th><th class="c">Capaian</th><th class="r">Realisasi</th></tr>${Pr.map(p => `<tr><td>${esc(p.nama)}</td><td>${esc(p.unit)}</td><td class="r">${rp(p.anggaran)}</td><td class="c">${+p.capaian || 0}%</td><td class="r">${rp(real(p))}</td></tr>`).join('')}</table>` : '<p>Belum ada program tercatat pada Laporan Pelkes tahun ini.</p>'}
  <h3 style="text-align:left">IV. DANA SENTRALISASI DAN TANGGAP DARURAT</h3><table><tr><th>Uraian</th><th class="r">Jumlah</th></tr><tr><td>Kewajiban Sentralisasi Klasis/Sinode (${c.sentral}%)</td><td class="r">${rp(wajib)}</td></tr><tr><td>Telah Disetor ke Sinode GPM</td><td class="r">${rp(k.set)}</td></tr><tr><td>Sisa Kewajiban</td><td class="r">${rp(wajib - k.set)}</td></tr><tr><td>Dana Tanggap Darurat Tersalurkan</td><td class="r">${rp(k.dar)}</td></tr></table>
  <h3 style="text-align:left">V. POSISI KAS (NERACA RINGKAS)</h3><table><tr><th>Uraian</th><th class="r">Jumlah</th></tr><tr><td>Total Penerimaan</td><td class="r">${rp(k.pen)}</td></tr><tr><td>(−) Pengeluaran Belanja</td><td class="r">${rp(k.keluar)}</td></tr><tr><td>(−) Setoran Sentralisasi</td><td class="r">${rp(k.set)}</td></tr><tr><td>(−) Dana Tanggap Darurat</td><td class="r">${rp(k.dar)}</td></tr><tr><td><b>Saldo Kas Akhir Periode</b></td><td class="r"><b>${rp(k.saldo)}</b></td></tr></table>
  <p>Demikian laporan ini disampaikan untuk dibahas pada Sidang Jemaat. Soli Deo Gloria.</p>
  <table class="ttd"><tr><td>Ketua Majelis Jemaat,<br><br><br><br><u><b>................</b></u></td><td>Bendahara,<br><br><br><br><u><b>${esc((me() || {}).nama || '................')}</b></u></td></tr></table>`;
}
function vLap() {
  const t = TAB.lap, k = kasPos(BD.year);
  let h = yBar('') + `<div class="stats">${stat('hand-holding-dollar', rp(k.pen), 'Total Penerimaan ' + BD.year)}${stat('receipt', rp(k.keluar + k.set + k.dar), 'Total Pengeluaran & Setoran')}${stat('wallet', rp(k.saldo), 'Posisi Kas')}${stat('clipboard-list', col('auditlog').length, 'Catatan Log Audit')}</div>`
    + tabs('lap', [['warta','Warta Jemaat (PDF)','newspaper'], ['tahunan','Laporan Tahunan','book-open'], ['audit','Log Audit','fingerprint']]);
  if (t === 'warta') {
    h += `<div class="panel"><h3 style="margin-bottom:8px">Rekap Mingguan untuk Warta Jemaat</h3><p style="margin-bottom:14px">Pilih tanggal akhir pekan (mis. hari Sabtu/Minggu). Rekap mencakup 7 hari yang berakhir pada tanggal tersebut.</p>
    <div class="tools" style="justify-content:flex-start;gap:12px"><input type="date" data-wk value="${esc(BD.wk)}" style="padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font:inherit"><button class="btn btn-gold btn-sm" data-act="lwarta"><i class="fa-solid fa-file-pdf"></i> Buat Rekap (Cetak / PDF)</button></div></div>`;
  } else if (t === 'tahunan') {
    h += `<div class="panel"><h3 style="margin-bottom:8px">Buku Laporan Keuangan Tahunan ${BD.year}</h3><p style="margin-bottom:14px">Berisi penerimaan, realisasi pagu APBJ, realisasi program, dana sentralisasi, dan posisi kas untuk Sidang Jemaat GPM.</p><button class="btn btn-gold btn-sm" data-act="ltahun"><i class="fa-solid fa-file-export"></i> Buka Laporan (Cetak / PDF / Word)</button></div>`;
  } else {
    h += `<div class="panel"><div class="tools">${search('Cari log (nama, aksi, modul)...')}</div>${tbl(['Waktu','Pengguna','Aksi','Modul','Detail'], col('auditlog').slice(0, 300).map(r => `<tr><td style="white-space:nowrap">${esc(new Date(r.waktu).toLocaleString('id-ID'))}</td><td>${esc(r.user)}</td><td>${chip(r.aksi === 'Hapus' ? 'ditolak' : r.aksi === 'Tambah' ? 'disetujui' : 'menunggu', r.aksi)}</td><td>${esc(r.modul)}</td><td>${esc(r.detail)}</td></tr>`), 'Belum ada aktivitas tercatat.')}</div>`;
  }
  return h;
}

/* ---------- Pendaftaran menu & tampilan ---------- */
const mi = (id, label, icon, roles, cnt) => ({id, icon, roles, get label() { const n = cnt ? cnt() : 0; return label + (n ? ` (${n})` : ''); }});
{
  const at3 = MENU.findIndex(m => m.id === 'uang') + 1;
  MENU.splice(at3, 0,
    mi('pen', 'Penerimaan & Persepuluhan', 'hand-holding-dollar', BEND),
    mi('kel', 'Pengeluaran & Pagu APBJ', 'receipt', BEND, () => col('disposisi').filter(x => x.status === 'Disetujui').length),
    mi('sen', 'Dana Sentralisasi GPM', 'share-nodes', BEND),
    mi('lap', 'Pelaporan & Konsolidasi', 'file-invoice-dollar', BEND),
    mi('antrean', 'Antrean Pengesahan', 'stamp', ['ketua'], () => qTotal()));
}
Object.assign(VIEWS, {pen:vPen, kel:vKel, sen:vSen, lap:vLap});

/* ================= BULETIN PDF (Bendahara -> beranda publik) ================= */
{
  const BL_MAX = 2 * 1024 * 1024;
  const okPdf = u => /^data:application\/pdf;base64,[A-Za-z0-9+\/=]+$/.test(u || '');
  const bls = () => DB.get('buletin', []);
  const vBul = () => {
    const L = bls().slice().sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
    return note('Unggah buletin dalam format <b>PDF</b> (maks. 2 MB). Hanya buletin berstatus <b>Terbit</b> yang tampil di beranda publik pada bagian &quot;Buletin Jemaat&quot;.')
      + `<div class="panel"><div class="tools"><button class="btn btn-blue btn-sm" data-act="bladd"><i class="fa-solid fa-plus"></i> Unggah Buletin</button></div>`
      + tbl(['Tanggal', 'Edisi / Periode', 'Status', ''], L.map(r => `<tr><td>${fmtD(r.tanggal)}</td><td><b>${esc(r.judul)}</b><br><small style="color:var(--muted)">${esc(r.berkas || '')}</small></td><td>${chip(r.status === 'Terbit' ? 'disetujui' : 'menunggu', r.status)}</td><td style="white-space:nowrap"><button class="ib" data-act="blview" data-id="${r.id}" title="Lihat PDF"><i class="fa-solid fa-eye"></i></button><button class="ib grn" data-act="bltoggle" data-id="${r.id}" title="${r.status === 'Terbit' ? 'Tarik dari beranda' : 'Terbitkan ke beranda'}"><i class="fa-solid fa-${r.status === 'Terbit' ? 'eye-slash' : 'bullhorn'}"></i></button><button class="ib" data-act="bledit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="bldel" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td></tr>`), 'Belum ada buletin. Klik "Unggah Buletin".') + '</div>';
  };
  const blForm = (title, item, save) => {
    let pdf = item ? item.pdf : '', nm = item ? item.berkas : '';
    openForm(title, [{k:'edisi', l:'Edisi / Periode (mis. Oktober 2026)', req:1}, {k:'deskripsi', l:'Ringkasan (opsional)', t:'textarea'}, {k:'status', l:'Status', t:'select', o:['Terbit', 'Draf']}],
      item || {status:'Terbit'}, d => okPdf(pdf) ? save({...d, judul:d.edisi, pdf, berkas:nm}) : 'Pilih berkas PDF terlebih dahulu.');
    const g = document.createElement('div'); g.className = 'fg';
    g.innerHTML = `<label>Berkas PDF (maks. 2 MB)</label><input type="file" accept="application/pdf"><small style="color:var(--muted)">${esc(nm || 'Belum ada berkas')}</small>`;
    const f = $('#fmForm'); f.insertBefore(g, f.querySelector('button.btn-block'));
    const inp = g.querySelector('input'), inf = g.querySelector('small');
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      if (file.type !== 'application/pdf') { inp.value = ''; return say('File harus berformat PDF.'); }
      if (file.size > BL_MAX) { inp.value = ''; return say('Ukuran PDF maksimal 2 MB.'); }
      const r = new FileReader();
      r.onload = () => { pdf = r.result; nm = file.name; inf.textContent = file.name; };
      r.onerror = () => say('Berkas tidak bisa dibaca.');
      r.readAsDataURL(file);
    };
  };
  const saveBl = (l, msg) => { const e = put('buletin', l); if (e) return e; renderDash(); say(msg); return null; };
  MENU.splice(MENU.findIndex(m => m.id === 'lap') + 1, 0, mi('buletin', 'Buletin Jemaat (PDF)', 'file-pdf', BEND));
  VIEWS.buletin = vBul;
  Object.assign(ACT, {
    bladd() {
      if (!isBend()) return;
      blForm('Unggah Buletin', null, d => { const e = saveBl([{id:uid(), tanggal:todayS(), ...d}, ...bls()], d.status === 'Terbit' ? 'Buletin diterbitkan di beranda publik.' : 'Buletin disimpan sebagai draf.'); if (!e) logA('Tambah', 'Buletin', d.judul + ' (' + d.status + ')'); return e; });
    },
    bledit(id) {
      const it = bls().find(x => x.id === id); if (!isBend() || !it) return;
      blForm('Ubah Buletin', it, d => { const l = bls(), i = l.findIndex(x => x.id === id); l[i] = {...l[i], ...d}; const e = saveBl(l, 'Buletin diperbarui.'); if (!e) logA('Ubah', 'Buletin', d.judul + ' (' + d.status + ')'); return e; });
    },
    bltoggle(id) {
      if (!isBend()) return; const l = bls(), it = l.find(x => x.id === id); if (!it) return;
      it.status = it.status === 'Terbit' ? 'Draf' : 'Terbit';
      if (!saveBl(l, it.status === 'Terbit' ? 'Buletin diterbitkan di beranda publik.' : 'Buletin ditarik dari beranda publik.')) logA(it.status === 'Terbit' ? 'Terbitkan' : 'Tarik', 'Buletin', it.judul);
    },
    bldel(id) {
      const it = bls().find(x => x.id === id); if (!isBend() || !it || !confirm('Hapus buletin ini?')) return;
      if (!saveBl(bls().filter(x => x.id !== id), 'Buletin dihapus.')) logA('Hapus', 'Buletin', it.judul);
    },
    blview(id) { if (isBend() && window.blOpen) blOpen(id); }
  });
}

/* ================= SALDO MASUK & KELUAR (Bendahara -> beranda publik) ================= */
{
  if (!MORE.includes('saldopub')) MORE.push('saldopub');
  Object.assign(TAB, {saldo:'minggu'});
  const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const SP = {tgl:todayS(), thn:String(new Date().getFullYear()), bln:String(new Date().getMonth() + 1).padStart(2, '0')};
  const spl = () => DB.get('saldopub', []);
  const addD = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const rentang = t => {
    if (t === 'minggu') { const sampai = SP.tgl || todayS(), dari = addD(sampai, -6); return {dari, sampai, label:'Minggu ' + fmtD(dari) + ' – ' + fmtD(sampai)}; }
    if (t === 'bulan') { const last = new Date(+SP.thn, +SP.bln, 0).getDate(); return {dari:`${SP.thn}-${SP.bln}-01`, sampai:`${SP.thn}-${SP.bln}-${String(last).padStart(2, '0')}`, label:BLN[+SP.bln - 1] + ' ' + SP.thn}; }
    return {dari:`${SP.thn}-01-01`, sampai:`${SP.thn}-12-31`, label:'Tahun ' + SP.thn};
  };
  /* Saldo masuk = penerimaan ibadah + persepuluhan. Saldo keluar = pengeluaran + setoran sentralisasi + dana darurat (sama dengan Posisi Kas). */
  const hitung = (dari, sampai) => {
    const R = k => sum(col(k).filter(x => x.tanggal && x.tanggal >= dari && x.tanggal <= sampai)), U = k => sum(col(k).filter(x => x.tanggal && x.tanggal <= sampai));
    const kol = R('penerimaan'), tit = R('persepuluhan'), bel = R('pengeluaran'), set = R('setoran'), dar = R('darurat');
    return {kol, tit, bel, set, dar, masuk:kol + tit, keluar:bel + set + dar, selisih:kol + tit - bel - set - dar, saldoAkhir:U('penerimaan') + U('persepuluhan') - U('pengeluaran') - U('setoran') - U('darurat')};
  };
  const sama = (x, t, r) => x.tipe === t && x.dari === r.dari && x.sampai === r.sampai;
  const vSaldo = () => {
    const t = TAB.saldo, r = rentang(t), k = hitung(r.dari, r.sampai), all = spl();
    const L = all.filter(x => x.tipe === t).sort((a, b) => String(b.sampai).localeCompare(String(a.sampai)));
    const ada = all.find(x => sama(x, t, r));
    const inp = 'padding:10px 14px;border:1px solid #d1d5db;border-radius:10px;font:inherit';
    const yl = [...new Set([SP.thn, ...yrs()])].sort().reverse();
    const ctl = (t === 'minggu' ? `<b>Akhir pekan</b><input type="date" data-sp="tgl" value="${esc(SP.tgl)}" style="${inp}">` : `<b>Tahun</b><select class="sel" data-sp="thn">${yl.map(v => `<option ${v === SP.thn ? 'selected' : ''}>${v}</option>`).join('')}</select>`)
      + (t === 'bulan' ? `<b>Bulan</b><select class="sel" data-sp="bln">${BLN.map((m, i) => { const v = String(i + 1).padStart(2, '0'); return `<option value="${v}" ${v === SP.bln ? 'selected' : ''}>${m}</option>`; }).join('')}</select>` : '');
    const row = (a, b, bold) => `<tr><td>${bold ? '<b>' + a + '</b>' : a}</td><td>${bold ? '<b>' + rp(b) + '</b>' : rp(b)}</td></tr>`;
    return note('Pilih periode, lalu tekan <b>Terbitkan ke Beranda</b>. Angka yang terbit adalah ringkasan saat ditekan; jika ada transaksi baru, tekan <b>Perbarui</b>. Persepuluhan hanya dipublikasikan sebagai <b>total</b>, tanpa nama KK.')
      + tabs('saldo', [['minggu', 'Mingguan', 'calendar-days'], ['bulan', 'Bulanan', 'calendar'], ['tahun', 'Tahunan', 'chart-column']])
      + `<div class="panel"><div class="tools"><span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${ctl}</span><button class="btn btn-gold btn-sm" data-act="sppub"><i class="fa-solid fa-bullhorn"></i> ${ada ? 'Perbarui &amp; Terbitkan' : 'Terbitkan ke Beranda'}</button></div>
      <h3 style="margin:6px 0 14px">${esc(r.label)}${ada ? ' ' + chip(ada.status === 'Terbit' ? 'disetujui' : 'menunggu', ada.status) : ''}</h3>
      <div class="stats">${stat('arrow-down', rp(k.masuk), 'Saldo Masuk')}${stat('arrow-up', rp(k.keluar), 'Saldo Keluar')}${stat('scale-balanced', rp(k.selisih), 'Selisih Periode')}${stat('wallet', rp(k.saldoAkhir), 'Saldo Kas Akhir')}</div>
      ${tbl(['Rincian', 'Jumlah'], [row('Kolekte &amp; Penerimaan Ibadah', k.kol), row('Persepuluhan (total)', k.tit), row('Total Masuk', k.masuk, 1), row('Pengeluaran Belanja', k.bel), row('Setoran Sentralisasi', k.set), row('Dana Tanggap Darurat', k.dar), row('Total Keluar', k.keluar, 1)], '')}</div>`
      + `<div class="panel"><h3 style="margin-bottom:12px">Riwayat Terbitan ${t === 'minggu' ? 'Mingguan' : t === 'bulan' ? 'Bulanan' : 'Tahunan'}</h3>`
      + tbl(['Periode', 'Masuk', 'Keluar', 'Saldo Kas Akhir', 'Status', ''], L.map(x => `<tr><td><b>${esc(x.label)}</b></td><td>${rp(x.masuk)}</td><td>${rp(x.keluar)}</td><td>${rp(x.saldoAkhir)}</td><td>${chip(x.status === 'Terbit' ? 'disetujui' : 'menunggu', x.status)}</td><td style="white-space:nowrap"><button class="ib grn" data-act="sptoggle" data-id="${x.id}" title="${x.status === 'Terbit' ? 'Tarik dari beranda' : 'Terbitkan ke beranda'}"><i class="fa-solid fa-${x.status === 'Terbit' ? 'eye-slash' : 'bullhorn'}"></i></button><button class="ib" data-act="sprefresh" data-id="${x.id}" title="Perbarui angka dari transaksi terbaru"><i class="fa-solid fa-right-left"></i></button><button class="ib red" data-act="spdel" data-id="${x.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td></tr>`), 'Belum ada saldo yang diterbitkan untuk jenis periode ini.') + '</div>';
  };
  const saveSp = (l, msg) => { const e = put('saldopub', l); if (e) { say(e); return false; } renderDash(); say(msg); return true; };
  MENU.splice(MENU.findIndex(m => m.id === 'lap') + 1, 0, mi('saldo', 'Saldo Masuk & Keluar', 'scale-balanced', BEND));
  VIEWS.saldo = vSaldo;
  Object.assign(ACT, {
    sppub() {
      if (!isBend()) return; const t = TAB.saldo, r = rentang(t);
      if (t === 'minggu' && !SP.tgl) return say('Pilih tanggal akhir pekan terlebih dahulu.');
      const l = spl(), i = l.findIndex(x => sama(x, t, r)), rec = {tipe:t, label:r.label, dari:r.dari, sampai:r.sampai, ...hitung(r.dari, r.sampai), status:'Terbit', tanggal:todayS()};
      if (i >= 0) l[i] = {...l[i], ...rec}; else l.unshift({id:uid(), ...rec});
      if (saveSp(l, 'Saldo ' + r.label + ' diterbitkan di beranda publik.')) logA(i >= 0 ? 'Ubah' : 'Tambah', 'Saldo Publik', r.label + ' (Terbit)');
    },
    sptoggle(id) {
      if (!isBend()) return; const l = spl(), it = l.find(x => x.id === id); if (!it) return;
      it.status = it.status === 'Terbit' ? 'Draf' : 'Terbit';
      if (saveSp(l, it.status === 'Terbit' ? 'Saldo diterbitkan di beranda publik.' : 'Saldo ditarik dari beranda publik.')) logA(it.status === 'Terbit' ? 'Terbitkan' : 'Tarik', 'Saldo Publik', it.label);
    },
    sprefresh(id) {
      if (!isBend()) return; const l = spl(), it = l.find(x => x.id === id); if (!it) return;
      Object.assign(it, hitung(it.dari, it.sampai), {tanggal:todayS()});
      if (saveSp(l, 'Angka diperbarui dari transaksi terbaru.')) logA('Ubah', 'Saldo Publik', it.label + ' (diperbarui)');
    },
    spdel(id) {
      const it = spl().find(x => x.id === id); if (!isBend() || !it || !confirm('Hapus saldo ini dari riwayat dan beranda publik?')) return;
      if (saveSp(spl().filter(x => x.id !== id), 'Saldo dihapus.')) logA('Hapus', 'Saldo Publik', it.label);
    }
  });
  $('#dBody').addEventListener('change', e => { const t = e.target, k = t.dataset && t.dataset.sp; if (k && t.value) { SP[k] = t.value; renderDash(); } });
}

/* ---------- Aksi ---------- */
const bdCheck = (cf, d, old) => ('jumlah' in d && !(num(d.jumlah) > 0)) ? 'Jumlah harus lebih dari 0.' : (cf.check ? cf.check(d, old) : null);
const lockMsg = () => say('Data yang sudah diproses tidak dapat diubah / dihapus.');
Object.assign(ACT, {
  bdadd(c) {
    const cf = BC[c]; if (!isBend() || !cf) return;
    openForm(cf.add, cf.f(), cf.def ? cf.def() : {}, d => {
      const er = bdCheck(cf, d, null); if (er) return er;
      const l = col(c), it = {id:uid(), ...d, jumlah:num(d.jumlah), ...(cf.init || {})};
      if (c === 'disposisi') it.no = 'UUDP-' + new Date().getFullYear().toString().slice(2) + String(l.length + 1).padStart(2, '0');
      l.unshift(it); if (!saveCol(c, l)) return 'Gagal menyimpan.';
      logA('Tambah', cf.label, cf.desc(it)); renderDash(); say('Data disimpan.');
    });
  },
  bdedit(key) {
    const [c, id] = String(key).split(':'), cf = BC[c]; if (!isBend() || !cf) return;
    const old = col(c).find(x => x.id === id); if (!old) return;
    if (cf.lock && old.status !== 'Menunggu') return lockMsg();
    openForm('Ubah ' + cf.label, cf.f(), old, d => {
      const er = bdCheck(cf, d, old); if (er) return er;
      const l = col(c), i = l.findIndex(x => x.id === id); l[i] = {...l[i], ...d, jumlah:num(d.jumlah)};
      if (!saveCol(c, l)) return 'Gagal menyimpan.';
      logA('Ubah', cf.label, cf.desc(old) + '  →  ' + cf.desc(l[i])); renderDash(); say('Perubahan disimpan.');
    });
  },
  bddel(key) {
    const [c, id] = String(key).split(':'), cf = BC[c]; if (!isBend() || !cf) return;
    const old = col(c).find(x => x.id === id); if (!old) return;
    if (cf.lock && old.status !== 'Menunggu') return lockMsg();
    if (!confirm('Hapus data ini? Penghapusan tercatat di Log Audit.')) return;
    if (!saveCol(c, col(c).filter(x => x.id !== id))) return;
    logA('Hapus', cf.label, cf.desc(old)); renderDash(); say('Data dihapus.');
  },
  bdmask() { if (isBend()) { BD.mask = !BD.mask; renderDash(); } },
  pagu() {
    if (!isBend()) return; const y = String(BD.year), pg = paguY(y);
    openForm('Pagu APBJ ' + y, SEKSI.map((s, i) => ({k:'s' + i, l:s + ' (Rp)', t:'number'})), Object.fromEntries(SEKSI.map((s, i) => [`s${i}`, pg[s] || ''])), d => {
      const all = DB.get('pagu', {}) || {}; all[y] = Object.fromEntries(SEKSI.map((s, i) => [s, num(d['s' + i])]));
      if (!saveCol('pagu', all)) return 'Gagal menyimpan.';
      logA('Ubah', 'Pagu APBJ', `Pagu ${y}: total ${rp(sum(Object.values(all[y]), x => x))}`); renderDash(); say('Pagu APBJ disimpan.');
    });
  },
  dcair(id) {
    if (!isBend()) return; const l = col('disposisi'), x = l.find(y => y.id === id); if (!x || x.status !== 'Disetujui') return;
    const e = {tanggal:todayS(), seksi:x.seksi, kategori:'Kegiatan Seksi', uraian:'Pencairan: ' + x.kegiatan, jumlah:num(x.jumlah), disp:x.id};
    const er = paguCheck(e, null); if (er) return say(er);
    if (!confirm(`Cairkan ${rp(x.jumlah)} untuk ${x.kegiatan}?`)) return;
    const p = col('pengeluaran'); p.unshift({id:uid(), ...e}); x.status = 'Dicairkan'; x.tglCair = todayS();
    if (!saveCol('pengeluaran', p) || !saveCol('disposisi', l)) return;
    logA('Cairkan', 'E-Disposisi Dana', BC.disposisi.desc(x)); renderDash(); say('Dana dicairkan dan tercatat di Buku Kas Pengeluaran.');
  },
  sentcfg() {
    if (!isBend()) return; const c = SC();
    openForm('Persentase Pembagian Dana', fld([['kas', 'Persentase Kas Jemaat (%) — sisanya untuk Sentralisasi', 'number', 1]]), {kas:c.kas}, d => {
      const v = num(d.kas); if (v < 0 || v > 100) return 'Isi angka 0 sampai 100.';
      if (!saveCol('sentralcfg', {kas:v, sentral:100 - v})) return 'Gagal menyimpan.';
      logA('Ubah', 'Dana Sentralisasi', `Pembagian ${v}% kas / ${100 - v}% sentralisasi`); renderDash(); say('Persentase disimpan.');
    });
  },
  buktiview(id) {
    if (!isBend()) return; const s = col('setoran').find(x => x.id === id); if (!s || !s.bukti) return;
    const o = document.createElement('div'); o.className = 'fb-box'; o.innerHTML = '<img alt="Bukti transfer">'; o.firstChild.src = s.bukti; o.onclick = () => o.remove(); document.body.appendChild(o);
  },
  lwarta() { if (isBend()) showDoc('Rekap Keuangan Mingguan ' + BD.wk, wartaHtml(BD.wk)); },
  ltahun() { if (isBend()) showDoc('Laporan Keuangan Tahunan ' + BD.year, tahunanHtml(BD.year)); }
});
$('#dBody').addEventListener('change', e => {
  const t = e.target;
  if (t.hasAttribute('data-bdy')) { BD.year = +t.value; renderDash(); }
  if (t.hasAttribute('data-bdm')) { BD.month = t.value; renderDash(); }
  if (t.hasAttribute('data-wk') && t.value) { BD.wk = t.value; renderDash(); }
});
$('#dBody').addEventListener('input', e => {
  const t = e.target; if (!t.hasAttribute('data-calc')) return;
  const v = num(t.value), c = SC(), s = Math.round(v * c.sentral / 100), o = document.getElementById('calcOut');
  if (o) o.innerHTML = `Kas Jemaat (${c.kas}%): <b>${rp(v - s)}</b> &nbsp;·&nbsp; Sentralisasi Klasis/Sinode (${c.sentral}%): <b>${rp(s)}</b>`;
});

/* ================= MODUL KETUA MAJELIS JEMAAT (terpisah) ================= */
const KET = ['ketua'];
const KOND = ['Kondusif', 'Butuh Pendampingan', 'Intervensi Ketua Majelis Jemaat'];
const PST2 = ['Baru', 'Dijadwalkan', 'Selesai'];
const uudpNo = r => r.no || ('UUDP-' + String(r.id).slice(-4).toUpperCase());
const skSt = r => r.status || 'Draf';
const qUudp = () => col('disposisi').filter(x => x.status === 'Menunggu');
const qSk = () => []; // SK diterbitkan langsung oleh Sekretaris, tidak masuk antrean Ketua
const qSurat = () => col('surat').filter(x => x.jenis === 'Surat Masuk' && !x.dispTujuan);
const qTotal = () => qUudp().length + qSk().length + qSurat().length;
const kondChip = k => k === 'Kondusif' ? chip('disetujui', k) : k === 'Butuh Pendampingan' ? chip('menunggu', k) : k === 'Intervensi Ketua Majelis Jemaat' ? chip('ditolak', k) : chip('nonaktif', 'Belum dinilai');
const radar = () => DB.get('radar', {}) || {};

function paguInfo(x) {
  const y = yOf(x.tanggal), lim = num(paguY(y)[x.seksi]), used = sum(col('pengeluaran').filter(e => e.seksi === x.seksi && yOf(e.tanggal) === y)), sisa = lim - used;
  if (!lim) return {ok:null, txt:'Pagu seksi belum diatur oleh Bendahara.'};
  return sisa >= num(x.jumlah) ? {ok:true, txt:`Bendahara: sesuai pagu APBJ ${y} (sisa pagu ${rp(sisa)}, setelah pencairan ${rp(sisa - num(x.jumlah))}).`} : {ok:false, txt:`Peringatan: melebihi pagu APBJ ${y}. Sisa pagu hanya ${rp(sisa)}.`};
}

/* ---------- Antrean Pengesahan ---------- */
function vAntrean() {
  const U = qUudp(), S = qSk(), M = qSurat();
  const card = (tag, id, title, body, btns) => `<div class="panel" style="border-left:5px solid var(--gold)"><small style="color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">${tag} · ID: ${esc(id)}</small><h3 style="margin:6px 0 8px;font-size:19px">${esc(title)}</h3><p style="line-height:1.7;color:#374151">${body}</p><div class="btns">${btns}</div></div>`;
  const gh = (act, id, ic, l, red) => `<button class="btn btn-sm" style="background:${red ? '#fee2e2;color:#b91c1c' : '#eef2f9;color:var(--blue)'}" data-act="${act}" data-id="${id}"><i class="fa-solid fa-${ic}"></i> ${l}</button>`;
  const hist = col('auditlog').filter(r => ['E-Disposisi Dana', 'SK Ketua Majelis Jemaat', 'Surat Masuk'].includes(r.modul) && ['Setujui', 'Tolak', 'Tanda Tangan', 'Koreksi', 'Disposisi'].includes(r.aksi) && /Ketua/.test(r.user)).slice(0, 8);
  return `<div class="stats">${stat('file-invoice-dollar', U.length, 'UUDP Keuangan')}${stat('envelope-open-text', M.length, 'Surat Masuk Belum Didisposisi')}</div>`
    + (U.length + S.length + M.length ? '' : `<div class="panel" style="text-align:center;color:var(--muted)"><i class="fa-solid fa-circle-check" style="font-size:30px;margin-bottom:8px;color:#047857"></i><p>Tidak ada dokumen yang menunggu pengesahan.</p></div>`)
    + U.map(x => { const pi = paguInfo(x); return card('UUDP Keuangan', uudpNo(x), `Pengajuan ${x.kegiatan} oleh ${x.seksi}`, `Total usulan pencairan: <b>${rp(x.jumlah)}</b>. <span style="color:${pi.ok === false ? '#b91c1c' : pi.ok ? '#047857' : '#92400e'}">${esc(pi.txt)}</span>${x.pengaju ? `<br><small style="color:var(--muted)">Diajukan oleh ${esc(x.pengaju)}</small>` : ''}`, `<button class="btn btn-blue btn-sm" data-act="dsetuju" data-id="${x.id}"><i class="fa-solid fa-check"></i> Setujui</button>${gh('utinjau', x.id, 'magnifying-glass', 'Tinjau')}${gh('dtolak', x.id, 'xmark', 'Tolak', 1)}`); }).join('')
    + M.map(x => card('Surat Masuk', x.nomor, x.perihal, `<small style="color:var(--muted)">Dari: <b>${esc(x.pihak || '-')}</b> · Tanggal surat: ${esc(dID(x.tanggal))}${x.kategori ? ' · Kategori: ' + esc(x.kategori) : ''}${x.diterima ? ' · Diterima: ' + esc(x.diterima) : ''}${x.lampiran ? ' · Lampiran: ' + esc(x.lampiran) : ''}${srtOkPdf(x.pdf) ? ' · <b>Berkas PDF terlampir</b>' : ''}</small><br>${x.ket ? nl2br(x.ket) : 'Memerlukan arahan / disposisi Ketua.'}`, `${gh('kview', x.id, 'file-lines', 'Lihat Surat')}<button class="btn btn-blue btn-sm" data-act="kdisp" data-id="${x.id}"><i class="fa-solid fa-share"></i> Disposisi</button>`)).join('')
    + (hist.length ? `<div class="panel"><h3 style="margin-bottom:12px">Riwayat Keputusan Terakhir</h3>${tbl(['Waktu', 'Aksi', 'Dokumen'], hist.map(r => `<tr><td style="white-space:nowrap">${esc(new Date(r.waktu).toLocaleString('id-ID'))}</td><td>${esc(r.aksi)}</td><td>${esc(r.detail)}</td></tr>`), '')}</div>` : '');
}

/* ---------- Radar Status & Kondisi Sektor ---------- */
function vRadar(u) {
  const R = radar(), ok = r => !r.status || r.status === 'Disetujui', w = col('warga').filter(x => x.status === 'Aktif'), cnt = k => SEKTOR.filter(s => ok(R[s] || {}) && (R[s] || {}).kondisi === k).length;
  return `<div class="stats">${KOND.map((k, i) => stat(['circle-check', 'hand-holding-heart', 'triangle-exclamation'][i], cnt(k), k)).join('')}${stat('circle-question', SEKTOR.filter(s => !((R[s] || {}).kondisi && ok(R[s]))).length, 'Belum Dinilai')}</div>
  <div class="panel"><div class="tools"><input data-search placeholder="Cari sektor...">${'' }</div>${tbl(['Sektor', 'Warga Aktif', 'Kondisi', 'Isu / Catatan', ''], SEKTOR.map((s, i) => { const r = R[s] || {}; return `<tr><td><b>${esc(s)}</b></td><td>${w.filter(x => x.sektor === s).length}</td><td>${kondChip(ok(r) ? r.kondisi : '')}${ok(r) ? '' : '<br>' + chip(r.status === 'Ditolak' ? 'ditolak' : 'menunggu', r.status === 'Ditolak' ? 'Ditolak' : 'Menunggu Persetujuan') + (r.kondisi ? '<br><small style="color:var(--muted)">Usulan: ' + esc(r.kondisi) + '</small>' : '')}</td><td>${esc(r.isu || '-')}${r.tgl ? `<br><small style="color:var(--muted)">Dinilai ${fmtD(r.tgl)}</small>` : ''}</td><td>${u && u.role === 'ketua' ? (r.status === 'Menunggu' ? `<button class="ib grn" data-act="rdsetuju" data-id="${i}" title="Setujui"><i class="fa-solid fa-check"></i></button>` : '') : (u && u.role === 'adminsektor' && u.sektor === s ? `<button class="ib" data-act="rdedit" data-id="${i}" title="Isi / ubah radar"><i class="fa-solid fa-pen"></i></button>` : '')}</td></tr>`; }), '')}</div>`;
}

/* ---------- Catatan Pastoral ---------- */
const pstChip = s => s === 'Selesai' ? chip('disetujui', s) : s === 'Dijadwalkan' ? chip('ketua', s) : chip('menunggu', s);
const PSTF = () => fld([['tanggal', 'Tanggal / Pekan', 'date', 1], ['judul', 'Judul Catatan', '', 1], ['sektor', 'Sektor Terkait', 'select', 0, 0, ['Semua Sektor', ...SEKTOR]], ['isi', 'Temuan / Catatan Pastoral', 'textarea', 1, 5], ['rekom', 'Rekomendasi Tindak Lanjut', 'textarea', 0, 3], ['status', 'Status Tindak Lanjut', 'select', 0, 0, PST2]]);
function vPastoral() {
  const L = srt(col('pastoral'));
  return `<div class="panel"><div class="tools"><span style="color:var(--muted)">Catatan pastoral pekanan Ketua Majelis Jemaat.</span><button class="btn btn-blue btn-sm" data-act="pstadd"><i class="fa-solid fa-plus"></i> Tambah Catatan</button></div></div>`
    + (L.length ? L.map((r, i) => `<div class="panel" style="${i === 0 ? 'border-left:5px solid var(--gold)' : ''}"><small style="color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">${i === 0 ? 'Catatan Pastoral Pekan Ini · ' : ''}${fmtD(r.tanggal)} · ${esc(r.sektor)}</small><h3 style="margin:6px 0 8px;font-size:19px">${esc(r.judul)} ${pstChip(r.status)}</h3><p style="white-space:pre-line;line-height:1.7;color:#374151">${esc(r.isi)}</p>${r.rekom ? `<div style="background:#fff8e1;border-radius:12px;padding:10px 14px;margin-top:10px"><b style="color:#92400e"><i class="fa-solid fa-route"></i> Rekomendasi</b><p style="white-space:pre-line">${esc(r.rekom)}</p></div>` : ''}<div class="btns"><button class="ib" data-act="pstedit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="pstdel" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></div></div>`).join('') : `<div class="panel" style="text-align:center;color:var(--muted)"><p>Belum ada catatan pastoral.</p></div>`);
}

/* ---------- Aksi Cepat di Beranda Ketua ---------- */
const origHome = VIEWS.home;
VIEWS.home = u => {
  if (u.role !== 'ketua') return origHome(u);
  const R = radar(), warn = SEKTOR.filter(s => (R[s] || {}).kondisi && R[s].kondisi !== 'Kondusif' && (!R[s].status || R[s].status === 'Disetujui')), p = srt(col('pastoral'))[0];
  return `<div class="panel"><h3 style="margin-bottom:12px"><i class="fa-solid fa-bolt" style="color:var(--gold)"></i> Aksi Cepat</h3><div class="btns" style="margin:0"><button class="btn btn-blue btn-sm" data-act="goto" data-id="antrean"><i class="fa-solid fa-stamp"></i> Antrean Pengesahan${qTotal() ? ' (' + qTotal() + ')' : ''}</button>${ghost('goto', 'tower-observation', 'Radar Sektor', 'radar')}${ghost('goto', 'hands-praying', 'Catatan Pastoral', 'pastoral')}</div></div>`
    + (warn.length ? `<div class="panel" style="border-left:5px solid #d97706"><h3 style="margin-bottom:8px">Sektor Perlu Perhatian</h3>${warn.map(s => `<p style="margin:4px 0"><b>${esc(s)}</b> ${kondChip(R[s].kondisi)} <small style="color:var(--muted)">${esc(R[s].isu || '')}</small></p>`).join('')}</div>` : '')
    + (p ? `<div class="panel"><small style="color:var(--muted);font-weight:600;text-transform:uppercase">Catatan Pastoral Terbaru · ${fmtD(p.tanggal)}</small><h3 style="margin:6px 0">${esc(p.judul)}</h3><p style="white-space:pre-line;color:#374151">${esc(p.isi)}</p></div>` : '')
    + origHome(u);
};

/* ---------- Pendaftaran menu ---------- */
{
  const at4 = MENU.findIndex(m => m.id === 'antrean') + 1;
  MENU.splice(at4, 0, mi('radar', 'Radar Sektor', 'tower-observation', ['ketua', 'adminsektor'], () => isKetua() ? SEKTOR.filter(s => (radar()[s] || {}).status === 'Menunggu').length : 0), mi('pastoral', 'Catatan Pastoral', 'hands-praying', KET));
}
Object.assign(VIEWS, {antrean:vAntrean, radar:vRadar, pastoral:vPastoral});

/* ---------- Aksi Ketua ---------- */
const kLog = (a, m, d) => logA(a, m, d);
Object.assign(ACT, {
  goto(id) { if (isKetua() && ['antrean', 'radar', 'pastoral'].includes(id)) { cur = id; renderDash(); } },
  dsetuju(id) {
    const u = isKetua(), l = col('disposisi'), x = l.find(y => y.id === id); if (!u || !x || x.status !== 'Menunggu') return;
    const pi = paguInfo(x); if (pi.ok === false && !confirm(pi.txt + '\nTetap setujui?')) return;
    x.status = 'Disetujui'; x.oleh = u.nama; x.tglPutus = todayS(); if (!saveCol('disposisi', l)) return;
    kLog('Setujui', 'E-Disposisi Dana', uudpNo(x) + ' ' + BC.disposisi.desc(x)); renderDash(); say('UUDP disetujui. Bendahara dapat mencairkan.');
  },
  dtolak(id) {
    const u = isKetua(), l = col('disposisi'), x = l.find(y => y.id === id); if (!u || !x || x.status !== 'Menunggu') return;
    openForm('Tolak ' + uudpNo(x), fld([['alasan', 'Alasan penolakan', 'textarea', 1, 3]]), {}, d => { x.status = 'Ditolak'; x.oleh = u.nama; x.tglPutus = todayS(); x.alasan = d.alasan; if (!saveCol('disposisi', l)) return 'Gagal menyimpan.'; kLog('Tolak', 'E-Disposisi Dana', uudpNo(x) + ' ' + BC.disposisi.desc(x)); renderDash(); say('UUDP ditolak.'); });
  },
  utinjau(id) {
    const x = col('disposisi').find(y => y.id === id); if (!isKetua() || !x) return; const pi = paguInfo(x), y = yOf(x.tanggal), lim = num(paguY(y)[x.seksi]);
    showDoc('Tinjauan ' + uudpNo(x), `${KOP}<h2>TINJAUAN PENGAJUAN DANA</h2><h3>${esc(uudpNo(x))}</h3><table><tr><td>Tanggal</td><td>${esc(dID(x.tanggal))}</td></tr><tr><td>Seksi / Panitia</td><td>${esc(x.seksi)}</td></tr><tr><td>Kegiatan</td><td>${esc(x.kegiatan)}</td></tr><tr><td>Diajukan oleh</td><td>${esc(x.pengaju || '-')}</td></tr><tr><td>Jumlah diajukan</td><td><b>${rp(x.jumlah)}</b></td></tr><tr><td>Pagu APBJ ${esc(y)} seksi ini</td><td>${lim ? rp(lim) : 'Belum diatur'}</td></tr><tr><td>Status pagu</td><td>${esc(pi.txt)}</td></tr></table>`);
  },
  ksign(id) {
    return; // dinonaktifkan: SK tidak memerlukan pengesahan Ketua
    const u = isKetua(), l = col('sk'), x = l.find(y => y.id === id); if (!u || !x || skSt(x) !== 'Draf') return;
    if (!confirm('Tanda tangani dan sahkan ' + x.nomor + '?')) return;
    x.status = 'Disahkan'; x.oleh = u.nama; x.tglTtd = todayS(); if (!saveCol('sk', l)) return; kLog('Tanda Tangan', 'SK Ketua Majelis Jemaat', x.nomor + ' — ' + x.nama); renderDash(); say('SK disahkan.');
  },
  kkoreksi(id) {
    return; // dinonaktifkan
    const u = isKetua(), l = col('sk'), x = l.find(y => y.id === id); if (!u || !x || skSt(x) !== 'Draf') return;
    openForm('Koreksi ' + x.nomor, fld([['catatan', 'Catatan koreksi untuk Sekretaris', 'textarea', 1, 4]]), {}, d => { x.status = 'Perlu Koreksi'; x.catatan = d.catatan; x.oleh = u.nama; if (!saveCol('sk', l)) return 'Gagal menyimpan.'; kLog('Koreksi', 'SK Ketua Majelis Jemaat', x.nomor + ': ' + d.catatan); renderDash(); say('SK dikembalikan ke Sekretaris.'); });
  },
  kview(id) {
    const x = col('surat').find(y => y.id === id); if (!isKetua() || !x) return;
    if (srtOkPdf(x.pdf)) return srOpen(x);
    showDoc((x.jenis === 'Surat Keluar' ? 'Surat Keluar ' : 'Surat Masuk ') + x.nomor, x.jenis === 'Surat Keluar' ? suratKeluarHtml(x) : suratMasukHtml(x));
  },
  kdisp(id) {
    const u = isKetua(), x = col('surat').find(y => y.id === id); if (!u || !x) return;
    openForm('Disposisi Surat Masuk', fld([['dispTujuan', 'Diteruskan / ditunjuk kepada', 'select', 0, 0, DISP], ['dispInstruksi', 'Instruksi (mis. penunjukan utusan)', 'textarea', 0, 3], ['dispTenggat', 'Tenggat', 'date'], ['dispStatus', 'Status Tindak Lanjut', 'select', 0, 0, ['Baru', 'Diproses', 'Selesai']]]), x, d => {
      const l = col('surat'), i = l.findIndex(y => y.id === id); l[i] = {...l[i], ...d, dispOleh:u.nama}; if (!saveCol('surat', l)) return 'Gagal menyimpan.'; kLog('Disposisi', 'Surat Masuk', x.nomor + ' → ' + d.dispTujuan); renderDash(); say('Disposisi disimpan.');
    });
  },
  rdedit(i) {
    const u = me(), s = SEKTOR[+i]; if (!u || !s || u.role !== 'adminsektor' || u.sektor !== s) return; const R = radar(), r = R[s] || {};
    openForm('Status ' + s, fld([['kondisi', 'Kondisi Sektor', 'select', 0, 0, KOND], ['isu', 'Isu / Catatan Utama (mis. Katekesi remaja lambat)']]), r, d => {
      R[s] = {kondisi:d.kondisi, isu:d.isu, tgl:todayS(), status:'Menunggu', oleh:u.nama}; if (!saveCol('radar', R)) return 'Gagal menyimpan.'; logA('Ajukan', 'Radar Sektor', s + ': ' + d.kondisi); renderDash(); say('Radar sektor dikirim ke Ketua Majelis Jemaat untuk disetujui.');
    });
  },
  rdsetuju(i) {
    const u = isKetua(), s = SEKTOR[+i]; if (!u || !s) return; const R = radar(), x = R[s]; if (!x || x.status !== 'Menunggu') return;
    R[s] = {...x, status:'Disetujui', setujuOleh:u.nama, tglSetuju:todayS()}; if (!saveCol('radar', R)) return; kLog('Setujui', 'Radar Sektor', s + ': ' + x.kondisi); renderDash(); say('Radar ' + s + ' disetujui.');
  },
  pstadd() {
    if (!isKetua()) return;
    openForm('Tambah Catatan Pastoral', PSTF(), {tanggal:todayS(), status:'Baru'}, d => { const l = col('pastoral'); l.unshift({id:uid(), ...d}); if (!saveCol('pastoral', l)) return 'Gagal menyimpan.'; kLog('Tambah', 'Catatan Pastoral', d.judul); renderDash(); say('Catatan disimpan.'); });
  },
  pstedit(id) {
    const x = col('pastoral').find(y => y.id === id); if (!isKetua() || !x) return;
    openForm('Ubah Catatan Pastoral', PSTF(), x, d => { const l = col('pastoral'), i = l.findIndex(y => y.id === id); l[i] = {...l[i], ...d}; if (!saveCol('pastoral', l)) return 'Gagal menyimpan.'; kLog('Ubah', 'Catatan Pastoral', d.judul); renderDash(); say('Perubahan disimpan.'); });
  },
  pstdel(id) {
    const x = col('pastoral').find(y => y.id === id); if (!isKetua() || !x || !confirm('Hapus catatan ini?')) return;
    if (!saveCol('pastoral', col('pastoral').filter(y => y.id !== id))) return; kLog('Hapus', 'Catatan Pastoral', x.judul); renderDash(); say('Catatan dihapus.');
  }
});


/* ================= JADWAL IBADAH (Sekretaris) ================= */
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const IBJ = [
  {n:'Tunas', ic:'seedling'},
  {n:'Wadah Pelayanan Perempuan', ic:'person-dress'},
  {n:'Wadah Pelayanan Laki-laki', ic:'person'},
  {n:'Angkatan Muda', ic:'user-group'},
  {n:'Unit', ic:'people-group'},
  {n:'Sektor', ic:'map-location-dot'},
  {n:'Katekisasi', ic:'book-bible'}
];
const IBTP = ['Gedung Gereja Beth Eden', ...SEKTOR, 'Rumah Jemaat', 'Lainnya'];
const IBF = {jenis:'Semua', tahun:String(new Date().getFullYear()), bulan:'0'};
const IBROLE = ['admin', 'sekretaris'];
const ibCan = () => { const u = me(); return u && ['admin', 'sekretaris'].includes(u.role) ? u : null; };
const ibInfo = tgl => {
  const d = new Date(tgl + 'T00:00:00');
  return isNaN(d) ? {hari:'-', tg:'-', bln:'-', thn:'-'} : {hari:HARI[d.getDay()], tg:d.getDate(), bln:BULAN[d.getMonth()], thn:d.getFullYear()};
};
const ibTempat = r => r.tempat === 'Lainnya' ? (r.tempatLain || 'Lainnya') : (r.tempat || '-');
const ibSlug = n => String(n).toLowerCase().replace(/\s+/g, '-');
const ibChip = n => { const j = IBJ.find(x => x.n === n); return `<span class="chip c-${ibSlug(n)}">${j ? `<i class="fa-solid fa-${j.ic}"></i>` : ''}${esc(n)}</span>`; };

CFG.ibadah = {col:'ibadah', add:'Tambah Jadwal Ibadah', empty:'Belum ada jadwal ibadah.', prepend:true,
  fields:[
    {k:'tanggal', l:'Tanggal Ibadah (hari, bulan & tahun terisi otomatis)', t:'date', req:1},
    {k:'jam', l:'Jam Ibadah (WIT)', t:'time'},
    {k:'tempat', l:'Tempat Ibadah', t:'select', o:IBTP},
    {k:'tempatLain', l:'Nama Tempat Lain (isi jika memilih "Lainnya")'},
    {k:'jenis', l:'Jenis Ibadah', t:'select', o:IBJ.map(j => j.n)},
    {k:'unit', l:'Nama Unit / Sektor (mis. Unit 2, Sektor Sion)'},
    {k:'tema', l:'Tema / Bacaan Alkitab'},
    {k:'pelayan', l:'Pelayan Firman / Pemimpin Ibadah'},
    {k:'ket', l:'Keterangan (opsional)', t:'textarea'}],
  cols:[], sort:() => 0,
  beforeSave(d) {
    if (!d.tanggal || ibInfo(d.tanggal).hari === '-') return 'Tanggal ibadah wajib diisi.';
    if (d.tempat === 'Lainnya' && !String(d.tempatLain || '').trim()) return 'Isi nama tempat ibadah pada kolom "Nama Tempat Lain".';
    const i = ibInfo(d.tanggal); d.hari = i.hari; d.bulan = i.bln; d.tahun = String(i.thn);
  }
};

function ibData() {
  const all = DB.get('ibadah', []);
  const inP = all.filter(r => { const i = ibInfo(r.tanggal); return (IBF.tahun === 'Semua' || String(i.thn) === IBF.tahun) && (IBF.bulan === '0' || i.bln === BULAN[+IBF.bulan - 1]); });
  const list = inP.filter(r => IBF.jenis === 'Semua' || r.jenis === IBF.jenis)
    .sort((a, b) => (a.tanggal + (a.jam || '')).localeCompare(b.tanggal + (b.jam || '')));
  return {all, inP, list};
}
const ibPeriode = () => `${IBF.bulan === '0' ? 'Semua Bulan' : BULAN[+IBF.bulan - 1]} ${IBF.tahun === 'Semua' ? '(Semua Tahun)' : IBF.tahun}${IBF.jenis === 'Semua' ? '' : ' · ' + IBF.jenis}`;

function vIbadah(u) {
  const can = ibCan(), {all, inP, list} = ibData();
  const yrs = [...new Set([String(new Date().getFullYear()), ...all.map(r => String(ibInfo(r.tanggal).thn))])].filter(y => y !== '-').sort().reverse();
  const sel = (k, opts) => `<select class="sel" data-ibf="${k}" aria-label="Filter ${k}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${IBF[k] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const filters = sel('jenis', [['Semua', 'Semua Jenis Ibadah'], ...IBJ.map(j => [j.n, j.n])])
    + sel('bulan', [['0', 'Semua Bulan'], ...BULAN.map((b, i) => [String(i + 1), b])])
    + sel('tahun', [['Semua', 'Semua Tahun'], ...yrs.map(y => [y, y])]);
  const stats = stat('calendar-check', inP.length, 'Total Ibadah') + IBJ.map(j => stat(j.ic, inP.filter(r => r.jenis === j.n).length, j.n)).join('');
  const rows = list.map(r => {
    const i = ibInfo(r.tanggal);
    return `<tr><td><b>${i.hari}</b></td><td>${i.tg}</td><td>${i.bln}</td><td>${i.thn}</td>
      <td>${r.jam ? esc(r.jam) + ' WIT' : '-'}</td>
      <td><i class="fa-solid fa-location-dot" style="color:var(--blue)"></i> ${esc(ibTempat(r))}</td>
      <td>${ibChip(r.jenis)}</td><td>${esc(r.unit || '-')}</td>
      <td class="ib-tema"><b>${esc(r.tema || '-')}</b>${r.pelayan ? `<br><small><i class="fa-solid fa-user"></i> ${esc(r.pelayan)}</small>` : ''}${r.ket ? `<br><small>${esc(r.ket)}</small>` : ''}</td>
      ${can ? `<td style="white-space:nowrap"><button class="ib" data-act="edit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="del" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button></td>` : ''}</tr>`;
  }).join('');
  return (can ? '' : `<div class="panel" style="padding:14px 20px"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> Sebagai ${LBL[u.role]}, Anda hanya dapat <b>melihat</b> jadwal ibadah. Jadwal diatur oleh Sekretaris.</div>`)
    + `<div class="stats">${stats}</div>
    <div class="panel"><div class="tools"><span class="ib-wrap">${filters}<input data-search placeholder="Cari tempat, tema, pelayan..."></span>
      <span class="ib-wrap"><button class="btn btn-sm" style="background:#eef2f9;color:var(--blue)" data-act="ibprint"><i class="fa-solid fa-print"></i> Cetak / PDF</button>
      ${can ? `<button class="btn btn-blue btn-sm" data-act="add"><i class="fa-solid fa-plus"></i> ${CFG.ibadah.add}</button>` : ''}</span></div>
    <p style="margin-bottom:12px;color:var(--muted);font-size:14px"><i class="fa-solid fa-calendar-days"></i> Periode: <b>${esc(ibPeriode())}</b> · ${list.length} jadwal</p>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Hari</th><th>Tanggal</th><th>Bulan</th><th>Tahun</th><th>Jam</th><th>Tempat Ibadah</th><th>Jenis Ibadah</th><th>Unit / Sektor</th><th>Tema &amp; Pelayan</th>${can ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${can ? 10 : 9}" class="empty">${CFG.ibadah.empty}</td></tr>`}</tbody></table></div></div>`;
}

function ibDoc() {
  const {list} = ibData(), u = me();
  const rows = list.map((r, k) => { const i = ibInfo(r.tanggal);
    return `<tr><td>${k + 1}</td><td>${i.hari}</td><td>${i.tg}</td><td>${i.bln}</td><td>${i.thn}</td><td>${esc(r.jam || '-')}</td><td>${esc(ibTempat(r))}</td><td>${esc(r.jenis)}</td><td>${esc(r.unit || '-')}</td><td>${esc(r.tema || '-')}${r.pelayan ? '<br>Pelayan: ' + esc(r.pelayan) : ''}</td></tr>`; }).join('');
  return `${KOP}<h2>JADWAL IBADAH</h2><h3>${esc(ibPeriode())}</h3>
    <table><tr><th>No</th><th>Hari</th><th>Tgl</th><th>Bulan</th><th>Tahun</th><th>Jam</th><th>Tempat Ibadah</th><th>Jenis Ibadah</th><th>Unit / Sektor</th><th>Tema / Pelayan</th></tr>${rows || '<tr><td colspan="10">Belum ada jadwal.</td></tr>'}</table>
    <table class="ttd"><tr><td>Tihulale, ${esc(dID(todayS()))}<br>Sekretaris,<br><br><br><br><u><b>${esc(u && u.role === 'sekretaris' ? u.nama : '................')}</b></u></td></tr></table>`;
}

Object.assign(ACT, {
  ibprint() { if (me()) showDoc('Jadwal Ibadah', ibDoc()); },
  ibgo() { if (me()) { cur = 'ibadah'; renderDash(); } }
});
$('#dBody').addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.ibf) { IBF[t.dataset.ibf] = t.value; renderDash(); } });

{
  const at5 = MENU.findIndex(m => m.id === 'agenda') + 1;
  MENU.splice(at5, 0, {id:'ibadah', label:'Jadwal Ibadah', icon:'church', roles:IBROLE});
  VIEWS.ibadah = vIbadah;
  MORE.push('ibadah');
  const prevHome = VIEWS.home;
  VIEWS.home = u => {
    const h = prevHome(u);
    if (!IBROLE.includes(u.role)) return h;
    const t = todayS();
    const up = DB.get('ibadah', []).filter(r => r.tanggal >= t).sort((a, b) => (a.tanggal + (a.jam || '')).localeCompare(b.tanggal + (b.jam || ''))).slice(0, 5);
    return h + `<div class="panel"><h3 style="margin-bottom:12px"><i class="fa-solid fa-church" style="color:var(--blue)"></i> Ibadah Mendatang</h3>
      ${up.length ? `<ul class="agl">${up.map(r => { const i = ibInfo(r.tanggal); return `<li><i class="fa-solid fa-${(IBJ.find(j => j.n === r.jenis) || {ic:'church'}).ic}"></i><div><b>${esc(r.jenis)}${r.unit ? ' · ' + esc(r.unit) : ''}</b><br><small>${i.hari}, ${i.tg} ${i.bln} ${i.thn}${r.jam ? ' · ' + esc(r.jam) + ' WIT' : ''} · ${esc(ibTempat(r))}</small></div></li>`; }).join('')}</ul>` : '<p>Belum ada jadwal ibadah yang akan datang.</p>'}
      <div class="btns"><button class="btn btn-blue btn-sm" data-act="ibgo"><i class="fa-solid fa-calendar-days"></i> ${ibCan() ? 'Kelola Jadwal Ibadah' : 'Lihat Jadwal Ibadah'}</button></div></div>`;
  };
}

/* ================= AGENDA & KEGIATAN SEKTOR (dengan persetujuan Admin / Ketua) ================= */
{
  const AGK = ['Jadwal Ibadah', 'Pelayanan', 'Pengumuman', 'Hari Besar', 'Pembangunan'];
  const isApv = u => !!u && (u.role === 'admin' || u.role === 'ketua');
  const stOf = r => r.status || (r.tayang === 'Ya' ? 'Menunggu' : 'Draft');
  const stChip = r => { const st = stOf(r);
    return (st === 'Disetujui' ? chip('disetujui', 'Disetujui · Tayang') : st === 'Menunggu' ? chip('menunggu', 'Menunggu Persetujuan') : st === 'Ditolak' ? chip('ditolak', 'Ditolak') : chip('nonaktif', 'Draft'))
      + (st === 'Disetujui' && r.oleh2 ? `<br><small style="color:var(--muted)">${esc(r.oleh2)}${r.tglSetuju ? ' · ' + fmtD(r.tglSetuju) : ''}</small>` : '')
      + (st === 'Ditolak' && r.alasan ? `<br><small style="color:#b42323">${esc(r.alasan)}</small>` : ''); };
  CFG.agendasektor = {col:'agendasektor', add:'Tambah Agenda Sektor', empty:'Belum ada agenda sektor.', prepend:true,
    fields:[{k:'judul', l:'Judul Agenda / Kegiatan', req:1},
      {k:'sektor', l:'Sektor', t:'select', o:SEKTOR},
      {k:'kategori', l:'Kategori', t:'select', o:AGK},
      {k:'waktu', l:'Tanggal / Waktu (mis. Sabtu, 08.00 WIT)', req:1},
      {k:'deskripsi', l:'Deskripsi', t:'textarea'},
      {k:'foto', l:'Foto (opsional)', t:'image'},
      {k:'tayang', l:'Tampilkan di Beranda Publik', t:'select', o:['Ya', 'Tidak']}],
    cols:[{t:'Agenda', f:r => `<b>${esc(r.judul)}</b><br><small style="color:var(--muted)">${esc(r.sektor || '-')}</small>`},
      {t:'Kategori', f:r => chip(r.kategori)}, {t:'Tanggal / Waktu', f:r => esc(r.waktu)},
      {t:'Status Publikasi', f:r => stChip(r)}],
    sort:() => 0,
    top: data => { const u = me(), n = data.filter(x => stOf(x) === 'Menunggu').length;
      if (isApv(u)) return `<div class="panel" style="padding:14px 20px;${n ? 'border-left:5px solid #d97706' : ''}"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> Sebagai ${LBL[u.role]}, Anda menyetujui atau menolak agenda sektor yang diajukan tampil di beranda publik. <b>${n}</b> agenda menunggu persetujuan.</div>`;
      return ''; }};
  MENU.splice(MENU.findIndex(m => m.id === 'agenda') + 1, 0, {id:'agendasektor', label:'Agenda Sektor', icon:'calendar-check', roles:['adminsektor', 'admin']});
  VIEWS.agendasektor = u => vCrud(CFG.agendasektor, u);
  MORE.push('agendasektor');
  const canAg = (u, it) => !!u && (isApv(u) || (u.role === 'adminsektor' && !!u.sektor && (!it || it.sektor === u.sektor)));
  const fAg = u => { const f = CFG.agendasektor.fields.map(x => x.k === 'tayang' ? {...x, l: isApv(u) ? 'Tampilkan di Beranda Publik' : 'Ajukan Tampil di Beranda Publik (perlu persetujuan Admin / Ketua)'} : x);
    return u.role === 'adminsektor' ? f.filter(x => x.k !== 'sektor') : f; };
  const stamp = (it, u) => { it.status = 'Disetujui'; it.oleh2 = u.nama; it.tglSetuju = todayS(); it.alasan = ''; };
  const _add = ACT.add, _edit = ACT.edit, _del = ACT.del;
  ACT.add = function (id) {
    if (cur !== 'agendasektor') return _add.call(this, id);
    const u = me(); if (!canAg(u)) return;
    openForm('Tambah Agenda Sektor', fAg(u), {kategori:'Pelayanan', tayang:'Ya', sektor:u.sektor || SEKTOR[0]}, d => {
      const l = DB.get('agendasektor', []); const it = {id:uid(), ...clean(d), oleh:u.nama, dibuat:todayS()};
      if (u.role === 'adminsektor') it.sektor = u.sektor;
      if (it.tayang !== 'Ya') it.status = 'Draft'; else if (isApv(u)) stamp(it, u); else it.status = 'Menunggu';
      l.unshift(it); const e = put('agendasektor', l); if (e) return e; renderDash();
      say(it.status === 'Disetujui' ? 'Agenda ditambahkan dan tampil di beranda publik.' : it.status === 'Menunggu' ? 'Agenda dikirim, menunggu persetujuan Admin / Ketua sebelum tampil di beranda publik.' : 'Agenda disimpan sebagai draft.');
    });
  };
  ACT.edit = function (id) {
    if (cur !== 'agendasektor') return _edit.call(this, id);
    const u = me(), item = DB.get('agendasektor', []).find(x => x.id === id); if (!item || !canAg(u, item)) return;
    openForm('Ubah Agenda Sektor', fAg(u), item, d => {
      const l = DB.get('agendasektor', []), i = l.findIndex(x => x.id === id); if (i < 0) return 'Data tidak ditemukan.';
      const prev = stOf(l[i]); l[i] = {...l[i], ...clean(d)}; const it = l[i]; if (u.role === 'adminsektor') it.sektor = u.sektor;
      if (it.tayang !== 'Ya') { it.status = 'Draft'; it.alasan = ''; }
      else if (!isApv(u)) { it.status = 'Menunggu'; it.alasan = ''; delete it.oleh2; delete it.tglSetuju; }
      else if (prev === 'Draft') stamp(it, u); else it.status = prev;
      const e = put('agendasektor', l); if (e) return e; renderDash();
      say(it.status === 'Menunggu' ? (prev === 'Disetujui' ? 'Agenda diperbarui dan menunggu persetujuan ulang. Sementara itu tidak tampil di beranda publik.' : 'Agenda diperbarui, menunggu persetujuan Admin / Ketua.') : 'Agenda diperbarui.');
    });
  };
  ACT.del = function (id) {
    if (cur !== 'agendasektor') return _del.call(this, id);
    const u = me(), item = DB.get('agendasektor', []).find(x => x.id === id); if (!item || !canAg(u, item) || !confirm('Hapus agenda ini?')) return;
    DB.set('agendasektor', DB.get('agendasektor', []).filter(x => x.id !== id)); renderDash(); say('Agenda dihapus.');
  };
  ACT.skapp = function (id) {
    const u = me(); if (!isApv(u) || cur !== 'agendasektor') return;
    const l = DB.get('agendasektor', []), it = l.find(x => x.id === id); if (!it || it.tayang !== 'Ya') return;
    stamp(it, u); const e = put('agendasektor', l); if (e) return say(e); renderDash(); say('Agenda disetujui dan tampil di beranda publik.');
  };
  ACT.skrej = function (id) {
    const u = me(); if (!isApv(u) || cur !== 'agendasektor') return;
    const l = DB.get('agendasektor', []), it = l.find(x => x.id === id); if (!it || it.tayang !== 'Ya') return;
    const al = prompt('Alasan penolakan (opsional, akan terlihat oleh Admin Sektor):', ''); if (al === null) return;
    it.status = 'Ditolak'; it.alasan = String(al).trim(); it.oleh2 = u.nama; it.tglSetuju = todayS();
    const e = put('agendasektor', l); if (e) return say(e); renderDash(); say('Agenda ditolak dan tidak tampil di beranda publik.');
  };
}

/* ================= CATATAN PASTORAL (Admin Sektor mengelola, Ketua hanya melihat) ================= */
{
  if (!MORE.includes('pastoral')) MORE.push('pastoral');
  const JNS = ['Kunjungan Rumah', 'Kunjungan Sakit', 'Kedukaan', 'Konseling / Penggembalaan', 'Doa & Ibadah Keluarga', 'Lainnya'];
  const STS = ['Perlu Tindak Lanjut', 'Dalam Pendampingan', 'Selesai'];
  const PS = {sek:'Semua'};
  const isSek = u => !!u && u.role === 'adminsektor' && !!u.sektor;
  const isKet = u => !!u && u.role === 'ketua';
  const pst = () => DB.get('pastoral', []);
  const canSee = (u, r) => isKet(u) || (isSek(u) && r.sektor === u.sektor);
  const canEdit = (u, r) => isSek(u) && r.sektor === u.sektor;
  const stC = s => chip(s === 'Selesai' ? 'disetujui' : s === 'Dalam Pendampingan' ? 'ketua' : 'menunggu', s);
  const F = [{k:'tanggal', l:'Tanggal', t:'date', req:1}, {k:'nama', l:'Nama Warga / Keluarga yang Dilayani', req:1},
    {k:'jenis', l:'Jenis Pelayanan', t:'select', o:JNS}, {k:'catatan', l:'Catatan Pastoral', t:'textarea', rows:6},
    {k:'tindak', l:'Tindak Lanjut (opsional)', t:'textarea', rows:3}, {k:'status', l:'Status', t:'select', o:STS}];
  const vPst = u => {
    const ket = isKet(u);
    let L = pst().filter(x => ket ? (PS.sek === 'Semua' || x.sektor === PS.sek) : isSek(u) && x.sektor === u.sektor);
    L = L.slice().sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
    const cut = t => { t = String(t || ''); return esc(t.length > 90 ? t.slice(0, 90) + '…' : t); };
    return note(ket ? 'Sebagai Ketua Majelis Jemaat, Anda hanya dapat <b>melihat</b> catatan pastoral dari semua sektor. Catatan ditulis dan dikelola oleh Admin Sektor.'
        : `Anda mencatat pelayanan pastoral untuk <b>${esc(u.sektor || '-')}</b>. Catatan bersifat <b>rahasia</b>: hanya terlihat oleh Anda dan Ketua Majelis Jemaat, dan tidak tampil di beranda publik.`)
      + `<div class="stats">${stat('hand-holding-heart', L.length, 'Total Catatan')}${stat('hourglass-half', L.filter(x => x.status === 'Perlu Tindak Lanjut').length, 'Perlu Tindak Lanjut')}${stat('user-check', L.filter(x => x.status === 'Dalam Pendampingan').length, 'Dalam Pendampingan')}</div>`
      + `<div class="panel"><div class="tools"><span style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">${search('Cari nama, jenis, catatan...')}${ket ? `<select class="sel" data-pst>${['Semua', ...SEKTOR].map(o => `<option ${PS.sek === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : ''}</span>${isSek(u) ? `<button class="btn btn-blue btn-sm" data-act="pstadd"><i class="fa-solid fa-plus"></i> Tambah Catatan</button>` : ''}</div>`
      + tbl(['Tanggal', 'Warga / Keluarga', 'Jenis', 'Catatan', 'Status', ''], L.map(r => `<tr><td>${fmtD(r.tanggal)}</td><td><b>${esc(r.nama)}</b><br><small style="color:var(--muted)">${esc(r.sektor || '-')}</small></td><td>${esc(r.jenis)}</td><td>${cut(r.catatan)}</td><td>${stC(r.status)}</td><td style="white-space:nowrap"><button class="ib" data-act="pstlihat" data-id="${r.id}" title="Lihat lengkap"><i class="fa-solid fa-eye"></i></button>${canEdit(u, r) ? `<button class="ib" data-act="pstedit" data-id="${r.id}" title="Ubah"><i class="fa-solid fa-pen"></i></button><button class="ib red" data-act="pstdel" data-id="${r.id}" title="Hapus"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`), 'Belum ada catatan pastoral.') + '</div>';
  };
  MENU.splice(MENU.findIndex(m => m.id === 'warga') + 1, 0, {id:'pastoral', label:'Catatan Pastoral', icon:'hand-holding-heart', roles:['adminsektor', 'ketua']});
  VIEWS.pastoral = vPst;
  const lihat = r => {
    const o = document.createElement('div'); o.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(17,24,39,.6);display:grid;place-items:center;padding:16px';
    const row = (a, b) => b ? `<p style="margin:12px 0 2px;color:var(--muted);font-size:13px;font-weight:700">${a}</p><p style="white-space:pre-wrap;margin:0">${esc(b)}</p>` : '';
    o.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:24px"><h3 style="margin:0 0 4px">${esc(r.nama)}</h3><small style="color:var(--muted)">${esc(r.sektor || '-')} · ${esc(fmtD(r.tanggal))} · ${esc(r.jenis)}</small><div style="margin:10px 0">${stC(r.status)}</div>${row('Catatan Pastoral', r.catatan)}${row('Tindak Lanjut', r.tindak)}${r.oleh ? `<p style="margin:14px 0 0;color:var(--muted);font-size:13px">Dicatat oleh ${esc(r.oleh)}</p>` : ''}<div style="margin-top:18px;text-align:right"><button class="btn btn-blue btn-sm" data-x>Tutup</button></div></div>`;
    o.onclick = e => { if (e.target === o || e.target.closest('[data-x]')) o.remove(); };
    document.body.appendChild(o);
  };
  Object.assign(ACT, {
    pstadd() {
      const u = me(); if (!isSek(u)) return;
      openForm('Tambah Catatan Pastoral', F, {tanggal:todayS(), jenis:JNS[0], status:STS[0]}, d => {
        d = clean(d); if (!d.catatan) return 'Catatan pastoral wajib diisi.';
        const l = pst(); l.unshift({id:uid(), ...d, sektor:u.sektor, oleh:u.nama, dibuat:todayS()});
        const e = put('pastoral', l); if (e) return e; renderDash(); say('Catatan pastoral disimpan.');
      });
    },
    pstedit(id) {
      const u = me(), it = pst().find(x => x.id === id); if (!it || !canEdit(u, it)) return;
      openForm('Ubah Catatan Pastoral', F, it, d => {
        d = clean(d); if (!d.catatan) return 'Catatan pastoral wajib diisi.';
        const l = pst(), i = l.findIndex(x => x.id === id); if (i < 0) return 'Data tidak ditemukan.';
        l[i] = {...l[i], ...d, sektor:u.sektor};
        const e = put('pastoral', l); if (e) return e; renderDash(); say('Catatan pastoral diperbarui.');
      });
    },
    pstdel(id) {
      const u = me(), it = pst().find(x => x.id === id); if (!it || !canEdit(u, it) || !confirm('Hapus catatan pastoral ini?')) return;
      const e = put('pastoral', pst().filter(x => x.id !== id)); if (e) return say(e); renderDash(); say('Catatan pastoral dihapus.');
    },
    pstlihat(id) { const u = me(), it = pst().find(x => x.id === id); if (it && canSee(u, it)) lihat(it); }
  });
  $('#dBody').addEventListener('change', e => { const t = e.target; if (t.hasAttribute && t.hasAttribute('data-pst')) { PS.sek = t.value; renderDash(); } });
}

/* ================= PERSETUJUAN INPUT ADMIN SEKTOR, PINDAH SEKTOR & LAPORAN KE SEKRETARIS ================= */
{
  ['jurnalsektor', 'laporsektor'].forEach(k => { if (!MORE.includes(k)) MORE.push(k); });
  const isAS = u => !!u && u.role === 'adminsektor' && !!u.sektor;
  const isAdm = u => !!u && u.role === 'admin';
  const jr = (sektor, aksi, nama, extra) => { const l = DB.get('jurnalsektor', []); l.push({id:uid(), sektor, tanggal:todayS(), aksi, nama, lapor:false, ...extra}); DB.set('jurnalsektor', l); };
  const apvChip = r => !r.apv ? '<small style="color:var(--muted)">-</small>'
    : (r.apv === 'Disetujui' ? chip('disetujui', 'Disetujui') : r.apv === 'Ditolak' ? chip('ditolak', 'Ditolak') : chip('menunggu', 'Menunggu Admin Utama'))
      + (r.apv === 'Disetujui' && r.apvOleh ? `<br><small style="color:var(--muted)">${esc(r.apvOleh)}${r.apvTgl ? ' · ' + esc(fmtD(r.apvTgl)) : ''}</small>` : '')
      + (r.apv === 'Ditolak' && r.apvAlasan ? `<br><small style="color:#b42323">${esc(r.apvAlasan)}</small>` : '');
  /* Data Warga: kolom nama (info pindahan) + kolom persetujuan */
  CFG.warga.cols[0] = {t:'Nama', f:r => `<b>${esc(r.nama)}</b>` + (r.pindahReq && r.pindahReq.status === 'Menunggu' ? `<br><small style="color:#b45309"><i class="fa-solid fa-right-left"></i> Pengajuan pindah ke ${esc(r.pindahReq.tujuan)}: menunggu persetujuan Admin Utama</small>` : '') + (r.pindahReq && r.pindahReq.status === 'Ditolak' ? `<br><small style="color:#b42323">Pindah ke ${esc(r.pindahReq.tujuan)} ditolak${r.pindahReq.alasan ? ': ' + esc(r.pindahReq.alasan) : ''}</small>` : '') + (r.pindahDari ? `<br><small style="color:var(--blue)">Pindahan dari ${esc(r.pindahDari)}${r.tglPindah ? ' · ' + esc(fmtD(r.tglPindah)) : ''}</small>` : '')};
  CFG.warga.cols.push({t:'Persetujuan', f:apvChip});
  CFG.warga.top = data => {
    const u = me(), n = data.filter(x => x.apv === 'Menunggu').length;
    if (isAdm(u)) return `<div class="panel" style="padding:14px 20px;${n ? 'border-left:5px solid #d97706' : ''}"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> Data warga yang ditambah atau diubah Admin Sektor, serta <b>pengajuan pindah sektor</b>, perlu <b>persetujuan Admin Utama</b>. <b>${n}</b> data menunggu persetujuan, <b>${data.filter(x => x.pindahReq && x.pindahReq.status === 'Menunggu').length}</b> pengajuan pindah.</div>`;
    if (isAS(u)) { const t = data.filter(x => x.apv === 'Ditolak').length;
      return `<div class="panel" style="padding:14px 20px"><i class="fa-solid fa-circle-info" style="color:var(--blue)"></i> Data yang Anda tambah atau ubah berstatus <b>Menunggu Persetujuan Admin Utama</b> (${n} menunggu${t ? ', ' + t + ' ditolak: ubah lalu kirim ulang' : ''}). Perpindahan warga ke sektor lain lewat tombol <b>Ajukan pindah</b> dan baru berlaku setelah <b>disetujui Admin Utama</b>; setelah itu otomatis tercatat di laporan Sekretaris. Jangan lupa <b>laporkan inputan ke Sekretaris</b> lewat menu Laporkan ke Sekretaris.</div>`; }
    return '';
  };
  /* Persetujuan otomatis diminta untuk input Admin Sektor; perubahan sektor oleh Admin/Sekretaris otomatis memindahkan data */
  CFG.warga.beforeSave = (d, item) => {
    const u = me();
    if (isAS(u)) {
      Object.assign(d, {apv:'Menunggu', apvOleh:'', apvTgl:'', apvAlasan:'', oleh:u.nama});
      jr(u.sektor, item ? 'Diubah' : 'Baru', d.nama || (item && item.nama) || '-', {wargaId:item ? item.id : '', oleh:u.nama});
    } else if (item && d.sektor && d.sektor !== item.sektor) {
      Object.assign(d, {pindahDari:item.sektor, tglPindah:todayS(), pindahOleh:u ? u.nama : ''});
      d.pindahReq = '';
      autoLapor(item.nama, item.sektor, d.sektor, item.id, u ? u.nama : 'Admin', 'Perpindahan sektor dilakukan langsung oleh ' + (u ? u.nama : 'Admin') + '.');
    }
    return null;
  };
  /* Perpindahan sektor yang sah: otomatis tercatat di Laporan Sekretaris (tanpa menunggu laporan manual) */
  const autoLapor = (nama, dari, ke, wargaId, oleh, catatan) => {
    const tg = todayS(), J = DB.get('jurnalsektor', []), L = DB.get('laporsektor', []);
    [[dari, 'Pindah Keluar', ke], [ke, 'Pindah Masuk', dari]].forEach(([sk, aksi, lawan]) => {
      J.push({id:uid(), sektor:sk, tanggal:tg, aksi, nama, lapor:true, lawan, wargaId, oleh});
      L.unshift({id:uid(), sektor:sk, oleh:'Sistem (' + oleh + ')', tanggal:tg, dibuat:new Date().toISOString(), catatan, status:'Terkirim', auto:true, items:[{aksi, nama, lawan, tanggal:tg, wargaId, sektor:sk}]});
    });
    DB.set('jurnalsektor', J); DB.set('laporsektor', L);
  };
  const modal = html => {
    const o = document.createElement('div'); o.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(17,24,39,.6);display:grid;place-items:center;padding:16px';
    o.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:620px;width:100%;max-height:90vh;overflow:auto;padding:24px">${html}<div style="margin-top:18px;text-align:right"><button class="btn btn-blue btn-sm" data-x>Tutup</button></div></div>`;
    o.onclick = e => { if (e.target === o || e.target.closest('[data-x]')) o.remove(); };
    document.body.appendChild(o);
  };
  const aksiChip = a => chip(a === 'Baru' || a === 'Pindah Masuk' ? 'disetujui' : a === 'Pindah Keluar' ? 'menunggu' : 'ketua', a);
  const lawanTxt = x => x.lawan ? (x.aksi === 'Pindah Keluar' ? ' → ' : ' ← ') + esc(x.lawan) : '';
  const belum = sk => DB.get('jurnalsektor', []).filter(x => x.sektor === sk && !x.lapor);
  const byNew = l => l.slice().sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat)));
  const stLap = x => x.status === 'Diterima' ? chip('disetujui', 'Diterima') + (x.diterimaOleh ? `<br><small style="color:var(--muted)">${esc(x.diterimaOleh)}${x.tglTerima ? ' · ' + esc(fmtD(x.tglTerima)) : ''}</small>` : '') : chip('menunggu', 'Belum Diterima');

  const vLapor = u => {
    const sk = u.sektor, P = belum(sk), R = byNew(DB.get('laporsektor', []).filter(x => x.sektor === sk));
    return note(`Laporkan inputan data warga <b>${esc(sk)}</b> kepada Sekretaris. Satu laporan memuat semua penambahan, perubahan, dan perpindahan warga yang belum pernah dilaporkan.`)
      + `<div class="panel"><div class="tools"><h3 style="margin:0">Belum Dilaporkan (${P.length})</h3><button class="btn btn-gold btn-sm" data-act="lpkirim"${P.length ? '' : ' disabled'}><i class="fa-solid fa-envelope-open-text"></i> Laporkan ke Sekretaris</button></div>`
      + tbl(['Tanggal', 'Warga', 'Aksi'], P.slice().reverse().map(x => `<tr><td>${esc(fmtD(x.tanggal))}</td><td><b>${esc(x.nama)}</b></td><td>${aksiChip(x.aksi)}${lawanTxt(x)}</td></tr>`), 'Semua inputan sudah dilaporkan.') + '</div>'
      + `<div class="panel"><h3 style="margin-bottom:12px">Riwayat Laporan</h3>`
      + tbl(['Tanggal', 'Jumlah Inputan', 'Status', ''], R.map(x => `<tr><td>${esc(fmtD(x.tanggal))}</td><td>${x.items.length}</td><td>${stLap(x)}</td><td><button class="ib" data-act="lplihat" data-id="${x.id}" title="Lihat isi laporan"><i class="fa-solid fa-eye"></i></button></td></tr>`), 'Belum ada laporan terkirim.') + '</div>';
  };
  const vLaporMasuk = u => {
    const R = byNew(DB.get('laporsektor', [])), n = R.filter(x => x.status !== 'Diterima').length, sek = u.role === 'sekretaris';
    return note(`Laporan inputan data warga dari Admin Sektor. <b>${n}</b> laporan belum ditandai diterima.${sek ? '' : ' Anda hanya dapat melihat.'}`)
      + `<div class="panel"><div class="tools">${search('Cari sektor / pengirim...')}</div>`
      + tbl(['Tanggal', 'Sektor', 'Dikirim oleh', 'Inputan', 'Status', ''], R.map(x => `<tr><td>${esc(fmtD(x.tanggal))}</td><td><b>${esc(x.sektor)}</b></td><td>${esc(x.oleh || '-')}</td><td>${x.items.length}</td><td>${stLap(x)}</td><td style="white-space:nowrap"><button class="ib" data-act="lplihat" data-id="${x.id}" title="Lihat isi laporan"><i class="fa-solid fa-eye"></i></button>${sek && x.status !== 'Diterima' ? `<button class="ib grn" data-act="lpterima" data-id="${x.id}" title="Tandai diterima"><i class="fa-solid fa-check"></i></button>` : ''}</td></tr>`), 'Belum ada laporan dari sektor.') + '</div>';
  };
  MENU.splice(MENU.findIndex(m => m.id === 'warga') + 1, 0,
    {id:'laporsektor', label:'Laporkan ke Sekretaris', icon:'envelope-open-text', roles:['adminsektor']},
    {id:'lapormasuk', label:'Laporan dari Sektor', icon:'envelope-open-text', roles:['sekretaris', 'admin']});
  VIEWS.laporsektor = vLapor; VIEWS.lapormasuk = vLaporMasuk;

  Object.assign(ACT, {
    wgapp(id) {
      const u = me(); if (!isAdm(u) || cur !== 'warga') return;
      const l = DB.get('warga', []), x = l.find(y => y.id === id); if (!x || x.apv !== 'Menunggu') return;
      Object.assign(x, {apv:'Disetujui', apvOleh:u.nama, apvTgl:todayS(), apvAlasan:''});
      const e = put('warga', l); if (e) return say(e); renderDash(); say('Data warga disetujui.'); logA('Setujui', 'Data Warga', x.nama);
    },
    wgrej(id) {
      const u = me(); if (!isAdm(u) || cur !== 'warga') return;
      const l = DB.get('warga', []), x = l.find(y => y.id === id); if (!x || x.apv !== 'Menunggu') return;
      const al = prompt('Alasan penolakan (opsional, terlihat oleh Admin Sektor):', ''); if (al === null) return;
      Object.assign(x, {apv:'Ditolak', apvOleh:u.nama, apvTgl:todayS(), apvAlasan:String(al).trim()});
      const e = put('warga', l); if (e) return say(e); renderDash(); say('Data warga ditolak.'); logA('Tolak', 'Data Warga', x.nama);
    },
    wgpindah(id) {
      const u = me(), it = DB.get('warga', []).find(x => x.id === id); if (!isAS(u) || !it || it.sektor !== u.sektor) return;
      if (it.pindahReq && it.pindahReq.status === 'Menunggu') return say('Pengajuan pindah ' + it.nama + ' masih menunggu persetujuan Admin Utama.');
      openForm('Ajukan Pindah Sektor: ' + it.nama, [{k:'tujuan', l:'Pindah ke', t:'select', o:SEKTOR.filter(x => x !== u.sektor)}, {k:'alasan', l:'Alasan pindah (opsional)', t:'textarea', rows:2}], {}, d => {
        const l = DB.get('warga', []), x = l.find(y => y.id === id); if (!x || x.sektor !== u.sektor) return 'Data tidak ditemukan di sektor Anda.';
        x.pindahReq = {tujuan:d.tujuan, dari:x.sektor, alasanPindah:clean(d).alasan || '', oleh:u.nama, tgl:todayS(), status:'Menunggu'};
        const e = put('warga', l); if (e) return e; renderDash(); say('Pengajuan pindah ke ' + d.tujuan + ' dikirim. Menunggu persetujuan Admin Utama.'); logA('Ajukan', 'Pindah Sektor', x.nama + ': ' + x.sektor + ' → ' + d.tujuan);
      });
    },
    wgpvapp(id) {
      const u = me(); if (!isAdm(u) || cur !== 'warga') return;
      const l = DB.get('warga', []), x = l.find(y => y.id === id); if (!x || !x.pindahReq || x.pindahReq.status !== 'Menunggu') return;
      const dari = x.sektor, ke = x.pindahReq.tujuan;
      Object.assign(x, {sektor:ke, pindahDari:dari, tglPindah:todayS(), pindahOleh:x.pindahReq.oleh, pindahReq:null});
      const e = put('warga', l); if (e) return say(e);
      autoLapor(x.nama, dari, ke, x.id, u.nama, 'Perpindahan sektor disetujui Admin Utama (' + u.nama + ').');
      renderDash(); say(x.nama + ' dipindahkan ke ' + ke + '. Laporan Sekretaris diperbarui otomatis.'); logA('Pindah', 'Data Warga', x.nama + ': ' + dari + ' → ' + ke);
    },
    wgpvrej(id) {
      const u = me(); if (!isAdm(u) || cur !== 'warga') return;
      const l = DB.get('warga', []), x = l.find(y => y.id === id); if (!x || !x.pindahReq || x.pindahReq.status !== 'Menunggu') return;
      const al = prompt('Alasan penolakan pindah sektor (opsional):', ''); if (al === null) return;
      Object.assign(x.pindahReq, {status:'Ditolak', alasan:String(al).trim()});
      const e = put('warga', l); if (e) return say(e); renderDash(); say('Pengajuan pindah ditolak.'); logA('Tolak', 'Pindah Sektor', x.nama);
    },
    lpkirim() {
      const u = me(); if (!isAS(u)) return; if (!belum(u.sektor).length) return say('Tidak ada inputan baru untuk dilaporkan.');
      openForm('Laporkan ke Sekretaris', [{k:'catatan', l:'Catatan untuk Sekretaris (opsional)', t:'textarea', rows:3}], {}, d => {
        const J = DB.get('jurnalsektor', []), items = J.filter(x => x.sektor === u.sektor && !x.lapor); if (!items.length) return 'Tidak ada inputan baru untuk dilaporkan.';
        const L = DB.get('laporsektor', []);
        L.unshift({id:uid(), sektor:u.sektor, oleh:u.nama, tanggal:todayS(), dibuat:new Date().toISOString(), catatan:clean(d).catatan || '', status:'Terkirim', items:items.map(x => ({aksi:x.aksi, nama:x.nama, lawan:x.lawan || '', tanggal:x.tanggal, wargaId:x.wargaId || '', sektor:x.sektor}))});
        items.forEach(x => { x.lapor = true; });
        let e = put('laporsektor', L); if (e) return e; e = put('jurnalsektor', J); if (e) return e;
        renderDash(); say('Laporan terkirim ke Sekretaris.'); logA('Tambah', 'Laporan Sektor', u.sektor + ' (' + items.length + ' inputan)');
      });
    },
    lplihat(id) {
      const u = me(), r = DB.get('laporsektor', []).find(x => x.id === id); if (!u || !r) return;
      if (!(['sekretaris', 'admin'].includes(u.role) || (isAS(u) && r.sektor === u.sektor))) return;
      const W = DB.get('warga', []), st = x => { const w = W.find(y => y.id === x.wargaId) || W.find(y => y.nama === x.nama && y.sektor === x.sektor); return w && w.apv ? apvChip(w) : '<small style="color:var(--muted)">-</small>'; };
      modal(`<h3 style="margin:0 0 4px">Laporan ${esc(r.sektor)}</h3><small style="color:var(--muted)">${esc(fmtD(r.tanggal))} · oleh ${esc(r.oleh || '-')}</small><div style="margin:10px 0">${stLap(r)}</div>${r.catatan ? `<p style="white-space:pre-wrap;margin:0 0 12px"><b>Catatan:</b> ${esc(r.catatan)}</p>` : ''}`
        + tbl(['Tanggal', 'Warga', 'Aksi', 'Persetujuan Admin Utama'], r.items.map(x => `<tr><td>${esc(fmtD(x.tanggal))}</td><td><b>${esc(x.nama)}</b></td><td>${aksiChip(x.aksi)}${lawanTxt(x)}</td><td>${st(x)}</td></tr>`), ''));
    },
    lpterima(id) {
      const u = me(); if (!u || u.role !== 'sekretaris') return;
      const L = DB.get('laporsektor', []), r = L.find(x => x.id === id); if (!r || r.status === 'Diterima') return;
      Object.assign(r, {status:'Diterima', diterimaOleh:u.nama, tglTerima:todayS()});
      const e = put('laporsektor', L); if (e) return say(e); renderDash(); say('Laporan ditandai diterima.'); logA('Ubah', 'Laporan Sektor', r.sektor + ' (diterima)');
    }
  });
}

window.GPM = {me, openForm, say, esc, rek:() => ACT.rek(), agenda:(a, id) => { const o = cur; cur = 'agenda'; try { ACT[a](id); } finally { cur = o; } },
  crud:(v, a, id) => { const o = cur; cur = v; try { ACT[a](id); } finally { cur = o; } }};
document.getElementById('rekEdit').onclick = () => ACT.rek();
document.getElementById('pntAdd').onclick = () => GPM.crud('panitia', 'add');
document.getElementById('pntGrid').addEventListener('click', e => { const b = e.target.closest('[data-pnt]'); if (b) GPM.crud('panitia', b.dataset.pnt, b.dataset.id); });
renderPanitia();
document.getElementById('fbAdd').onclick = () => GPM.crud('fotobangun', 'add');
document.getElementById('fbGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-fb]');
  if (b) return GPM.crud('fotobangun', b.dataset.fb, b.dataset.id);
  const im = e.target.closest('.fb-item img'); if (!im) return;
  const o = document.createElement('div'); o.className = 'fb-box'; o.innerHTML = '<img alt="">'; o.firstChild.src = im.src; o.onclick = () => o.remove(); document.body.appendChild(o);
});
refreshNav();
})();

/* ================= PROFIL: SEJARAH, STRUKTUR, WILAYAH ================= */
(() => {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'gpm_profil';
const DEF = {
  sejarah: 'Jemaat Gereja Beth Eden berdiri sejak tahun 1935 dan berada di Desa Tihulale, Kecamatan Amalatu, Kabupaten Seram Bagian Barat, Provinsi Maluku, sebagai bagian dari Gereja Protestan Maluku (GPM).\n\nSejak awal berdirinya, jemaat terus bertumbuh dalam ibadah, pelayanan, perayaan hari besar gerejawi, dan pembangunan fasilitas jemaat.',
  visi: 'Menjadi jemaat yang hidup dalam kasih Kristus, bersekutu, bersaksi, dan melayani.',
  misi: 'Menyelenggarakan ibadah dan pembinaan iman warga jemaat.\nMemperkuat persekutuan antarwarga dan antarsektor.\nMelayani sesama dan masyarakat sekitar dengan kasih.\nMenyelesaikan pembangunan gedung gereja baru secara gotong royong.',
  struktur: 'Ketua Majelis Jemaat | \nWakil Ketua | \nSekretaris | \nBendahara | \nSeksi Ibadah | \nSeksi Diakonia | \nSeksi Pembangunan | \nSeksi Pemuda',
  alamat: 'Desa Tihulale, Kecamatan Amalatu, Kabupaten Seram Bagian Barat, Provinsi Maluku.',
  sektor: 'Sektor Sion\nSektor Galelia\nSektor Ebenhaezer\nSektor Getsemany\nSektor Tiberias\nSektor Betlehem'
};
const load = () => { try { return {...DEF, ...(JSON.parse(localStorage.getItem(KEY)) || {})}; } catch { return {...DEF}; } };
const lines = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const isAdmin = () => { try { const u = window.GPM && GPM.me(); return u && u.role === 'admin'; } catch { return false; } };
let current = null;

const VIEW = {
  sejarah: {icon:'book-bible', title:'Sejarah & Visi Misi', html: d => `
    <h4>Sejarah Singkat</h4><p>${esc(d.sejarah)}</p>
    <h4>Visi</h4><p>${esc(d.visi)}</p>
    <h4>Misi</h4><ol>${lines(d.misi).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`,
    fields: d => [{k:'sejarah', l:'Sejarah Singkat', t:'textarea'}, {k:'visi', l:'Visi', t:'textarea'}, {k:'misi', l:'Misi (satu baris per poin)', t:'textarea'}]},
  struktur: {icon:'sitemap', title:'Struktur Kepengurusan', html: d => {
    const rows = lines(d.struktur).map(l => { const [j, ...n] = l.split('|'); return {j:j.trim(), n:n.join('|').trim()}; });
    const node = (r, top) => `<div class="nd${top ? ' top' : ''}"><b>${esc(r.j)}</b><small>${esc(r.n || '(belum diisi)')}</small></div>`;
    if (!rows.length) return '<p>Belum ada data kepengurusan.</p>';
    const head = rows.slice(0, 4), rest = rows.slice(4);
    return `<p style="margin-bottom:14px">Majelis Pekerja Harian (MPH) dan Badan Pekerja yang melayani jemaat.</p><div class="org">
      ${head.map((r, i) => (i ? '<div class="ln"></div>' : '') + node(r, i === 0)).join('')}
      ${rest.length ? '<div class="ln"></div><div class="sub">' + rest.map(r => node(r)).join('') + '</div>' : ''}</div>
      <div class="note2">${isAdmin() ? '' : 'Nama pengurus dapat diperbarui oleh Admin jemaat.'}</div>`; },
    fields: d => [{k:'struktur', l:'Pengurus (satu baris: Jabatan | Nama). 4 baris pertama tampil berurutan, sisanya sebagai seksi.', t:'textarea', rows:10}]},
  peta: {icon:'map-location-dot', title:'Wilayah Pelayanan', html: d => {
    const q = encodeURIComponent('Tihulale, Amalatu, Seram Bagian Barat, Maluku');
    return `<h4>Lokasi</h4><p>${esc(d.alamat)}</p>
      <iframe class="map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Peta Desa Tihulale"
        src="https://maps.google.com/maps?q=${q}&output=embed&z=12"></iframe>
      <div class="ibtns" style="margin:0 0 8px"><a class="btn btn-blue btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${q}"><i class="fa-solid fa-location-arrow"></i> Buka di Google Maps</a></div>
      <h4>Sektor Pelayanan</h4><ul>${lines(d.sektor).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; },
    fields: d => [{k:'alamat', l:'Alamat / Wilayah', t:'textarea'}, {k:'sektor', l:'Daftar Sektor (satu baris per sektor)', t:'textarea'}]}
};

function show(key) {
  const v = VIEW[key]; if (!v) return; current = key;
  const d = load();
  $b.innerHTML = `<div class="ihead"><div class="ic"><i class="fa-solid fa-${v.icon}"></i></div><h3>${v.title}</h3></div>${v.html(d)}
    ${isAdmin() ? '<div class="ibtns"><button class="btn btn-blue btn-sm" id="infoEdit"><i class="fa-solid fa-pen"></i> Ubah Konten</button></div>' : ''}`;
  $m.classList.add('open');
  const e = document.getElementById('infoEdit'); if (e) e.onclick = edit;
}
function edit() {
  if (!isAdmin()) return;
  const v = VIEW[current], d = load();
  const fields = v.fields(d);
  $m.classList.remove('open');
  GPM.openForm('Ubah: ' + v.title, fields, d, x => {
    const n = load(); fields.forEach(f => n[f.k] = x[f.k]);
    localStorage.setItem(KEY, JSON.stringify(n)); GPM.say('Konten diperbarui.'); show(current);
  });
}

const $m = document.getElementById('infoModal'), $b = document.getElementById('infoBody');
document.addEventListener('click', e => {
  const c = e.target.closest('.card[data-info]'); if (!c) return;
  e.preventDefault(); show(c.dataset.info);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card[data-info]')) { e.preventDefault(); show(e.target.dataset.info); }
});
$m.addEventListener('transitionend', () => {});
// Hentikan peta saat modal ditutup
new MutationObserver(() => { if (!$m.classList.contains('open')) $b.innerHTML = ''; }).observe($m, {attributes:true, attributeFilter:['class']});
})();

/* ================= AGENDA & KEGIATAN (tampilan publik) ================= */
(() => {
'use strict';
const KEY = 'gpm_agenda';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEF = [
  {id:'d1', judul:'Ibadah Raya Minggu', kategori:'Jadwal Ibadah', waktu:'Setiap Minggu, 09.00 WIT', deskripsi:'Ibadah raya jemaat setiap hari Minggu. Seluruh warga jemaat diundang hadir.'},
  {id:'d2', judul:'Perayaan Natal Jemaat', kategori:'Hari Besar', waktu:'25 Desember', deskripsi:'Persiapan ibadah dan perayaan Natal bersama seluruh sektor pelayanan.'},
  {id:'d3', judul:'Kerja Bakti Gedung Gereja', kategori:'Pembangunan', waktu:'Sabtu, Pukul 08.00', deskripsi:'Gotong royong seluruh warga untuk menunjang pembangunan gedung gereja baru.'},
  {id:'d4', judul:'Latihan Paduan Suara', kategori:'Pelayanan', waktu:'Setiap Kamis, 19.00 WIT', deskripsi:'Latihan rutin paduan suara jemaat. Terbuka bagi pemuda dan orang dewasa.'}
];
const STY = {'Jadwal Ibadah':['t1','b1','people-group'], 'Hari Besar':['t2','b2','star'], 'Pembangunan':['t3','b3','hands-holding-circle'],
  'Pelayanan':['t4','b4','music'], 'Pengumuman':['t5','b5','bullhorn']};
try { if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, JSON.stringify(DEF)); } catch {}
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : DEF; } catch { return DEF; } };
const isStaff = () => { try { const u = window.GPM && GPM.me(); return !!u && (u.role === 'admin' || u.role === 'ketua'); } catch { return false; } };
const isSek = () => { try { const u = window.GPM && GPM.me(); return !!u && u.role === 'adminsektor' && !!u.sektor; } catch { return false; } };
const canSk = a => { try { const u = GPM.me(); return !!u && (u.role === 'admin' || u.role === 'ketua' || (u.role === 'adminsektor' && u.sektor === a.sektor)); } catch { return false; } };
const loadSk = () => { try { const v = JSON.parse(localStorage.getItem('gpm_agendasektor')); return Array.isArray(v) ? v.filter(x => x && x.tayang === 'Ya' && x.status === 'Disetujui').map(x => ({...x, _sk:1})) : []; } catch { return []; } };
const okImg = u => /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u || '');
const slider = document.getElementById('slider'), addBtn = document.getElementById('agAdd');

window.renderAgenda = function () {
  const list = [...load(), ...loadSk()], st = isStaff(), sk = isSek();
  addBtn.hidden = !(st || sk);
  addBtn.innerHTML = sk ? '<i class="fa-solid fa-plus"></i> Tambah Agenda Sektor' : '<i class="fa-solid fa-plus"></i> Tambah Agenda';
  if (!list.length) { slider.innerHTML = '<div class="ag-empty"><i class="fa-regular fa-calendar" style="font-size:34px"></i><p>Belum ada agenda atau kegiatan.</p></div>'; return; }
  slider.innerHTML = list.map(a => {
    const [t, b, ic] = STY[a.kategori] || STY['Pelayanan'];
    return `<article class="news">
      ${(a._sk ? canSk(a) : st) ? `<div class="adm"><button data-ag="edit" ${a._sk ? 'data-sk="1"' : ''} data-id="${esc(a.id)}" title="Ubah" aria-label="Ubah"><i class="fa-solid fa-pen"></i></button><button class="red" data-ag="del" ${a._sk ? 'data-sk="1"' : ''} data-id="${esc(a.id)}" title="Hapus" aria-label="Hapus"><i class="fa-solid fa-trash"></i></button></div>` : ''}
      <div class="thumb ${t}"><i class="fa-solid fa-${ic}"></i>${okImg(a.foto) ? `<img src="${a.foto}" alt="${esc(a.judul)}" loading="lazy">` : ''}<span class="badge ${b}">${esc(a.kategori)}</span></div>
      <div class="body"><div class="date"><i class="fa-regular fa-calendar"></i> ${esc(a.waktu)}</div>
        ${a._sk && a.sektor ? `<div class="date" style="color:#047857;font-weight:600"><i class="fa-solid fa-people-roof"></i> ${esc(a.sektor)}</div>` : ''}
        <h5>${esc(a.judul)}</h5><p>${esc(a.deskripsi)}</p></div></article>`;
  }).join('');
};
addBtn.addEventListener('click', () => isSek() ? GPM.crud('agendasektor', 'add') : GPM.agenda('add'));
slider.addEventListener('click', e => {
  const b = e.target.closest('[data-ag]'); if (!b) return; if (b.dataset.sk) GPM.crud('agendasektor', b.dataset.ag, b.dataset.id); else GPM.agenda(b.dataset.ag, b.dataset.id);
});
renderAgenda();
})();

/* ================= RENUNGAN HARIAN (tampilan publik) ================= */
(() => {
'use strict';
const KEY = 'gpm_renungan';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmt = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'}); } catch { return d; } };
const SEED = [{id:'r1', tanggal:today(), judul:'Tuhan adalah Gembalaku', ayat:'Mazmur 23:1',
  teks:'TUHAN adalah gembalaku, takkan kekurangan aku.',
  isi:'Seorang gembala mengenal setiap dombanya, menuntun ke padang rumput yang hijau dan menjaga dari bahaya.\n\nDalam setiap musim hidup, entah penuh sukacita atau penuh pergumulan, kita tidak berjalan sendirian. Tuhan setia menuntun dan mencukupkan kebutuhan kita.\n\nHari ini, percayakan langkah Anda kepada Gembala yang baik.',
  doa:'Tuhan Yesus, terima kasih sebab Engkau menuntun dan mencukupkan kami. Ajar kami percaya sepenuhnya kepada-Mu. Amin.',
  penulis:'Majelis Jemaat Gereja Beth Eden'}];
try { if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, JSON.stringify(SEED)); } catch {}
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; } };
const isStaff = () => { try { const u = window.GPM && GPM.me(); return !!u && ['admin', 'ketua'].includes(u.role); } catch { return false; } };
const view = document.getElementById('rnView'), adm = document.getElementById('rnAdm');
let idx = null;

window.renderRenungan = function () {
  const list = load().slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal)); // terbaru dulu
  adm.hidden = !isStaff();
  const has = list.length > 0;
  document.getElementById('rnEdit').hidden = document.getElementById('rnDel').hidden = !has;
  if (!has) {
    view.innerHTML = '<div class="rn-card"><div class="rn-empty"><i class="fa-solid fa-book-open"></i><p>Belum ada renungan.</p></div></div>';
    return;
  }
  if (idx === null || idx >= list.length) { const t = today(); idx = list.findIndex(r => r.tanggal <= t); if (idx < 0) idx = list.length - 1; }
  const r = list[idx];
  window.__rnCurrent = r.id;
  view.innerHTML = `<article class="rn-card">
    <div class="rn-top"><div class="rn-date"><i class="fa-regular fa-calendar"></i> ${esc(fmt(r.tanggal))}</div><h4>${esc(r.judul)}</h4></div>
    <div class="rn-body">
      <div class="rn-ayat"><b><i class="fa-solid fa-book-bible"></i> ${esc(r.ayat)}</b>${r.teks ? `<p>${esc(r.teks)}</p>` : ''}</div>
      <div class="rn-isi">${esc(r.isi)}</div>
      ${r.doa ? `<div class="rn-doa"><b><i class="fa-solid fa-hands-praying"></i> Doa</b><p>${esc(r.doa)}</p></div>` : ''}
      ${r.penulis ? `<div class="rn-by"><i class="fa-solid fa-pen-nib"></i> ${esc(r.penulis)}</div>` : ''}
    </div></article>
    <div class="rn-nav">
      <button id="rnPrev" ${idx >= list.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> Sebelumnya</button>
      <span>${idx + 1} dari ${list.length}</span>
      <button id="rnNext" ${idx <= 0 ? 'disabled' : ''}>Berikutnya <i class="fa-solid fa-chevron-right"></i></button>
    </div>`;
  document.getElementById('rnPrev').onclick = () => { idx++; renderRenungan(); };
  document.getElementById('rnNext').onclick = () => { idx--; renderRenungan(); };
};
document.getElementById('rnAdd').onclick = () => { idx = null; GPM.crud('renungan', 'add'); };
document.getElementById('rnEdit').onclick = () => { if (window.__rnCurrent) GPM.crud('renungan', 'edit', window.__rnCurrent); };
document.getElementById('rnDel').onclick = () => { if (window.__rnCurrent) { idx = null; GPM.crud('renungan', 'del', window.__rnCurrent); } };
renderRenungan();
})();

/* ================= BULETIN JEMAAT PDF (tampilan publik) ================= */
(() => {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const okPdf = u => /^data:application\/pdf;base64,[A-Za-z0-9+\/=]+$/.test(u || '');
const load = () => { try { const v = JSON.parse(localStorage.getItem('gpm_buletin')); return Array.isArray(v) ? v : []; } catch { return []; } };
const fmt = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}); } catch { return d || ''; } };
const toBlob = u => { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], {type:'application/pdf'}); };
const sec = document.getElementById('buletin'), grid = document.getElementById('blGrid'), navA = document.querySelector('#nav a[href="#buletin"]');
let url = null;
function tutup() { const o = document.getElementById('blView'); if (o) o.remove(); if (url) { URL.revokeObjectURL(url); url = null; } }
window.renderBuletin = function () {
  const L = load().filter(x => x && x.status === 'Terbit' && okPdf(x.pdf)).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
  sec.hidden = !L.length; if (navA) navA.parentElement.hidden = !L.length;
  grid.innerHTML = L.map(r => `<article class="bl-card"><div class="bl-ic"><i class="fa-solid fa-file-pdf"></i></div><div class="bl-b"><small>${fmt(r.tanggal)}</small><h5>${esc(r.judul)}</h5>${r.deskripsi ? `<p>${esc(r.deskripsi)}</p>` : ''}<div class="bl-btn"><button class="btn btn-blue btn-sm" data-bl="baca" data-id="${esc(r.id)}"><i class="fa-solid fa-book-open"></i> Baca</button><button class="btn btn-gold btn-sm" data-bl="unduh" data-id="${esc(r.id)}"><i class="fa-solid fa-download"></i> Unduh PDF</button></div></div></article>`).join('');
};
window.blOpen = function (id, dl) {
  const r = load().find(x => x.id === id); if (!r || !okPdf(r.pdf)) return;
  if (dl) { const a = document.createElement('a'), u = URL.createObjectURL(toBlob(r.pdf)); a.href = u; a.download = (r.judul || 'buletin').replace(/[^\w\-]+/g, '-') + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); return; }
  tutup(); url = URL.createObjectURL(toBlob(r.pdf));
  const o = document.createElement('div'); o.id = 'blView'; o.className = 'bl-view';
  o.innerHTML = `<div class="bl-bar"><b>${esc(r.judul)}</b><span><button class="btn btn-gold btn-sm" data-bl="unduh2"><i class="fa-solid fa-download"></i> Unduh</button> <button class="btn btn-blue btn-sm" data-bl="tutup"><i class="fa-solid fa-xmark"></i> Tutup</button></span></div><iframe title="${esc(r.judul)}"></iframe>`;
  o.querySelector('iframe').src = url; document.body.appendChild(o);
  o.addEventListener('click', e => { const b = e.target.closest('[data-bl]'); if (!b) return; if (b.dataset.bl === 'tutup') tutup(); if (b.dataset.bl === 'unduh2') blOpen(id, true); });
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') tutup(); });
grid.addEventListener('click', e => { const b = e.target.closest('[data-bl]'); if (b) blOpen(b.dataset.id, b.dataset.bl === 'unduh'); });
renderBuletin();
})();

/* ================= SALDO MASUK & KELUAR (tampilan publik) ================= */
(() => {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp = n => 'Rp ' + (+n || 0).toLocaleString('id-ID');
const n0 = v => +v || 0;
const load = () => { try { const v = JSON.parse(localStorage.getItem('gpm_saldopub')); return Array.isArray(v) ? v : []; } catch { return []; } };
const fmt = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}); } catch { return d || ''; } };
const T = [['minggu', 'Mingguan'], ['bulan', 'Bulanan'], ['tahun', 'Tahunan']];
const sec = document.getElementById('saldo'), grid = document.getElementById('spGrid'), tabsEl = document.getElementById('spTabs'), navA = document.querySelector('#nav a[href="#saldo"]');
let aktif = null;
const card = r => { const m = n0(r.masuk), k = n0(r.keluar), tot = m + k, pct = tot ? Math.round(m / tot * 100) : 0;
  const rw = (a, b) => `<div class="sp-row"><span>${a}</span><b>${rp(b)}</b></div>`;
  return `<article class="sp-card"><small>Diperbarui ${esc(fmt(r.tanggal))}</small><h5>${esc(r.label)}</h5>
    <div class="sp-row sp-in"><span><i class="fa-solid fa-arrow-down"></i> Saldo Masuk</span><b>${rp(m)}</b></div>
    <div class="sp-row sp-out"><span><i class="fa-solid fa-arrow-up"></i> Saldo Keluar</span><b>${rp(k)}</b></div>
    <div class="sp-bar" title="Porsi masuk ${pct}%"><i style="width:${pct}%"></i></div>
    <div class="sp-row"><span>Selisih periode</span><b>${rp(r.selisih)}</b></div>
    <div class="sp-bal"><span>Saldo kas akhir periode</span><b>${rp(r.saldoAkhir)}</b></div>
    <details><summary>Lihat rincian</summary>${rw('Kolekte &amp; penerimaan ibadah', n0(r.kol))}${rw('Persepuluhan (total)', n0(r.tit))}${rw('Pengeluaran belanja', n0(r.bel))}${rw('Setoran sentralisasi', n0(r.set))}${rw('Dana tanggap darurat', n0(r.dar))}</details></article>`; };
window.renderSaldoPub = function () {
  const all = load().filter(x => x && x.status === 'Terbit' && T.some(t => t[0] === x.tipe));
  sec.hidden = !all.length; if (navA) navA.parentElement.hidden = !all.length;
  if (!all.length) { grid.innerHTML = ''; tabsEl.innerHTML = ''; return; }
  const ada = T.filter(t => all.some(x => x.tipe === t[0]));
  if (!ada.some(t => t[0] === aktif)) aktif = ada[0][0];
  tabsEl.innerHTML = ada.map(t => `<button class="${t[0] === aktif ? 'on' : ''}" data-sp="${t[0]}">${t[1]}</button>`).join('');
  grid.innerHTML = all.filter(x => x.tipe === aktif).sort((a, b) => String(b.sampai).localeCompare(String(a.sampai))).slice(0, 12).map(card).join('');
};
tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b) { aktif = b.dataset.sp; renderSaldoPub(); } });
renderSaldoPub();
})();
