import db from '../database/db.js';
import { STATES, CRLF } from '../config/constants.js';
import { showMailboxMenu } from '../modules/mailbox.js';
import { showAreaList } from '../modules/messages.js';

export function startEditor(socket, session, isReply = false) {
    socket.emit('data', `${CRLF}\x1b[1;33m--- LİNE EDİTÖRÜ ---\x1b[0m${CRLF}`);
    socket.emit('data', `Mesajınızı yazın. Bitirmek için yeni satırda \x1b[1;37m.S\x1b[0m yazın.${CRLF}`);
    socket.emit('data', `İptal için \x1b[1;37m.A\x1b[0m yazın.${CRLF}`);
    socket.emit('data', `Önceki satırları görmek için \x1b[1;37m.L\x1b[0m yazın.${CRLF}`);
    socket.emit('data', `\x1b[1;33m--------------------\x1b[0m${CRLF}`);
    if (isReply && session.tempMessage.parentId) {
        let parent;
        if (session.state === STATES.MAILBOX_WRITE_BODY) {
            parent = db.prepare('SELECT * FROM private_messages WHERE id = ?').get(session.tempMessage.parentId);
        } else {
            parent = db.prepare('SELECT * FROM messages WHERE id = ?').get(session.tempMessage.parentId);
        }
        
        if (parent) {
            const lines = parent.body.split('\n');
            const snippet = lines.slice(0, 3).map(l => `> ${l}`).join(CRLF);
            socket.emit('data', `\x1b[1;30mAlıntı:\x1b[0m${CRLF}\x1b[1;36m${snippet}${lines.length > 3 ? CRLF + '> ...' : ''}\x1b[0m${CRLF}${CRLF}`);
        }
    }
    socket.emit('data', `1: `);
}

export function handleEditorInput(socket, session, input) {
    const cmd = input.trim().toUpperCase();
    
    if (cmd === '.S') {
        const fullBody = session.tempMessage.body.join('\n');
        
        if (session.state === STATES.MAILBOX_WRITE_BODY) {
            const rcvr = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(session.tempMessage.to);
            if (rcvr) {
                db.prepare('INSERT INTO private_messages (sender_id, receiver_id, subject, body, parent_id) VALUES (?, ?, ?, ?, ?)')
                  .run(session.userId, rcvr.id, session.tempMessage.subject, fullBody, session.tempMessage.parentId);
                socket.emit('data', CRLF + `\x1b[1;32mMesaj başarıyla gönderildi.\x1b[0m${CRLF}`);
            } else {
                socket.emit('data', CRLF + `\x1b[1;31mAlıcı bulunamadı.\x1b[0m${CRLF}`);
            }
            setTimeout(() => showMailboxMenu(socket, session), 1500);
        } else {
            db.prepare('INSERT INTO messages (area_id, author_id, author_name, subject, body, parent_id) VALUES (?, ?, ?, ?, ?, ?)')
              .run(session.currentArea.id, session.userId, session.username, session.tempMessage.subject, fullBody, session.tempMessage.parentId);
            socket.emit('data', CRLF + `\x1b[1;32mMesaj kaydedildi.\x1b[0m${CRLF}`);
            setTimeout(() => showAreaList(socket, session), 1500);
        }
    } else if (cmd === '.A') {
        socket.emit('data', CRLF + `\x1b[1;31mİptal edildi.\x1b[0m${CRLF}`);
        setTimeout(() => {
            if (session.state === STATES.MAILBOX_WRITE_BODY) showMailboxMenu(socket, session);
            else showAreaList(socket, session);
        }, 1500);
    } else if (cmd === '.L') {
        socket.emit('data', CRLF + `\x1b[1;36m-- Mevcut Mesajınız --\x1b[0m${CRLF}`);
        session.tempMessage.body.forEach((line, idx) => {
            socket.emit('data', `${idx + 1}: ${line}${CRLF}`);
        });
        socket.emit('data', `\x1b[1;36m----------------------\x1b[0m${CRLF}`);
        socket.emit('data', `${session.tempMessage.body.length + 1}: `);
    } else {
        session.tempMessage.body.push(input);
        socket.emit('data', `${session.tempMessage.body.length + 1}: `);
    }
}
