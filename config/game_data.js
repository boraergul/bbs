export const WEAPONS = [
    { id: 0, name: "Başlangıç Hançeri", damage: 1, price: 0 },
    { id: 1, name: "Paslı Kama", damage: 3, price: 50 },
    { id: 2, name: "Çelik Kılıç", damage: 6, price: 150 },
    { id: 3, name: "Çift Elli Balta", damage: 10, price: 350 },
    { id: 4, name: "Gümüş Mızrak", damage: 15, price: 700 },
    { id: 5, name: "Zehirli Hançer", damage: 22, price: 1200 },
    { id: 6, name: "Şövalye Kılıcı", damage: 32, price: 2500 },
    { id: 7, name: "Ejderha Dişi", damage: 45, price: 5000 },
    { id: 8, name: "Şeytan Katleden", damage: 60, price: 10000 },
    { id: 9, name: "Efsanevi Excalibur", damage: 85, price: 25000 }
];

export const ARMORS = [
    { id: 0, name: "Seyyah Pelerini", defense: 0, price: 0 },
    { id: 1, name: "Deri Zırh", defense: 2, price: 50 },
    { id: 2, name: "Çivili Zırh", defense: 4, price: 150 },
    { id: 3, name: "Zincir Gömlek", defense: 7, price: 350 },
    { id: 4, name: "Çelik Göğüslük", defense: 12, price: 700 },
    { id: 5, name: "Şövalye Zırhı", defense: 18, price: 1200 },
    { id: 6, name: "Mitril Zırh", defense: 26, price: 2500 },
    { id: 7, name: "Ejderha Pulu", defense: 38, price: 5000 },
    { id: 8, name: "Karanlık Aura Zırhı", defense: 55, price: 10000 },
    { id: 9, name: "İlahi Kalkan", defense: 80, price: 25000 }
];

export const POTIONS = [
    { id: 's', name: "Küçük İksir", heal: 25, price: 20, col: 'potion_s' },
    { id: 'm', name: "Orta İksir", heal: 75, price: 50, col: 'potion_m' },
    { id: 'l', name: "Büyük İksir", heal: 200, price: 120, col: 'potion_l' }
];

export const MONSTERS = [
    { level: 1, name: "Zayıf Slime", hp: 10, dmg: 1, gold: 2, exp: 2, icon: " (o_o) " },
    { level: 1, name: "Çılgın Fare", hp: 12, dmg: 2, gold: 3, exp: 2, icon: " ~<:3 )~ " },
    { level: 2, name: "Yaban Domuzu", hp: 18, dmg: 3, gold: 5, exp: 4, icon: " (8(0_0)8) " },
    { level: 2, name: "Orman Cini", hp: 20, dmg: 3, gold: 6, exp: 4, icon: " ( ^v^ ) " },
    { level: 3, name: "Hırsız Goblin", hp: 25, dmg: 5, gold: 8, exp: 6, icon: " <`o_o`> " },
    { level: 3, name: "Aç Kurt", hp: 28, dmg: 6, gold: 7, exp: 7, icon: " >/o.o\\< " },
    { level: 4, name: "Zehirli Örümcek", hp: 35, dmg: 8, gold: 10, exp: 10, icon: " /X\\o_o/X\\ " },
    { level: 4, name: "Bataklık Zombisi", hp: 40, dmg: 7, gold: 12, exp: 11, icon: " [ o.o ] " },
    { level: 5, name: "İskelet Savaşçı", hp: 45, dmg: 10, gold: 15, exp: 14, icon: " \\|x_x|/ " },
    { level: 5, name: "Haydut", hp: 50, dmg: 12, gold: 20, exp: 15, icon: " ( -_- )> " },
    { level: 6, name: "Vahşi Ayı", hp: 60, dmg: 14, gold: 22, exp: 18, icon: " (º(OO)º) " },
    { level: 7, name: "Ork Savaşçısı", hp: 75, dmg: 16, gold: 25, exp: 22, icon: " [ >o_o> ] " },
    { level: 8, name: "Mağara Trolü", hp: 90, dmg: 20, gold: 35, exp: 26, icon: " \\(OoO)/ " },
    { level: 9, name: "Karanlık Büyücü", hp: 80, dmg: 25, gold: 45, exp: 32, icon: " *~(o_o)~* " },
    { level: 10, name: "Taş Golem", hp: 120, dmg: 22, gold: 50, exp: 40, icon: " [====] " },
    { level: 11, name: "Lanetli Şövalye", hp: 140, dmg: 28, gold: 65, exp: 45, icon: " <[X_X]> " },
    { level: 12, name: "Vampir Yarasa", hp: 110, dmg: 32, gold: 70, exp: 50, icon: " \\/\\/o_o\\/\\/ " },
    { level: 13, name: "Kanlı Kurtadam", hp: 160, dmg: 35, gold: 85, exp: 60, icon: " =/^o_o^\\= " },
    { level: 14, name: "Harpiya", hp: 150, dmg: 40, gold: 100, exp: 70, icon: " \\\\^v^// " },
    { level: 15, name: "Cehennem Tazısı", hp: 200, dmg: 45, gold: 120, exp: 85, icon: " ~\\(x_x)/~ " },
    { level: 16, name: "Ölüm Şövalyesi", hp: 250, dmg: 55, gold: 150, exp: 100, icon: " <|X_X|> " },
    { level: 17, name: "Buzul Devi", hp: 300, dmg: 60, gold: 180, exp: 120, icon: " [\\o_o/] " },
    { level: 18, name: "Ateş Elementali", hp: 280, dmg: 70, gold: 200, exp: 140, icon: " *\\(O_O)/* " },
    { level: 19, name: "Gölge Suikastçisi", hp: 260, dmg: 85, gold: 250, exp: 160, icon: " ( -.- ) " },
    { level: 20, name: "Manticore", hp: 400, dmg: 90, gold: 300, exp: 200, icon: " \\>º_º</ " },
    { level: 22, name: "Lich", hp: 350, dmg: 110, gold: 400, exp: 250, icon: " ~[X_X]~ " },
    { level: 24, name: "Antik Behemoth", hp: 600, dmg: 130, gold: 600, exp: 350, icon: " ([(O_O)]) " },
    { level: 26, name: "Uçurum Şeytanı", hp: 800, dmg: 150, gold: 800, exp: 450, icon: " \\((x_x))/ " },
    { level: 28, name: "Yavru Ejderha", hp: 1200, dmg: 180, gold: 1200, exp: 600, icon: " /\\/\\(o_o)/\\/\\ " },
    { level: 30, name: "Kıyamet Ejderhası", hp: 2000, dmg: 250, gold: 3000, exp: 1000, icon: " =/\\/\\(X_X)/\\/\\= " }
];

export const YOGHURT_TEXT = "Şu yoğurdu sarımsaklasak da mı saklasak sarımsaklamasak da mı saklasak?";
