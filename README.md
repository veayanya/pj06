# Generator Sertifikat Bapperida

Versi ini menanamkan gambar template langsung di dalam index.html (data URI).
Tidak membutuhkan folder public atau file template.jpg terpisah.

## Deploy ke Vercel
1. Upload index.html, tutorial.css, tutorial.js, folder tutorial/ (berisi 14 gambar panduan), vercel.json, dan README.md ke root repository GitHub.
2. Vercel: Framework Preset = Other.
3. Root Directory = ./ ; Build Command kosong; Output Directory kosong.
4. Deploy.

Jika repository sebelumnya sudah memiliki public/template.jpg, file tersebut boleh tetap ada tetapi tidak diperlukan.

## Tutorial & Panduan
- Pertama kali dibuka: muncul tutorial singkat bergerak dengan tombol **Lewati** atau **Mulai tur interaktif**.
- Tur interaktif menyorot elemen asli di halaman, langkah demi langkah (15 langkah).
- Tombol **Tutorial & Panduan** (header) dan tombol **?** (pojok kanan bawah) membuka panduan lengkap bergambar.
- Status "sudah pernah lihat" disimpan di browser (kunci `bapperida_tutorial_seen_v1`), terpisah dari data sertifikat,
  jadi tombol Atur Ulang tidak memunculkan tutorial lagi.
- Untuk menampilkan intro lagi: buka alamat dengan tambahan `?tutorial` (contoh: .../index.html?tutorial).
- Gambar panduan ada di folder `tutorial/`. Bila tampilan aplikasi berubah, gambar perlu dibuat ulang.


## Gemini (Nano Banana) dan Canva
- Gemini: file `api/gemini.js`. Di Vercel tambahkan Environment Variables `GEMINI_API_KEY` (dari Google AI Studio) dan `ADMIN_KEY` (kata sandi bebas), lalu Redeploy. Opsional `GEMINI_IMAGE_MODEL` untuk memilih model gambar.
- Di panel "Desain AI & Canva": tulis deskripsi, pilih tujuan (template 16:9 atau gambar layer), klik "Buat dengan Gemini", lalu pakai sebagai template atau layer (lewat Crop Pintar).
- Canva (manual): buka Canva, buat desain ukuran custom 1376 x 768 px, unduh PNG/JPG, lalu klik "Impor desain Canva sebagai template".


## Format unduhan
- Tombol unduh menghasilkan file Word (`Sertifikat_Bapperida.docx`), satu halaman landscape, gambar sertifikat memenuhi halaman. File dibuat langsung di browser, tanpa pustaka tambahan dan tanpa server.
- Isi sertifikat berupa gambar, jadi teks di dalam Word tidak bisa diedit. Koreksi dilakukan di aplikasi, lalu unduh ulang.
