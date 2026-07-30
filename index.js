const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('VLS BOT este ONLINE 24/7!');
});

app.listen(port, '0.0.0.0', () => {
  console.log('Server web pornit cu succes pe portul ' + port);
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
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const STAFF_ROLE_ID = '1530184577648300253'; 
const VERIFIED_ROLE_ID = '1530184597919240192'; 
const GUILD_ID = '1455317975191126219'; 

const userMessageTracker = new Map();
const userLastMessage = new Map();

const userNotes = new Map(); 
const userCases = new Map(); 

const commands = [
  new SlashCommandBuilder().setName('setup-verify').setDescription('Trimite panoul de verificare.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('ticket-setup').setDescription('Panou de Suport Ticket.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Joacă Piatră, Hârtie, Foarfecă cu botul!')
    .addStringOption(opt => 
      opt.setName('alegere').setDescription('Alege opțiunea ta').setRequired(true)
         .addChoices(
           { name: '🪨 Piatră', value: 'piatra' },
           { name: '📄 Hârtie', value: 'hartie' },
           { name: '✂️ Foarfecă', value: 'foarfece' }
         )
    ),

  // Comenzi exacte din video
  new SlashCommandBuilder()
    .setName('ban-add')
    .setDescription('Banează un utilizator de pe server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('ban-remove')
    .setDescription('Elimină un ban de la un utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt => opt.setName('userid').setDescription('ID utilizator').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ban-temp')
    .setDescription('Banează temporar un utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addIntegerOption(opt => opt.setName('ore').setDescription('Număr de ore').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('mute-add')
    .setDescription('Timeout / Mute pentru un membru.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addIntegerOption(opt => opt.setName('minute').setDescription('Minute').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('mute-remove')
    .setDescription('Scoate timeout-ul (unmute).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('role-add')
    .setDescription('ADMIN ONLY - Adaugă un rol unui membru.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addRoleOption(opt => opt.setName('rol').setDescription('Rolul').setRequired(true)),

  new SlashCommandBuilder()
    .setName('role-remove')
    .setDescription('ADMIN ONLY - Scoate un rol unui membru.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addRoleOption(opt => opt.setName('rol').setDescription('Rolul').setRequired(true)),

  new SlashCommandBuilder()
    .setName('role-temp')
    .setDescription('ADMIN ONLY - Dă un rol temporar.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addRoleOption(opt => opt.setName('rol').setDescription('Rolul').setRequired(true))
    .addIntegerOption(opt => opt.setName('minute').setDescription('Minute').setRequired(true)),

  new SlashCommandBuilder()
    .setName('voice-deaf')
    .setDescription('Dă deafen și mute unui membru în canalul vocal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('voice-undeaf')
    .setDescription('Scoate deafen și unmate în canalul vocal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Dă afară un membru de pe server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('case-view')
    .setDescription('Vezi detaliile unui caz.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(opt => opt.setName('caseid').setDescription('ID Caz').setRequired(true)),

  new SlashCommandBuilder()
    .setName('note-add')
    .setDescription('Adaugă o notă de moderare unui utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('nota').setDescription('Textul notei').setRequired(true)),

  new SlashCommandBuilder()
    .setName('note-remove')
    .setDescription('Șterge o notă de moderare.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addIntegerOption(opt => opt.setName('index').setDescription('Numărul notei').setRequired(true)),

  new SlashCommandBuilder()
    .setName('note-view')
    .setDescription('Vezi notele de moderare ale unui utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('case-remove')
    .setDescription('Elimină un caz din istoricul unui utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addIntegerOption(opt => opt.setName('caseid').setDescription('ID Caz').setRequired(true)),

  new SlashCommandBuilder()
    .setName('user-history')
    .setDescription('Vezi istoricul de moderare al unui utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Modifică slowmode-ul canalului selectat.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt => opt.setName('secunde').setDescription('Secunde').setRequired(true)),

  new SlashCommandBuilder()
    .setName('user-clear-history')
    .setDescription('ADMIN ONLY - Șterge istoricul de moderare al unui utilizator.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertizează un utilizator și trimite embed privat.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul').setRequired(true)),

  new SlashCommandBuilder().setName('ping').setDescription('Verifică latența botului!'),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Șterge mesaje multiple dintr-un canal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => opt.setName('numar').setDescription('Număr de mesaje').setRequired(true)),

  new SlashCommandBuilder().setName('server-info').setDescription('Obține informații despre server!'),

  new SlashCommandBuilder()
    .setName('user-nick')
    .setDescription('Modifică porecla (nickname) unui membru.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addStringOption(opt => opt.setName('porecla').setDescription('Noua poreclă').setRequired(true)),

  new SlashCommandBuilder().setName('channel-lock').setDescription('Blochează canalul curent.').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('channel-unlock').setDescription('Deblochează canalul curent.').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Pune botul să spună ceva.')
    .addStringOption(opt => opt.setName('mesaj').setDescription('Mesajul').setRequired(true))
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log('VLS BOT este ONLINE cu comenzile din video!');
  client.user.setActivity('🔒 Security Active', { type: ActivityType.Watching });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID), 
      { body: commands }
    );
    console.log('Comenzile din video au fost înregistrate cu succes pe server!');
  } catch (err) {
    console.error('Eroare la comenzi:', err);
  }
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) {
    await member.kick('Securitate: Bot neautorizat detectat').catch(() => {});
    return;
  }

  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 3) {
    await member.send('⛔ Contul tău este prea nou (sub 3 zile) și a fost respins automat de sistemul de securitate.').catch(() => {});
    await member.kick('Securitate: Cont creat recent (potențial raid/alt account).').catch(() => {});
    return;
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const member = message.member;
  if (!member) return;

  const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.has(STAFF_ROLE_ID);
  if (isStaff) return;

  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.(gg|io|me|li|com\/invite)\/[^\s]+)/i;
  if (urlRegex.test(message.content)) {
    await message.delete().catch(() => {});
    const warnLink = await message.channel.send('🚨 <@' + message.author.id + '>, link-urile și invitațiile sunt strict interzise!');
    setTimeout(() => warnLink.delete().catch(() => {}), 5000);
    return;
  }

  const hasEveryoneOrHere = message.mentions.everyone;
  const totalMentions = message.mentions.users.size + message.mentions.roles.size;

  if (hasEveryoneOrHere || totalMentions > 2) {
    await message.delete().catch(() => {});
    await member.timeout(60 * 60 * 1000, 'Securitate: Mass-Ping sau Everyone Raid').catch(() => {});
    const warnPing = await message.channel.send('🛡️ <@' + message.author.id + '> a primit TIMEOUT 1 ORĂ pentru Mass-Ping / Everyone!');
    setTimeout(() => warnPing.delete().catch(() => {}), 7000);
    return;
  }

  const userId = message.author.id;
  const now = Date.now();

  if (userLastMessage.has(userId)) {
    const lastData = userLastMessage.get(userId);
    if (lastData.content === message.content && (now - lastData.time) < 10000) {
      await message.delete().catch(() => {});
      await member.timeout(30 * 60 * 1000, 'Securitate: Spam mesaje identice').catch(() => {});
      const warnDup = await message.channel.send('🛡️ <@' + message.author.id + '> a primit timeout 30 minute pentru spam identic!');
      setTimeout(() => warnDup.delete().catch(() => {}), 6000);
      userLastMessage.delete(userId);
      return;
    }
  }
  userLastMessage.set(userId, { content: message.content, time: now });

  if (userMessageTracker.has(userId)) {
    const userData = userMessageTracker.get(userId);
    if (now - userData.firstMessageTime < 4000) {
      userData.messageCount++;
      if (userData.messageCount >= 4) {
        await message.delete().catch(() => {});
        await member.timeout(20 * 60 * 1000, 'Securitate: Flood / Spam rapid').catch(() => {});
        const warnSpam = await message.channel.send('🛡️ <@' + message.author.id + '> a primit timeout 20 minute pentru flood!');
        setTimeout(() => warnSpam.delete().catch(() => {}), 6000);
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

function checkHierarchy(executorMember, targetMember, botMember) {
  if (targetMember.id === executorMember.guild.ownerId) return 'Nu poți acționa asupra Ownerului!';
  if (targetMember.roles.highest.position >= executorMember.roles.highest.position && executorMember.id !== executorMember.guild.ownerId) {
    return 'Nu poți acționa asupra unui membru cu grad egal sau mai mare!';
  }
  if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
    return 'Botul nu are rolul destul de înalt!';
  }
  return null;
}

client.on('interactionCreate', async (interaction) => {

  if (interaction.isButton() && interaction.customId === 'btn_verify_me') {
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);

    if (!role) {
      return interaction.reply({ content: '❌ Rolul de verificare nu a fost găsit!', ephemeral: true });
    }

    if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
      return interaction.reply({ content: 'ℹ️ Ești deja verificat!', ephemeral: true });
    }

    try {
      await member.roles.add(role);
      await interaction.reply({ content: '🎉 Verificare Reușită! Ai primit rolul <@&' + VERIFIED_ROLE_ID + '>.', ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Botul nu are permisiunea de a oferi acest rol!', ephemeral: true });
    }
    return;
  }

  if (interaction.isButton() && ['tk_reward', 'tk_report', 'tk_support'].includes(interaction.customId)) {
    await interaction.deferReply({ ephemeral: true });
    const { customId, guild, user } = interaction;

    let categoryName = 'General Support';
    let prefix = 'support';
    let embedColor = 0x0077b6;

    if (customId === 'tk_reward') { categoryName = '🎁 Claim Reward'; prefix = 'reward'; embedColor = 0x57F287; }
    if (customId === 'tk_report') { categoryName = '🚨 Report User'; prefix = 'report'; embedColor = 0xED4245; }

    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = prefix + '-' + cleanUsername;

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
      .setTitle('🎫 Ticket nou: ' + categoryName)
      .setDescription('Salut <@' + user.id + '>! Descrie problema ta în detaliu.')
      .setColor(embedColor);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Închide Ticket').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: '<@&' + STAFF_ROLE_ID + '> <@' + user.id + '>', embeds: [ticketEmbed], components: [closeRow] });
    await interaction.editReply({ content: '✅ Ticket creat: ' + ticketChannel });
    return;
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await interaction.reply({ content: '🔒 Ticketul se va închide în 5 secunde...', ephemeral: true });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel, member: executor, user: executorUser } = interaction;
  const botMember = guild.members.me;

  const logCase = (targetId, action, reason) => {
    if (!userCases.has(targetId)) userCases.set(targetId, []);
    const list = userCases.get(targetId);
    const caseId = Math.floor(100000 + Math.random() * 900000);
    list.push({ caseId, action, reason, moderator: executorUser.tag, time: Date.now() });
    return caseId;
  };

  if (commandName === 'rps') {
    await interaction.deferReply({ ephemeral: false });
    const userChoice = options.getString('alegere');
    const choices = ['piatra', 'hartie', 'foarfece'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    const emojis = { piatra: '🪨 Piatră', hartie: '📄 Hârtie', foarfece: '✂️ Foarfecă' };
    let result = '';
    let color = 0x0077b6;

    if (userChoice === botChoice) {
      result = '🤝 **Egalitate!** Amândoi am ales ' + emojis[userChoice] + '.';
      color = 0xFEE75C;
    } else if (
      (userChoice === 'piatra' && botChoice === 'foarfece') ||
      (userChoice === 'hartie' && botChoice === 'piatra') ||
      (userChoice === 'foarfece' && botChoice === 'hartie')
    ) {
      result = '🎉 **Felicitări, ai câștigat!** Alegerea ta (' + emojis[userChoice] + ') bate alegerea mea (' + emojis[botChoice] + ').';
      color = 0x57F287;
    } else {
      result = '😢 **Ai pierdut!** Alegerea mea (' + emojis[botChoice] + ') bate alegerea ta (' + emojis[userChoice] + ').';
      color = 0xED4245;
    }

    const rpsEmbed = new EmbedBuilder()
      .setTitle('🎮 Piatră, Hârtie, Foarfecă')
      .setColor(color)
      .addFields(
        { name: '👤 Alegerea ta:', value: emojis[userChoice], inline: true },
        { name: '🤖 Alegerea mea:', value: emojis[botChoice], inline: true },
        { name: '🏆 Rezultat:', value: result, inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [rpsEmbed] });
    return;
  }

  if (commandName === 'setup-verify') {
    await interaction.deferReply({ ephemeral: true });
    const verifyEmbed = new EmbedBuilder()
      .setTitle('🛡️ CENTRU DE VERIFICARE')
      .setDescription('Apasă pe butonul de mai jos pentru a primi accesul complet.')
      .setColor(0x0077b6)
 .setFooter({ text: 'VLS Community Verification' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_verify_me').setLabel('Verifică-te 🛡️').setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [verifyEmbed], components: [row] });
    await interaction.editReply({ content: '✅ Panoul de verificare a fost creat!' });
    return;
  }

  if (commandName === 'ticket-setup') {
    await interaction.deferReply({ ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(0x0077b6)
      .setDescription(
        '# 🎫 CENTRU DE SUPORT\n' +
        '***Ai nevoie de ajutor? Selectează categoria potrivită și deschide un ticket.***\n\n' +
        '## 🎁 Claim Reward\nDeschide un ticket pentru a revendica un premiu.\n\n' +
        '## 🚨 Report a User\nRaportează un utilizator care a încălcat regulamentul.\n\n' +
        '## 🛡️ General Support\nPentru întrebări și asistență generală.'
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tk_support').setLabel('Suport General').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tk_reward').setLabel('Claim Reward').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('tk_report').setLabel('Report Member').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: '✅ Panoul de ticket-uri a fost creat!' });
    return;
  }

  if (commandName === 'say') {
    await interaction.deferReply({ ephemeral: false });
    await channel.send(options.getString('mesaj'));
    await interaction.editReply({ content: '✅ Trimis!' });
    return;
  }

  if (commandName === 'ping') {
    await interaction.reply({ content: 'Pong! 🏓 **' + client.ws.ping + 'ms**', ephemeral: false });
    return;
  }

  if (commandName === 'server-info') {
    await interaction.deferReply({ ephemeral: false });
    const embed = new EmbedBuilder()
      .setTitle('📊 Informații Server - ' + guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setColor(0x0077b6)
      .addFields(
        { name: '👑 Owner:', value: '<@' + guild.ownerId + '>', inline: true },
        { name: '👥 Membri Totali:', value: '' + guild.memberCount, inline: true },
        { name: '💬 Canale:', value: '' + guild.channels.cache.size, inline: true }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (commandName === 'purge') {
    await interaction.deferReply({ ephemeral: true });
    const amount = options.getInteger('numar');
    await channel.bulkDelete(amount, true).catch(() => {});
    await interaction.editReply({ content: '🧹 Am șters **' + amount + '** mesaje!' });
    return;
  }

  if (commandName === 'channel-lock') {
    await interaction.deferReply({ ephemeral: true });
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
    await interaction.editReply({ content: '🔒 Canal blocat!' });
    return;
  }

  if (commandName === 'channel-unlock') {
    await interaction.deferReply({ ephemeral: true });
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
    await interaction.editReply({ content: '🔓 Canal deblocat!' });
    return;
  }

  if (commandName === 'slowmode') {
    await interaction.deferReply({ ephemeral: true });
    const seconds = options.getInteger('secunde');
    await channel.setRateLimitPerUser(seconds);
    await interaction.editReply({ content: '⏱️ Slowmode setat la ' + seconds + ' secunde!' });
    return;
  }

  if (commandName === 'user-nick') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const newNick = options.getString('porecla');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    const err = checkHierarchy(executor, targetMember, botMember);
    if (err) return interaction.editReply({ content: '❌ ' + err });

    await targetMember.setNickname(newNick).catch(() => {});
    await interaction.editReply({ content: '✅ Porecla lui **' + target.tag + '** a fost modificată!' });
    return;
  }

  // Executare comenzi din video
  if (commandName === 'ban-add') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const reason = options.getString('motiv') || 'Fără motiv';
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (targetMember) {
      const err = checkHierarchy(executor, targetMember, botMember);
      if (err) return interaction.editReply({ content: '❌ ' + err });
    }
    const caseId = logCase(target.id, 'Ban', reason);
    await guild.members.ban(target, { reason }).catch(() => {});
    await interaction.editReply({ content: '⛔ Utilizatorul a fost banat! (Caz #' + caseId + ')' });
    return;
  }

  if (commandName === 'ban-remove') {
    await interaction.deferReply({ ephemeral: true });
    const userId = options.getString('userid');
    try {
      await guild.members.unban(userId);
      await interaction.editReply({ content: '✅ Banul a fost scos pentru ID-ul ' + userId + '!' });
    } catch {
      await interaction.editReply({ content: '❌ Nu s-a găsit niciun ban activ pe acest ID.' });
    }
    return;
  }

  if (commandName === 'ban-temp') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const hours = options.getInteger('ore');
    const reason = options.getString('motiv') || 'Fără motiv';
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (targetMember) {
      const err = checkHierarchy(executor, targetMember, botMember);
      if (err) return interaction.editReply({ content: '❌ ' + err });
    }
    const caseId = logCase(target.id, `Temp-Ban (${hours}h)`, reason);
    await guild.members.ban(target, { reason }).catch(() => {});
    setTimeout(async () => {
      await guild.members.unban(target.id).catch(() => {});
    }, hours * 60 * 60 * 1000);

    await interaction.editReply({ content: '⏱️ Utilizatorul a primit ban temporar ' + hours + ' ore! (Caz #' + caseId + ')' });
    return;
  }

  if (commandName === 'mute-add') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const minutes = options.getInteger('minute');
    const reason = options.getString('motiv') || 'Fără motiv';
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    const err = checkHierarchy(executor, targetMember, botMember);
    if (err) return interaction.editReply({ content: '❌ ' + err });

    const caseId = logCase(target.id, `Timeout (${minutes}m)`, reason);
    await targetMember.timeout(minutes * 60 * 1000, reason).catch(() => {});
    await interaction.editReply({ content: '🔇 Timeout aplicat pentru ' + minutes + ' minute! (Caz #' + caseId + ')' });
    return;
  }

  if (commandName === 'mute-remove') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });
    await targetMember.timeout(null).catch(() => {});
    await interaction.editReply({ content: '🔊 Timeout scos pentru **' + target.tag + '**!' });
    return;
  }

  if (commandName === 'role-add') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const role = options.getRole('rol');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    await targetMember.roles.add(role).catch(() => {});
    await interaction.editReply({ content: '✅ Rolul <@&' + role.id + '> a fost adăugat lui **' + target.tag + '**!' });
    return;
  }

  if (commandName === 'role-remove') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const role = options.getRole('rol');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    await targetMember.roles.remove(role).catch(() => {});
    await interaction.editReply({ content: '✅ Rolul <@&' + role.id + '> a fost scos de la **' + target.tag + '**!' });
    return;
  }

  if (commandName === 'role-temp') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const role = options.getRole('rol');
    const minutes = options.getInteger('minute');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    await targetMember.roles.add(role).catch(() => {});
    setTimeout(async () => {
      await targetMember.roles.remove(role).catch(() => {});
    }, minutes * 60 * 1000);

    await interaction.editReply({ content: '⏱️ Rolul <@&' + role.id + '> a fost dat temporar (' + minutes + ' minute) lui **' + target.tag + '**!' });
    return;
  }

  if (commandName === 'voice-deaf') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember || !targetMember.voice.channel) return interaction.editReply({ content: '❌ Membrul nu este într-un canal vocal!' });

    await targetMember.voice.setDeaf(true).catch(() => {});
    await interaction.editReply({ content: '🔇 Utilizatorul a primit deafen în canalul vocal.' });
    return;
  }

  if (commandName === 'voice-undeaf') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember || !targetMember.voice.channel) return interaction.editReply({ content: '❌ Membrul nu este într-un canal vocal!' });

    await targetMember.voice.setDeaf(false).catch(() => {});
    await interaction.editReply({ content: '🔊 S-a scos deafen-ul din canalul vocal.' });
    return;
  }

  if (commandName === 'kick') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const reason = options.getString('motiv') || 'Fără motiv';
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    const err = checkHierarchy(executor, targetMember, botMember);
    if (err) return interaction.editReply({ content: '❌ ' + err });

    const caseId = logCase(target.id, 'Kick', reason);
    await targetMember.kick(reason).catch(() => {});
    await interaction.editReply({ content: '✅ Utilizatorul a primit kick. (Caz #' + caseId + ')' });
    return;
  }

  if (commandName === 'warn') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const reason = options.getString('motiv');
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ Membrul nu a fost găsit!' });

    const err = checkHierarchy(executor, targetMember, botMember);
    if (err) return interaction.editReply({ content: '❌ ' + err });

    const caseId = logCase(target.id, 'Warn', reason);
    const timestampNow = '<t:' + Math.floor(Date.now() / 1000) + ':R>';

    const warnEmbed = new EmbedBuilder()
      .setTitle('❗ Punishment Issued')
      .setColor(0x0077b6)
      .setDescription(
        'You received a punishment from our server staff for breaking the server rules. Please check the details below:\n\n' +
        '- **Punishment:** Warn\n' +
        '- **Moderator:** <@' + executorUser.id + '>\n' +
        '- **Time:** ' + timestampNow + '\n' +
        '- **Case ID:** #' + caseId + '\n' +
        '- **Reason:** ' + reason
      )
      .setFooter({ text: guild.name + ' Moderation Team' })
      .setTimestamp();

    await target.send({ embeds: [warnEmbed] }).catch(() => {});
    await interaction.editReply({ content: '⚠️ **' + target.tag + '** a fost avertizat și notificat în privat! (Caz #' + caseId + ')' });
    return;
  }

  if (commandName === 'case-view') {
    await interaction.deferReply({ ephemeral: true });
    const caseId = options.getInteger('caseid');
    let found = null;
    for (let [uid, cases] of userCases.entries()) {
      const c = cases.find(x => x.caseId === caseId);
      if (c) { found = c; break; }
    }
    if (!found) return interaction.editReply({ content: '❌ Cazul #' + caseId + ' nu a fost găsit!' });

    const embed = new EmbedBuilder()
      .setTitle('🔍 Detalii Caz #' + found.caseId)
      .setColor(0x0077b6)
      .addFields(
        { name: '🛠️ Acțiune:', value: found.action, inline: true },
        { name: '🛡️ Moderator:', value: found.moderator, inline: true },
        { name: '📝 Motiv:', value: found.reason, inline: false }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (commandName === 'case-remove') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const caseId = options.getInteger('caseid');
    if (userCases.has(target.id)) {
      let list = userCases.get(target.id);
      userCases.set(target.id, list.filter(c => c.caseId !== caseId));
    }
    await interaction.editReply({ content: '✅ Cazul #' + caseId + ' a fost șters din istoricul utilizatorului!' });
    return;
  }

  if (commandName === 'note-add') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const nota = options.getString('nota');
    if (!userNotes.has(target.id)) userNotes.set(target.id, []);
    userNotes.get(target.id).push({ nota, moderator: executorUser.tag, time: Date.now() });
    await interaction.editReply({ content: '✅ Notă adaugată cu succes pentru **' + target.tag + '**!' });
    return;
  }

  if (commandName === 'note-view') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const notes = userNotes.get(target.id) || [];
    if (notes.length === 0) return interaction.editReply({ content: 'ℹ️ Utilizatorul nu are nicio notă înregistrată.' });

    let desc = notes.map((n, idx) => `**#${idx + 1}** - ${n.nota} *(de ${n.moderator})*`).join('\n');
    const embed = new EmbedBuilder().setTitle('📝 Note pentru ' + target.tag).setDescription(desc).setColor(0x0077b6);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (commandName === 'note-remove') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const index = options.getInteger('index') - 1;
    if (userNotes.has(target.id)) {
      let notes = userNotes.get(target.id);
      if (notes[index]) {
        notes.splice(index, 1);
        return interaction.editReply({ content: '✅ Nota a fost ștearsă!' });
      }
    }
    await interaction.editReply({ content: '❌ Indexul notei nu a fost găsit.' });
    return;
  }

  if (commandName === 'user-history') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    const cases = userCases.get(target.id) || [];
    if (cases.length === 0) return interaction.editReply({ content: 'ℹ️ Utilizatorul nu are niciun istoric de moderare.' });

    let desc = cases.map(c => `**[Caz #${c.caseId}]** ${c.action} - Motiv: *${c.reason}*`).join('\n');
    const embed = new EmbedBuilder().setTitle('📊 Istoric moderare: ' + target.tag).setDescription(desc).setColor(0x0077b6);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (commandName === 'user-clear-history') {
    await interaction.deferReply({ ephemeral: true });
    const target = options.getUser('user');
    userCases.delete(target.id);
    userNotes.delete(target.id);
    await interaction.editReply({ content: '✅ Istoricul și notele utilizatorului au fost resetate complet!' });
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
