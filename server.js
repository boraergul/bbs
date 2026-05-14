import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'database');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const db = new Database(path.join(dbDir, 'bbs.db'));
const schema = fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8');
db.exec(schema);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    maxHttpBufferSize: 1e8 // 100MB
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Dosya İndirme Route (Counter Artırma)
app.get('/download/:id', (req, res) => {
    const fileId = req.params.id;
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
    if (file) {
        db.prepare('UPDATE files SET download_count = download_count + 1 WHERE id = ?').run(fileId);
        res.download(path.join(uploadsDir, file.filename));
    } else {
        res.status(404).send('Dosya bulunamadı.');
    }
});

const CLS = '\x1b[2J\x1b[H';
const CRLF = '\r\n';

const STATES = {
    LOGIN_USERNAME: 'LOGIN_USERNAME',
    LOGIN_PASSWORD: 'LOGIN_PASSWORD',
    REGISTER_CONFIRM: 'REGISTER_CONFIRM',
    REGISTER_PASSWORD: 'REGISTER_PASSWORD',
    MAIN_MENU: 'MAIN_MENU',
    AREA_LIST: 'AREA_LIST',
    READ_MESSAGE_SPLIT: 'READ_MESSAGE_SPLIT',
    WRITE_TO: 'WRITE_TO',
    WRITE_SUBJECT: 'WRITE_SUBJECT',
    WRITE_BODY: 'WRITE_BODY',
    GAMES_MENU: 'GAMES_MENU',
    GAME_MAIN: 'GAME_MAIN',
    GAME_BATTLE: 'GAME_BATTLE',
    GAME_YOGHURT_MAIN: 'GAME_YOGHURT_MAIN',
    GAME_YOGHURT_PLAY: 'GAME_YOGHURT_PLAY',
    GAME_SHOP: 'GAME_SHOP',
    GAME_INN: 'GAME_INN',
    WHO_ONLINE: 'WHO_ONLINE',
    FILE_AREAS: 'FILE_AREAS',
    FILE_LIST: 'FILE_LIST',
    FILE_DELETE: 'FILE_DELETE',
    CHAT_ROOM: 'CHAT_ROOM',
    SYSOP_MENU: 'SYSOP_MENU',
    SYSOP_USER_LIST: 'SYSOP_USER_LIST',
    SYSOP_USER_MANAGE: 'SYSOP_USER_MANAGE',
    SYSOP_USER_RENAME: 'SYSOP_USER_RENAME',
    SYSOP_BROADCAST: 'SYSOP_BROADCAST'
};

const activeSessions = new Map();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

io.on('connection', async (socket) => {
    let session = {
        socketId: socket.id,
        state: STATES.LOGIN_USERNAME,
        username: 'Guest',
        userId: null,
        securityLevel: 10,
        buffer: '',
        currentArea: null,
        currentFileArea: null,
        currentMsgIndex: 0,
        tempMessage: { to: 'All', subject: '', body: [], parentId: null },
        gameState: { player: null, enemy: null, yoghurt: { index: 0, startTime: 0 } },
        loginTime: Date.now()
    };
    activeSessions.set(socket.id, session);

    socket.emit('play-modem-sound');
    socket.emit('data', `\x1b[1;30mATDT 0312-MANIAC-BBS${CRLF}\x1b[0m`);
    await sleep(800);
    socket.emit('data', `Dialing...${CRLF}`);
    await sleep(1200);
    socket.emit('data', `Connecting...${CRLF}`);
    await sleep(1000);
    socket.emit('data', `\x1b[1;32mCONNECT 56600 / V.42bis Connection established.${CRLF}\x1b[0m`);
    await sleep(800);
    socket.emit('data', getWelcomeLogo());
    socket.emit('data', `\x1b[33m${CRLF}Login: \x1b[0m`);

    socket.on('data', async (data) => {
        if (session.state === STATES.GAME_YOGHURT_PLAY) {
            handleYoghurtInput(socket, session, data);
            return;
        }
        
        // Arrow Keys
        if (data === '\x1b[A' && session.state === STATES.READ_MESSAGE_SPLIT) {
            session.currentMsgIndex = Math.max(0, session.currentMsgIndex - 1);
            renderSplitView(socket, session);
            return;
        }
        if (data === '\x1b[B' && session.state === STATES.READ_MESSAGE_SPLIT) {
            const msgs = getMessages(session.currentArea.id);
            session.currentMsgIndex = Math.min(msgs.length - 1, session.currentMsgIndex + 1);
            renderSplitView(socket, session);
            return;
        }

        if (data === '\r') {
            const input = session.buffer.trim();
            session.buffer = '';
            if (input.startsWith('/') && session.state !== STATES.WRITE_BODY) {
                handleGlobalCommand(socket, session, input);
                return;
            }
            if (![STATES.CHAT_ROOM, STATES.SYSOP_BROADCAST, STATES.GAME_BATTLE, STATES.WRITE_BODY].includes(session.state)) socket.emit('data', CRLF);
            await handleState(socket, session, input);
        } else if (data === '\u007f') {
            if (session.buffer.length > 0) {
                session.buffer = session.buffer.slice(0, -1);
                socket.emit('data', '\b \b');
            }
        } else {
            const charInput = data.toLocaleUpperCase('tr-TR');
            const immediateStates = [STATES.MAIN_MENU, STATES.AREA_LIST, STATES.READ_MESSAGE_SPLIT, STATES.GAMES_MENU, STATES.GAME_MAIN, STATES.GAME_BATTLE, STATES.GAME_SHOP, STATES.GAME_INN, STATES.GAME_YOGHURT_MAIN, STATES.WHO_ONLINE, STATES.FILE_AREAS, STATES.FILE_LIST, STATES.SYSOP_MENU, STATES.SYSOP_USER_MANAGE];
            
            if (immediateStates.includes(session.state)) {
                session.buffer = ''; 
                await handleState(socket, session, charInput);
            } else {
                session.buffer += data;
                if (session.state === STATES.LOGIN_PASSWORD || session.state === STATES.REGISTER_PASSWORD) {
                    socket.emit('data', '*');
                } else {
                    socket.emit('data', data);
                }
            }
        }
    });

    socket.on('upload-file', (fileInfo) => {
        const filePath = path.join(uploadsDir, fileInfo.filename);
        fs.writeFileSync(filePath, Buffer.from(fileInfo.data));
        db.prepare('INSERT INTO files (area_id, uploader_id, filename, file_size) VALUES (?, ?, ?, ?)').run(fileInfo.areaId, session.userId, fileInfo.filename, fileInfo.size);
        socket.emit('data', `${CRLF}\x1b[1;32mDosya başarıyla yüklendi: ${fileInfo.filename}\x1b[0m${CRLF}Devam için bir tuşa basın...`);
    });

    socket.on('disconnect', () => { 
        if (session.state === STATES.CHAT_ROOM) broadcastChat(session, `\x1b[31m${session.username} sohbetten ayrıldı.\x1b[0m`);
        activeSessions.delete(socket.id); 
    });
});

