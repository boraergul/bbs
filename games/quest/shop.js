import db from '../../database/db.js';
import { STATES, CLS, CRLF } from '../../config/constants.js';
import { WEAPONS, ARMORS, POTIONS } from '../../config/game_data.js';

export function startShop(socket, session) {
    session.state = STATES.GAME_SHOP;
    const p = session.gameState.player;
    let out = CLS + `\x1b[1;30m` +
        `       .-------.    \x1b[1;31m--- KANLI DEMİRCİ ---\x1b[1;30m${CRLF}` +
        `      /   _ _   \\   \x1b[1;37m"Zırhın kağıt gibi! Güçlen."\x1b[1;30m${CRLF}` +
        `     |  (   )  |  ${CRLF}` +
        `     |   | |   |    \x1b[1;33mCebindeki Altın: \x1b[1;37m${p.gold}\x1b[1;30m${CRLF}` +
        `   __|   | |   |__  ${CRLF}` +
        `  /  |   |_|   |  \\ \x1b[1;37m[1]\x1b[0m \x1b[1;31mMaksimum Can +5\x1b[0m - \x1b[1;33m20 Altın\x1b[0m${CRLF}` +
        ` |   '---------'   |\x1b[1;37m[2]\x1b[0m \x1b[1;36mSilah Pazarı\x1b[0m${CRLF}` +
        `  \\_______________/ \x1b[1;37m[3]\x1b[0m \x1b[1;35mZırh Tüccarı\x1b[0m${CRLF}` +
        `                    \x1b[1;37m[4]\x1b[0m \x1b[1;32mİksir Dükkanı\x1b[0m${CRLF}` +
        `                    \x1b[1;37m[Q]\x1b[0m \x1b[1;30mGeri Dön\x1b[0m${CRLF}` +
        `${CRLF} > `;
    socket.emit('data', out);
}

export function handleShopUpgrade(socket, session) {
    const p = session.gameState.player;
    if (p.gold >= 20) {
        p.gold -= 20; p.max_hp += 5; p.hp += 5;
        db.prepare('UPDATE player_stats SET gold = ?, max_hp = ?, hp = ? WHERE user_id = ?').run(p.gold, p.max_hp, p.hp, session.userId);
        socket.emit('data', `${CRLF}\x1b[1;32mDaha dayanıklı hale geldin! Max HP +5.\x1b[0m`);
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mYeterli altının yok!\x1b[0m`);
    }
    setTimeout(() => startShop(socket, session), 1500);
}

export function showShopList(socket, session, type, arr) {
    let state = STATES.GAME_SHOP_WEAPONS;
    let title = "SİLAH PAZARI";
    let prop = 'damage'; let propName = "Hasar"; let color = "\x1b[1;31m";
    if (type === 'armor') { state = STATES.GAME_SHOP_ARMORS; title = "ZIRH TÜCCARI"; prop = 'defense'; propName = "Defans"; color = "\x1b[1;32m"; }
    else if (type === 'potion') { state = STATES.GAME_SHOP_POTIONS; title = "İKSİR DÜKKANI"; prop = 'heal'; propName = "Can"; color = "\x1b[1;35m"; }
    
    session.state = state;
    let out = CLS + `\x1b[1;33m=== [ ${title} ] ===\x1b[0m${CRLF}`;
    out += `\x1b[1;33mCebindeki Altın: \x1b[1;37m${session.gameState.player.gold}\x1b[0m${CRLF}${CRLF}`;
    
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        if (item.price === 0 && type !== 'potion') continue;
        let pId = type === 'potion' ? item.id.toUpperCase() : i;
        out += ` \x1b[1;37m[${pId}]\x1b[0m ${item.name.padEnd(20)} ${color}+${item[prop]} ${propName}\x1b[0m - \x1b[1;33m${item.price} Altın\x1b[0m${CRLF}`;
    }
    out += `${CRLF} \x1b[1;37m[Q]\x1b[0m \x1b[1;30mGeri Dön\x1b[0m${CRLF}${CRLF} Almak istediğin eşya no: `;
    socket.emit('data', out);
}

export function showShopWeapons(socket, session) { showShopList(socket, session, 'weapon', WEAPONS); }
export function showShopArmors(socket, session) { showShopList(socket, session, 'armor', ARMORS); }
export function showShopPotions(socket, session) { showShopList(socket, session, 'potion', POTIONS); }

export function handleShopBuy(socket, session, type, arr, input) {
    const p = session.gameState.player;
    let item = null; let itemIdx = -1;
    if (type === 'potion') {
        item = arr.find(x => x.id.toUpperCase() === input);
    } else {
        itemIdx = parseInt(input);
        if (!isNaN(itemIdx) && itemIdx >= 0 && itemIdx < arr.length) item = arr[itemIdx];
    }
    
    if (!item || (item.price === 0 && type !== 'potion')) {
        socket.emit('data', `${CRLF}\x1b[1;31mGeçersiz seçim!\x1b[0m`);
    } else if (p.gold < item.price) {
        socket.emit('data', `${CRLF}\x1b[1;31mYeterli altının yok!\x1b[0m`);
    } else {
        p.gold -= item.price;
        if (type === 'weapon') { p.weapon = itemIdx; db.prepare('UPDATE player_stats SET gold = ?, weapon = ? WHERE user_id = ?').run(p.gold, p.weapon, session.userId); }
        else if (type === 'armor') { p.armor = itemIdx; db.prepare('UPDATE player_stats SET gold = ?, armor = ? WHERE user_id = ?').run(p.gold, p.armor, session.userId); }
        else if (type === 'potion') { p[item.col]++; db.prepare(`UPDATE player_stats SET gold = ?, ${item.col} = ? WHERE user_id = ?`).run(p.gold, p[item.col], session.userId); }
        socket.emit('data', `${CRLF}\x1b[1;32m${item.name} satın alındı!\x1b[0m`);
    }
    setTimeout(() => {
        if (type === 'weapon') showShopWeapons(socket, session);
        else if (type === 'armor') showShopArmors(socket, session);
        else showShopPotions(socket, session);
    }, 1500);
}
