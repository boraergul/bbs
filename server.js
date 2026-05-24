import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import db from './database/db.js';
import { STATES, immediateStates } from './config/constants.js';
import { handleState } from './core/state_manager.js';
import { handleYoghurtPlay } from './games/yoghurt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    maxHttpBufferSize: 1e8 // 100MB
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Dosya İndirme Route (Counter Artırma)
app.get('/download/:id', (req, res) => {
    const fileId = req.params.id;
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
    if (file) {
        db.prepare('UPDATE files SET download_count = download_count + 1 WHERE id = ?').run(fileId);
        res.download(path.join(__dirname, 'uploads', file.filename));
    } else {
        res.status(404).send('Dosya bulunamadı.');
    }
});

const activeSessions = new Map();

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
        targetUserId: null
    };
    
    activeSessions.set(socket.id, session);
    
    socket.emit('data', '\x1b[2J\x1b[H' +
        `\x1b[1;35m  __  __         \x1b[1;36m _   _  _             \x1b[1;33m ____  ____  ____  \r\n` +
        `\x1b[1;35m |  \\/  |  __ _  \x1b[1;36m| \\ | |(_)  __ _   __ \x1b[1;33m| __ )| __ )/ ___| \r\n` +
        `\x1b[1;35m | |\\/| | / _\` | \x1b[1;36m|  \\| || | / _\` | / _|\x1b[1;33m|  _ \\|  _ \\\\___ \\ \r\n` +
        `\x1b[1;35m | |  | || (_| | \x1b[1;36m| |\\  || || (_| || (__\x1b[1;33m| |_) | |_) |___) |\r\n` +
        `\x1b[1;35m |_|  |_| \\__,_| \x1b[1;36m|_| \\_||_| \\__,_| \\___|\x1b[1;33m|____/|____/|____/ \x1b[0m\r\n\r\n` +
` \x1b[1;36m              [ MaNiAc BBS - Web Rebirth v1.0 ]\x1b[0m\r\n\x1b[1;32m════════════════════════════════════════════════════════════════════════\x1b[0m\r\n\x1b[1;37m Welcome to the digital underground.\r\n  System: MaNiAc BBS | Location: Ankara\r\n  Connecting to node 1...\x1b[0m\r\n\r\n` +
`\x1b[1;33mKullanıcı Adı:\x1b[0m `);

    socket.on('data', (data) => {
        if (session.state === STATES.GAME_YOGHURT_PLAY) {
            handleYoghurtPlay(socket, session, data);
            return;
        }

        if (data === '\b' || data === '\x7f') {
            if (session.buffer.length > 0) {
                session.buffer = session.buffer.slice(0, -1);
                socket.emit('data', '\b \b');
            }
        } else if (data === '\r' || data === '\n') {
            const input = session.buffer;
            session.buffer = '';
            socket.emit('data', '\r\n');
            handleState(socket, session, input, activeSessions, io);
        } else {
            const charInput = data.toLocaleUpperCase('tr-TR');
            
            if (immediateStates.includes(session.state)) {
                session.buffer = ''; 
                handleState(socket, session, charInput, activeSessions, io);
            } else {
                session.buffer += data;
                const isPasswordState = session.state === STATES.LOGIN_PASSWORD || session.state === STATES.REGISTER_PASSWORD;
                socket.emit('data', isPasswordState ? '*' : data);
            }
        }
    });

    socket.on('file-upload', (fileData) => {
        if (session.state === STATES.FILE_LIST && session.currentFileArea) {
            try {
                const uniqueName = Date.now() + '_' + fileData.name;
                const filePath = path.join(__dirname, 'uploads', uniqueName);
                import('fs').then(fs => {
                    fs.writeFileSync(filePath, Buffer.from(fileData.data));
                    db.prepare('INSERT INTO files (area_id, uploader_id, uploader_name, filename, size, description) VALUES (?, ?, ?, ?, ?, ?)')
                      .run(session.currentFileArea.id, session.userId, session.username, uniqueName, fileData.size, 'Kullanıcı Yüklemesi');
                    socket.emit('data', `\r\n\x1b[1;32mDosya başarıyla yüklendi: ${fileData.name}\x1b[0m\r\n`);
                    setTimeout(() => handleState(socket, session, 'L', activeSessions, io), 1500); // L refresh list
                });
            } catch (e) {
                socket.emit('data', `\r\n\x1b[1;31mDosya yükleme hatası: ${e.message}\x1b[0m\r\n`);
            }
        }
    });

    socket.on('disconnect', () => {
        activeSessions.delete(socket.id);
    });
});

httpServer.listen(PORT, () => { 
    console.log(`BBS Sunucusu http://localhost:${PORT} adresinde çalışıyor.`); 
});