function handleGlobalCommand(socket, session, input) {
    const parts = input.split(' ');
    const cmd = parts[0].toUpperCase();
    if (cmd === '/MSG') {
        const targetUsername = parts[1];
        const msg = parts.slice(2).join(' ');
        if (!targetUsername || !msg) {
            socket.emit('data', `${CRLF}\x1b[31mKullanım: /MSG <kullanıcı> <mesaj>\x1b[0m${CRLF}`);
            if (session.state === STATES.CHAT_ROOM) socket.emit('data', `\x1b[1;33mMesaj: \x1b[0m`);
            return;
        }
        sendPrivateMessage(socket, session, targetUsername, msg);
        if (session.state === STATES.CHAT_ROOM) socket.emit('data', `\x1b[1;33mMesaj: \x1b[0m`);
    } else if (cmd === '/THEME') {
        socket.emit('toggle-theme');
        socket.emit('data', `${CRLF}\x1b[1;32mTema değiştirildi.\x1b[0m${CRLF}`);
        if (session.state === STATES.CHAT_ROOM) socket.emit('data', `\x1b[1;33mMesaj: \x1b[0m`);
    } else if (cmd === '/Q') {
        if (session.state === STATES.CHAT_ROOM) broadcastChat(session, `\x1b[31m${session.username} sohbetten ayrıldı.\x1b[0m`);
        goToMainMenu(socket, session);
    } else {
        socket.emit('data', `${CRLF}\x1b[31mGeçersiz komut.\x1b[0m${CRLF}`);
        if (session.state === STATES.CHAT_ROOM) socket.emit('data', `\x1b[1;33mMesaj: \x1b[0m`);
    }
}

function sendPrivateMessage(socket, session, targetUsername, msg) {
    let targetSession = null;
    activeSessions.forEach((s) => {
        if (s.username.toUpperCase() === targetUsername.toUpperCase()) targetSession = s;
    });
    if (targetSession) {
        const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        io.to(targetSession.socketId).emit('data', `${CRLF}\x1b[1;35m[${time}] [PM] ${session.username}: ${msg}\x1b[0m${CRLF}`);
        socket.emit('data', `${CRLF}\x1b[1;32m[${time}] [PM] -> ${targetSession.username}: ${msg}\x1b[0m${CRLF}`);
    } else {
        socket.emit('data', `${CRLF}\x1b[31mKullanıcı online değil: ${targetUsername}\x1b[0m${CRLF}`);
    }
}

