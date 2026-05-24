import db from '../database/db.js';
import { STATES, CRLF } from '../config/constants.js';

import { goToMainMenu, showWhoOnline } from '../modules/menu.js';
import { handleMessageListInput, startWritingMessage, renderSplitView, showAreaList } from '../modules/messages.js';
import { showFileAreas, showFileList, startDeleteFile, handleDeleteFile } from '../modules/files.js';
import { showMailboxMenu } from '../modules/mailbox.js';
import { handleChatInput } from '../modules/chat.js';
import { startSysOpMenu, handleSysOpInput, handleSysOpUserList, handleSysOpUserManage, handleSysOpUserLevel, handleSysOpUserRename, handleSysOpBroadcast } from '../modules/admin.js';

import { showGamesMenu, handleGamesMenuInput } from '../games/index.js';
import { renderYoghurtMain, startYoghurtPlay } from '../games/yoghurt.js';
import { renderGameMain, startInn, handleInnHeal } from '../games/quest/index.js';
import { startInventory, handleDrinkPotion } from '../games/quest/inventory.js';
import { startShop, handleShopUpgrade, showShopWeapons, showShopArmors, showShopPotions, handleShopBuy } from '../games/quest/shop.js';
import { startForest, handleAttack } from '../games/quest/battle.js';

import { startEditor, handleEditorInput } from './editor.js';

