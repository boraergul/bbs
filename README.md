# MaNiAc BBS - Web Rebirth v1.0

![BBS Logo](public/images/logo.png) <!-- Opsiyonel: Logo varsa -->

MaNiAc BBS, 1980 ve 90'ların efsanevi Bulletin Board System (BBS) deneyimini modern web teknolojileriyle (Node.js, Socket.io, xterm.js) tarayıcınıza taşıyan bir "Web-BBS" projesidir. 

Ankara merkezli klasik MaNiAc BBS ruhunu, dial-up seslerinden ANSI grafiklerine kadar her detayıyla yeniden yaşatıyoruz.

## 🚀 Öne Çıkan Özellikler

- **📟 Nostaljik Bağlantı:** Gerçek dial-up animasyonu ve 56k modem el sıkışma (handshake) sesi.
- **💬 İletişim:** 
    - **Global Chat:** Gerçek zamanlı, zaman damgalı genel sohbet odası.
    - **PM (Private Message):** `/MSG` komutu ile kullanıcılar arası anlık özel mesajlaşma.
- **🎮 Oyunlar:** 
    - **Yoghurt:** SSG tarafından geliştirilen efsanevi klavye yarışı.
    - **Quest:** Orman keşfi ve sıra tabanlı savaş mekanikleri içeren RPG.
- **📬 Mesaj Alanları:** HitNet ve FidoNet tarzı bölünmüş ekran (Split-View) mesaj okuyucu.
- **📂 Dosya Merkezi:** Alanlara göre ayrılmış dosya yükleme ve indirme platformu.
- **🌗 Tema Desteği:** Klasik Yeşil (Matrix) ve Kehribar (Amber) monitör modları arasında anlık geçiş.
- **🖥️ CRT Efekti:** Tarama çizgileri (Scanlines) ve ekran parlaması ile tam retro deneyim.

## 🛠️ Teknik Altyapı

- **Backend:** Node.js & Express
- **Veritabanı:** SQLite (better-sqlite3)
- **Real-time:** Socket.io
- **Terminal:** xterm.js (80x25 Standart)
- **Güvenlik:** Bcrypt şifreleme

## 📦 Kurulum

1. Depoyu klonlayın.
2. `npm install` ile bağımlılıkları yükleyin.
3. `node server.js` ile sunucuyu başlatın.
4. Tarayıcıdan `http://localhost:3000` adresine gidin.

---
*MaNiAc BBS - Web Rebirth | Ankara | 2026*
