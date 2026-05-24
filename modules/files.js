import db from '../database/db.js';
import { STATES, CRLF } from '../config/constants.js';
import { renderHeader, goToMainMenu } from './menu.js';

export function showFileAreas(socket, session) {
    session.state = STATES.FILE_AREAS;
    const areas = db.prepare('SELECT * FROM file_areas ORDER BY id ASC').all();
    let out = renderHeader() + `\x1b[1;33m--- DOSYA ARŞİVLERİ ---\x1b[0m${CRLF}`;
    areas.forEach(a => {
        out += ` \x1b[1;37m[${a.id}]\x1b[0m \x1b[1;36m${a.name}\x1b[0m - ${a.description}${CRLF}`;
    });
    out += `${CRLF}\x1b[1;37m[Q]\x1b[0m Ana Menüye Dön${CRLF}${CRLF}Seçiminiz: `;
    socket.emit('data', out);
}

export function showFileList(socket, session) {
    session.state = STATES.FILE_LIST;
    const files = db.prepare('SELECT * FROM files WHERE area_id = ? ORDER BY id ASC').all(session.currentFileArea.id);
    let out = renderHeader() + `\x1b[1;33m--- ARŞİV: ${session.currentFileArea.name} ---\x1b[0m${CRLF}`;
    
    if (files.length === 0) {
        out += `  \x1b[1;31mBu alanda henüz dosya yok.\x1b[0m${CRLF}`;
    } else {
        files.forEach(f => {
            const kb = (f.size / 1024).toFixed(1);
            out += ` \x1b[1;37m[${f.id}]\x1b[0m \x1b[1;36m${f.filename}\x1b[0m (${kb} KB) - İndirilme: ${f.download_count}${CRLF}`;
            out += `     Yükleyen: \x1b[1;32m${f.uploader_name}\x1b[0m | ${f.description}${CRLF}`;
        });
    }
    
    out += `${CRLF}\x1b[1;37m[U]\x1b[0m Dosya Yükle  `;
    if (session.securityLevel >= 90) out += `\x1b[1;31m[D]\x1b[0m Dosya Sil  `;
    out += `\x1b[1;37m[L]\x1b[0m Yenile  \x1b[1;37m[Q]\x1b[0m Arşivlere Dön${CRLF}`;
    out += `İndirmek istediğiniz dosya no: `;
    socket.emit('data', out);
}

export function startDeleteFile(socket, session) {
    session.state = STATES.FILE_DELETE;
    socket.emit('data', `${CRLF}\x1b[1;31mSilinecek Dosya ID:\x1b[0m `);
}

export function handleDeleteFile(socket, session, input) {
    const fileId = parseInt(input);
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
    if (file) {
        try {
            // Need fs logic here, but avoiding node's fs for now since it's just DB logic in demo.
            // In full implementation, we'd import fs and fs.unlinkSync(path.join(uploadsDir, file.filename))
            db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
            socket.emit('data', `${CRLF}\x1b[1;32mDosya başarıyla silindi.\x1b[0m${CRLF}`);
        } catch(e) {
            socket.emit('data', `${CRLF}\x1b[1;31mHata: ${e.message}\x1b[0m${CRLF}`);
        }
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mDosya bulunamadı.\x1b[0m${CRLF}`);
    }
    setTimeout(() => showFileList(socket, session), 1500);
}
