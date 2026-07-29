const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

// Pornește serverul Web pentru Render
app.get('/', (req, res) => {
  res.send('VLS BOT este ONLINE 24/7!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server web pornit cu succes pe portul ${port}`);
});

const { 
  Client, 
  GatewayIntentBits, 
  ActivityType, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans
  ]
});

// ==================== CONFIGURARE ====================
const STAFF_ROLE_ID = '1530184577648300253'; 
const VERIFIED_ROLE_ID = '1530184597919240192'; 
// =====================================================

const userMessageTracker = new Map();

// 1. Definim Lista Completă de Comenzi Slash
const commands = [
  // --- Comenzi Administrare / Moderare / Setup (Doar pentru Staff) ---
  new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('Trimite panoul de verificare.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Panou de Suport Ticket.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Dă afară un membru de pe server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banează un membru de pe server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Deblochează (unban) un utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt => opt.setName('userid').setDescription('ID-ul utilizatorului').setRequired(true)),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Mute temporar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addIntegerOption(opt => opt.setName('minute').setDescription('Minute').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Scoate pauza (Timeout).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Șterge un număr de mesaje.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => opt.setName('numar').setDescription('Numărul de mesaje (1-100)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertizează un membru.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul').setRequired(true)),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Blochează canalul curent.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Deblochează canalul curent.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Setează slowmode pe canal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt => opt.setName('secunde').setDescription('Secunde').setRequired(true)),

  new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Recreează canalul curent pentru curățare totală.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // --- Comenzi Publice (Accesibile de către TOȚI membrii și vizibile public) ---
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Trimite un mesaj prin bot (Accesibil pentru toți).')
    .addStringOption(opt => opt.setName('mesaj').setDescription('Mesajul').setRequired(true)),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Informații despre utilizator (Vizibil pentru toți).')
    .addUserOption(opt => opt.setName('user').setDescription('Membru')),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Statistici server (Vizibil pentru toți).'),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping bot.')
].map(cmd => cmd.toJSON());

// 2. Pornire Bot
client.once('ready', async () => {
  console.log(`VLS BOT este ONLINE!`);
  client.user.setActivity('🛡️ Protection Active', { type: ActivityType.Watching });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Comenzile Slash au fost actualizate!');
  } catch (err) {
    console.error('Eroare la comenzi:', err);
  }
});

// 3. Protecție Membri Noi (Anti-Bot)
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) {
    await member.kick('Securitate: Bot neautorizat detectat').catch(() => {});
  }
});

// 4. Filtre de Securitate în Mesaje (Anti-Link, Anti-Spam, Mass-Ping)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const member = message.member;
  const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(STAFF_ROLE_ID);

  if (isStaff) return;

  // Anti-Link Global / Scam
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.(gg|io|me|li)\/[^\s]+)/i;
  if (urlRegex.test(message.content)) {
    await message.delete().catch(() => {});
    const warnLink = await message.channel.send(`⚠️ <@${message.author.id}>, link-urile și reclamele sunt **interzise**!`);
    setTimeout(() => warnLink.delete().catch(() => {}), 5000);
    return;
  }

  // Anti-Mass Ping
  const totalMentions = message.mentions.users.size + message.mentions.roles.size;
  if (totalMentions > 5) {
    await message.delete().catch(() => {});
    await member.timeout(15 * 60 * 1000, 'Securitate: Mass Ping Spam').catch(() => {});
    await message.channel.send(`🛡️ <@${message.author.id}> a primit **timeout 15 minute** pentru Mass Ping!`);
    return;
  }

  // Anti-Spam Rapid
  const userId = message.author.id;
  const now = Date.now();

  if (userMessageTracker.has(userId)) {
    const userData = userMessageTracker.get(userId);
    if (now - userData.firstMessageTime < 4000) {
      userData.messageCount++;
      if (userData.messageCount >= 5) {
        await message.delete().catch(() => {});
        await member.timeout(10 * 60 * 1000, 'Securitate: Auto-Spam Detectat').catch(() => {});
        const warnSpam = await message.channel.send(`🛡️ <@${message.author.id}> a primit **timeout 10 minute** pentru Spam rapid!`);
        setTimeout(() => warnSpam.delete().catch(() => {}), 7000);
        userMessageTracker.delete(userId);
        return;
      }
    } else {
      userMessageTracker.set(userId, { messageCount: 1, firstMessageTime: now });
    }
  } else {
    userMessageTracker.set(userId, { messageCount: 1, firstMessageTime: now });
  }
});

// Helper Verificare Ierarhie
function checkHierarchy(executorMember, targetMember, botMember) {
  if (targetMember.id === executorMember.guild.ownerId) return 'Nu poți acționa asupra Ownerului!';
  if (targetMember.roles.highest.position >= executorMember.roles.highest.position && executorMember.id !== executorMember.guild.ownerId) {
    return 'Nu poți acționa asupra unui membru cu grad egal sau mai mare!';
  }
  if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
    return 'Botul nu are rolul destul de înalt pentru a acționa asupra acestui membru!';
  }
  return null;
}

