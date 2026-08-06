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

// Initialize Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

// In-memory storages
const userMessages = new Map();
const joinLogs = [];
const actionTracker = new Map();

// Map for server security settings (Per Guild)
const guildSettings = new Map();

function getGuildSettings(guildId) {
    if (!guildSettings.has(guildId)) {
        guildSettings.set(guildId, {
            antiLink: true,  // Enabled by default
            antiSpam: true,  // Enabled by default
            antiRaid: true   // Enabled by default
        });
    }
    return guildSettings.get(guildId);
}

// Regex for links and invites
const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;

// Slash Commands Registration
const commands = [
    new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Backup system for pronxy\'s market')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('create')
               .setDescription('Creates a complete backup of the server'))
        .addSubcommand(sub =>
            sub.setName('load')
               .setDescription('Loads an existing backup')
               .addStringOption(opt => opt.setName('id').setDescription('The backup ID').setRequired(true))),
               
    new SlashCommandBuilder()
        .setName('denuke')
        .setDescription('Quick server restoration in case of an attack')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => 
            opt.setName('backup_id')
               .setDescription('The backup ID for automatic restoration')
               .setRequired(true)),

    new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('Enable or disable Anti-Link / Anti-Invite protection')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('state')
               .setDescription('Select module status')
               .setRequired(true)
               .addChoices(
                   { name: 'Enabled 🟢', value: 'on' },
                   { name: 'Disabled 🔴', value: 'off' }
               )
        ),

    new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('Enable or disable Anti-Spam protection')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('state')
               .setDescription('Select module status')
               .setRequired(true)
               .addChoices(
                   { name: 'Enabled 🟢', value: 'on' },
                   { name: 'Disabled 🔴', value: 'off' }
               )
        ),

    new SlashCommandBuilder()
        .setName('antiraid')
        .setDescription('Enable or disable Anti-Raid protection')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('state')
               .setDescription('Select module status')
               .setRequired(true)
               .addChoices(
                   { name: 'Enabled 🟢', value: 'on' },
                   { name: 'Disabled 🔴', value: 'off' }
               )
        ),

    new SlashCommandBuilder()
        .setName('security')
        .setDescription('Displays the status of pronxy\'s market security modules')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

// Event: Ready
client.once('ready', async () => {
    console.log(`[ONLINE] pronxy's market bot connected as ${client.user.tag}`);
    client.user.setActivity("pronxy's market | /security", { type: ActivityType.Watching });
    backup.setStorageFolder(__dirname + '/backups/');

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('[SLASH COMMANDS] Security commands successfully registered.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// =============================================================
// 1. ANTI-LINK & ANTI-SPAM MODULE
// =============================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    const config = getGuildSettings(message.guild.id);

    // --- ANTI-LINK ---
    if (config.antiLink && linkRegex.test(message.content)) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.delete().catch(() => {});
            const alert = await message.channel.send(
                `🛡️ **[pronxy's market Security]** ${message.author}, posting links or invites is not allowed!`
            );
            setTimeout(() => alert.delete().catch(() => {}), 4000);
            return;
        }
    }

    // --- ANTI-SPAM ---
    if (config.antiSpam) {
        const userId = message.author.id;
        const now = Date.now();
        const SPAM_LIMIT = 5;
        const TIME_WINDOW = 4000;

        if (!userMessages.has(userId)) userMessages.set(userId, []);
        const timestamps = userMessages.get(userId);
        timestamps.push(now);

        const recentMessages = timestamps.filter(time => now - time < TIME_WINDOW);
        userMessages.set(userId, recentMessages);

        if (recentMessages.length > SPAM_LIMIT) {
            try {
                await message.delete().catch(() => {});
                await message.member.timeout(10 * 60 * 1000, 'pronxy\'s market Anti-Spam System');
                const spamAlert = await message.channel.send(
                    `⚠️ **[pronxy's market]** User **${message.author.tag}** received a 10-minute timeout for SPAM!`
                );
                userMessages.delete(userId);
                setTimeout(() => spamAlert.delete().catch(() => {}), 6000);
            } catch (err) {}
        }
    }
});

