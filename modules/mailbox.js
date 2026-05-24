import db from '../database/db.js';
import { STATES, CRLF } from '../config/constants.js';
import { renderHeader, goToMainMenu } from './menu.js';
import { startEditor } from '../core/editor.js';

export function showMailboxMenu(socket, session) {
    session.state = STATES.MAILBOX_MENU;
    const msgs = db.prepare('SELECT p.*, u.username as sender_name FROM private_messages p JOIN users u ON p.sender_id = u.id WHERE p.receiver_id = ? ORDER BY p.id DESC').all(session.userId);
    
    if (session.currentMsgIndex === undefined || session.currentMsgIndex >= msgs.length) {
        session.currentMsgIndex = 0;
    }

    let out = renderHeader() + `\x1b[1;33m--- ÇEVRİMDIŞI POSTA KUTUSU ---\x1b[0m${CRLF}`;
    
    // Top Half: Message List
    const pageSize = 5;
    const totalPages = Math.ceil(msgs.length / pageSize) || 1;
    const currentPage = Math.floor(session.currentMsgIndex / pageSize);
    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, msgs.length);
    
    out += `\x1b[1;30m[ Gelen Mesajlar | Sayfa ${currentPage+1}/${totalPages} ]\x1b[0m${CRLF}`;
    if (msgs.length === 0) {
        out += `  \x1b[1;31mPosta kutun boş.\x1b[0m${CRLF}`;
    } else {
        for (let i = startIdx; i < endIdx; i++) {
            const m = msgs[i];
            const prefix = i === session.currentMsgIndex ? '\x1b[1;32m>\x1b[0m ' : '  ';
            const status = m.is_read ? ' ' : '\x1b[1;32m*\x1b[0m';
            const subject = (m.subject || "Konu Yok").substring(0, 40);
            out += `${prefix}${status} \x1b[1;36m${m.sender_name.padEnd(15)}\x1b[0m | ${subject}${CRLF}`;
        }
    }
    out += `\x1b[1;30m------------------------------------------------------------------------\x1b[0m${CRLF}`;
    
    // Bottom Half: Selected Message Reader
    const selected = msgs[session.currentMsgIndex];
    if (selected) {
        if (!selected.is_read) {
            db.prepare('UPDATE private_messages SET is_read = 1 WHERE id = ?').run(selected.id);
        }
        out += `\x1b[1;35mKimden:\x1b[0m \x1b[1;37m${selected.sender_name}\x1b[0m${CRLF}`;
        out += `\x1b[1;35mTarih :\x1b[0m \x1b[1;37m${selected.created_at}\x1b[0m${CRLF}`;
        out += `\x1b[1;35mKonu  :\x1b[0m \x1b[1;33m${selected.subject || "Konu Yok"}\x1b[0m${CRLF}`;
        out += `\x1b[1;30m--- Mesaj Başlangıcı ---\x1b[0m${CRLF}`;
        out += `\x1b[1;37m${selected.body}\x1b[0m${CRLF}`;
        out += `\x1b[1;30m--- Mesaj Sonu ---\x1b[0m${CRLF}${CRLF}`;
    }
    
    out += `\x1b[1;37m[N]\x1b[0m İleri  \x1b[1;37m[P]\x1b[0m Geri  \x1b[1;37m[W]\x1b[0m Yeni  \x1b[1;37m[R]\x1b[0m Cevap  \x1b[1;37m[D]\x1b[0m Sil  \x1b[1;37m[Q]\x1b[0m Çık${CRLF}> `;
    
    socket.emit('data', out);
}


