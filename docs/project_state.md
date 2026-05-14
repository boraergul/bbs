# MaNiAc BBS - Project State

## Project Architecture
- **Frontend:** Next.js/Vite (Planlanan) -> Şu an: Simple Express Static.
- **Terminal:** xterm.js
- **Communication:** Socket.io
- **Backend:** Node.js

## Chronological Work Log
### [2026-05-13]
- Proje vizyonu ve teknik mimari dokümantasyonu oluşturuldu.
- Phase 4.2 (New Game - YOGHURT) tamamlandı:
    - SSG'nin efsanevi klavye yarışı "YOGHURT" eklendi.
    - Gerçek zamanlı karakter doğrulama ve milisaniye bazlı zamanlayıcı (Timer) kuruldu.
    - Top 10 Liderlik Tablosu (Leaderboard) entegre edildi.
- **Phase 5 (Social & UI/UX Rebirth) tamamlandı:**
    - **Global Sohbet Odası:** Zaman damgalı [HH:mm], gerçek zamanlı mesajlaşma.
    - **PM (Özel Mesaj) Sistemi:** `/MSG <user> <message>` ile her yerden özel iletişim.
    - **Dial-up Deneyimi:** ATDT komutu, "Connecting..." animasyonları ve efsanevi 56k modem sesi.
    - **Gece/Gündüz Modları:** Yeşil (Matrix) ve Kehribar (Amber) temaları arası geçiş.
    - **Navigasyon:** Case-insensitive `/Q` ve tüm menülerde tek tuş (Q) ile geri dönüş.
    - **UI Temizliği:** Scrollbarlar gizlendi, CRT efektleri optimize edildi.
- Phase 1 (Foundation) tamamlandı: Terminal, CRT efektleri, Socket bağlantısı.
- Phase 2 (Authentication) tamamlandı: Kayıt/Giriş sistemi, SQLite entegrasyonu.
- Phase 3 (Message Areas) tamamlandı:
    - HitNet tarzı `ht.*` alanları oluşturuldu.
    - BlueWave / FidoNet tarzı gelişmiş mesaj okuyucu kodlandı.
    - **Split-View (Bölünmüş Ekran)** arayüzü eklendi: Üstte mesaj listesi, altta içerik.
    - **Yön Tuşları (Arrow Keys)** ile navigasyon desteği eklendi.
    - (R)eply fonksiyonu ile etkileşimli yanıt sistemi kuruldu.

## Critical Bugs & Technical Debt
- Dosya indirme sayacı (Download Count) henüz veritabanında otomatik tetiklenmiyor.
- Mesaj okuma ekranında (R)eply ve (W)rite fonksiyonları için gerçek bir editör arayüzü gerekiyor.
- Oyun içerisinde henüz dükkan (Shop) veya dinlenme (Inn) yeri yok.

## Unified Memory
- BBS projesi nostaljik DOS/ANSI havasını koruyarak modern web teknolojileriyle inşa ediliyor.
- Temel hedef: Terminal Stream üzerinden etkileşimli bir platform.
