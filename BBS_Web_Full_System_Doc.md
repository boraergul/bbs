# BBS Web Rebirth: Uçtan Uca Sistem Mimarisi ve Geliştirme Dokümanı

## 1. Proje Vizyonu
Bu proje, 1990'ların efsanevi BBS (Bulletin Board System) deneyimini, modern web teknolojileri (WebSockets, Node.js, xterm.js) kullanarak tarayıcıya taşır. Amaç sadece bir web sitesi yapmak değil, tarayıcı içinde çalışan gerçek zamanlı bir "Terminal Stream" platformu oluşturmaktır. Proje, nostaljik ANSI grafikleri ve tam teşekküllü RPG oyunlarıyla interaktif bir dünyaya dönüşmüştür.

---

## 2. Teknik Mimari (Full Stack)

### A. Teknoloji Yığını
- **Frontend:** Vanilla JS (Optimized) + `xterm.js` (Terminal Render Motoru).
- **İletişim:** `Socket.io` (Düşük gecikmeli, çift yönlü veri akışı).
- **Backend:** Node.js (Asenkron BBS Engine).
- **Veritabanı:** SQLite via `better-sqlite3`.
- **Stil:** CSS3 (CRT, Scanline ve Theme support için).

### B. Sistem Katmanları
1.  **Terminal Emülatörü:** Kullanıcının gördüğü arayüz. ANSI kaçış dizilerini (renkler, imleç hareketleri) yorumlar.
2.  **State Machine (Durum Makinesi):** Kullanıcının o an hangi menüde (Login, Main, Message, Game, Chat, vb.) olduğunu takip eder.
3.  **BBS Engine:** Gelen klavye verisini işleyip, ilgili modüle ileten ana mantık.

---

## 3. Modüler Detaylar ve Tamamlanan Özellikler

### A. Kullanıcı Yönetimi ve Giriş (The Gateway)
- **Login Flow:** Kullanıcı adı -> Şifre -> ANSI Art Karşılama Ekranı.
- **Security:** Şifreler bcrypt ile hashlenir.

### B. Mesaj Alanları (Message Bases)
Hiyerarşik bir yapı: **Area -> Thread -> Message**.
- **Tam Ekran Editör:** Kullanıcıların mesajlarına yanıt yazabilmesi için satır satır çalışan bir metin editörü geliştirildi. (`.S` kaydet, `.A` iptal, `.L` listele).

### C. Door Games (Oyun Entegrasyonu)
- **Karanlık Orman (Quest RPG):** Kapsamlı bir RPG döngüsü:
    - Yaratık avı (Forest), EXP kazanımı ve seviye atlama (Max HP artışı ve can dolumu).
    - Ekonomi sistemi: Han'da (Inn) dinlenerek can/stamina doldurma, Demirci'de (Shop) altın harcayarak kalıcı Max HP geliştirme.
    - Anti-Spam: Savaş sonunda tuş spam'i ile ödül kopyalamayı engelleyen özel güvenlik kontrolleri eklendi.
- **Yoghurt:** Efsanevi SSG klavye hız yarışı. Milisaniye hassasiyetli skor tablosu ve oyuncuların sıkıştıklarında `ESC` veya `*` ile çıkabilmelerini sağlayan iptal mekanizması eklendi.

### D. Social Modules (Sosyal Araçlar)
- **Global Chat:** Özel odalarda [HH:mm] zaman damgalı, gerçek zamanlı ortak sohbet alanı (`/Q` ile çıkış).
- **PM (Private Message):** Herhangi bir menüdeyken `/MSG <kullanıcı> <mesaj>` global komutu ile anlık özel mesaj gönderme ve alma.

### E. Dosya Yönetimi (File Areas)
- Kullanıcıların dosya yükleyebileceği ve indirebileceği sunucu tabanlı dosya alanları.
- İndirme sayacı (Download count) ve SysOp yetkisiyle dosya silebilme.

