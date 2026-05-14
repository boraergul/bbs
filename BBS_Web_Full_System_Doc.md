# BBS Web Rebirth: Uçtan Uca Sistem Mimarisi ve Geliştirme Dokümanı

## 1. Proje Vizyonu
Bu proje, 1990'ların efsanevi BBS (Bulletin Board System) deneyimini, modern web teknolojileri (WebSockets, Node.js, xterm.js) kullanarak tarayıcıya taşır. Amaç sadece bir web sitesi yapmak değil, tarayıcı içinde çalışan gerçek zamanlı bir "Terminal Stream" platformu oluşturmaktır.

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
2.  **State Machine (Durum Makinesi):** Kullanıcının o an hangi menüde (Login, Main, Message, Game) olduğunu takip eder.
3.  **BBS Engine:** Gelen klavye verisini işleyip, ilgili modüle (örn: Mesaj yazma) ileten ana mantık.

---

## 3. Modüler Detaylar

### A. Kullanıcı Yönetimi ve Giriş (The Gateway)
Sistem bir "State" yapısında çalışır. Kullanıcı bağlandığında `UNAUTHENTICATED` durumundadır.
- **Login Flow:** Kullanıcı adı -> Şifre -> (Varsa) Karşılama Ekranı (ANSI Art).
- **Security:** Şifreler bcrypt ile hashlenmeli.

### B. Mesaj Alanları (Message Bases)
Hiyerarşik bir yapı: **Area -> Thread -> Message**.
- **Fonksiyonlar:** 
    - `listAreas()`: Kategorileri listeler.
    - `readThread(id)`: Mesajları klasik N (Next), P (Prev) tuşlarıyla okutur.
    - `postMessage()`: Çok satırlı (multiline) metin girişi sağlar.

### C. Door Games (Oyun Entegrasyonu)
- **Quest:** Orman keşfi, monster encounter ve loot sistemi.
- **Yoghurt:** SSG klasiği, milisaniye hassasiyetli klavye hız yarışı.

### D. Social Modules (Sosyal Araçlar)
- **Global Chat:** [HH:mm] zaman damgalı, gerçek zamanlı ortak sohbet alanı.
- **PM (Private Message):** `/MSG <kullanıcı> <mesaj>` global komutu ile anlık özel iletişim.

### E. Theme & UX
- **Theme Switch:** CSS variables üzerinden Yeşil (Night) ve Amber (Day) modları.
- **Dial-up Sim:** Sunucu taraflı geciktirilmiş (async/await) ATDT animasyonu ve modem handshake sesleri.

---

## 4. Veritabanı Şeması (SQL)

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
CREATE TABLE message_areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    description TEXT
);

-- Mesajlar
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    area_id INT REFERENCES message_areas(id),
    author_id INT REFERENCES users(id),
    subject VARCHAR(100),
    body TEXT,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Oyun Verileri (Örn: Basit bir RPG için)
CREATE TABLE player_stats (
    user_id INT PRIMARY KEY REFERENCES users(id),
    hp INT,
    gold INT,
    level INT
);
```

---

## 5. UI/UX: Retro Estetik (VGA & CRT)

### ANSI Renk Standartları
Backend'den gönderilecek veriler şu formatta olmalıdır:
- `\x1b[1;33m` : Parlak Sarı (Başlıklar)
- `\x1b[1;32m` : Parlak Yeşil (Kullanıcılar)
- `\x1b[0m`    : Reset (Normal beyaz)

### CRT Filtresi (CSS)
```css
.terminal-container {
    background-color: #000;
    position: relative;
    overflow: hidden;
}

/* Tarama Çizgileri */
.terminal-container::after {
    content: " ";
    position: absolute;
    top: 0; left: 0; bottom: 0; right: 0;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
                linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    background-size: 100% 2px, 3px 100%;
    pointer-events: none;
    z-index: 2;
}

/* Hafif Titreme */
@keyframes flicker {
    0% { opacity: 0.97; }
    50% { opacity: 1; }
    100% { opacity: 0.98; }
}
.terminal-container { animation: flicker 0.15s infinite; }
```

---

## 6. AI Geliştirme Master Promptları (Adım Adım)

### Adım 1: Temel İskelet (Skeleton)
> "Node.js, Express ve Socket.io kullanarak bir backend; React ve xterm.js kullanarak bir frontend oluştur. Terminal 'Perfect DOS VGA' fontu kullanmalı. Kullanıcı bağlandığında sunucudan 'Welcome to BBS' yazısı ANSI renkleriyle (Sarı) gelmeli. Klavyeden girilen her tuş sunucuya gönderilmeli ve sunucu bu tuşu geri yankılamalı (echo)."

### Adım 2: Menü Sistemi (Navigation)
> "Backend tarafında bir State Machine kur. Kullanıcı 'MAIN_MENU' durumundayken 'M' tuşuna basarsa 'MESSAGE_MENU' durumuna geçsin ve ekrana mesaj alanlarını listelesin. Her durum geçişinde ekranı temizle (ANSI: \x1b[2J) ve yeni menüyü çiz."

### Adım 3: Veritabanı ve Mesajlaşma (Messaging)
> "SQLite veritabanı entegre et. 'Messages' tablosu oluştur. Kullanıcı bir mesaj alanına girdiğinde mesaj başlıklarını listele. Bir rakama bastığında (örn: 1) o mesajın içeriğini üstte gönderen ve konu bilgilerinin olduğu bir kutu (ANSI Box) içinde göster."

---

## 7. Geliştirme Yol Haritası (Roadmap)
1.  **Hafta 1:** Terminal emülasyonu, Socket bağlantısı ve CRT görsel efektleri.
2.  **Hafta 2:** Kullanıcı kayıt/giriş sistemi ve ANSI Art karşılama ekranları.
3.  **Hafta 3:** Mesaj alanları (Okuma/Yazma) ve hiyerarşik menü yapısı.
4.  **Hafta 4:** Basit bir 'Door Game' (Sıra tabanlı dövüş veya ticaret oyunu).
5.  **Hafta 5:** Dosya listeleme ve SysOp (Yönetici) paneli.

---
**SysOp Notu:** BBS'lerin en önemli kuralı şudur; sistem asla 'statik' değildir. Kullanıcı bir tuşa bastığında sistem ona bir yanıt akışı (stream) gönderir. Bu akışı `socket.emit('data', buffer)` şeklinde yönetmelisin.