// 5. Gestionare Comenzi Slash & Interacțiuni
client.on('interactionCreate', async (interaction) => {

  // --- Comanda /setup-verify ---
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-verify') {
    await interaction.deferReply({ ephemeral: true });

    const verifyEmbed = new EmbedBuilder()
      .setTitle('🛡️ CENTRU DE VERIFICARE')
      .setDescription(
`### Bine ai venit pe server!
Apasă pe butonul de mai jos pentru a primii accesul complet pe server.`
      )
      .setColor(0x5865F2)
      .setFooter({ text: 'VLS Community Verification' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_verify_me')
        .setLabel('Verifică-te 🛡️')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [verifyEmbed], components: [row] });
    await interaction.editReply({ content: '✅ Panoul de verificare a fost creat cu succes!' });
    return;
  }

  // --- Apăsare pe Butonul "Verifică-te 🛡️" ---
  if (interaction.isButton() && interaction.customId === 'btn_verify_me') {
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);

    if (!role) {
      return interaction.reply({ content: '❌ Rolul de verificare nu a fost găsit pe server!', ephemeral: true });
    }

    if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
      return interaction.reply({ content: 'ℹ️ Ești deja verificat pe acest server!', ephemeral: true });
    }

    try {
      await member.roles.add(role);
      await interaction.reply({ content: `🎉 **Verificare Reușită!** Ai primit rolul <@&${VERIFIED_ROLE_ID}>.`, ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Botul nu are permisiunea de a oferi acest rol! Asigură-te că rolul botului este mai sus decât rolul acordat.', ephemeral: true });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel, member: executor } = interaction;
  const botMember = guild.members.me;

  // --- COMENZI PUBLICE (Vizibile public și folosite de toți) ---
  if (commandName === 'say') {
    await interaction.deferReply({ ephemeral: false });
    await channel.send(options.getString('mesaj'));
    await interaction.editReply({ content: '✅ Trimis!' });
    return;
  }

  if (commandName === 'userinfo') {
    await interaction.deferReply({ ephemeral: false });
    const userTarget = options.getUser('user') || interaction.user;
    const memberTarget = await guild.members.fetch(userTarget.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(`👤 Informații utilizator - ${userTarget.tag}`)
      .setThumbnail(userTarget.displayAvatarURL({ dynamic: true }))
      .setColor(0x5865F2)
      .addFields(
        { name: '🆔 ID Utilizator:', value: userTarget.id, inline: true },
        { name: '📅 Cont Creat:', value: `<t:${Math.floor(userTarget.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Alăturat pe Server:', value: memberTarget ? `<t:${Math.floor(memberTarget.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (commandName === 'serverinfo') {
    await interaction.deferReply({ ephemeral: false });
    const embed = new EmbedBuilder()
      .setTitle(`📊 Informații Server - ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setColor(0x5865F2)
      .addFields(
        { name: '👑 Owner:', value: `<@${guild.ownerId}>`, inline: true },
        { name: '👥 Membri Totali:', value: `${guild.memberCount}`, inline: true },
        { name: '💬 Canale:', value: `${guild.channels.cache.size}`, inline: true },
        { name: '📅 Creat pe:', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (commandName === 'ping') {
    await interaction.reply({ content: `Pong! 🏓 **${client.ws.ping}ms**`, ephemeral: false });
    return;
  }

  // --- COMANDA /ticket-setup (Cu GIF-ul tău inclus) ---
  if (commandName === 'ticket-setup') {
    await interaction.deferReply({ ephemeral: true });
    
    const embed = new EmbedBuilder()
      .setTitle('🎫 SUPORT TICKET')
      .setDescription('Apasă pe butonul corespunzător de mai jos pentru a deschide un ticket de suport.')
      .setColor(0x5865F2)
      .setImage('https://cdn.discordapp.com/attachments/1527382497342783568/1530170988682285177/standard_29.gif?ex=6a6b31c8&is=6a69e048&hm=ec0f08c269ade7cc79a65f6316d2d80e57e0f15258fdc1e58b37fa67e648074b&');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tk_support').setLabel('Suport General').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tk_reward').setLabel('Claim Reward').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('tk_report').setLabel('Report Member').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: '✅ Panoul de ticket-uri cu GIF a fost creat cu succes!' });
    return;
  }

  // --- COMENZI DE MODERARE / ADMIN ---
  if (commandName === 'warn') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const reason = options.getString('motiv');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    const err = checkHierarchy(executor, targetMember, botMember);
    if (err) return interaction.editReply({ content: `❌ ${err}` });

    const warnEmbed = new EmbedBuilder()
      .setTitle('⚠️ Avertisment Primit')
      .setColor(0xFEE75C)
      .setDescription(`Ai fost avertizat pe serverul **${guild.name}**!\n**Motiv:** ${reason}`)
      .setTimestamp();

    await target.send({ embeds: [warnEmbed] }).catch(() => {});
    await interaction.editReply({ content: `⚠️ **${target.tag}** a fost avertizat! Motiv: *${reason}*` });
  }

  if (commandName === 'kick') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const reason = options.getString('motiv') || 'Fără motiv';
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    const err = checkHierarchy(executor, targetMember, botMember);
    if (err) return interaction.editReply({ content: `❌ ${err}` });

    await targetMember.kick(reason).catch(() => {});
    await interaction.editReply({ content: `✅ **${target.tag}** a primit kick. Motiv: *${reason}*` });
  }

  if (commandName === 'ban') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const reason = options.getString('motiv') || 'Fără motiv';
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (targetMember) {
      const err = checkHierarchy(executor, targetMember, botMember);
      if (err) return interaction.editReply({ content: `❌ ${err}` });
    }
    await guild.members.ban(target, { reason }).catch(() => {});
    await interaction.editReply({ content: `⛔ **${target.tag}** a fost banat! Motiv: *${reason}*` });
  }

  if (commandName === 'unban') {
    await interaction.deferReply({ ephemeral: true });
    const userId = options.getString('userid');
    try {
      await guild.members.unban(userId);
      await interaction.editReply({ content: `✅ Utilizatorul cu ID-ul **${userId}** a primit unban!` });
    } catch {
      await interaction.editReply({ content: `❌ Nu s-a găsit niciun ban pe acest ID.` });
    }
  }

  if (commandName === 'timeout') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const minutes = options.getInteger('minute');
    const reason = options.getString('motiv') || 'Fără motiv';
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    const err = checkHierarchy(executor, targetMember, botMember);
    if (err) return interaction.editReply({ content: `❌ ${err}` });

    await targetMember.timeout(minutes * 60 * 1000, reason).catch(() => {});
    await interaction.editReply({ content: `🔇 **${target.tag}** a primit timeout (${minutes}m). Motiv: *${reason}*` });
  }

  if (commandName === 'unmute') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });
    await targetMember.timeout(null).catch(() => {});
    await interaction.editReply({ content: `🔊 Timeout scos pentru **${target.tag}**!` });
  }

  if (commandName === 'clear') {
    await interaction.deferReply({ ephemeral: true });
    const amount = options.getInteger('numar');
    await channel.bulkDelete(amount, true).catch(() => {});
    await interaction.editReply({ content: `🧹 Am șters **${amount}** mesaje!` });
  }

  if (commandName === 'lock') {
    await interaction.deferReply({ ephemeral: true });
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, SendMessagesInThreads: false });
    await interaction.editReply({ content: '🔒 Canal **blocat**!' });
  }

  if (commandName === 'unlock') {
    await interaction.deferReply({ ephemeral: true });
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, SendMessagesInThreads: null });
    await interaction.editReply({ content: '🔓 Canal **deblocat**!' });
  }

  if (commandName === 'slowmode') {
    await interaction.deferReply({ ephemeral: true });
    const seconds = options.getInteger('secunde');
    await channel.setRateLimitPerUser(seconds);
    await interaction.editReply({ content: seconds === 0 ? '🚀 Slowmode dezactivat!' : `⏱️ Slowmode setat la **${seconds}s**!` });
  }

  if (commandName === 'nuke') {
    await interaction.deferReply({ ephemeral: true });
    const pos = channel.position;
    const newChan = await channel.clone();
    await channel.delete();
    await newChan.setPosition(pos);
    await newChan.send('💣 **Canalul a fost curățat complet (Nuked)!**');
  }
});

// 6. Sistem Ticket Interacțiuni (Butoane)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId, guild, user } = interaction;

  if (['tk_reward', 'tk_report', 'tk_support'].includes(customId)) {
    await interaction.deferReply({ ephemeral: true });

    let categoryName = 'General Support';
    let prefix = 'support';
    let embedColor = 0x5865F2;

    if (customId === 'tk_reward') { categoryName = '🎁 Claim Reward'; prefix = 'reward'; embedColor = 0x57F287; }
    if (customId === 'tk_report') { categoryName = '🚨 Report User'; prefix = 'report'; embedColor = 0xED4245; }

    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = `${prefix}-${cleanUsername}`;

    if (guild.channels.cache.find(c => c.name === channelName)) {
      return interaction.editReply({ content: '⚠️ Ai deja un ticket deschis!' });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
      ]
    });

    const ticketEmbed = new EmbedBuilder()
      .setTitle(`🎫 Ticket nou: ${categoryName}`)
      .setDescription(`Salut <@${user.id}>! Descrie problema ta în detaliu.`)
      .setColor(embedColor);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Închide Ticket').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `<@&${STAFF_ROLE_ID}> <@${user.id}>`, embeds: [ticketEmbed], components: [closeRow] });
    await interaction.editReply({ content: `✅ Ticket creat: ${ticketChannel}` });
  }

  if (customId === 'close_ticket') {
    await interaction.reply({ content: '🔒 Ticketul se va închide în 5 secunde...', ephemeral: true });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.DISCORD_TOKEN
  
