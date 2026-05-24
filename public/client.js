const socket = io();

// Tema Yönetimi (En başta tanımlı)
function toggleTheme() {
    document.body.classList.toggle('day-mode');
    const isDay = document.body.classList.contains('day-mode');
    localStorage.setItem('theme', isDay ? 'day' : 'night');
}

// xterm.js kurulumu
const term = new Terminal({
    cols: 80,
    rows: 25,
    cursorBlink: true,
    fontFamily: "'Cascadia Code', Menlo, Monaco, 'Courier New', Courier, monospace",
    fontSize: 18,
    theme: {
        background: 'transparent',
        foreground: '#00ff41'
    },
    allowProposedApi: true
});

const terminalContainer = document.getElementById('terminal');
if (terminalContainer) {
    term.open(terminalContainer);
}

// Sunucudan gelen veriyi terminale yaz
socket.on('data', (data) => {
    term.write(data);
});

// Terminalden girilen veriyi sunucuya gönder
term.onData((data) => {
    socket.emit('data', data);
});

// Bağlantı koptuğunda uyarı ver
socket.on('disconnect', () => {
    term.write('\r\n\x1b[1;31m[ BAĞLANTI KESİLDİ ]\x1b[0m\r\n');
});

// Modem Sesi Yönetimi
socket.on('play-modem-sound', () => {
    const sound = document.getElementById('modem-sound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => {
            console.log("Ses için etkileşim bekleniyor...");
            document.addEventListener('click', () => {
                sound.play();
            }, { once: true });
        });
    }
});

// Tema Hatırlatıcı
if (localStorage.getItem('theme') === 'day') {
    document.body.classList.add('day-mode');
}

// İkon tıklama
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

socket.on('toggle-theme', toggleTheme);

// Dosya indirme tetikleyicisi
socket.on('trigger-download', (url) => {
    window.location.href = url;
});

// Dosya seçme tetikleyicisi
socket.on('trigger-file-picker', (areaId) => {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                socket.emit('upload-file', {
                    areaId: areaId,
                    filename: file.name,
                    size: file.size,
                    data: event.target.result
                });
            };
            reader.readAsArrayBuffer(file);
        };
        fileInput.click();
    }
});