// =============================================================
// 2. ANTI-RAID MODULE
// =============================================================
client.on('guildMemberAdd', async (member) => {
    const config = getGuildSettings(member.guild.id);
    if (!config.antiRaid) return;

    const now = Date.now();
    joinLogs.push(now);

    const RAID_LIMIT = 5;
    const RAID_WINDOW = 10000;
    const recentJoins = joinLogs.filter(time => now - time < RAID_WINDOW);

    const accountAge = now - member.user.createdTimestamp;
    const MIN_AGE = 3 * 24 * 60 * 60 * 1000; // 3 Days

    if (recentJoins.length >= RAID_LIMIT || accountAge < MIN_AGE) {
        try {
            await member.kick('pronxy\'s market Anti-Raid System: New account or raid attempt detected');
        } catch (err) {}
    }
});

// =============================================================
// 3. DE-NUKE MODULE (Channel deletion protection)
// =============================================================
client.on('channelDelete', async (channel) => {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
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
            await member.ban({ reason: 'pronxy\'s market De-Nuke: Channel deletion attempt' }).catch(() => {});
        }
    }
});

// =============================================================
// 4. SLASH COMMAND INTERACTION HANDLER
// =============================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild, user } = interaction;
    const config = getGuildSettings(guild.id);

    // --- /ANTILINK COMMAND ---
    if (commandName === 'antilink') {
        const state = options.getString('state');
        config.antiLink = (state === 'on');
        return interaction.reply({
            content: `🛡️ **[pronxy's market]** **Anti-Link** protection has been ${config.antiLink ? 'ENABLED 🟢' : 'DISABLED 🔴'}.`,
            ephemeral: true
        });
    }

    // --- /ANTISPAM COMMAND ---
    if (commandName === 'antispam') {
        const state = options.getString('state');
        config.antiSpam = (state === 'on');
        return interaction.reply({
            content: `⚠️ **[pronxy's market]** **Anti-Spam** protection has been ${config.antiSpam ? 'ENABLED 🟢' : 'DISABLED 🔴'}.`,
            ephemeral: true
        });
    }

    // --- /ANTIRAID COMMAND ---
    if (commandName === 'antiraid') {
        const state = options.getString('state');
        config.antiRaid = (state === 'on');
        return interaction.reply({
            content: `🚨 **[pronxy's market]** **Anti-Raid** protection has been ${config.antiRaid ? 'ENABLED 🟢' : 'DISABLED 🔴'}.`,
            ephemeral: true
        });
    }

    // --- /SECURITY COMMAND ---
    if (commandName === 'security') {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Security Panel - pronxy\'s market')
            .setDescription('Current status of automated protection systems:')
            .addFields(
                { name: '🔗 Anti-Link & Invites', value: config.antiLink ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                { name: '💬 Anti-Spam', value: config.antiSpam ? '🟢 Enabled' : '🔴 Disabled', inline: true },
                { name: '🚨 Anti-Raid', value: config.antiRaid ? '🟢 Enabled' : '🔴 Disabled', inline: true }
            )
            .setColor('#2F3136')
            .setFooter({ text: "pronxy's market Security" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // --- /BACKUP COMMAND ---
    if (commandName === 'backup') {
        const subcommand = options.getSubcommand();
        if (subcommand === 'create') {
            await interaction.deferReply({ ephemeral: true });
            backup.create(guild, { jsonBeautify: true, saveImages: "base64" }).then((backupData) => {
                const embed = new EmbedBuilder()
                    .setTitle('💾 Backup Created - pronxy\'s market')
                    .setDescription(`Server structure saved successfully!\n\n**Backup ID:** \`${backupData.id}\``)
                    .setColor('#2F3136');
                interaction.editReply({ embeds: [embed] });
            }).catch((err) => interaction.editReply(`Error: ${err.message}`));
        }
        if (subcommand === 'load') {
            const backupID = options.getString('id');
            await interaction.reply({ content: '⚙️ Restoring server...', ephemeral: true });
            backup.load(backupID, guild).catch((err) => interaction.followUp({ content: `Error: ${err.message}`, ephemeral: true }));
        }
    }

    // --- /DENUKE COMMAND ---
    if (commandName === 'denuke') {
        if (user.id !== guild.ownerId) return interaction.reply({ content: '❌ Only the Server Owner can execute De-Nuke!', ephemeral: true });
        const backupID = options.getString('backup_id');
        await interaction.reply({ content: '🚨 **PROCEDURE DE-NUKE INITIATED...**', ephemeral: false });
        try {
            const bans = await guild.bans.fetch();
            for (const ban of bans.values()) await guild.members.unban(ban.user.id).catch(() => {});
            await backup.load(backupID, guild);
        } catch (err) {
            await interaction.followUp({ content: `De-Nuke Error: ${err.message}` });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
