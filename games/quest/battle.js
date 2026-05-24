import db from '../../database/db.js';
import { STATES, CLS, CRLF } from '../../config/constants.js';
import { MONSTERS, WEAPONS, ARMORS } from '../../config/game_data.js';
import { renderGameMain } from './index.js';

export function renderBattleState(socket, session) {
    const p = session.gameState.player; const monster = session.gameState.enemy;
    let out = CLS + `\x1b[1;31m!!! BİR DÜŞMAN BELİRDİ !!!\x1b[0m${CRLF}${CRLF}`;
    out += ` \x1b[1;37m${monster.icon}\x1b[0m${CRLF}`;
    out += ` \x1b[1;31m${monster.name}\x1b[0m (Seviye: ${monster.level}) (\x1b[1;33mHP: ${monster.hp}\x1b[0m)${CRLF}${CRLF}`;
    out += ` \x1b[1;32mSenin HP: ${p.hp}/${p.max_hp}\x1b[0m${CRLF}${CRLF}`;
    out += ` \x1b[1;33m[A]\x1b[0m Saldır! \x1b[1;33m[P]\x1b[0m İksir İç \x1b[1;33m[Q]\x1b[0m Kaç!${CRLF}${CRLF} > `;
    socket.emit('data', out);
}

export function startForest(socket, session) {
    const p = session.gameState.player;
    if (p.stamina <= 0) { socket.emit('data', CRLF + 'Yoruldun!'); setTimeout(() => renderGameMain(socket, session), 1000); return; }
    p.stamina--; db.prepare('UPDATE player_stats SET stamina = stamina - 1 WHERE user_id = ?').run(session.userId);
    
    let possibleMonsters = MONSTERS.filter(m => m.level <= p.level + 2 && m.level >= p.level - 2);
    if (possibleMonsters.length === 0) possibleMonsters = [MONSTERS[0]];
    const monster = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)]; 
    session.gameState.enemy = { ...monster };
    session.state = STATES.GAME_BATTLE; 
    renderBattleState(socket, session);
}

export function handleAttack(socket, session) {
    const p = session.gameState.player; const e = session.gameState.enemy;
    if (e.hp <= 0) return; 
    
    const w = WEAPONS[p.weapon || 0]; const a = ARMORS[p.armor || 0];
    
    const pDmg = Math.floor(Math.random() * 5) + 5 + w.damage + Math.floor(p.level / 2); 
    const rawEdmg = e.dmg + Math.floor(Math.random() * (e.level || 1));
    const eDmg = Math.max(0, rawEdmg - a.defense);
    
    e.hp -= pDmg; 
    let out = `\x1b[1G\x1b[K\x1b[1;32mSaldırdın ve ${pDmg} hasar verdin!\x1b[0m (Enemy HP: ${Math.max(0, e.hp)})${CRLF}`;
    
    if (e.hp <= 0) {
        p.gold += e.gold;
        p.exp += e.exp;
        
        let levelUpMsg = '';
        const expNeeded = p.level * 10;
        if (p.exp >= expNeeded) {
            p.level++;
            p.max_hp += 2;
            p.hp = p.max_hp;
            p.exp -= expNeeded;
            levelUpMsg = `${CRLF}\x1b[1;35m*** LEVEL UP! Seviye ${p.level} oldun! Canın doldu! ***\x1b[0m`;
        }
        
        db.prepare('UPDATE player_stats SET gold = ?, hp = ?, exp = ?, level = ?, max_hp = ? WHERE user_id = ?')
          .run(p.gold, p.hp, p.exp, p.level, p.max_hp, session.userId);
        socket.emit('data', out + `\x1b[1;33mKAZANDIN! ${e.gold} altın ve ${e.exp} EXP kazandın.\x1b[0m${levelUpMsg}${CRLF}Devam için bir tuşa basın...`);
        setTimeout(() => renderGameMain(socket, session), 2000); return;
    }
    
    p.hp -= eDmg;
    out += `\x1b[1;31m${e.name} sana saldırdı ve ${eDmg} hasar verdi!\x1b[0m (HP: ${p.hp})${CRLF}${CRLF} > `;
    
    if (p.hp <= 0) {
        p.hp = p.max_hp; p.gold = Math.floor(p.gold / 2);
        db.prepare('UPDATE player_stats SET hp = ?, gold = ? WHERE user_id = ?').run(p.hp, p.gold, session.userId);
        socket.emit('data', CRLF + `\x1b[1;41;37m ÖLDÜN! Altınlarının yarısını kaybettin. \x1b[0m${CRLF}Yeniden doğuyorsun...`);
        setTimeout(() => renderGameMain(socket, session), 2000); return;
    }
    
    socket.emit('data', out);
}
