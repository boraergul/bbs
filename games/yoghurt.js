import db from '../database/db.js';
import { STATES, CLS, CRLF } from '../config/constants.js';
import { YOGHURT_TEXT } from '../config/game_data.js';

export function enterYoghurt(socket, session) {
    session.gameState.yoghurt = { index: 0, startTime: 0 };
    renderYoghurtMain(socket, session);
}

export function renderYoghurtMain(socket, session) {
    session.state = STATES.GAME_YOGHURT_MAIN;
    
    const scores = db.prepare(`
        SELECT u.username, y.score_ms 
        FROM yoghurt_scores y 
        JOIN users u ON y.user_id = u.id 
        ORDER BY y.score_ms ASC 
        LIMIT 10
    `).all();

    let hofStr = `\x1b[1;33m   [ HALL OF FAME ]\x1b[0m${CRLF}`;
    if (scores.length === 0) {
        hofStr += `\x1b[1;30m   Henüz skor yok...\x1b[0m${CRLF}`;
    } else {
        scores.forEach((s, i) => {
            const rank = (i + 1).toString().padStart(2, ' ');
            const user = s.username.padEnd(15, ' ');
            const time = (s.score_ms / 1000).toFixed(3);
            hofStr += `\x1b[1;37m ${rank}. \x1b[1;36m${user} \x1b[1;32m${time} sn\x1b[0m${CRLF}`;
        });
    }

    let out = CLS + `\x1b[1;36m` +
` __  __              _                 _   ${CRLF}` +
` \\ \\/ /___   __ _  | |__   _   _  _ __| |_ ${CRLF}` +
`  \\  // _ \\ / _\` | | '_ \\ | | | || '__| __|${CRLF}` +
`  / /| (_) | (_| | | | | || |_| || |  | |_ ${CRLF}` +
` /_/  \\___/ \\__, | |_| |_| \\__,_||_|   \\__|${CRLF}` +
`            |___/                          ${CRLF}\x1b[0m` +
`${CRLF}${hofStr}${CRLF}` +
`\x1b[1;37m[S]\x1b[0m \x1b[1;33mOyuna Başla\x1b[0m${CRLF}` +
`\x1b[1;37m[Q]\x1b[0m \x1b[1;30mOyunlardan Çık\x1b[0m${CRLF}${CRLF} > `;
    socket.emit('data', out);
}

export function startYoghurtPlay(socket, session) {
    session.state = STATES.GAME_YOGHURT_PLAY;
    session.gameState.yoghurt = { index: 0, startTime: 0 };
    let out = CLS + `\x1b[1;31m!!! YAZMAYA BAŞLA !!!\x1b[0m${CRLF}${CRLF}`;
    out += `\x1b[1;37mHedef Metin:\x1b[0m${CRLF}\x1b[1;33m${YOGHURT_TEXT}\x1b[0m${CRLF}${CRLF}`;
    out += `\x1b[1;36mSenin Yazdığın:\x1b[0m${CRLF}`;
    socket.emit('data', out);
}

export function handleYoghurtPlay(socket, session, char) {
    const y = session.gameState.yoghurt; 
    const targetChar = YOGHURT_TEXT[y.index];
    if (y.index === 0 && y.startTime === 0) y.startTime = Date.now();
    if (char === targetChar) {
        y.index++; socket.emit('data', `\x1b[1;32m${char}\x1b[0m`);
        if (y.index === YOGHURT_TEXT.length) {
            const timeMs = Date.now() - y.startTime;
            db.prepare('INSERT INTO yoghurt_scores (user_id, score_ms) VALUES (?, ?)').run(session.userId, timeMs);
            socket.emit('data', CRLF + CRLF + `\x1b[1;33mBİTTİ! Süre: ${(timeMs/1000).toFixed(3)} sn.\x1b[0m${CRLF}Devam için bir tuşa basın...`);
            session.state = STATES.GAME_YOGHURT_MAIN;
        }
    } else {
        socket.emit('data', `\x1b[41m \x1b[0m\b`);
    }
}
