const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('VLS BOT este ONLINE!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server web pornit pe portul ${port}`);
});

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('VLS BOT este treaz și funcționează!');
});

app.listen(port, () => {
  console.log(`Server web pornit pe portul ${port}`);
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
    GatewayIntentBits.GuildMembers
  ]
});

// 1. Definim Comenzile Slash & Moderare
const commands = [
  // --- MODERARE ---
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
    .setDescription('Deblochează (unban) un utilizator folosind ID-ul lui.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt => opt.setName('userid').setDescription('ID-ul utilizatorului (ex: 123456789)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Pune un membru pe pauză (Mute).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true))
    .addIntegerOption(opt => opt.setName('minute').setDescription('Durata în minute').setRequired(true))
    .addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Scoate pauza (Timeout) de pe un membru.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('Membru').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Șterge un număr de mesaje.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => opt.setName('numar').setDescription('Numărul de mesaje (1-100)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Blochează canalul curent (membrii nu mai pot scrie).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Deblochează canalul curent.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // --- TICKET SETUP ---
  new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Trimite panoul principal de suport prin Ticket.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // --- UTILITARE ---
  new SlashCommandBuilder().setName('ping').setDescription('Verifică ping-ul botului.')
].map(cmd => cmd.toJSON());

// 2. Pornire Bot & Înregistrare Comenzi
client.once('ready', async () => {
  console.log(`VLS BOT este ONLINE!`);
  client.user.setActivity('VLS Support & Moderation', { type: ActivityType.Watching });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Comenzile Slash (Moderare & Ticket) au fost actualizate!');
  } catch (err) {
    console.error('Eroare la comenzi:', err);
  }
});

// 3. Gestionare Comenzi Slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, channel } = interaction;

  // --- /ticket-setup ---
  if (commandName === 'ticket-setup') {
    const embedText = 
`# 🎫 CENTRU DE SUPORT
***Ai nevoie de ajutor? Selectează categoria potrivită din meniul de mai jos și deschide un ticket. Echipa noastră îți va răspunde cât mai curând posibil.***

## 🎁 Claim Reward
**Deschide un ticket pentru a revendica un premiu sau o recompensă. Te rugăm să atașezi dovezile necesare.**

## 🚨 Report a User
**Raportează un utilizator care a încălcat regulamentul. Include ID-ul utilizatorului, motivul raportării și dovezi clare.**

## 🛡️ General Support
**Pentru întrebări, probleme sau orice alt tip de ajutor care nu se încadrează în categoriile de mai sus.**

-# Nu deschide ticket-uri fără motiv și nu contacta membrii staff-ului în privat. Abuzul sistemului de suport poate duce la sancțiuni.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tk_reward').setLabel('Claim Reward').setEmoji('🎁').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('tk_report').setLabel('Report a User').setEmoji('🚨').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('tk_support').setLabel('General Support').setEmoji('🛡️').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ content: embedText, components: [row] });
    await interaction.reply({ content: '✅ Panoul de suport Ticket a fost trimis!', ephemeral: true });
  }

  // --- /kick ---
  if (commandName === 'kick') {
    const target = options.getUser('user');
    const reason = options.getString('motiv') || 'Fără motiv';
    const member = await guild.members.fetch(target.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Membrul nu a fost găsit!', ephemeral: true });
    await member.kick(reason);
    await interaction.reply({ content: `✅ **${target.tag}** a primit kick. Motiv: *${reason}*` });
  }

  // --- /ban ---
  if (commandName === 'ban') {
    const target = options.getUser('user');
    const reason = options.getString('motiv') || 'Fără motiv';
    await guild.members.ban(target, { reason });
    await interaction.reply({ content: `⛔ **${target.tag}** a fost banat! Motiv: *${reason}*` });
  }

  // --- /unban ---
  if (commandName === 'unban') {
    const userId = options.getString('userid');
    try {
      await guild.members.unban(userId);
      await interaction.reply({ content: `✅ Utilizatorul cu ID-ul **${userId}** a primit unban!` });
    } catch (err) {
      await interaction.reply({ content: '❌ Nu s-a găsit niciun ban pe acest ID sau ID-ul este invalid.', ephemeral: true });
    }
  }

  // --- /timeout ---
  if (commandName === 'timeout') {
    const target = options.getUser('user');
    const minutes = options.getInteger('minute');
    const reason = options.getString('motiv') || 'Fără motiv';
    const member = await guild.members.fetch(target.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Membrul nu a fost găsit!', ephemeral: true });
    await member.timeout(minutes * 60 * 1000, reason);
    await interaction.reply({ content: `🔇 **${target.tag}** a primit timeout pentru **${minutes} minute**. Motiv: *${reason}*` });
  }

  // --- /unmute ---
  if (commandName === 'unmute') {
    const target = options.getUser('user');
    const member = await guild.members.fetch(target.id).catch(() => null);

    if (!member) return interaction.reply({ content: '❌ Membrul nu a fost găsit!', ephemeral: true });
    await member.timeout(null);
    await interaction.reply({ content: `🔊 Timeout-ul a fost scos pentru **${target.tag}**!` });
  }

  // --- /clear ---
  if (commandName === 'clear') {
    const amount = options.getInteger('numar');
    await channel.bulkDelete(amount, true);
    await interaction.reply({ content: `🧹 Am șters **${amount}** mesaje!`, ephemeral: true });
  }

  // --- /lock ---
  if (commandName === 'lock') {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
    await interaction.reply({ content: '🔒 Canalul a fost **blocat**!' });
  }

  // --- /unlock ---
  if (commandName === 'unlock') {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
    await interaction.reply({ content: '🔓 Canalul a fost **deblocat**!' });
  }

  // --- /ping ---
  if (commandName === 'ping') await interaction.reply('Pong! 🏓 VLS BOT răspunde instant!');
});

// 4. Sistem Butoane TK (Creare / Închidere Ticket)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, guild, user } = interaction;

  // Butoane TK (Reward, Report, Support)
  if (['tk_reward', 'tk_report', 'tk_support'].includes(customId)) {
    let categoryName = 'support';
    let prefix = 'ticket';

    if (customId === 'tk_reward') { categoryName = '🎁 Claim Reward'; prefix = 'reward'; }
    if (customId === 'tk_report') { categoryName = '🚨 Report User'; prefix = 'report'; }
    if (customId === 'tk_support') { categoryName = '🛡️ General Support'; prefix = 'support'; }

    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = `${prefix}-${cleanUsername}`;

    // Verificare dacă are deja ticket deschis
    const existingChannel = guild.channels.cache.find(c => c.name === channelName);
    if (existingChannel) {
      return interaction.reply({ content: `⚠️ Ai deja un ticket deschis aici: ${existingChannel}`, ephemeral: true });
    }

    // Creare canal privat
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
        }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Închide Ticket').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `Salut <@${user.id}>! Ai deschis un ticket la categoria **${categoryName}**.\nTe rugăm să oferi detaliile necesare, iar echipa noastră îți va răspunde în cel mai scurt timp.`,
      components: [closeRow]
    });

    await interaction.reply({ content: `✅ Ticketul tău a fost creat: ${ticketChannel}`, ephemeral: true });
  }

  // Închidere Ticket
  if (customId === 'close_ticket') {
    await interaction.reply('🔒 Ticketul se va închide în 5 secunde...');
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

// Logare
client.login(process.env.DISCORD_TOKEN);
                                 
