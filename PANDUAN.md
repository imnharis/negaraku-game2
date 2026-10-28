# NEGARAKU — 6 Pemain Berpasangan

Pakej ini menambah pelayan multiplayer sebenar kepada permainan Negaraku. Setiap orang menggunakan peranti sendiri. Dua orang dalam satu pasangan berkongsi misi, soalan, susunan bendera dan skor.

**Penting:** pakej ini belum mempunyai alamat hosting internet. Fail `index.html` tidak boleh dibuka terus untuk multiplayer; pelayan mesti dijalankan. Ia boleh digunakan dalam rangkaian Wi-Fi yang sama atau diterbitkan pada hosting yang menyokong pelayan Node.js.

## Cara paling cepat: semua peranti pada Wi-Fi yang sama

1. Ekstrak ZIP pada komputer guru.
2. Pastikan Node.js telah dipasang. Tiada pakej tambahan atau `npm install` diperlukan.
3. Windows: buka `MULA-WINDOWS.bat`, kemudian pilih kod hos rahsia 6–12 digit apabila diminta. Untuk sistem lain, tetapkan pemboleh ubah persekitaran `HOST_PIN` kepada kod pilihan anda sebelum menjalankan `node server.js`.
4. Biarkan tetingkap pelayan terbuka. Ia memaparkan:
   - Panel guru: `http://localhost:3000/guru`
   - Alamat untuk murid, contohnya `http://192.168.1.10:3000`.
5. Jika Windows meminta akses rangkaian, benarkan untuk rangkaian persendirian kelas.
6. Guru membuka `/guru`, memasukkan **kod hos** yang ditetapkan tadi, kemudian menekan **Cipta bilik baharu**. Kongsi **kod bilik** enam aksara yang dijana dengan murid. Jangan kongsi kod hos.
7. Enam murid membuka alamat pemain yang dipaparkan oleh pelayan pada peranti masing-masing. **Jangan gunakan `localhost` pada telefon atau komputer murid** — gunakan alamat IP komputer guru.
8. Setiap murid mengisi nama, memilih karakter, kod bilik dan pasangan. Pelayan mengehadkan setiap pasangan kepada dua pemain.
9. Selepas kesemua enam pemain masuk, guru menekan **Mulakan pusingan 1**.
10. Apabila ketiga-tiga pasangan selesai, guru menekan **Pusingan seterusnya**. Semua peranti menerima fasa baharu mengikut pasangan masing-masing.

Semua peranti perlu berada dalam rangkaian yang saling boleh diakses. Sesetengah Wi-Fi sekolah mengasingkan peranti; jika alamat IP tidak boleh dibuka, dapatkan bantuan pentadbir rangkaian. Sambungan internet masih diperlukan untuk memuatkan Three.js dan Tailwind yang digunakan oleh permainan asal.

## Giliran fasa

| Pasangan | Pusingan 1 | Pusingan 2 | Pusingan 3 |
|---|---|---|---|
| 1 | Kanak-kanak | Remaja | Dewasa |
| 2 | Remaja | Dewasa | Kanak-kanak |
| 3 | Dewasa | Kanak-kanak | Remaja |

Dalam mod kelas ini, murid terus memasuki fasa yang ditetapkan selepas arahan guru; mereka tidak perlu memilih portal lobi.

## Kerjasama pasangan

- Setiap murid mengawal karakter sendiri. Rakan yang berada dalam fasa sama dipaparkan dengan nama.
- Kepingan bendera hanya perlu dikutip sekali bagi satu pasangan.
- Soalan dibuka pada kedua-dua peranti pasangan. Mereka berbincang; salah seorang menghantar jawapan.
- Pelayan merekod jawapan dan mata sekali sahaja walaupun kedua-duanya menekan serentak.
- Kedua-duanya menekan **Teruskan** selepas membaca maklum balas. Jawapan salah tetap ditunjukkan bersama pembetulan.
- Susunan bendera dikongsi; kedua-duanya boleh menyusun kepingan.
- Obby sekolah selesai untuk pasangan apabila seorang berjaya; laluan masuk sekolah dikosongkan daripada kereta hiasan. Dalam fasa dewasa, satu kereta dikongsi: ahli pertama yang mendaftar ialah pemandu, ahli kedua ialah penumpang. Penumpang mengikuti kereta pemandu secara automatik. Selepas pemandu parkir, butang **KELUAR** muncul pada kedua-dua peranti. Setiap ahli menekan butang itu untuk turun dan berjalan. Soalan dibuka setelah kedua-duanya keluar.
- Setiap fasa mempunyai 3 soalan. Jumlahnya 9 soalan bagi setiap pasangan. Obby sekolah dipendekkan kepada 12 platform dengan 3 checkpoint nota; jalan memandu bermula lebih dekat dengan lampu isyarat dan petak parkir didekatkan.
- Selepas siap, pasangan menunggu guru. Tiada butang murid untuk melangkau pusingan.
- Setiap pasangan bermula dengan 100 mata, mendapat +10 untuk jawapan betul atau -5 untuk jawapan salah. Satu penghantaran setiap soalan bagi mod kelas ini. Skor maksimum ialah 190 mata.

## Jika mahu bermain dari lokasi berbeza melalui internet

