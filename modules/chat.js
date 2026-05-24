import { STATES, CLS, CRLF } from '../config/constants.js';
import { goToMainMenu } from './menu.js';

export function startChat(socket, session) {
    session.state = STATES.CHAT_ROOM;
    socket.emit('data', CLS + `\x1b[1;36m*** KÜRESEL SOHBET ODASINA KATILDIN ***\x1b[0m${CRLF}`);
    socket.emit('data', `Çıkmak için \x1b[1;37m/q\x1b[0m yazın.${CRLF}\x1b[1;33m---------------------------------------\x1b[0m${CRLF}`);
}

export function handleChatInput(socket, session, input, activeSessions, io) {
    if (input.toUpperCase() === '/Q') {
        goToMainMenu(socket, session);
    } else if (input.trim().length > 0) {
        const msg = `\x1b[1;32m[${session.username}]\x1b[0m: ${input}${CRLF}`;
        for (let [sid, sess] of activeSessions.entries()) {
            if (sess.state === STATES.CHAT_ROOM && sid !== socket.id) {
                io.to(sid).emit('data', `\x1b[1G\x1b[K${msg}> `);
            }
        }
        socket.emit('data', `> `);
    } else {
        socket.emit('data', `> `);
    }
}
