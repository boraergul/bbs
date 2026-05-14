# MaNiAc BBS - Security Audit Report

**Tarih:** 2026-05-13
**Denetçi:** Antigravity AI

## 1. Genel Durum
BBS projesinin mevcut aşamasındaki güvenlik seviyesi **"Geliştirme Ortamı İçin Uygun"** ancak **"Üretim (Production) İçin Yetersiz"** olarak değerlendirilmiştir.

---

## 2. Bulgular

### 🔴 KRİTİK: Taşıma Katmanı Güvenliği (Transport Security)
- **Sorun:** Veriler HTTP ve ham WebSocket üzerinden gönderiliyor.
- **Risk:** Kullanıcı adı ve şifreler ağ üzerinde "plaintext" (açık metin) olarak seyahat eder. Aynı ağdaki bir saldırgan bu verileri sniff edebilir.
- **Çözüm:** Üretim ortamında mutlaka **HTTPS** ve **WSS** (SSL/TLS) kullanılmalıdır.

### 🟡 UYARI: Servis Dışı Bırakma (DoS - Denial of Service)
- **Sorun:** `session.buffer` için herhangi bir karakter sınırı yok.
- **Risk:** Kötü niyetli bir kullanıcı Enter tuşuna basmadan milyonlarca karakter göndererek sunucu belleğini (RAM) doldurabilir.
- **Çözüm:** `inputBuffer` boyutu için bir üst sınır (örn: 1024 karakter) eklenmelidir.

### 🟡 UYARI: Kaba Kuvvet Saldırısı (Brute Force)
- **Sorun:** Hatalı giriş denemeleri için bir sınırlama (rate-limiting) yok.
- **Risk:** Bir saldırgan otomatik bir botla binlerce şifre deneyebilir.
- **Çözüm:** Belirli sayıda hatalı girişte IP bazlı veya kullanıcı bazlı geçici engelleme (lockout) eklenmelidir.

### 🟢 BAŞARILI: SQL Injection Koruması
- **Bulgu:** Veritabanı sorguları `better-sqlite3`'ün "Prepared Statements" yapısı kullanılarak yapılıyor.
- **Durum:** Güvenli. Kullanıcı girdileri doğrudan sorguya eklenmiyor.

### 🟢 BAŞARILI: Şifre Güvenliği (Password Hashing)
- **Bulgu:** Şifreler `bcrypt` ile 10 tur saltlanarak hashleniyor.
- **Durum:** Güvenli. Veritabanı ele geçirilse bile orijinal şifrelere ulaşılamaz.

---

## 3. Önerilen Güvenlik Sıkılaştırmaları
1.  **Input Validation:** Kullanıcı adlarının sadece alfanümerik karakterler içermesi zorunlu tutulmalı.
2.  **Rate Limiting:** `express-rate-limit` gibi kütüphanelerle Socket bağlantılarına sınır getirilmeli.
3.  **Sanitization:** Terminale basılan verilerdeki kontrol karakterleri filtrelenmeli.

---
*Bu rapor sistemin mevcut durumunu yansıtmaktadır. Yeni özellikler eklendikçe denetim tekrarlanmalıdır.*
