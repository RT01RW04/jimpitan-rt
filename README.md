# 🌐 Menjadikan Jimpitan Ronda Online lewat GitHub

Versi 1.7.0 · gratis selamanya · tanpa server, tanpa biaya bulanan

Sesudah langkah di panduan ini selesai, RT Bapak/Ibu punya **dua alamat web**:

| Alamat | Untuk siapa | Isinya |
|---|---|---|
| `https://namaanda.github.io/jimpitan-rt/` | **Pengurus / petugas ronda** | Aplikasinya sendiri — scan, catat, rekap. Bisa dipasang ke layar HP seperti aplikasi biasa. Jalan di Android **dan** iPhone. |
| `https://namaanda.github.io/jimpitan-rt/warga/` | **Semua warga** | Halaman laporan terbuka: terkumpul malam ini, siapa sudah/belum setor, rekap bulan, saldo kas. Cukup dibuka, tidak perlu pasang apa pun. |

Yang diunggah adalah isi folder **`jimpitan-web/`** di ruang kerja ini.

---

## Bagian 1 — Mengunggah ke GitHub (±10 menit, sekali saja)

### Langkah 1. Buat akun GitHub

1. Buka **github.com** → tekan **Sign up**.
2. Isi e-mail, password, nama pengguna (ini akan jadi bagian alamat web — pilih yang pendek dan sopan, misal `rt01margorejo`).
3. Buka e-mail, masukkan kode verifikasi. Akun gratis sudah cukup.

### Langkah 2. Buat repositori

1. Tekan tanda **+** di kanan atas → **New repository**.
2. **Repository name**: `jimpitan-rt`
3. Pilih **Public**.
   *Ini wajib supaya halaman web bisa dibuka warga. Lihat catatan privasi di bagian 4.*
4. Jangan centang apa pun yang lain → tekan **Create repository**.

### Langkah 3. Unggah berkas aplikasi

1. Di halaman repositori baru itu, tekan tautan **uploading an existing file**.
2. Buka folder `jimpitan-web` di komputer, **blok semua isinya** (berkas *dan* folder `ikon`, `lib`, `warga`, `data`) lalu **seret ke jendela GitHub**.

   > ⚠️ Yang diseret adalah **isi** folder `jimpitan-web`, bukan foldernya.
   > Kalau benar, `index.html` berada di tingkat paling atas repositori.

3. Tunggu sampai semua berkas terdaftar (±14 berkas), lalu tekan **Commit changes**.

### Langkah 4. Nyalakan GitHub Pages

1. Masuk ke tab **Settings** repositori → menu kiri **Pages**.
2. Bagian *Build and deployment* → **Source: Deploy from a branch**.
3. **Branch**: pilih **main**, folder **/ (root)** → tekan **Save**.
4. Tunggu **1–3 menit**, lalu segarkan halaman itu. Akan muncul tulisan:
   *“Your site is live at https://namaanda.github.io/jimpitan-rt/”*

Selesai. Alamat itulah aplikasinya.

### Langkah 5. Pasang di HP pengurus

- **Android (Chrome)**: buka alamatnya → menu ⋮ → **Tambahkan ke layar utama**.
- **iPhone (Safari)**: buka alamatnya → tombol **Bagikan** → **Tambahkan ke Layar Utama**.

Sesudah itu ikonnya duduk di layar HP persis seperti aplikasi biasa, dan **tetap jalan walau sinyal hilang** di tengah ronda.

---

## Bagian 2 — Menyambungkan aplikasi ke halaman warga

Sekali saja, di HP petugas ronda:

1. Buka aplikasi → tab **Atur**.
2. Cari bagian **Halaman web untuk warga**.
3. Isi **Alamat situs RT** dengan alamat tadi, contoh:
   `https://namaanda.github.io/jimpitan-rt/`
4. Keluar dari kolom isian. Akan muncul alamat halaman warga berwarna hijau — tandanya sudah tersambung.

Langkah ini berlaku untuk **versi web maupun APK**. Kalau tetap memakai APK, laporannya tetap bisa menunjuk ke halaman web.

---

## Bagian 3 — Cara memakainya tiap malam

1. Catat jimpitan seperti biasa (scan / manual).
2. Tekan **Kirim laporan ke WhatsApp**.
3. Di layar pratinjau akan muncul keterangan *“🔗 Tautan warga siap — ikut terkirim ke grup.”*
4. Tekan **Kirim ke WhatsApp** → pilih **grup RT** → kirim.

Warga menerima pesan seperti biasa, ditambah satu tautan di bawahnya:

```
🔗 Lihat rincian lengkap di web:
https://namaanda.github.io/jimpitan-rt/warga/#z8KmPc...
```

Warga cukup **menekan tautan itu** — langsung terbuka halaman rapi berisi:

- jumlah terkumpul malam itu + persentase pencapaian,
- daftar rumah yang **sudah** setor beserta jam dan nominalnya,
- daftar rumah yang **belum** setor,
- status **borongan bulanan** (lunas / belum),
- **rekap bulan ini** per malam,
- **saldo kas** lengkap dengan pemasukan & pengeluaran,
- keaktifan **tiap rumah** sebulan.

> **Penting dipahami:** seluruh isi laporan **menempel di dalam tautan itu sendiri**
> (bagian panjang sesudah tanda `#`). Jadi tidak ada data yang disimpan di server mana pun,
> dan tautan lama tetap menampilkan laporan lama — cocok untuk arsip grup WA.

