-- Users tablosu
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    security_level INTEGER DEFAULT 10,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mesaj Alanları
CREATE TABLE IF NOT EXISTS message_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Mesaj Verileri
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER REFERENCES message_areas(id),
    author_id INTEGER REFERENCES users(id),
    to_user TEXT DEFAULT 'All',
    parent_id INTEGER DEFAULT NULL,
    subject TEXT,
    body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Oyun İstatistikleri (RPG)
CREATE TABLE IF NOT EXISTS player_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    hp INTEGER DEFAULT 20,
    max_hp INTEGER DEFAULT 20,
    gold INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    stamina INTEGER DEFAULT 15,
    last_rest DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Yoghurt Oyun Skorları
CREATE TABLE IF NOT EXISTS yoghurt_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    score_ms INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- HitNet Alanlarını Ekle
INSERT OR IGNORE INTO message_areas (name, description) VALUES ('ht.sohbet', 'Genel sohbet ve geyik alanı.');
INSERT OR IGNORE INTO message_areas (name, description) VALUES ('ht.abaza', 'HitNet efsanesi, anlatılmaz yaşanır.');
INSERT OR IGNORE INTO message_areas (name, description) VALUES ('ht.teknik', 'Bilgisayar, yazılım ve donanım tartışmaları.');
INSERT OR IGNORE INTO message_areas (name, description) VALUES ('ht.ilan', 'Alım, satım ve iş ilanları.');

-- File Areas (Dosya Alanları)
CREATE TABLE IF NOT EXISTS file_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Files (Dosyalar)
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER REFERENCES file_areas(id),
    uploader_id INTEGER REFERENCES users(id),
    filename TEXT NOT NULL,
    description TEXT,
    file_size INTEGER,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed File Areas
INSERT OR IGNORE INTO file_areas (name, description) VALUES ('Yazılım', 'BBS ve sistem araçları.');
INSERT OR IGNORE INTO file_areas (name, description) VALUES ('Grafik', 'ANSI ve ASCII sanat eserleri.');
INSERT OR IGNORE INTO file_areas (name, description) VALUES ('Metin', 'E-Dergiler ve dökümanlar.');

-- Sohbet Mesajları
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