async function handleState(socket, session, input) {
    if (session.state === STATES.CHAT_ROOM && input.toUpperCase() !== '/Q') {
        if (input) broadcastChat(session, `\x1b[1;36m${session.username}:\x1b[0m ${input}`, true);
        return;
    }

    switch (session.state) {
        case STATES.LOGIN_USERNAME:
            if (!input) { socket.emit('data', '\x1b[33mLogin: \x1b[0m'); return; }
            session.username = input;
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(input);
            if (user) {
                session.userId = user.id; session.state = STATES.LOGIN_PASSWORD;
                socket.emit('data', '\x1b[33mPassword: \x1b[0m');
            } else {
                session.state = STATES.REGISTER_CONFIRM;
                socket.emit('data', `\x1b[31mKullanıcı bulunamadı.\x1b[0m${CRLF}\x1b[33mYeni kayıt oluşturulsun mu? (E/H): \x1b[0m`);
            }
            break;
        case STATES.REGISTER_CONFIRM:
            if (input === 'E') { session.state = STATES.REGISTER_PASSWORD; socket.emit('data', '\x1b[33mYeni Şifre Belirleyin: \x1b[0m'); }
            else { session.state = STATES.LOGIN_USERNAME; socket.emit('data', `\x1b[33m${CRLF}Login: \x1b[0m`); }
            break;
        case STATES.REGISTER_PASSWORD:
            const hash = await bcrypt.hash(input, 10);
            const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(session.username, hash);
            session.userId = result.lastInsertRowid;
            socket.emit('data', `${CRLF}\x1b[1;32mKayıt başarılı!\x1b[0m${CRLF}`); goToMainMenu(socket, session);
            break;
        case STATES.LOGIN_PASSWORD:
            const userData = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
            if (await bcrypt.compare(input, userData.password_hash)) {
                db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userData.id);
                session.securityLevel = userData.security_level;
                socket.emit('data', `${CRLF}\x1b[1;32mGiriş başarılı!\x1b[0m${CRLF}`); goToMainMenu(socket, session);
            } else {
                socket.emit('data', '\x1b[31mHatalı şifre!\x1b[0m' + CRLF);
                session.state = STATES.LOGIN_USERNAME; socket.emit('data', '\x1b[33mLogin: \x1b[0m');
            }
            break;
        case STATES.MAIN_MENU:
            if (input === 'M') showAreaList(socket, session);
            else if (input === 'G') showGamesMenu(socket, session);
            else if (input === 'D') showFileAreas(socket, session);
            else if (input === 'C') enterChat(socket, session);
            else if (input === 'W') showWhoOnline(socket, session);
            else if (input === 'S' && session.securityLevel >= 255) showSysOpMenu(socket, session);
            else if (input === 'X') { socket.emit('data', CRLF + 'Bye!' + CRLF); socket.disconnect(); }
            else { goToMainMenu(socket, session); }
            break;
        case STATES.SYSOP_MENU:
            if (input === 'U') showSysOpUserList(socket, session);
            else if (input === 'B') startBroadcast(socket, session);
            else if (input === 'Q') goToMainMenu(socket, session);
            else showSysOpMenu(socket, session);
            break;
        case STATES.SYSOP_USER_LIST:
            if (input.toUpperCase() === 'Q') {
                showSysOpMenu(socket, session);
            } else {
                const targetId = parseInt(input);
                if (!isNaN(targetId)) {
                    const tUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
                    if (tUser) {
                        session.targetUser = tUser;
                        showSysOpUserManage(socket, session, tUser);
                        return;
                    }
                }
                showSysOpUserList(socket, session);
            }
            break;
        case STATES.SYSOP_USER_MANAGE:
            if (input === 'Q') {
                showSysOpUserList(socket, session);
            } else if (input === 'R') {
                session.state = STATES.SYSOP_USER_RENAME;
                socket.emit('data', CRLF + `\x1b[1;36mYeni Kullanıcı Adı: \x1b[0m`);
            } else if (input === 'S') {
                if (session.targetUser.id === session.userId) {
                    socket.emit('data', CRLF + `\x1b[1;31mKendi yetkinizi değiştiremezsiniz.\x1b[0m${CRLF}`);
                    setTimeout(() => showSysOpUserManage(socket, session, session.targetUser), 1500);
                } else {
                    const newLevel = session.targetUser.security_level >= 255 ? 10 : 255;
                    db.prepare('UPDATE users SET security_level = ? WHERE id = ?').run(newLevel, session.targetUser.id);
                    session.targetUser.security_level = newLevel;
                    socket.emit('data', CRLF + `\x1b[1;32mYetki başarıyla güncellendi. Yeni seviye: ${newLevel}\x1b[0m${CRLF}`);
                    setTimeout(() => showSysOpUserManage(socket, session, session.targetUser), 1500);
                }
            } else {
                showSysOpUserManage(socket, session, session.targetUser);
            }
            break;
        case STATES.SYSOP_USER_RENAME:
            if (!input || input.length < 3) {
                socket.emit('data', CRLF + `\x1b[1;31mİsim en az 3 karakter olmalı.\x1b[0m${CRLF}`);
                setTimeout(() => showSysOpUserManage(socket, session, session.targetUser), 1500);
                return;
            }
            if (session.targetUser.security_level >= 255) {
                socket.emit('data', CRLF + `\x1b[1;31mSysOp olan bir kullanıcının adı değiştirilemez!\x1b[0m${CRLF}`);
                setTimeout(() => showSysOpUserManage(socket, session, session.targetUser), 1500);
                return;
            }
            try {
                db.prepare('UPDATE users SET username = ? WHERE id = ?').run(input, session.targetUser.id);
                session.targetUser.username = input;
                socket.emit('data', CRLF + `\x1b[1;32mKullanıcı adı başarıyla '${input}' olarak güncellendi!\x1b[0m${CRLF}`);
                setTimeout(() => showSysOpUserManage(socket, session, session.targetUser), 1500);
            } catch (e) {
                socket.emit('data', CRLF + `\x1b[1;31mBu isim zaten kullanılıyor olabilir.\x1b[0m${CRLF}`);
                setTimeout(() => showSysOpUserManage(socket, session, session.targetUser), 1500);
            }
            break;
        case STATES.SYSOP_BROADCAST:
            if (input) {
                activeSessions.forEach(s => {
                    io.to(s.socketId).emit('data', `${CRLF}\x1b[1;41;37m [SİSTEM DUYURUSU] ${session.username}: ${input} \x1b[0m${CRLF}`);
                });
                showSysOpMenu(socket, session);
            }
            break;
        case STATES.AREA_LIST:
            if (input === 'Q') goToMainMenu(socket, session);
            else {
                const areaId = parseInt(input);
                const area = db.prepare('SELECT * FROM message_areas WHERE id = ?').get(areaId);
                if (area) { session.currentArea = area; session.currentMsgIndex = 0; renderSplitView(socket, session); }
                else showAreaList(socket, session);
            }
            break;
        case STATES.READ_MESSAGE_SPLIT:
            if (input === 'Q') showAreaList(socket, session);
            else if (input === 'W') startWritingMessage(socket, session);
            else if (input === 'R') startWritingMessage(socket, session, true);
            else renderSplitView(socket, session);
            break;
        case STATES.WRITE_TO:
            session.tempMessage.to = input || 'All';
            session.state = STATES.WRITE_SUBJECT;
            socket.emit('data', `\x1b[1;36mSubject: \x1b[0m`);
            break;
        case STATES.WRITE_SUBJECT:
            session.tempMessage.subject = input || 'No Subject';
            startEditor(socket, session);
            break;
        case STATES.WRITE_BODY:
            handleEditorInput(socket, session, input);
            break;
        case STATES.FILE_AREAS:
            if (input === 'Q') goToMainMenu(socket, session);
            else {
                const fAreaId = parseInt(input);
                const fArea = db.prepare('SELECT * FROM file_areas WHERE id = ?').get(fAreaId);
                if (fArea) { session.currentFileArea = fArea; showFileList(socket, session); }
                else showFileAreas(socket, session);
            }
            break;
        case STATES.FILE_LIST:
            if (input === 'Q') showFileAreas(socket, session);
            else if (input === 'U') socket.emit('trigger-file-picker', session.currentFileArea.id);
            else if (input === 'D' && session.securityLevel >= 90) startDeleteFile(socket, session);
            else if (input === 'L') showFileList(socket, session); // Refresh
            else {
                const fileId = parseInt(input);
                if (fileId) socket.emit('data', `${CRLF}\x1b[1;32mİndirme linki: http://localhost:3000/download/${fileId}\x1b[0m${CRLF}Dosyayı indirmek için linke tıklayın.${CRLF}Devam için bir tuşa basın...`);
            }
            break;
        case STATES.FILE_DELETE:
            handleDeleteFile(socket, session, input);
            break;
        case STATES.GAMES_MENU:
            if (input === '1') enterGame(socket, session);
            else if (input === '2') enterYoghurt(socket, session);
            else if (input === 'Q') goToMainMenu(socket, session);
            else showGamesMenu(socket, session);
            break;
        case STATES.GAME_MAIN:
            if (input === 'F') startForest(socket, session);
            else if (input === 'I') startInn(socket, session);
            else if (input === 'S') startShop(socket, session);
            else if (input === 'Q') showGamesMenu(socket, session);
            else renderGameMain(socket, session);
            break;
        case STATES.GAME_INN:
            if (input === '1') handleInnHeal(socket, session);
            else if (input === 'Q') renderGameMain(socket, session);
            else startInn(socket, session);
            break;
        case STATES.GAME_SHOP:
            if (input === '1') handleShopUpgrade(socket, session);
            else if (input === 'Q') renderGameMain(socket, session);
            else startShop(socket, session);
            break;
        case STATES.GAME_BATTLE:
            if (input === 'A') handleAttack(socket, session);
            else if (input === 'Q') renderGameMain(socket, session);
            break;
        case STATES.GAME_YOGHURT_MAIN:
            if (input === 'S') startYoghurtPlay(socket, session);
            else if (input === 'Q') showGamesMenu(socket, session);
            else renderYoghurtMain(socket, session);
            break;
        case STATES.WHO_ONLINE:
            if (input === 'Q') goToMainMenu(socket, session);
            else showWhoOnline(socket, session);
            break;
        case STATES.CHAT_ROOM:
            if (input.toUpperCase() === '/Q') goToMainMenu(socket, session);
            break;
    }
}

function startWritingMessage(socket, session, isReply = false) {
    session.tempMessage = { to: 'All', subject: '', body: [], parentId: null };
    if (isReply) {
        const msgs = getMessages(session.currentArea.id);
        const parent = msgs[session.currentMsgIndex];
        session.tempMessage.to = parent.author_name;
        session.tempMessage.subject = `Re: ${parent.subject}`;
        session.tempMessage.parentId = parent.id;
        session.state = STATES.WRITE_BODY;
        startEditor(socket, session, true);
    } else {
        session.state = STATES.WRITE_TO;
        socket.emit('data', CRLF + `\x1b[1;36mTo: \x1b[0m`);
    }
}

