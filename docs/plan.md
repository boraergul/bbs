# Implementation Plan: Improve Quit (Q) Experience

The user reported that pressing 'Q' in the main menu results in no feedback, leaving the terminal in a "hung" state. This plan improves the logoff sequence.

## Proposed Changes

### [MODIFY] [core/state_manager.js](file:///d:/Google%20Drive/Projeler/bbs/core/state_manager.js)

Update the 'Q' handler in `STATES.MAIN_MENU` to provide visual feedback before disconnecting.

```javascript
// Change:
else if (input === 'Q') socket.disconnect();

// To:
else if (input === 'Q') {
    socket.emit('data', CRLF + "\x1b[1;33mMaNiAc BBS'i tercih ettiğiniz için teşekkürler! Geri gelmeyi unutmayın...\x1b[0m" + CRLF);
    setTimeout(() => socket.disconnect(), 2000);
}
```

### [MODIFY] [public/client.js](file:///d:/Google%20Drive/Projeler/bbs/public/client.js)

Add a disconnect listener to the client-side socket to notify the user when the connection is lost.

```javascript
socket.on('disconnect', () => {
    term.write('\r\n\x1b[1;31m[ BAĞLANTI KESİLDİ ]\x1b[0m\r\n');
});
```

## Verification Plan

### Manual Verification
1.  Log into the BBS.
2.  Navigate to the Main Menu.
3.  Press 'Q'.
4.  Verify that the "Goodbye" message appears.
5.  Wait 2 seconds and verify that the red "[ BAĞLANTI KESİLDİ ]" message appears.
6.  Try typing and verify that no input is echoed (as the connection is closed).
