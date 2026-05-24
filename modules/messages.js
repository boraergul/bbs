import db from '../database/db.js';
import { STATES, CRLF } from '../config/constants.js';
import { renderHeader, goToMainMenu } from './menu.js';
import { startEditor } from '../core/editor.js';

export function getMessages(areaId) {
    const rows = db.prepare('SELECT * FROM messages WHERE area_id = ? ORDER BY id ASC').all(areaId);
    let msgs = [];
    let msgMap = {};
    rows.forEach(r => {
        r.children = [];
        msgMap[r.id] = r;
        if (r.parent_id === null) msgs.push(r);
        else if (msgMap[r.parent_id]) msgMap[r.parent_id].children.push(r);
    });
    
    let flat = [];
    function flatten(list, depth = 0) {
        list.forEach(m => {
            m.depth = depth;
            flat.push(m);
            flatten(m.children, depth + 1);
        });
    }
    flatten(msgs);
    return flat;
}

export function showAreaList(socket, session) {
    session.state = STATES.AREA_LIST;
    const areas = db.prepare('SELECT * FROM message_areas ORDER BY id ASC').all();
    let out = renderHeader() + `\x1b[1;33m--- MESAJ PANOLARI ---\x1b[0m${CRLF}`;
    areas.forEach(a => {
        out += ` \x1b[1;37m[${a.id}]\x1b[0m \x1b[1;36m${a.name}\x1b[0m - ${a.description}${CRLF}`;
    });
    out += `${CRLF}\x1b[1;37m[Q]\x1b[0m Ana Menüye Dön${CRLF}${CRLF}Seçiminiz: `;
    socket.emit('data', out);
}

export function renderSplitView(socket, session) {
    session.state = STATES.READ_MESSAGE_SPLIT;
    const msgs = getMessages(session.currentArea.id);
    let out = renderHeader() + `\x1b[1;33m--- PANO: ${session.currentArea.name} ---\x1b[0m${CRLF}`;
    
    // Top Half: Thread List
    const pageSize = 5;
    const totalPages = Math.ceil(msgs.length / pageSize) || 1;
    const currentPage = Math.floor(session.currentMsgIndex / pageSize);
    const startIdx = currentPage * pageSize;
    const endIdx = Math.min(startIdx + pageSize, msgs.length);
    
    out += `\x1b[1;30m[ Mesaj Listesi | Sayfa ${currentPage+1}/${totalPages} ]\x1b[0m${CRLF}`;
    if (msgs.length === 0) {
        out += `  \x1b[1;31mHiç mesaj yok.\x1b[0m${CRLF}`;
    } else {
        for (let i = startIdx; i < endIdx; i++) {
            const m = msgs[i];
            const prefix = i === session.currentMsgIndex ? '\x1b[1;32m>\x1b[0m ' : '  ';
            const indent = '  '.repeat(m.depth);
            out += `${prefix}${indent}\x1b[1;36m${m.subject}\x1b[0m (Yazan: \x1b[1;37m${m.author_name}\x1b[0m)${CRLF}`;
        }
    }
    out += `\x1b[1;30m------------------------------------------------------------------------\x1b[0m${CRLF}`;
    
    // Bottom Half: Selected Message Reader
    if (msgs.length > 0) {
        const selected = msgs[session.currentMsgIndex];
        out += `\x1b[1;35mKimden:\x1b[0m \x1b[1;37m${selected.author_name}\x1b[0m${CRLF}`;
        out += `\x1b[1;35mTarih :\x1b[0m \x1b[1;37m${selected.created_at}\x1b[0m${CRLF}`;
        out += `\x1b[1;35mKonu  :\x1b[0m \x1b[1;33m${selected.subject}\x1b[0m${CRLF}`;
        out += `\x1b[1;30m--- Mesaj Başlangıcı ---\x1b[0m${CRLF}`;
        out += `\x1b[1;37m${selected.body}\x1b[0m${CRLF}`;
        out += `\x1b[1;30m--- Mesaj Sonu ---\x1b[0m${CRLF}${CRLF}`;
    }
    
    out += `\x1b[1;37m[N]\x1b[0m İleri  \x1b[1;37m[P]\x1b[0m Geri  \x1b[1;37m[W]\x1b[0m Yeni Mesaj  `;
    if (msgs.length > 0) out += `\x1b[1;37m[R]\x1b[0m Cevapla  `;
    out += `\x1b[1;37m[Q]\x1b[0m Panolara Dön${CRLF}> `;
    
    socket.emit('data', out);
}

export function handleMessageListInput(socket, session, input) {
    const msgs = getMessages(session.currentArea.id);
    if (input === 'Q') showAreaList(socket, session);
    else if (input === 'W') startWritingMessage(socket, session);
    else if (input === 'R' && msgs.length > 0) startWritingMessage(socket, session, true);
    else if (input === 'N' && session.currentMsgIndex < msgs.length - 1) {
        session.currentMsgIndex++; renderSplitView(socket, session);
    }
    else if (input === 'P' && session.currentMsgIndex > 0) {
        session.currentMsgIndex--; renderSplitView(socket, session);
    }
    else renderSplitView(socket, session);
}

export function startWritingMessage(socket, session, isReply = false) {
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