function startEditor(socket, session, isReply = false) {
    session.state = STATES.WRITE_BODY;
    let out = CLS + `\x1b[1;33m══ [ MaNiAc BBS Line Editor ] ════════════════════════\x1b[0m${CRLF}`;
    out += `\x1b[1;36mTo     : \x1b[0m${session.tempMessage.to}${CRLF}`;
    out += `\x1b[1;36mSubject: \x1b[0m${session.tempMessage.subject}${CRLF}`;
    out += `\x1b[1;32mKomutlar: .S (Kaydet), .A (İptal), .L (Listele)\x1b[0m${CRLF}`;
    out += `──────────────────────────────────────────────────────${CRLF}`;
    if (isReply) {
        const msgs = getMessages(session.currentArea.id);
        const parent = msgs[session.currentMsgIndex];
        out += `\x1b[1;30m--- Alıntı ---\x1b[0m${CRLF}`;
        const quote = parent.body.split('\n').map(line => `> ${line}`).join(CRLF);
        out += `\x1b[1;30m${quote}\x1b[0m${CRLF}`;
    }
    socket.emit('data', out + `01: `);
}

function handleEditorInput(socket, session, input) {
    if (input.toLocaleUpperCase('tr-TR') === '.S') {
        saveMessage(socket, session);
    } else if (input.toLocaleUpperCase('tr-TR') === '.A') {
        socket.emit('data', CRLF + `\x1b[31mİptal edildi.\x1b[0m${CRLF}`);
        setTimeout(() => renderSplitView(socket, session), 1000);
    } else if (input.toLocaleUpperCase('tr-TR') === '.L') {
        socket.emit('data', CRLF + `\x1b[1;37m--- Mesaj İçeriği ---\x1b[0m${CRLF}`);
        session.tempMessage.body.forEach((line, i) => {
            socket.emit('data', `${(i+1).toString().padStart(2, '0')}: ${line}${CRLF}`);
        });
        socket.emit('data', `${(session.tempMessage.body.length + 1).toString().padStart(2, '0')}: `);
    } else {
        session.tempMessage.body.push(input);
        socket.emit('data', CRLF + `${(session.tempMessage.body.length + 1).toString().padStart(2, '0')}: `);
    }
}

