import { STATES, CLS, CRLF } from '../config/constants.js';
import { renderHeader, goToMainMenu } from '../modules/menu.js';
import { enterYoghurt } from './yoghurt.js';
import { enterGame } from './quest/index.js';

export function showGamesMenu(socket, session) {
    session.state = STATES.GAMES_MENU;
    let out = renderHeader() + `\x1b[1;33m--- OYUNLAR ---\x1b[0m${CRLF}`;
    out += `\x1b[1;37m[1]\x1b[0m Quest RPG (Macera & Savaş)${CRLF}`;
    out += `\x1b[1;37m[2]\x1b[0m Yoghurt Typing (Hız Testi)${CRLF}`;
    out += `\x1b[1;37m[Q]\x1b[0m Ana Menüye Dön${CRLF}${CRLF}Seçiminiz: `;
    socket.emit('data', out);
}

export function handleGamesMenuInput(socket, session, input) {
    if (input === '1') enterGame(socket, session);
    else if (input === '2') enterYoghurt(socket, session);
    else if (input === 'Q') goToMainMenu(socket, session);
    else showGamesMenu(socket, session);
}
