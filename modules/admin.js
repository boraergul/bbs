import db from '../database/db.js';
import { STATES, CRLF } from '../config/constants.js';
import { renderHeader, goToMainMenu } from './menu.js';

export function startSysOpMenu(socket, session) {
    if (session.securityLevel < 90) { goToMainMenu(socket, session); return; }
    session.state = STATES.SYSOP_MENU;
    let out = renderHeader() + `\x1b[1;31m--- SYSOP PANELİ ---\x1b[0m${CRLF}`;
    out += `\x1b[1;37m[1]\x1b[0m Kullanıcı Listesi ve Yönetimi${CRLF}`;
    out += `\x1b[1;37m[2]\x1b[0m Sistem Duyurusu Yap (Broadcast)${CRLF}`;
    out += `\x1b[1;37m[Q]\x1b[0m Ana Menüye Dön${CRLF}${CRLF}Seçiminiz: `;
    socket.emit('data', out);
}

export function handleSysOpInput(socket, session, input, activeSessions) {
    if (input === '1') {
        session.state = STATES.SYSOP_USER_LIST;
        const users = db.prepare('SELECT id, username, security_level, created_at FROM users ORDER BY id ASC').all();
        let out = renderHeader() + `\x1b[1;31m--- KULLANICI LİSTESİ ---\x1b[0m${CRLF}`;
        users.forEach(u => {
            out += ` \x1b[1;37m[${u.id}]\x1b[0m \x1b[1;36m${u.username.padEnd(15)}\x1b[0m (Yetki: ${u.security_level}) - Kayıt: ${u.created_at}${CRLF}`;
        });
        out += `${CRLF}\x1b[1;37m[Q]\x1b[0m Geri Dön${CRLF}Yönetmek istediğiniz kullanıcının ID'si: `;
        socket.emit('data', out);
    } else if (input === '2') {
        session.state = STATES.SYSOP_BROADCAST;
        socket.emit('data', `${CRLF}\x1b[1;31mDuyuru Mesajı:\x1b[0m `);
    } else if (input === 'Q') {
        goToMainMenu(socket, session);
    } else {
        startSysOpMenu(socket, session);
    }
}

export function handleSysOpUserList(socket, session, input) {
    if (input === 'Q') { startSysOpMenu(socket, session); return; }
    const userId = parseInt(input);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (user) {
        session.state = STATES.SYSOP_USER_MANAGE;
        session.targetUserId = user.id;
        let out = renderHeader() + `\x1b[1;31m--- KULLANICI YÖNETİMİ: ${user.username} ---\x1b[0m${CRLF}`;
        out += `\x1b[1;37m[1]\x1b[0m Yetki Seviyesini Değiştir (Şu an: ${user.security_level})${CRLF}`;
        out += `\x1b[1;37m[2]\x1b[0m Kullanıcı Adını Değiştir${CRLF}`;
        out += `\x1b[1;37m[Q]\x1b[0m Geri Dön${CRLF}${CRLF}Seçiminiz: `;
        socket.emit('data', out);
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mGeçersiz ID!\x1b[0m${CRLF}`);
        setTimeout(() => handleSysOpInput(socket, session, '1'), 1000);
    }
}

export function handleSysOpUserManage(socket, session, input) {
    if (input === 'Q') { handleSysOpInput(socket, session, '1'); return; }
    if (input === '1') {
        session.state = 'SYSOP_USER_LEVEL';
        socket.emit('data', `${CRLF}\x1b[1;31mYeni Yetki Seviyesi (0-100):\x1b[0m `);
    } else if (input === '2') {
        session.state = STATES.SYSOP_USER_RENAME;
        socket.emit('data', `${CRLF}\x1b[1;31mYeni Kullanıcı Adı:\x1b[0m `);
    } else {
        socket.emit('data', `Geçersiz Seçim.${CRLF}> `);
    }
}

export function handleSysOpUserLevel(socket, session, input) {
    const level = parseInt(input);
    if (!isNaN(level) && level >= 0 && level <= 100) {
        db.prepare('UPDATE users SET security_level = ? WHERE id = ?').run(level, session.targetUserId);
        socket.emit('data', `${CRLF}\x1b[1;32mYetki güncellendi!\x1b[0m${CRLF}`);
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mGeçersiz yetki seviyesi!\x1b[0m${CRLF}`);
    }
    setTimeout(() => {
        const fakeInput = session.targetUserId.toString();
        handleSysOpUserList(socket, session, fakeInput);
    }, 1500);
}

export function handleSysOpUserRename(socket, session, input) {
    if (input.trim().length >= 3) {
        try {
            db.prepare('UPDATE users SET username = ? WHERE id = ?').run(input.trim(), session.targetUserId);
            socket.emit('data', `${CRLF}\x1b[1;32mKullanıcı adı güncellendi!\x1b[0m${CRLF}`);
        } catch (e) {
            socket.emit('data', `${CRLF}\x1b[1;31mBu isim zaten kullanılıyor veya geçersiz!\x1b[0m${CRLF}`);
        }
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mİsim çok kısa!\x1b[0m${CRLF}`);
    }
    setTimeout(() => {
        const fakeInput = session.targetUserId.toString();
        handleSysOpUserList(socket, session, fakeInput);
    }, 1500);
}

export function handleSysOpBroadcast(socket, session, input, activeSessions, io) {
    const msg = input.trim();
    if (msg) {
        const formattedMsg = `${CRLF}\x1b[1;41;37m [SİSTEM DUYURUSU] \x1b[0m \x1b[1;33m${msg}\x1b[0m${CRLF}> `;
        for (let [sid, sess] of activeSessions.entries()) {
            if (sess.state !== STATES.LOGIN_USERNAME && sess.state !== STATES.LOGIN_PASSWORD) {
                io.to(sid).emit('data', formattedMsg);
            }
        }
        socket.emit('data', `${CRLF}\x1b[1;32mDuyuru tüm kullanıcılara gönderildi.\x1b[0m${CRLF}`);
    }
    setTimeout(() => startSysOpMenu(socket, session), 1500);
}