---

## Bagian 4 — Catatan privasi (mohon dibaca)

- Repositori **Public** berarti **berkas aplikasinya** bisa dilihat siapa saja. Itu wajar — isinya memang hanya program, **bukan data warga**.
- **Data jimpitan tidak ikut terunggah** selama Bapak/Ibu hanya memakai cara tautan. Datanya tetap di HP petugas.
- Tautan laporan memang memuat **nama KK dan nominal setoran** — itu tujuannya, supaya transparan. Tapi tautan hanya sampai ke orang yang menerimanya di grup.
- Yang **tidak pernah** ikut dibagikan: kode barcode tiap rumah, isi pengaturan, token, dan seluruh basis data mentah. *(Ini diuji otomatis setiap rilis.)*
- Kalau ada warga keberatan namanya tampil, matikan saja **Sertakan rincian di WA** di tab Atur — laporan akan memuat angka totalnya saja.

---

## Bagian 5 — (Pilihan) Satu alamat tetap yang selalu terbarui

Kalau Bapak/Ibu ingin warga cukup **menyimpan satu alamat** (`.../warga/`) dan selalu melihat laporan terbaru tanpa menunggu tautan baru, aplikasi bisa **menerbitkan sendiri** laporannya ke GitHub.

Perlu **token** sekali atur:

1. Di GitHub tekan foto profil → **Settings** → paling bawah **Developer settings**.
2. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
3. Isi:
   - **Token name**: `jimpitan`
   - **Expiration**: pilih **No expiration** (atau 1 tahun, nanti diperbarui)
   - **Repository access**: **Only select repositories** → pilih **jimpitan-rt**
   - **Permissions** → *Repository permissions* → **Contents** → ubah jadi **Read and write**
4. Tekan **Generate token** → **salin token** yang muncul (diawali `github_pat_…`).
   Token hanya tampil sekali.
5. Di aplikasi: **Atur → Halaman web untuk warga → Terbitkan otomatis**, isi:
   - Nama pengguna GitHub, Nama repositori (`jimpitan-rt`), dan **Token** tadi.
6. Tekan **Terbitkan laporan sekarang** untuk mencoba. Kalau berhasil muncul *“✔ Laporan terbit di halaman warga”*.
7. Nyalakan sakelar **Terbitkan tiap kirim laporan** supaya jalan sendiri tiap kali mengirim laporan WA.

> **Jaga tokennya seperti menjaga password.** Token tersimpan di HP itu saja.
> Kalau HP hilang: buka GitHub → Settings → Developer settings → tekan **Revoke** pada token itu.
> Fitur ini **sepenuhnya pilihan** — cara tautan di Bagian 3 tidak membutuhkan token sama sekali.

---

## Bagian 6 — Kalau ada masalah

| Keluhan | Sebabnya | Cara mengatasi |
|---|---|---|
| Alamat GitHub Pages **404** | Pages belum aktif, atau berkas terunggah masuk ke dalam subfolder | Pastikan `index.html` ada di **tingkat paling atas** repositori; ulangi Langkah 4 |
| Situs lama yang muncul setelah berkas diperbarui | Berkas lama masih tersimpan di HP | Tutup aplikasi, buka lagi. Di browser: tahan tombol **muat ulang** → *Hard reload* |
| Warga bilang **tautannya tidak bisa dibuka** | Tautan terpotong saat disalin sebagian | Minta warga **menekan tautannya langsung** di WhatsApp, jangan menyalin teksnya |
| Halaman warga bilang *Belum ada laporan diterbitkan* | Alamat dibuka tanpa tautan laporan, dan fitur Bagian 5 belum dipakai | Wajar. Buka lewat tautan dari grup WA, atau aktifkan Bagian 5 |
| **Terbitkan** gagal: *Token ditolak* | Token salah ketik / sudah kedaluwarsa / dicabut | Buat token baru mengikuti Bagian 5 |
| **Terbitkan** gagal: *Repositori tidak ditemukan* | Nama pengguna atau nama repositori salah ketik | Cocokkan persis dengan yang ada di alamat GitHub |
| Ingin ganti nama alamat | — | Settings → Repository name. Jangan lupa perbarui **Alamat situs RT** di aplikasi |

---

## Bagian 7 — Cara cepat tanpa akun GitHub

Kalau belum sempat membuat akun, buka **app.netlify.com/drop**, seret folder `jimpitan-web` ke sana, dan dalam ±20 detik alamatnya langsung jadi. Tanpa daftar, tanpa bayar.

Kekurangannya: alamatnya acak (misal `fluffy-kue-123.netlify.app`) dan tidak bisa dipakai untuk fitur *Terbitkan otomatis* di Bagian 5. Untuk sekadar mencoba, cara ini paling cepat.

---

## Ringkasan isi folder `jimpitan-web/`

```
index.html              aplikasi utama (pengurus)
app.js  app.css         program & tampilan
manifest.webmanifest    agar bisa dipasang ke layar HP
sw.js                   penyimpanan luring (tetap jalan tanpa sinyal)
ikon/                   ikon aplikasi
lib/                    pembaca & pembuat QR
warga/index.html        ← halaman laporan terbuka untuk warga
data/                   wadah laporan.json bila memakai Terbitkan otomatis
.nojekyll               penanda wajib GitHub Pages
server.py               hanya alat bantu uji coba di komputer; boleh diabaikan
```
