import db from '../../database/db.js';
import { STATES, CLS, CRLF } from '../../config/constants.js';
import { WEAPONS, ARMORS, POTIONS } from '../../config/game_data.js';
import { renderBattleState } from './battle.js';

export function startInventory(socket, session) {
    session.state = STATES.GAME_INVENTORY;
    const p = session.gameState.player;
    const w = WEAPONS[p.weapon || 0];
    const a = ARMORS[p.armor || 0];
    let out = CLS + `\x1b[1;35m=== [ ENVANTER VE DURUM ] =======================\x1b[0m${CRLF}${CRLF}`;
    out += ` \x1b[1;32mSeviye:\x1b[0m ${p.level}  \x1b[1;35mEXP:\x1b[0m ${p.exp}/${p.level*10}  \x1b[1;33mAltın:\x1b[0m ${p.gold}${CRLF}`;
    out += ` \x1b[1;31mCan:\x1b[0m ${p.hp}/${p.max_hp}   \x1b[1;34mStamina:\x1b[0m ${p.stamina}/15${CRLF}${CRLF}`;
    out += ` \x1b[1;36m[ Silah ]\x1b[0m ${w.name} (\x1b[1;31m+${w.damage} Hasar\x1b[0m)${CRLF}`;
    out += ` \x1b[1;36m[ Zırh  ]\x1b[0m ${a.name} (\x1b[1;32m+${a.defense} Defans\x1b[0m)${CRLF}${CRLF}`;
    out += ` \x1b[1;33m[ İksirler ]\x1b[0m${CRLF}`;
    out += `  Küçük İksir : ${p.potion_s} adet${CRLF}`;
    out += `  Orta İksir  : ${p.potion_m} adet${CRLF}`;
    out += `  Büyük İksir : ${p.potion_l} adet${CRLF}${CRLF}`;
    out += ` \x1b[1;37m[P]\x1b[0m \x1b[1;32mİksir İç\x1b[0m    \x1b[1;37m[Q]\x1b[0m \x1b[1;30mGeri Dön\x1b[0m${CRLF}${CRLF} > `;
    socket.emit('data', out);
}

export function handleDrinkPotion(socket, session, inBattle = false) {
    const p = session.gameState.player;
    let healed = 0;
    if (p.hp >= p.max_hp) {
        socket.emit('data', `${CRLF}\x1b[1;33mZaten tam cana sahipsin!\x1b[0m`);
    } else if (p.potion_s > 0 && p.max_hp - p.hp <= POTIONS[0].heal) {
        p.potion_s--; healed = POTIONS[0].heal; db.prepare('UPDATE player_stats SET potion_s = ? WHERE user_id = ?').run(p.potion_s, session.userId);
    } else if (p.potion_l > 0 && p.max_hp - p.hp >= 100) {
        p.potion_l--; healed = POTIONS[2].heal; db.prepare('UPDATE player_stats SET potion_l = ? WHERE user_id = ?').run(p.potion_l, session.userId);
    } else if (p.potion_m > 0) {
        p.potion_m--; healed = POTIONS[1].heal; db.prepare('UPDATE player_stats SET potion_m = ? WHERE user_id = ?').run(p.potion_m, session.userId);
    } else if (p.potion_s > 0) {
        p.potion_s--; healed = POTIONS[0].heal; db.prepare('UPDATE player_stats SET potion_s = ? WHERE user_id = ?').run(p.potion_s, session.userId);
    } else if (p.potion_l > 0) {
        p.potion_l--; healed = POTIONS[2].heal; db.prepare('UPDATE player_stats SET potion_l = ? WHERE user_id = ?').run(p.potion_l, session.userId);
    } else {
        socket.emit('data', `${CRLF}\x1b[1;31mHiç iksirin yok!\x1b[0m`);
        setTimeout(() => inBattle ? renderBattleState(socket, session) : startInventory(socket, session), 1500);
        return;
    }
    
    if (healed > 0) {
        p.hp = Math.min(p.max_hp, p.hp + healed);
        db.prepare('UPDATE player_stats SET hp = ? WHERE user_id = ?').run(p.hp, session.userId);
        socket.emit('data', `${CRLF}\x1b[1;32mİksir içtin! +${healed} HP. (Can: ${p.hp}/${p.max_hp})\x1b[0m`);
    }
    setTimeout(() => inBattle ? renderBattleState(socket, session) : startInventory(socket, session), 1500);
}