Hoskan folder ini pada pelayan Node.js yang boleh dicapai melalui HTTPS. Tetapkan rahsia persekitaran `HOST_PIN` kepada kod hos pilihan anda (6–12 digit). Nilainya kekal di pelayan dan tidak dihantar dalam HTML atau JavaScript pemain. Arahan mula ialah `node server.js`, dan port mengikuti pemboleh ubah persekitaran `PORT` (lalai 3000). Laman pemain berada di `/`, manakala panel guru berada di `/guru`.

Gunakan **satu proses/instance pelayan** untuk versi ini. Bilik disimpan dalam memori, bukan pangkalan data bersama. Jangan gandakan instance atau menjalankan autoscaling tanpa menambah storan bersama terlebih dahulu. Memulakan semula pelayan akan menamatkan bilik; sesi bilik juga tamat selepas enam jam.

Jangan kongsi data sesi guru. Kod bilik hanya untuk masuk sebagai murid; arahan guru memerlukan token pemilik bilik yang disimpan pada pelayar guru.

## Sambung semula

Muat semula tab asal pada peranti murid untuk menyambung sesi yang sama. Sesi murid disimpan dalam `sessionStorage`, jadi jangan tutup tab atau gunakan tab baharu jika mahu mengekalkan tempatnya. Guru boleh memuat semula panel pada pelayar sama untuk menyambung bilik. Sebelum permainan bermula, guru boleh mengeluarkan pemain yang tersalah masuk supaya tempat pasangan boleh digunakan semula.

## Pengesahan dan batas

Jalankan `node test-server.js` untuk ujian pelayan. Ujian meliputi enam klien HTTP berasingan, kapasiti pasangan, peranan guru, kedudukan pemain, penghantaran jawapan serentak, pengesahan bacaan dua ahli, susunan bendera bersama dan tiga pusingan.

Ujian tersebut **bukan** ujian enam pelayar/peranti sebenar. Grafik, latensi Wi-Fi, audio dan interaksi penuh perlu diuji pada peranti yang akan digunakan sebelum PdP. Tiada hosting internet atau ujian enam peranti sebenar telah dibuat dalam sesi pembinaan ini.

Penyegerakan menggunakan permintaan HTTP berkala (sekitar 350 ms) dan interpolasi pergerakan. Ia sesuai untuk aktiviti kelas kecil; ia bukan enjin multiplayer aksi kompetitif. Permainan tidak menyediakan sembang teks atau suara — ahli pasangan berbincang secara lisan.

## Kod hos dan kod bilik

Kod hos ialah rahsia guru untuk mencipta bilik. Kod bilik dijana secara berasingan untuk enam murid menyertai sesi. Cubaan kod hos salah dihadkan kepada lima cubaan bagi alamat sambungan dalam 10 minit. Kod hos tidak ditetapkan secara tetap dalam pakej ini; pemilik pelayan memilihnya semasa menjalankan atau mengkonfigurasi hosting.

## Spectate dan guru sebagai pemain

Dalam panel guru, pilih nama di bahagian **Spectate pemain** dan tekan **Buka spectate** selepas sesi bermula. Kamera mengikuti pemain terpilih; tukar nama untuk melihat pemain lain. Paparan ini membina semula dunia berdasarkan kedudukan pemain melalui rangkaian, bukan perkongsian skrin atau paparan tetikus tepat pemain. Soalan semasa ditunjukkan sebagai status; jawapan dan kemajuan boleh dipantau di kad pasangan. Sambungan perlahan mungkin melambatkan paparan.

Guru boleh mengekalkan panel guru dalam satu tab, kemudian membuka pautan laman pemain dalam tab lain dan mendaftar sebagai salah seorang daripada enam pemain. Guru mengambil satu daripada dua tempat pasangannya; kapasiti kekal enam pemain. Tab guru dan tab pemain mempunyai sesi berasingan.

## Keputusan dan sijil

Apabila ketiga-tiga pasangan selesai semua tiga fasa, kedudukan dan sijil muncul secara automatik pada panel guru dan peranti murid, tanpa perlu menunggu butang Tamatkan sesi. Guru masih boleh menekan butang itu untuk menutup sesi.

Kedudukan mengikut markah tertinggi. Jika markah seri, jumlah masa setiap pasangan menyiapkan fasa (dari arahan mula pusingan sehingga kedua-dua ahli selesai membaca jawapan atau bendera siap disusun) yang lebih singkat didahulukan. Masa menunggu guru antara pusingan tidak dikira. Jika masa juga sama, nombor pasangan yang lebih kecil didahulukan.

Setiap murid mendapat sijil nama sendiri dengan tempat pasangan (pertama, kedua atau ketiga). Tekan **Muat turun sijil** untuk menyimpan gambar PNG. Guru boleh memuat turun keenam-enam sijil; murid hanya ditawarkan sijil sendiri. Sijil dan keputusan memerlukan bilik masih tersedia; muat turun sebelum pelayan ditutup.

## Berlari

Tahan **Shift kiri atau kanan** sambil bergerak untuk berlari 1.65 kali kelajuan biasa di lobby dan ketiga-tiga fasa. Pada skrin sentuh, tahan butang **LARI / Shift** sambil menggerakkan joystick. Lepaskan untuk berjalan semula. Lari tidak menambah kelajuan kereta.