### F. SysOp (Sistem Operatörü) Yönetimi
Sistem yöneticilerine özel (Security Level: 255) kapsamlı panel:
- **Kullanıcı Yönetimi:** Kullanıcıları ID ile seçip, istatistiklerine (oyun verileri, altın, hp) zarar vermeden güvenli şekilde isim değiştirme.
- **Yetkilendirme:** Normal kullanıcılara tek tuşla SysOp yetkisi atama veya geri alma.
- **Güvenlik:** Bir SysOp'un başka bir SysOp'un adını değiştirmesi kilitlenmiştir.
- **Global Duyuru:** Sistemdeki aktif tüm kullanıcılara kırmızı banner ile anlık "Sistem Duyurusu" (Broadcast) geçebilme.

### G. Theme & UX
- **Theme Switch:** CSS variables üzerinden Yeşil (Night) ve Amber (Day) modları geçişi (`/THEME` komutu).
- **Dial-up Sim:** Sunucu taraflı geciktirilmiş ATDT animasyonu ve modem sesleri.
- **Zengin ANSI Sanatı:** Tüm menüler (SysOp, Oyunlar, Han, Dükkan) için özel ANSI renklendirmeleri ve ASCII grafikleri.

---

## 4. Veritabanı Şeması (Genişletilmiş SQL)

```sql
-- Kullanıcılar
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) UNIQUE,
    password_hash TEXT,
    security_level INT DEFAULT 10, -- 10: User, 255: SysOp
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mesaj Alanları
CREATE TABLE message_areas ( id SERIAL PRIMARY KEY, name VARCHAR(50), description TEXT );
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    area_id INT REFERENCES message_areas(id),
    author_id INT REFERENCES users(id),
    subject VARCHAR(100),
    body TEXT,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Oyun Verileri: RPG Stats
CREATE TABLE player_stats (
    user_id INT PRIMARY KEY REFERENCES users(id),
    hp INT, max_hp INT,
    stamina INT,
    gold INT,
    exp INT, level INT
);

-- Oyun Verileri: Yoghurt Leaderboard
CREATE TABLE yoghurt_scores (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    score_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dosya Alanları
CREATE TABLE file_areas ( id SERIAL PRIMARY KEY, name VARCHAR(50), description TEXT );
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    area_id INT REFERENCES file_areas(id),
    uploader_id INT REFERENCES users(id),
    filename VARCHAR(255),
    file_size INT,
    download_count INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. UI/UX: Retro Estetik (VGA & CRT)
(Terminal ANSI kodları, scanline efektleri ve flicker animasyonları bu projenin ruhunu oluşturmaya devam ediyor.)

---

## 6. Geliştirme Yol Haritası (Roadmap)
- [x] **Hafta 1:** Terminal emülasyonu, Socket bağlantısı ve CRT görsel efektleri.
- [x] **Hafta 2:** Kullanıcı kayıt/giriş sistemi, ANSI Art karşılama ekranları ve Global/Özel Chat.
- [x] **Hafta 3:** Mesaj alanları (Okuma/Yazma) ve hiyerarşik menü, tam ekran editör.
- [x] **Hafta 4:** Door Game (Quest RPG döngüsü, Yoghurt yarışması, Anti-Spam).
- [x] **Hafta 5:** Dosya listeleme ve tam teşekküllü SysOp (Yönetici) paneli (İsim/Yetki değişimi).
- [x] **Hafta 6:** Çevrimdışı Posta Kutusu (Offline PM) ve birleştirilmiş `/` (Slash) editör komutları.
- [x] **Hafta 7:** Quest RPG için envanter/eşya (Silah, Zırh, İksir) sistemi ve 30 kademeli canavar zorluğu.
- [ ] **Gelecek:** Topluluk Liderlik Tablosu (Hall of Fame) ve SysOp Ban/Kick araçları.
