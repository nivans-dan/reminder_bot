import { createRequire } from "module";
import { config } from "./config.js";

const require = createRequire(import.meta.url); // Using both require and import in the same file
const { Client, GatewayIntentBits } = require("discord.js"); // Creates a class named Discord
const client = new Client({ // Instantiate the last class. This is, in general, the bot
    intents: [ // All GuildMembers for messages in chat
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./reminders.db')


client.on("ready", () => {
    console.log(`Bot is ready as: ${client.user.tag}`);

    db.run(`CREATE TABLE IF NOT EXISTS reminders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT,
        message TEXT,
        time INTEGER
    )`);
});

function addReminder(msg) {
    // Example: !reminder 19/Mar/2023 03:28 final-test
    const reminderRegExp = /\!reminder\s\d{2}\/\w{3}\/\d{4}\s\d{2}\:\d{2}\s[aA-zZ\-]*/;

    // Data validation
    if (!reminderRegExp.test(msg.content)) {
        msg.channel.send('Format mismatch (!command dd/mm/yyyy hh:mm message-like-this)');
        return;
    }

    const args = msg.content.slice(1).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'reminder') {
        const dt = args.shift();
        const time = args.shift();
        const reminder = args.join(' ');

        // Data validation 2
        if (!Date.parse(`${dt} ${time}`)) {
            return msg.channel.send('Date and/or time not valid');
        }

        const miliseconds = new Date(`${dt} ${time}`).getTime() - Date.now();

        const stmt = db.prepare('INSERT INTO reminders(user, message, time) VALUES(?, ?, ?)');
        stmt.run(msg.author.id, reminder, Date.now() + miliseconds);
        stmt.finalize();

        msg.channel.send(`Reminder set for: ${dt} at ${time}. I will remind you: ${reminder}`)
    }
}

function checkReminders() {
    const currentTime = Date.now();

    db.all('SELECT * FROM reminders WHERE time <= ?', currentTime, (err, rows) => {
        if (err) {
            console.log(err);
            return;
        }

        rows.forEach(row => {
            const user = client.users.cache.get(row.user);
            const channel = client.channels.cache.get(config.testChanel);
            channel.send(`Reminder: ${row.message} -> <@${user.id}>`)
            db.run('DELETE FROM reminders WHERE id = ?', row.id);
        });
    });
}

// Run every minute
setInterval(checkReminders, 60 * 1000);

client.on('messageCreate', async (msg) => {
    if (msg.channel.id === config.testChanel) {
        if (!msg.content.startsWith('!') || msg.author.bot) return;
        
        addReminder(msg);
        // db.run('DELETE FROM reminders')
    }
});

client.login(config.token);