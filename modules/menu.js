import db from '../database/db.js';
import { STATES, CLS, CRLF } from '../config/constants.js';

export function renderHeader() {
    return CLS + 
        `\x1b[1;35m  __  __         \x1b[1;36m _   _  _             \x1b[1;33m ____  ____  ____  ${CRLF}` +
        `\x1b[1;35m |  \\/  |  __ _  \x1b[1;36m| \\ | |(_)  __ _   __ \x1b[1;33m| __ )| __ )/ ___| ${CRLF}` +
        `\x1b[1;35m | |\\/| | / _\` | \x1b[1;36m|  \\| || | / _\` | / _|\x1b[1;33m|  _ \\|  _ \\\\___ \\ ${CRLF}` +
        `\x1b[1;35m | |  | || (_| | \x1b[1;36m| |\\  || || (_| || (__\x1b[1;33m| |_) | |_) |___) |${CRLF}` +
        `\x1b[1;35m |_|  |_| \\__,_| \x1b[1;36m|_| \\_||_| \\__,_| \\___|\x1b[1;33m|____/|____/|____/ ${CRLF}` +
        `\x1b[0m${CRLF}`;
}

export function showMainMenu(socket, session) {
    session.state = STATES.MAIN_MENU;
    const unreadMsg = db.prepare('SELECT COUNT(*) as c FROM private_messages WHERE receiver_id = ? AND is_read = 0').get(session.userId);
    const unreadText = unreadMsg.c > 0 ? `\x1b[1;31m(${unreadMsg.c} Yeni)\x1b[0m` : '';
    
    socket.emit('data', renderHeader() + 
        `\x1b[1;33m--- ANA MENÜ ---\x1b[0m${CRLF}` +
        `\x1b[1;37m[M]\x1b[0m Mesaj Panoları${CRLF}` +
        `\x1b[1;37m[P]\x1b[0m Posta Kutusu ${unreadText}${CRLF}` +
        `\x1b[1;37m[F]\x1b[0m Dosya Arşivi${CRLF}` +
        `\x1b[1;37m[C]\x1b[0m Küresel Sohbet Odası${CRLF}` +
        `\x1b[1;37m[G]\x1b[0m Oyunlar${CRLF}` +
        `\x1b[1;37m[W]\x1b[0m Kimler Çevrimiçi?${CRLF}` +
        (session.securityLevel >= 90 ? `\x1b[1;31m[S]\x1b[0m SysOp Paneli${CRLF}` : '') +
        `\x1b[1;37m[Q]\x1b[0m Çıkış (Bağlantıyı Kes)${CRLF}${CRLF}` +
        `Seçiminiz: `
    );
}

export function goToMainMenu(socket, session) {
    showMainMenu(socket, session);
}

export function showWhoOnline(socket, session, activeSessions) {
    session.state = STATES.WHO_ONLINE;
    let out = renderHeader() + `\x1b[1;33m--- ÇEVRİMİÇİ KULLANICILAR ---\x1b[0m${CRLF}`;
    let i = 1;
    for (let [sid, sess] of activeSessions.entries()) {
        const adminMark = sess.securityLevel >= 90 ? `\x1b[1;31m[SysOp]\x1b[0m` : '';
        out += ` ${i}. \x1b[1;36m${sess.username}\x1b[0m ${adminMark} - Durum: ${sess.state}${CRLF}`;
        i++;
    }
    out += `${CRLF}\x1b[1;37m[Q]\x1b[0m Ana Menüye Dön${CRLF}${CRLF}> `;
    socket.emit('data', out);
}