function saveMessage(socket, session) {
    const body = session.tempMessage.body.join('\n');
    db.prepare('INSERT INTO messages (area_id, author_id, to_user, subject, body, parent_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(session.currentArea.id, session.userId, session.tempMessage.to, session.tempMessage.subject, body, session.tempMessage.parentId);
    
    socket.emit('data', CRLF + `\x1b[1;32m🏴 Mesaj başarıyla gönderildi!\x1b[0m${CRLF}`);
    setTimeout(() => {
        session.currentMsgIndex = 0; // Başa dön veya listeyi yenile
        renderSplitView(socket, session);
    }, 1500);
}

function showSysOpMenu(socket, session) {
    session.state = STATES.SYSOP_MENU;
    let out = CLS + `\x1b[1;31m` +
        ` ███████╗██╗   ██╗███████╗ ██████╗ ██████╗                               ${CRLF}` +
        ` ██╔════╝╚██╗ ██╔╝██╔════╝██╔═══██╗██╔══██╗                              ${CRLF}` +
        ` ███████╗ ╚████╔╝ ███████╗██║   ██║██████╔╝                              ${CRLF}` +
        ` ╚════██║  ╚██╔╝  ╚════██║██║   ██║██╔═══╝                               ${CRLF}` +
        ` ███████║   ██║   ███████║╚██████╔╝██║                                   ${CRLF}` +
        ` ╚══════╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝                                   ${CRLF}\x1b[0m${CRLF}` +
        ` \x1b[1;37mMaNiAc BBS System Operator Control Panel\x1b[0m${CRLF}${CRLF}` +
        ` [U] Kullanıcı Yönetimi${CRLF}` +
        ` [B] Global Duyuru Yap${CRLF}` +
        ` [Q] Geri (Ana Menü)${CRLF}${CRLF} Seçiniz: `;
    socket.emit('data', out);
}

function showSysOpUserList(socket, session) {
    session.state = STATES.SYSOP_USER_LIST;
    const users = db.prepare('SELECT id, username, security_level, last_login FROM users LIMIT 15').all();
    let out = CLS + `\x1b[1;31m══ [ Kullanıcı Yönetimi ] ════════════════════════════\x1b[0m${CRLF}${CRLF}`;
    out += ` ID | Kullanıcı Adı  | Seviye | Son Giriş${CRLF}`;
    out += ` ───|────────────────|────────|──────────────────────${CRLF}`;
    users.forEach(u => {
        out += ` ${u.id.toString().padEnd(2)} | ${u.username.padEnd(14)} | ${u.security_level.toString().padEnd(6)} | ${u.last_login}${CRLF}`;
    });
    out += `${CRLF} \x1b[1;33m[Q] Geri${CRLF}${CRLF} Yönetmek için ID yazın: `;
    socket.emit('data', out);
}

function showSysOpUserManage(socket, session, targetUser) {
    session.state = STATES.SYSOP_USER_MANAGE;
    let out = CLS + `\x1b[1;31m══ [ Kullanıcı Yönetimi: ${targetUser.username} ] ════════════════════════════\x1b[0m${CRLF}${CRLF}`;
    out += ` Mevcut ID     : ${targetUser.id}${CRLF}`;
    out += ` Kullanıcı Adı : ${targetUser.username}${CRLF}`;
    out += ` Yetki Seviyesi: ${targetUser.security_level}${CRLF}${CRLF}`;
    out += ` \x1b[1;33m[R]\x1b[0m İsim Değiştir${CRLF}`;
    out += ` \x1b[1;33m[S]\x1b[0m SysOp Yetkisi Ata/Al${CRLF}`;
    out += ` \x1b[1;33m[Q]\x1b[0m Geri${CRLF}${CRLF}`;
    out += ` Seçiminiz: `;
    socket.emit('data', out);
}

function startBroadcast(socket, session) {
    session.state = STATES.SYSOP_BROADCAST;
    socket.emit('data', CRLF + `\x1b[1;31mDuyuru Mesajı: \x1b[0m`);
}

function enterChat(socket, session) {
    session.state = STATES.CHAT_ROOM;
    let out = CLS + `\x1b[1;33m` +
        `  ██████╗██╗  ██╗ █████╗ ████████╗                                       ${CRLF}` +
        ` ██╔════╝██║  ██║██╔══██╗╚══██╔══╝                                       ${CRLF}` +
        ` ██║     ███████║███████║   ██║                                          ${CRLF}` +
        ` ██║     ██╔══██║██╔══██║   ██║                                          ${CRLF}` +
        ` ╚██████╗██║  ██║██║  ██║   ██║                                          ${CRLF}` +
        `  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝                                          ${CRLF}\x1b[0m${CRLF}` +
        ` \x1b[1;32mSohbet odasına hoş geldin! Çıkmak için /Q yaz.${CRLF} PM göndermek için: /MSG <kullanıcı> <mesaj>${CRLF}──────────────────────────────────────────\x1b[0m${CRLF}`;
    
    const history = db.prepare('SELECT m.message, u.username, m.created_at FROM chat_messages m JOIN users u ON m.author_id = u.id ORDER BY m.created_at DESC LIMIT 15').all();
    history.reverse().forEach(h => {
        const time = new Date(h.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        out += `\x1b[1;30m[${time}]\x1b[0m \x1b[1;36m${h.username}:\x1b[0m ${h.message}${CRLF}`;
    });
    
    socket.emit('data', out + `\x1b[1;33mMesaj: \x1b[0m`);
    broadcastChat(session, `\x1b[32m${session.username} sohbete katıldı.\x1b[0m`, false);
}

function broadcastChat(senderSession, msg, saveToDb = false) {
    if (saveToDb && senderSession.userId) {
        db.prepare('INSERT INTO chat_messages (author_id, message) VALUES (?, ?)').run(senderSession.userId, msg.split(':\x1b[0m ')[1] || msg);
    }
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    activeSessions.forEach((s) => {
        if (s.state === STATES.CHAT_ROOM) {
            io.to(s.socketId).emit('data', `\x1b[1G\x1b[K\x1b[1;30m[${time}]\x1b[0m ${msg}${CRLF}\x1b[1;33mMesaj: \x1b[0m`);
        }
    });
}

function showAreaList(socket, session) {
    session.state = STATES.AREA_LIST;
    const areas = db.prepare('SELECT * FROM message_areas').all();
    let out = CLS + `\x1b[1;33m` +
        ` ███╗   ███╗███████╗███████╗███████╗ █████╗  ██████╗ █████╗ ███████╗     ${CRLF}` +
        ` ████╗ ████║██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗██╔════╝     ${CRLF}` +
        ` ██╔████╔██║█████╗  ███████╗███████╗███████║██║  ███╗███████║███████╗     ${CRLF}` +
        ` ██║╚██╔╝██║██╔══╝  ╚════██║╚════██║██╔══██║██║   ██║██╔══██║╚════██║     ${CRLF}` +
        ` ██║ ╚═╝ ██║███████╗███████║███████║██║  ██║╚██████╔╝██║  ██║███████║     ${CRLF}` +
        ` ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝     ${CRLF}\x1b[0m${CRLF}`;
    areas.forEach(a => { out += ` [${a.id}] ${a.name}${CRLF}`; });
    socket.emit('data', out + `${CRLF} \x1b[1;33m[Q] Geri (Ana Menü)\x1b[0m${CRLF}${CRLF} Seçiniz: `);
}

function renderSplitView(socket, session) {
    session.state = STATES.READ_MESSAGE_SPLIT;
    const msgs = getMessages(session.currentArea.id);
    let output = CLS + `\x1b[1;34m══ [ ${session.currentArea.name} ] ═══════════════════════════\x1b[0m${CRLF}`;
    const visibleCount = 15;
    const start = Math.max(0, Math.min(msgs.length - visibleCount, session.currentMsgIndex - Math.floor(visibleCount/2)));
    for (let i = start; i < start + visibleCount; i++) {
        if (i >= msgs.length) { output += CRLF; continue; }
        const m = msgs[i]; const isSelected = i === session.currentMsgIndex;
        output += `${isSelected ? '\x1b[1;33m>\x1b[7m' : ' '} ${m.author_name.padEnd(15)} | ${m.subject.slice(0, 45).padEnd(45)} \x1b[0m${CRLF}`;
    }
    output += `\x1b[1;32m═══════════════════════════════════════════════════════════════\x1b[0m${CRLF}`;
    if (msgs.length > 0) {
        const msg = msgs[session.currentMsgIndex];
        output += `\x1b[1;36mFrom: ${msg.author_name.padEnd(20)} To: ${msg.to_user.padEnd(20)} Date: ${new Date(msg.created_at).toLocaleString('tr-TR')}\x1b[0m${CRLF}`;
        output += `\x1b[1;36mSubj: ${msg.subject}\x1b[0m${CRLF}${msg.body.split('\n').slice(0, 15).join(CRLF)}${CRLF}`;
    }
    output += `\x1b[40;1H\x1b[1;33m[\u2191\u2193] Gez, [R] Yanıtla, [W] Yaz, [Q] Geri (Liste)\x1b[0m`;
    socket.emit('data', output);
}

function showFileAreas(socket, session) {
    session.state = STATES.FILE_AREAS;
    const areas = db.prepare('SELECT * FROM file_areas').all();
    let out = CLS + `\x1b[1;33m` +
        ` ███████╗██╗██╗     ███████╗███████╗                                     ${CRLF}` +
        ` ██╔════╝██║██║     ██╔════╝██╔════╝                                     ${CRLF}` +
        ` █████╗  ██║██║     █████╗  ███████╗                                     ${CRLF}` +
        ` ██╔══╝  ██║██║     ██╔══╝  ╚════██║                                     ${CRLF}` +
        ` ██║     ██║███████╗███████╗███████║                                     ${CRLF}` +
        ` ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝                                     ${CRLF}\x1b[0m${CRLF}`;
    areas.forEach(a => { out += ` [${a.id}] ${a.name.padEnd(15)} - ${a.description}${CRLF}`; });
    socket.emit('data', out + `${CRLF} \x1b[1;33m[Q] Geri (Ana Menü)\x1b[0m${CRLF}${CRLF} Seçiniz: `);
}

function showFileList(socket, session) {
    session.state = STATES.FILE_LIST;
    const files = db.prepare('SELECT f.*, u.username as uploader FROM files f JOIN users u ON f.uploader_id = u.id WHERE area_id = ?').all(session.currentFileArea.id);
    let out = CLS + `\x1b[1;36m══ [ ${session.currentFileArea.name} ] ═══════════════════════════\x1b[0m${CRLF}${CRLF}`;
    out += ` \x1b[1;32m ID | Dosya Adı       | Boyut | Yükleyen      | İndirilme\x1b[0m${CRLF}`;
    out += ` ────|────────────────|───────|───────────────|───────────${CRLF}`;
    if (files.length === 0) out += ` \x1b[1;30m   Bu alanda henüz dosya yok.\x1b[0m${CRLF}`;
    files.forEach(f => { out += ` ${f.id.toString().padEnd(2)} | ${f.filename.padEnd(15)} | ${(f.file_size/1024).toFixed(1)}K | ${f.uploader.padEnd(13)} | ${f.download_count}${CRLF}`; });
    out += `${CRLF} \x1b[1;33m[U]\x1b[0m Yükle  \x1b[1;33m[L]\x1b[0m Yenile  \x1b[1;33m[Q]\x1b[0m Geri`;
    if (session.securityLevel >= 90) out += `  \x1b[1;31m[D]\x1b[0m Sil`;
    socket.emit('data', out + `${CRLF}${CRLF} İndirmek için ID yazın veya seçiniz: `);
}

function startDeleteFile(socket, session) { session.state = STATES.FILE_DELETE; socket.emit('data', CRLF + `\x1b[1;31mSilinecek Dosya ID: \x1b[0m`); }
function handleDeleteFile(socket, session, input) {
    const fileId = parseInt(input); const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
    if (file) {
        const filePath = path.join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
        socket.emit('data', CRLF + `\x1b[1;32mDosya silindi.\x1b[0m${CRLF}Devam için bir tuşa basın...`);
    } else socket.emit('data', CRLF + `\x1b[31mDosya bulunamadı.\x1b[0m${CRLF}Devam için bir tuşa basın...`);
    session.state = STATES.FILE_LIST;
}

function showWhoOnline(socket, session) {
    session.state = STATES.WHO_ONLINE;
    let output = CLS + `\x1b[1;33m` +
        ` ██╗    ██╗██╗  ██╗ ██████╗      ██╗███████╗                             ${CRLF}` +
        ` ██║    ██║██║  ██║██╔═══██╗     ██║██╔════╝                             ${CRLF}` +
        ` ██║ █╗ ██║███████║██║   ██║     ██║███████╗                             ${CRLF}` +
        ` ██║███╗██║██╔══██║██║   ██║     ██║╚════██║                             ${CRLF}` +
        ` ╚███╔███╔╝██║  ██║╚██████╔╝     ██║███████║                             ${CRLF}` +
        `  ╚══╝╚══╝ ╚═╝  ╚═╝ ╚═════╝      ╚═╝╚══════╝                             ${CRLF}\x1b[0m${CRLF}`;
    activeSessions.forEach((s) => {
        const duration = Math.floor((Date.now() - s.loginTime) / 1000 / 60);
        output += ` ${s.username.padEnd(15)} | ${duration.toString().padStart(3)} dakika     | ${s.state}${CRLF}`;
    });
    output += `${CRLF} \x1b[1;33m[Q] Geri Dön\x1b[0m`;
    socket.emit('data', output);
}

function enterYoghurt(socket, session) { renderYoghurtMain(socket, session); }
function renderYoghurtMain(socket, session) {
    session.state = STATES.GAME_YOGHURT_MAIN;
    const scores = db.prepare(`SELECT ys.*, u.username FROM yoghurt_scores ys JOIN users u ON ys.user_id = u.id ORDER BY score_ms ASC LIMIT 10`).all();
    let output = CLS + `\x1b[1;33m` +
        ` ██╗   ██╗ ██████╗  ██████╗ ██╗  ██╗██╗   ██╗██████╗ ████████╗           ${CRLF}` +
        ` ╚██╗ ██╔╝██╔═══██╗██╔════╝ ██║  ██║██║   ██║██╔══██╗╚══██╔══╝           ${CRLF}` +
        `  ╚████╔╝ ██║   ██║██║  ███╗███████║██║   ██║██████╔╝   ██║              ${CRLF}` +
        `   ╚██╔╝  ██║   ██║██║   ██║██╔══██║██║   ██║██╔══██╗   ██║              ${CRLF}` +
        `    ██║   ╚██████╔╝╚██████╔╝██║  ██║╚██████╔╝██║  ██║   ██║              ${CRLF}` +
        `    ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝              ${CRLF}\x1b[1;36m              [ by SSG - MaNiAc Web Edition ]\x1b[0m${CRLF}${CRLF}`;
    scores.forEach((s, i) => { output += ` \x1b[1;37m   ${i + 1}. ${s.username.padEnd(15)} : ${(s.score_ms / 1000).toFixed(3)} sn\x1b[0m${CRLF}`; });
    output += `${CRLF} \x1b[1;33m[S]\x1b[0m Oyuna Başla! \x1b[1;33m[Q]\x1b[0m Çıkış${CRLF}${CRLF} \x1b[32mSeçiminiz: \x1b[0m`;
    socket.emit('data', output);
}
function startYoghurtPlay(socket, session) {
    session.state = STATES.GAME_YOGHURT_PLAY; session.gameState.yoghurt = { index: 0, startTime: 0 };
    socket.emit('data', CLS + `\x1b[1;36mYAZIN:\x1b[0m \x1b[1;30m(Çıkmak için ESC veya *)\x1b[0m${CRLF}${CRLF} \x1b[1;37m"${YOGHURT_TEXT}"\x1b[0m${CRLF}${CRLF} \x1b[1;32m>\x1b[1;30m${YOGHURT_TEXT}\x1b[0m\x1b[5;3H`);
}
function handleYoghurtInput(socket, session, char) {
    if (char === '\x1b' || char === '*') { // ESC veya * basılırsa çıkış yap
        session.state = STATES.GAME_YOGHURT_MAIN;
        socket.emit('data', CRLF + CRLF + `\x1b[1;31mOyun iptal edildi.\x1b[0m${CRLF}`);
        setTimeout(() => renderYoghurtMain(socket, session), 1500);
        return;
    }
    
    const y = session.gameState.yoghurt; const targetChar = YOGHURT_TEXT[y.index];
    if (y.index === 0 && y.startTime === 0) y.startTime = Date.now();
    if (char === targetChar) {
        y.index++; socket.emit('data', `\x1b[1;32m${char}\x1b[0m`);
        if (y.index === YOGHURT_TEXT.length) {
            const timeMs = Date.now() - y.startTime;
            db.prepare('INSERT INTO yoghurt_scores (user_id, score_ms) VALUES (?, ?)').run(session.userId, timeMs);
            socket.emit('data', CRLF + CRLF + `\x1b[1;33mBİTTİ! Süre: ${(timeMs/1000).toFixed(3)} sn.\x1b[0m${CRLF}Devam için bir tuşa basın...`);
            session.state = STATES.GAME_YOGHURT_MAIN;
        }
    } else socket.emit('data', `\x1b[41m \x1b[0m\b`);
}
function enterGame(socket, session) {
    let stats = db.prepare('SELECT * FROM player_stats WHERE user_id = ?').get(session.userId);
    if (!stats) db.prepare('INSERT INTO player_stats (user_id) VALUES (?)').run(session.userId);
    session.gameState.player = db.prepare('SELECT * FROM player_stats WHERE user_id = ?').get(session.userId);
    renderGameMain(socket, session);
}

function renderGameMain(socket, session) {
    session.state = STATES.GAME_MAIN; const p = session.gameState.player;
    let out = CLS + `\x1b[1;36m` +
        `      /\\                                                 ${CRLF}` +
        `     /  \\    \x1b[1;33m+---------------------------------------+\x1b[1;36m   ${CRLF}` +
        `    |    |   \x1b[1;33m|\x1b[1;37m   K A R A N L I K   O R M A N I       \x1b[1;33m|\x1b[1;36m   ${CRLF}` +
        `    |    |   \x1b[1;33m+---------------------------------------+\x1b[1;36m   ${CRLF}` +
        `    |    |                                                 ${CRLF}` +
        `  __\\____/__ \x1b[1;32mSeviye:\x1b[0m ${p.level.toString().padEnd(3)} \x1b[1;35mEXP:\x1b[0m ${p.exp}/${p.level*10}   \x1b[1;33mAltın:\x1b[0m ${p.gold}${CRLF}` +
        `  \\___  ___/ \x1b[1;31mCan:\x1b[0m ${p.hp}/${p.max_hp}    \x1b[1;34mStamina:\x1b[0m ${p.stamina}/15${CRLF}` +
        `      ||                                                   ${CRLF}` +
        `      ||     \x1b[1;37m[F]\x1b[0m \x1b[1;32mOrmana Gir\x1b[0m (Yaratık Avı)            ${CRLF}` +
        `      ||     \x1b[1;37m[I]\x1b[0m \x1b[1;36mŞen Dul Han'ı\x1b[0m (Dinlen)              ${CRLF}` +
        `     _||_    \x1b[1;37m[S]\x1b[0m \x1b[1;31mKanlı Demirci\x1b[0m (Geliş)               ${CRLF}` +
        `     \\__/    \x1b[1;37m[Q]\x1b[0m \x1b[1;30mOyunlardan Çık\x1b[0m                      ${CRLF}` +
        `\x1b[0m${CRLF} > `;
    socket.emit('data', out);
}
function startInn(socket, session) {
    session.state = STATES.GAME_INN;
    const p = session.gameState.player;
    let out = CLS + `\x1b[1;33m` +
        `     (  )   (   )  )${CRLF}` +
        `      ) (   )  (  (${CRLF}` +
        `      ( )  (    ) )${CRLF}` +
        `      _____________${CRLF}` +
        `     <_____________> \x1b[1;36m--- ŞEN DUL HAN'I ---\x1b[1;33m${CRLF}` +
        `     |             | \x1b[1;37m"Dışarısı soğuk yolcu, ateşe geç."\x1b[1;33m${CRLF}` +
        `     |   \x1b[1;37mBİRA\x1b[1;33m      | ${CRLF}` +
        `     |             | \x1b[1;33mCebindeki Altın: \x1b[1;37m${p.gold}\x1b[1;33m${CRLF}` +
        `     \\_____________/ ${CRLF}` +
        `                     \x1b[1;37m[1]\x1b[0m \x1b[1;32mTam İyileşme\x1b[0m - \x1b[1;33m10 Altın\x1b[0m${CRLF}` +
        `                     \x1b[1;37m[Q]\x1b[0m \x1b[1;30mGeri Dön\x1b[0m${CRLF}` +
        `\x1b[0m${CRLF} > `;
    socket.emit('data', out);
}
function handleInnHeal(socket, session) {
    const p = session.gameState.player;
    if (p.gold >= 10) {
        p.gold -= 10; p.hp = p.max_hp; p.stamina = 15;
        db.prepare('UPDATE player_stats SET gold = ?, hp = ?, stamina = ? WHERE user_id = ?').run(p.gold, p.hp, p.stamina, session.userId);
        socket.emit('data', `${CRLF}\x1b[1;32mTamamen iyileştin! Dinlenmiş hissediyorsun.\x1b[0m`);
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mYeterli altının yok!\x1b[0m`);
    }
    setTimeout(() => startInn(socket, session), 1500);
}
function startShop(socket, session) {
    session.state = STATES.GAME_SHOP;
    const p = session.gameState.player;
    let out = CLS + `\x1b[1;30m` +
        `       .-------.    \x1b[1;31m--- KANLI DEMİRCİ ---\x1b[1;30m${CRLF}` +
        `      /   _ _   \\   \x1b[1;37m"Zırhın kağıt gibi! Güçlen."\x1b[1;30m${CRLF}` +
        `     |  (   )  |  ${CRLF}` +
        `     |   | |   |    \x1b[1;33mCebindeki Altın: \x1b[1;37m${p.gold}\x1b[1;30m${CRLF}` +
        `   __|   | |   |__  ${CRLF}` +
        `  /  |   |_|   |  \\ \x1b[1;37m[1]\x1b[0m \x1b[1;31mMaksimum Can +5\x1b[0m - \x1b[1;33m20 Altın\x1b[0m${CRLF}` +
        ` |   '---------'   |\x1b[1;37m[Q]\x1b[0m \x1b[1;30mGeri Dön\x1b[0m${CRLF}` +
        `  \\_______________/ \x1b[0m${CRLF}` +
        `${CRLF} > `;
    socket.emit('data', out);
}
function handleShopUpgrade(socket, session) {
    const p = session.gameState.player;
    if (p.gold >= 20) {
        p.gold -= 20; p.max_hp += 5; p.hp += 5;
        db.prepare('UPDATE player_stats SET gold = ?, max_hp = ?, hp = ? WHERE user_id = ?').run(p.gold, p.max_hp, p.hp, session.userId);
        socket.emit('data', `${CRLF}\x1b[1;32mDaha dayanıklı hale geldin! Max HP +5.\x1b[0m`);
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mYeterli altının yok!\x1b[0m`);
    }
    setTimeout(() => startShop(socket, session), 1500);
}
function startForest(socket, session) {
    if (session.gameState.player.stamina <= 0) { socket.emit('data', CRLF + 'Yoruldun!'); setTimeout(() => renderGameMain(socket, session), 1000); return; }
    session.gameState.player.stamina--; db.prepare('UPDATE player_stats SET stamina = stamina - 1 WHERE user_id = ?').run(session.userId);
    const monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)]; session.gameState.enemy = { ...monster };
    session.state = STATES.GAME_BATTLE; 
    let out = CLS + `\x1b[1;31m!!! BİR DÜŞMAN BELİRDİ !!!\x1b[0m${CRLF}${CRLF}`;
    out += ` \x1b[1;37m${monster.icon}\x1b[0m${CRLF}`;
    out += ` \x1b[1;31m${monster.name}\x1b[0m (\x1b[1;33mHP: ${monster.hp}\x1b[0m)${CRLF}${CRLF}`;
    out += ` \x1b[1;32mSenin HP: ${session.gameState.player.hp}/${session.gameState.player.max_hp}\x1b[0m${CRLF}${CRLF}`;
    out += ` \x1b[1;33m[A]\x1b[0m Saldır! \x1b[1;33m[Q]\x1b[0m Kaç!${CRLF}${CRLF} > `;
    socket.emit('data', out);
}
function handleAttack(socket, session) {
    const p = session.gameState.player; const e = session.gameState.enemy;
    if (e.hp <= 0) return; // Düşman zaten öldüyse işlemi durdur (spam koruması)
    
    const pDmg = Math.floor(Math.random() * 5) + 5; const eDmg = Math.floor(Math.random() * 3) + 1;
    e.hp -= pDmg; 
    let out = `\x1b[1G\x1b[K\x1b[1;32mSaldırdın ve ${pDmg} hasar verdin!\x1b[0m (Enemy HP: ${Math.max(0, e.hp)})${CRLF}`;
    
    if (e.hp <= 0) {
        const gold = Math.floor(Math.random() * 10) + 5;
        const exp = Math.floor(Math.random() * 5) + 3;
        p.gold += gold;
        p.exp += exp;
        
        let levelUpMsg = '';
        const expNeeded = p.level * 10;
        if (p.exp >= expNeeded) {
            p.level++;
            p.max_hp += 2;
            p.hp = p.max_hp;
            p.exp -= expNeeded;
            levelUpMsg = `${CRLF}\x1b[1;35m*** LEVEL UP! Seviye ${p.level} oldun! Canın doldu! ***\x1b[0m`;
        }
        
        db.prepare('UPDATE player_stats SET gold = ?, hp = ?, exp = ?, level = ?, max_hp = ? WHERE user_id = ?')
          .run(p.gold, p.hp, p.exp, p.level, p.max_hp, session.userId);
        socket.emit('data', out + `\x1b[1;33mKAZANDIN! ${gold} altın ve ${exp} EXP kazandın.\x1b[0m${levelUpMsg}${CRLF}Devam için bir tuşa basın...`);
        setTimeout(() => renderGameMain(socket, session), 2000); return;
    }
    
    p.hp -= eDmg;
    out += `\x1b[1;31m${e.name} sana saldırdı ve ${eDmg} hasar verdi!\x1b[0m (HP: ${p.hp})${CRLF}${CRLF} > `;
    
    if (p.hp <= 0) {
        p.hp = p.max_hp; p.gold = Math.floor(p.gold / 2);
        db.prepare('UPDATE player_stats SET hp = ?, gold = ? WHERE user_id = ?').run(p.hp, p.gold, session.userId);
        socket.emit('data', CRLF + `\x1b[1;41;37m ÖLDÜN! Altınlarının yarısını kaybettin. \x1b[0m${CRLF}Yeniden doğuyorsun...`);
        setTimeout(() => renderGameMain(socket, session), 2000); return;
    }
    socket.emit('data', out);
}
function showGamesMenu(socket, session) {
    session.state = STATES.GAMES_MENU;
    let output = CLS + `\x1b[1;33m` +
        `  ██████╗  █████╗ ███╗   ███╗███████╗███████╗                            ${CRLF}` +
        ` ██╔════╝ ██╔══██╗████╗ ████║██╔════╝██╔════╝                            ${CRLF}` +
        ` ██║  ███╗███████║██╔████╔██║█████╗  ███████╗                            ${CRLF}` +
        ` ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ╚════██║                            ${CRLF}` +
        ` ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗███████║                            ${CRLF}` +
        `  ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝                            ${CRLF}\x1b[0m${CRLF}`;
    output += ` [1] Quest${CRLF} [2] Yoghurt${CRLF} \x1b[1;33m[Q]\x1b[0m Geri (Ana Menü)${CRLF} Seçim: `;
    socket.emit('data', output);
}

function getMessages(areaId) { return db.prepare('SELECT m.*, u.username as author_name FROM messages m JOIN users u ON m.author_id = u.id WHERE area_id = ? ORDER BY created_at ASC').all(areaId); }

function goToMainMenu(socket, session) {
    session.state = STATES.MAIN_MENU;
    let out = CLS + `\x1b[1;33m` +
        ` ███╗   ███╗ █████╗ ██╗███╗   ██╗    ███╗   ███╗███████╗███╗   ██╗██╗   ██╗  ${CRLF}` +
        ` ████╗ ████║██╔══██╗██║████╗  ██║    ████╗ ████║██╔════╝████╗  ██║██║   ██║  ${CRLF}` +
        ` ██╔████╔██║███████║██║██╔██╗ ██║    ██╔████╔██║█████╗  ██╔██╗ ██║██║   ██║  ${CRLF}` +
        ` ██║╚██╔╝██║██╔══██║██║██║╚██╗██║    ██║╚██╔╝██║██╔══╝  ██║╚██╗██║██║   ██║  ${CRLF}` +
        ` ██║ ╚═╝ ██║██║  ██║██║██║ ╚████║    ██║ ╚═╝ ██║███████╗██║ ╚████║╚██████╔╝  ${CRLF}` +
        ` ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝    ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝   ${CRLF}\x1b[0m${CRLF}`;
    let menu = ` [M] Mesajlar${CRLF} [G] Oyunlar${CRLF} [D] Dosyalar${CRLF} [C] Sohbet${CRLF} [W] Kimler Bağlı?${CRLF}`;
    if (session.securityLevel >= 255) menu += ` \x1b[1;31m[S] SysOp Paneli\x1b[0m${CRLF}`;
    menu += ` [X] Çıkış${CRLF}${CRLF}\x1b[1;36mOnline: ${activeSessions.size} kullanıcı bağlı.\x1b[0m${CRLF} Seçim: `;
    socket.emit('data', out + menu);
}
function getWelcomeLogo() {
    return `${CLS}\x1b[1;33m` +
` ███╗   ███╗ █████╗ ███╗   ██╗██╗ █████╗  ██████╗    ██████╗ ██████╗ ███████╗  ${CRLF}` +
` ████╗ ████║██╔══██╗████╗  ██║██║██╔══██╗██╔════╝    ██╔══██╗██╔══██╗██╔════╝  ${CRLF}` +
` ██╔████╔██║███████║██╔██╗ ██║██║███████║██║         ██████╔╝██████╔╝███████╗  ${CRLF}` +
` ██║╚██╔╝██║██╔══██║██║╚██╗██║██║██╔══██║██║         ██╔══██╗██╔══██╗╚════██║  ${CRLF}` +
` ██║ ╚═╝ ██║██║  ██║██║ ╚████║██║██║  ██║╚██████╗    ██████╔╝██████╔╝███████╗  ${CRLF}` +
` ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝ ╚═════╝    ╚═════╝ ╚═════╝ ╚══════╝  ${CRLF}\x1b[0m${CRLF}` +
` \x1b[1;36m              [ MaNiAc BBS - Web Rebirth v1.0 ]\x1b[0m${CRLF}\x1b[1;32m════════════════════════════════════════════════════════════════════════\x1b[0m${CRLF}\x1b[1;37m Welcome to the digital underground.${CRLF}  System: MaNiAc BBS | Location: Ankara${CRLF}  Connecting to node 1...\x1b[0m${CRLF}`;
}
const YOGHURT_TEXT = "Şu yoğurdu sarımsaklasak da mı saklasak sarımsaklamasak da mı saklasak?";
const MONSTERS = [
    { name: "Orman Cini", hp: 20, icon: " ( ^v^ ) " },
    { name: "Zombi", hp: 30, icon: " [ o.o ] " },
    { name: "Kara Şövalye", hp: 50, icon: " <[X_X]> " }
];
httpServer.listen(PORT, () => { console.log(`BBS Sunucusu http://localhost:${PORT} adresinde çalışıyor.`); });