export function handleState(socket, session, input, activeSessions, io) {
    switch (session.state) {
        case STATES.LOGIN_USERNAME:
            session.username = input.trim();
            const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(session.username);
            if (user) {
                session.state = STATES.LOGIN_PASSWORD;
                socket.emit('data', `\x1b[1;36m${CRLF}Parola:\x1b[0m `);
                socket.emit('password-mode', true);
            } else {
                session.state = STATES.REGISTER_CONFIRM;
                socket.emit('data', `${CRLF}\x1b[1;33mBu isim kayıtlı değil. Yeni kullanıcı oluşturulsun mu? (E/H):\x1b[0m `);
            }
            break;
        case STATES.LOGIN_PASSWORD:
            socket.emit('password-mode', false);
            const existingUser = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(session.username);
            if (existingUser) {
                import('bcrypt').then(bcrypt => {
                    if (bcrypt.default.compareSync(input, existingUser.password_hash)) {
                        session.userId = existingUser.id;
                        session.securityLevel = existingUser.security_level;
                        goToMainMenu(socket, session);
                    } else {
                        socket.emit('data', `${CRLF}\x1b[1;31mYanlış parola! Bağlantı kesiliyor.\x1b[0m${CRLF}`);
                        socket.disconnect();
                    }
                });
            }
            break;
        case STATES.REGISTER_CONFIRM:
            if (input.toUpperCase() === 'E') {
                session.state = STATES.REGISTER_PASSWORD;
                socket.emit('data', `${CRLF}\x1b[1;36mYeni Parola Belirleyin:\x1b[0m `);
                socket.emit('password-mode', true);
            } else {
                socket.emit('data', `${CRLF}Bağlantı kesiliyor...${CRLF}`);
                socket.disconnect();
            }
            break;
        case STATES.REGISTER_PASSWORD:
            socket.emit('password-mode', false);
            if (input.length < 4) {
                socket.emit('data', `${CRLF}\x1b[1;31mParola çok kısa! Tekrar girin:\x1b[0m `);
                socket.emit('password-mode', true);
            } else {
                import('bcrypt').then(bcrypt => {
                    const hash = bcrypt.default.hashSync(input, 10);
                    const isFirst = db.prepare('SELECT COUNT(*) as c FROM users').get().c === 0;
                    const secLvl = isFirst ? 100 : 10;
                    const result = db.prepare('INSERT INTO users (username, password_hash, security_level) VALUES (?, ?, ?)').run(session.username, hash, secLvl);
                    session.userId = result.lastInsertRowid;
                    session.securityLevel = secLvl;
                    socket.emit('data', `${CRLF}\x1b[1;32mKayıt başarılı!${isFirst ? ' İlk kullanıcı olduğunuz için SysOp yapıldınız.' : ''}\x1b[0m${CRLF}`);
                    setTimeout(() => goToMainMenu(socket, session), 1000);
                });
            }
            break;
        case STATES.MAIN_MENU:
            if (input === 'M') showAreaList(socket, session);
            else if (input === 'P') showMailboxMenu(socket, session);
            else if (input === 'F') showFileAreas(socket, session);
            else if (input === 'C') import('../modules/chat.js').then(c => c.startChat(socket, session));
            else if (input === 'G') showGamesMenu(socket, session);
            else if (input === 'W') showWhoOnline(socket, session, activeSessions);
            else if (input === 'S' && session.securityLevel >= 90) startSysOpMenu(socket, session);
            else if (input === 'Q') {
                socket.emit('data', CRLF + "\x1b[1;33mMaNiAc BBS'i tercih ettiğiniz için teşekkürler! Geri gelmeyi unutmayın...\x1b[0m" + CRLF);
                setTimeout(() => socket.disconnect(), 2000);
            }
            else goToMainMenu(socket, session);
            break;
        case STATES.MAILBOX_MENU:
            const mailboxMsgs = db.prepare('SELECT p.*, u.username as sender_name FROM private_messages p JOIN users u ON p.sender_id = u.id WHERE p.receiver_id = ? ORDER BY p.id DESC').all(session.userId);
            if (input === 'Q') goToMainMenu(socket, session);
            else if (input === 'W') {
                session.tempMessage = { to: '', subject: '', body: [], parentId: null };
                session.state = STATES.MAILBOX_WRITE_TO;
                socket.emit('data', CRLF + `\x1b[1;36mKime: \x1b[0m`);
            } else if (input === 'N' && session.currentMsgIndex < mailboxMsgs.length - 1) {
                session.currentMsgIndex++; showMailboxMenu(socket, session);
            } else if (input === 'P' && session.currentMsgIndex > 0) {
                session.currentMsgIndex--; showMailboxMenu(socket, session);
            } else if (input === 'R' && mailboxMsgs.length > 0) {
                const msg = mailboxMsgs[session.currentMsgIndex];
                session.tempMessage = { to: msg.sender_name, subject: `Re: ${msg.subject}`, body: [], parentId: msg.id };
                session.state = STATES.MAILBOX_WRITE_BODY;
                startEditor(socket, session, true);
            } else if (input === 'D' && mailboxMsgs.length > 0) {
                const msg = mailboxMsgs[session.currentMsgIndex];
                db.prepare('DELETE FROM private_messages WHERE id = ?').run(msg.id);
                socket.emit('data', CRLF + `\x1b[1;31mMesaj silindi.\x1b[0m${CRLF}`);
                setTimeout(() => showMailboxMenu(socket, session), 1000);
            } else showMailboxMenu(socket, session);
            break;
        case STATES.MAILBOX_WRITE_TO:
            if (!input) { showMailboxMenu(socket, session); return; }
            const rcvr = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(input);
            if (!rcvr) {
                socket.emit('data', CRLF + `\x1b[1;31mBöyle bir kullanıcı bulunamadı.\x1b[0m${CRLF}`);
                setTimeout(() => showMailboxMenu(socket, session), 1500);
            } else {
                session.tempMessage = { to: rcvr.username, subject: 'Offline PM', body: [], parentId: null };
                session.state = STATES.MAILBOX_WRITE_BODY;
                startEditor(socket, session, false);
            }
            break;
        case STATES.MAILBOX_WRITE_BODY:
            handleEditorInput(socket, session, input);
            break;
        case STATES.AREA_LIST:
            if (input === 'Q') goToMainMenu(socket, session);
            else {
                const areaId = parseInt(input);
                const area = db.prepare('SELECT * FROM message_areas WHERE id = ?').get(areaId);
                if (area) { session.currentArea = area; session.currentMsgIndex = 0; renderSplitView(socket, session); }
                else showAreaList(socket, session);
            }
            break;
        case STATES.READ_MESSAGE_SPLIT:
            handleMessageListInput(socket, session, input);
            break;
        case STATES.WRITE_TO:
            session.tempMessage.to = input || 'All';
            session.state = STATES.WRITE_SUBJECT;
            socket.emit('data', `\x1b[1;36mSubject: \x1b[0m`);
            break;
        case STATES.WRITE_SUBJECT:
            session.tempMessage.subject = input || 'No Subject';
            startEditor(socket, session);
            break;
        case STATES.WRITE_BODY:
            handleEditorInput(socket, session, input);
            break;
        case STATES.FILE_AREAS:
            if (input === 'Q') goToMainMenu(socket, session);
            else {
                const fAreaId = parseInt(input);
                const fArea = db.prepare('SELECT * FROM file_areas WHERE id = ?').get(fAreaId);
                if (fArea) { session.currentFileArea = fArea; showFileList(socket, session); }
                else showFileAreas(socket, session);
            }
            break;
        case STATES.FILE_LIST:
            if (input === 'Q') showFileAreas(socket, session);
            else if (input === 'U') socket.emit('trigger-file-picker', session.currentFileArea.id);
            else if (input === 'D' && session.securityLevel >= 90) startDeleteFile(socket, session);
            else if (input === 'L') showFileList(socket, session); 
            else {
                const fileId = parseInt(input);
                if (fileId) {
                    socket.emit('trigger-download', `/download/${fileId}`);
                    socket.emit('data', `${CRLF}\x1b[1;32mİndirme işlemi başlatıldı. Lütfen tarayıcınızın indirme penceresini kontrol edin.\x1b[0m${CRLF}Devam için bir tuşa basın...`);
                }
            }
            break;
        case STATES.FILE_DELETE:
            handleDeleteFile(socket, session, input);
            break;
        case STATES.GAMES_MENU:
            handleGamesMenuInput(socket, session, input);
            break;
        case STATES.GAME_MAIN:
            if (input === 'F') startForest(socket, session);
            else if (input === 'E') startInventory(socket, session);
            else if (input === 'I') startInn(socket, session);
            else if (input === 'S') startShop(socket, session);
            else if (input === 'Q') showGamesMenu(socket, session);
            else renderGameMain(socket, session);
            break;
        case STATES.GAME_INVENTORY:
            if (input === 'P') handleDrinkPotion(socket, session, false);
            else if (input === 'Q') renderGameMain(socket, session);
            else startInventory(socket, session);
            break;
        case STATES.GAME_INN:
            if (input === '1') handleInnHeal(socket, session);
            else if (input === 'Q') renderGameMain(socket, session);
            else startInn(socket, session);
            break;
        case STATES.GAME_SHOP:
            if (input === '1') handleShopUpgrade(socket, session);
            else if (input === '2') showShopWeapons(socket, session);
            else if (input === '3') showShopArmors(socket, session);
            else if (input === '4') showShopPotions(socket, session);
            else if (input === 'Q') renderGameMain(socket, session);
            else startShop(socket, session);
            break;
        case STATES.GAME_SHOP_WEAPONS:
            import('../config/game_data.js').then(g => {
                if (input === 'Q') startShop(socket, session);
                else handleShopBuy(socket, session, 'weapon', g.WEAPONS, input);
            });
            break;
        case STATES.GAME_SHOP_ARMORS:
            import('../config/game_data.js').then(g => {
                if (input === 'Q') startShop(socket, session);
                else handleShopBuy(socket, session, 'armor', g.ARMORS, input);
            });
            break;
        case STATES.GAME_SHOP_POTIONS:
            import('../config/game_data.js').then(g => {
                if (input === 'Q') startShop(socket, session);
                else handleShopBuy(socket, session, 'potion', g.POTIONS, input);
            });
            break;
        case STATES.GAME_BATTLE:
            if (input === 'A') handleAttack(socket, session);
            else if (input === 'P') handleDrinkPotion(socket, session, true);
            else if (input === 'Q') renderGameMain(socket, session);
            break;
        case STATES.GAME_YOGHURT_MAIN:
            if (input === 'S') startYoghurtPlay(socket, session);
            else if (input === 'Q') showGamesMenu(socket, session);
            else renderYoghurtMain(socket, session);
            break;
        case STATES.WHO_ONLINE:
            if (input === 'Q') goToMainMenu(socket, session);
            else showWhoOnline(socket, session, activeSessions);
            break;
        case STATES.CHAT_ROOM:
            handleChatInput(socket, session, input, activeSessions, io);
            break;
        case STATES.SYSOP_MENU:
            handleSysOpInput(socket, session, input, activeSessions);
            break;
        case STATES.SYSOP_USER_LIST:
            handleSysOpUserList(socket, session, input);
            break;
        case STATES.SYSOP_USER_MANAGE:
            handleSysOpUserManage(socket, session, input);
            break;
        case 'SYSOP_USER_LEVEL':
            handleSysOpUserLevel(socket, session, input);
            break;
        case STATES.SYSOP_USER_RENAME:
            handleSysOpUserRename(socket, session, input);
            break;
        case STATES.SYSOP_BROADCAST:
            handleSysOpBroadcast(socket, session, input, activeSessions, io);
            break;
    }
}
