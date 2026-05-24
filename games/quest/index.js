import db from '../../database/db.js';
import { STATES, CLS, CRLF } from '../../config/constants.js';

export function enterGame(socket, session) {
    let stats = db.prepare('SELECT * FROM player_stats WHERE user_id = ?').get(session.userId);
    if (!stats) db.prepare('INSERT INTO player_stats (user_id) VALUES (?)').run(session.userId);
    session.gameState.player = db.prepare('SELECT * FROM player_stats WHERE user_id = ?').get(session.userId);
    renderGameMain(socket, session);
}

export function renderGameMain(socket, session) {
    session.state = STATES.GAME_MAIN; 
    const p = session.gameState.player;
    let out = CLS + `\x1b[1;36m` +
        `      /\\                                                 ${CRLF}` +
        `     /  \\    \x1b[1;33m+---------------------------------------+\x1b[1;36m   ${CRLF}` +
        `    |    |   \x1b[1;33m|\x1b[1;37m   K A R A N L I K   O R M A N I       \x1b[1;33m|\x1b[1;36m   ${CRLF}` +
        `    |    |   \x1b[1;33m+---------------------------------------+\x1b[1;36m   ${CRLF}` +
        `    |    |                                                 ${CRLF}` +
        `  __\\____/__ \x1b[1;32mSeviye:\x1b[0m ${p.level.toString().padEnd(3)} \x1b[1;35mEXP:\x1b[0m ${p.exp}/${p.level*10}   \x1b[1;33mAltın:\x1b[0m ${p.gold}${CRLF}` +
        `  \\___  ___/ \x1b[1;31mCan:\x1b[0m ${p.hp}/${p.max_hp}    \x1b[1;34mStamina:\x1b[0m ${p.stamina}/15${CRLF}` +
        `      ||                                                   ${CRLF}` +
        `      ||     \x1b[1;37m[F]\x1b[0m \x1b[1;32mOrmana Gir\x1b[0m (Yaratık Avı)            ${CRLF}` +
        `      ||     \x1b[1;37m[E]\x1b[0m \x1b[1;35mEnvanter\x1b[0m (Eşyalar ve Durum)         ${CRLF}` +
        `     _||_    \x1b[1;37m[I]\x1b[0m \x1b[1;36mŞen Dul Han'ı\x1b[0m (Dinlen)              ${CRLF}` +
        `     \\__/    \x1b[1;37m[S]\x1b[0m \x1b[1;31mKanlı Demirci\x1b[0m (Dükkan)              ${CRLF}` +
        `             \x1b[1;37m[Q]\x1b[0m \x1b[1;30mOyunlardan Çık\x1b[0m                      ${CRLF}` +
        `\x1b[0m${CRLF} > `;
    socket.emit('data', out);
}

export function startInn(socket, session) {
    session.state = STATES.GAME_INN;
    const p = session.gameState.player;
    let out = CLS + `\x1b[1;33m` +
        `     (  )   (   )  )${CRLF}` +
        `      ) (   )  (  (${CRLF}` +
        `      ( )  (    ) )${CRLF}` +
        `      _____________${CRLF}` +
        `     <_____________> \x1b[1;36m--- ŞEN DUL HAN'I ---\x1b[1;33m${CRLF}` +
        `     |             | \x1b[1;37m"Dışarısı soğuk yolcu, ateşe geç."\x1b[1;33m${CRLF}` +
        `     |   \x1b[1;37mBİRA\x1b[1;33m      | ${CRLF}` +
        `     |             | \x1b[1;33mCebindeki Altın: \x1b[1;37m${p.gold}\x1b[1;33m${CRLF}` +
        `     \\_____________/ ${CRLF}` +
        `                     \x1b[1;37m[1]\x1b[0m \x1b[1;32mTam İyileşme\x1b[0m - \x1b[1;33m10 Altın\x1b[0m${CRLF}` +
        `                     \x1b[1;37m[Q]\x1b[0m \x1b[1;30mGeri Dön\x1b[0m${CRLF}` +
        `\x1b[0m${CRLF} > `;
    socket.emit('data', out);
}

export function handleInnHeal(socket, session) {
    const p = session.gameState.player;
    if (p.gold >= 10) {
        p.gold -= 10; p.hp = p.max_hp; p.stamina = 15;
        db.prepare('UPDATE player_stats SET gold = ?, hp = ?, stamina = ? WHERE user_id = ?').run(p.gold, p.hp, p.stamina, session.userId);
        socket.emit('data', `${CRLF}\x1b[1;32mTamamen iyileştin! Dinlenmiş hissediyorsun.\x1b[0m`);
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mYeterli altının yok!\x1b[0m`);
    }
    setTimeout(() => startInn(socket, session), 1500);
}
