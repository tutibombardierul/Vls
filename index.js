require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    AuditLogEvent, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder,
    ActivityType
} = require('discord.js');
const backup = require('discord-backup');

// Inițializare Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

// Stocări temporare
const userMessages = new Map();
const joinLogs = [];
const actionTracker = new Map();

// Regex pentru blocare invitații
const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;

// Comenzi Slash
const commands = [
    new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Sistemul de salvări pronxy\'s market')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('create')
               .setDescription('Creează un backup complet al serverului'))
        .addSubcommand(sub =>
            sub.setName('load')
               .setDescription('Încarcă un backup existent')
               .addStringOption(opt => opt.setName('id').setDescription('ID-ul backup-ului').setRequired(true))),
               
    new SlashCommandBuilder()
        .setName('denuke')
        .setDescription('Restaurare rapidă în caz de atac - pronxy\'s market')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => 
            opt.setName('backup_id')
               .setDescription('ID-ul backup-ului pentru restaurare automată')
               .setRequired(true))
].map(cmd => cmd.toJSON());

// Event: Pornire Bot
client.once('ready', async () => {
    console.log(`[ONLINE] Botul pronxy's market este conectat ca ${client.user.tag}`);
    
    // Status personalizat pentru bot
    client.user.setActivity("pronxy's market | /backup & /denuke", { type: ActivityType.Watching });
    
    backup.setStorageFolder(__dirname + '/backups/');

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('[SLASH COMMANDS] Comenzile pronxy\'s market au fost înregistrate.');
    } catch (error) {
        console.error('Eroare la înregistrarea comenzilor:', error);
    }
});

// -------------------------------------------------------------
// 1. MODUL ANTI-INVITE & ANTI-SPAM
// -------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // --- ANTI-INVITE ---
    if (inviteRegex.test(message.content)) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.delete().catch(() => {});
            const alert = await message.channel.send(`🛡️ **[pronxy's market Security]** ${message.author}, invitațiile către alte servere nu sunt permise!`);
            setTimeout(() => alert.delete().catch(() => {}), 4000);
            return;
        }
    }

    // --- ANTI-SPAM ---
    const userId = message.author.id;
    const now = Date.now();
    const SPAM_LIMIT = 5;      // Mesaje
    const TIME_WINDOW = 4000;   // 4 Secunde

    if (!userMessages.has(userId)) userMessages.set(userId, []);
    const timestamps = userMessages.get(userId);
    timestamps.push(now);

    const recentMessages = timestamps.filter(time => now - time < TIME_WINDOW);
    userMessages.set(userId, recentMessages);

    if (recentMessages.length > SPAM_LIMIT) {
        try {
            await message.member.timeout(10 * 60 * 1000, 'pronxy\'s market Anti-Spam System');
            await message.channel.send(`⚠️ **[pronxy's market]** ${message.author.tag} a primit timeout 10 minute pentru spam.`);
            userMessages.delete(userId);
        } catch (err) {
            console.error('Eroare aplicare Timeout:', err);
        }
    }
});

// -------------------------------------------------------------
// 2. MODUL ANTI-RAID
// -------------------------------------------------------------
client.on('guildMemberAdd', async (member) => {
    const now = Date.now();
    joinLogs.push(now);

    const RAID_LIMIT = 5;       // Maxim 5 intrări
    const RAID_WINDOW = 10000;   // În 10 secunde
    const recentJoins = joinLogs.filter(time => now - time < RAID_WINDOW);

    const accountAge = now - member.user.createdTimestamp;
    const MIN_AGE = 3 * 24 * 60 * 60 * 1000; // 3 Zile vechime minimă

    if (recentJoins.length >= RAID_LIMIT || accountAge < MIN_AGE) {
        try {
            await member.kick('pronxy\'s market Anti-Raid System / Cont nou/suspect');
        } catch (err) {
            console.error('Eroare Kick Anti-Raid:', err);
        }
    }
});

// -------------------------------------------------------------
// 3. MODUL DE-NUKE
// -------------------------------------------------------------
client.on('channelDelete', async (channel) => {
    const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete
    }).catch(() => null);

    if (!auditLogs) return;
    const logEntry = auditLogs.entries.first();
    if (!logEntry) return;

    const { executor } = logEntry;
    if (executor.id === client.user.id || executor.id === channel.guild.ownerId) return;

    const now = Date.now();
    const userData = actionTracker.get(executor.id) || { count: 0, firstAction: now };

    if (now - userData.firstAction > 10000) {
        userData.count = 1;
        userData.firstAction = now;
    } else {
        userData.count++;
    }

    actionTracker.set(executor.id, userData);

    if (userData.count >= 2) {
        const member = await channel.guild.members.fetch(executor.id).catch(() => null);
        if (member) {
            await member.roles.set([]).catch(() => {});
            await member.ban({ reason: 'pronxy\'s market De-Nuke: Ștergere neautorizată de canale' }).catch(() => {});
        }
    }
});

// -------------------------------------------------------------
// 4. COMENZI /BACKUP & /DENUKE
// -------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user } = interaction;

    // --- COMANDA /BACKUP ---
    if (commandName === 'backup') {
        const subcommand = options.getSubcommand();

        if (subcommand === 'create') {
            await interaction.deferReply({ ephemeral: true });
            
            backup.create(guild, {
                jsonBeautify: true,
                saveImages: "base64"
            }).then((backupData) => {
                const embed = new EmbedBuilder()
                    .setTitle('💾 Backup Creat - pronxy\'s market')
                    .setDescription(`Structura serverului a fost salvată cu succes!\n\n**ID Backup:** \`${backupData.id}\`\nPăstrează acest ID pentru restaurare!`)
                    .setColor('#2F3136')
                    .setFooter({ text: "pronxy's market Security System" })
                    .setTimestamp();
                interaction.editReply({ embeds: [embed] });
            }).catch((err) => {
                interaction.editReply(`Eroare la crearea backup-ului: ${err.message}`);
            });
        }

        if (subcommand === 'load') {
            const backupID = options.getString('id');
            await interaction.reply({ content: '⚙️ **[pronxy\'s market]** Se inițializează restaurarea serverului...', ephemeral: true });

            backup.load(backupID, guild).then(() => {
                backup.remove(backupID);
            }).catch((err) => {
                interaction.followUp({ content: `Eroare la încărcarea backup-ului: ${err.message}`, ephemeral: true });
            });
        }
    }

    // --- COMANDA /DENUKE ---
    if (commandName === 'denuke') {
        if (user.id !== guild.ownerId) {
            return interaction.reply({ content: '❌ Doar Owner-ul serverului pronxy\'s market poate executa De-Nuke!', ephemeral: true });
        }

        const backupID = options.getString('backup_id');
        await interaction.reply({ content: '🚨 **[pronxy\'s market] PROCEDURĂ DE-NUKE INIȚIATĂ.** Se restaurează serverul...', ephemeral: false });

        try {
            const bans = await guild.bans.fetch();
            for (const ban of bans.values()) {
                await guild.members.unban(ban.user.id, 'Procedură De-Nuke pronxy\'s market').catch(() => {});
            }

            await backup.load(backupID, guild);
        } catch (err) {
            await interaction.followUp({ content: `Eroare De-Nuke: ${err.message}` });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
                                 
