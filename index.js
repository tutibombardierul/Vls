const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('VLS BOT este ONLINE 24/7!');
});

app.listen(port, '0.0.0.0', () => {
  console.log('Server web pornit cu succes pe portul ' + port);
});
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } = require('discord.js');

// ID-urile serverului tău
const TICKET_CATEGORY_ID = '1530184638893522984';
const STAFF_ROLE_ID = '1530184457744830255';
const VERIFIED_ROLE_ID = '15301895791240192';
const LOG_CHANNEL_ID = '1530184671827071160';
const PREFIX = '-';

// Evitare creare dublă
const activeTicketCreations = new Set();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Definire Comenzi Slash
const commands = [
  new SlashCommandBuilder().setName('help').setDescription('Meniul de ajutor cu toate comenzile'),
  new SlashCommandBuilder().setName('setup-verify').setDescription('Trimite panoul de verificare pe server'),
  new SlashCommandBuilder().setName('ticket-setup').setDescription('Panou de Suport Tickete'),
  new SlashCommandBuilder().setName('ping').setDescription('Verifică latența botului!'),
  new SlashCommandBuilder().setName('server-info').setDescription('Informații despre server!'),
  new SlashCommandBuilder().setName('user-info').setDescription('Informații un utilizator').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul')),
  new SlashCommandBuilder().setName('say').setDescription('Pune botul să spună ceva').addStringOption(opt => opt.setName('mesaj').setDescription('Mesajul').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('Șterge mesaje dintr-un canal!').addIntegerOption(opt => opt.setName('numar').setDescription('Numărul de mesaje').setRequired(true)),
  new SlashCommandBuilder().setName('channel-lock').setDescription('Blochează canalul curent'),
  new SlashCommandBuilder().setName('channel-unlock').setDescription('Deblochează canalul curent'),
  new SlashCommandBuilder().setName('slowmode').setDescription('Setează slowmode pe canal').addIntegerOption(opt => opt.setName('secunde').setDescription('Secunde').setRequired(true)),
  new SlashCommandBuilder().setName('user-nick').setDescription('Schimbă porecla unui utilizator').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addStringOption(opt => opt.setName('porecla').setDescription('Noua poreclă').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick de pe server').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),
  new SlashCommandBuilder().setName('ban').setDescription('Banează un utilizator de pe server.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),
  new SlashCommandBuilder().setName('unban').setDescription('Elimină un ban de la un utilizator.').addStringOption(opt => opt.setName('userid').setDescription('ID-ul utilizatorului').setRequired(true)),
  new SlashCommandBuilder().setName('tempban').setDescription('Ban temporar pe server.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addIntegerOption(opt => opt.setName('ore').setDescription('Număr de ore').setRequired(true)).addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),
  new SlashCommandBuilder().setName('mute').setDescription('Timeout pentru membru.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addIntegerOption(opt => opt.setName('minute').setDescription('Minute').setRequired(true)).addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),
  new SlashCommandBuilder().setName('unmute').setDescription('Scoate timeout-ul (unmute).').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)),
  new SlashCommandBuilder().setName('role-add').setDescription('Adaugă un rol unui membru.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Rolul').setRequired(true)),
  new SlashCommandBuilder().setName('role-remove').setDescription('Scoate un rol unui membru.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Rolul').setRequired(true)),
  new SlashCommandBuilder().setName('temp-role').setDescription('Dă un rol temporar.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addRoleOption(opt => opt.setName('rol').setDescription('Rolul').setRequired(true)).addIntegerOption(opt => opt.setName('minute').setDescription('Minute').setRequired(true)),
  new SlashCommandBuilder().setName('voice-deaf').setDescription('Da deafen lui mute unui membru in canal vocal.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)),
  new SlashCommandBuilder().setName('voice-undeaf').setDescription('Scoate deafen și unmute în canalul vocal.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Dă un avertisment unui utilizator.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addStringOption(opt => opt.setName('motiv').setDescription('Motivul')),
  new SlashCommandBuilder().setName('unwarn').setDescription('Șterge o notă de moderare.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addIntegerOption(opt => opt.setName('index').setDescription('Indexul').setRequired(true)),
  new SlashCommandBuilder().setName('case-view').setDescription('Vezi detaliile unui caz.').addIntegerOption(opt => opt.setName('caseid').setDescription('ID caz').setRequired(true)),
  new SlashCommandBuilder().setName('case-remove').setDescription('Șterge o notă de moderare a unui utilizator.').addIntegerOption(opt => opt.setName('caseid').setDescription('ID caz').setRequired(true)),
  new SlashCommandBuilder().setName('note-add').setDescription('Adaugă o notă de moderare unui utilizator.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addStringOption(opt => opt.setName('text').setDescription('Textul notei').setRequired(true)),
  new SlashCommandBuilder().setName('note-remove').setDescription('Șterge o notă de moderare.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)).addIntegerOption(opt => opt.setName('index').setDescription('Index').setRequired(true)),
  new SlashCommandBuilder().setName('user-history').setDescription('Vezi istoricul de moderare al unui utilizator.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)),
  new SlashCommandBuilder().setName('user-clear-history').setDescription('Resetează istoricul de moderare al unui utilizator.').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)),
  new SlashCommandBuilder().setName('rps').setDescription('Joacă Piatră, Hârtie, Foarfecă').addStringOption(opt => opt.setName('alegere').setDescription('Alege opțiunea ta').setRequired(true).addChoices(
    { name: 'Piatră', value: 'piatra' },
    { name: 'Hârtie', value: 'hartie' },
    { name: 'Foarfecă', value: 'foarfece' }
  )),
  // Comenzi Ticket
  new SlashCommandBuilder().setName('add').setDescription('Adaugă un utilizator în ticket').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)),
  new SlashCommandBuilder().setName('remove').setDescription('Elimină un utilizator din ticket').addUserOption(opt => opt.setName('user').setDescription('Utilizatorul').setRequired(true)),
  new SlashCommandBuilder().setName('transfer').setDescription('Transferă ticketul altui membru staff').addUserOption(opt => opt.setName('user').setDescription('Noul titular staff').setRequired(true)),
  new SlashCommandBuilder().setName('unclaim').setDescription('Renunță la preluarea ticketului'),
  new SlashCommandBuilder().setName('rename').setDescription('Schimbă numele ticketului').addStringOption(opt => opt.setName('nume').setDescription('Noul nume').setRequired(true))
];

client.once('ready', async () => {
  console.log(`Logat ca ${client.user.tag}!`);
  client.user.setPresence({ activities: [{ name: '🥇VLS ON TOP 🔝' }], status: 'online' });

  if (!process.env.GUILD_ID) {
    console.error('❌ GUILD_ID nu este definit în variabilele de mediu!');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Înregistrare comenzi Slash...');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands.map(cmd => cmd.toJSON()) },
    );
    console.log('Comenzile Slash au fost înregistrate cu succes!');
  } catch (error) {
    console.error('Eroare la înregistrarea comenzilor:', error);
  }
});

// HANDLER PENTRU COMENZI CU PREFIX (-)
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'ping') {
    return message.reply(`Pong! ${client.ws.ping}ms`);
  }

  if (commandName === 'say') {
    const text = args.join(' ');
    if (!text) return message.reply('❌ Te rog să scrii un mesaj!');
    await message.delete().catch(() => {});
    return message.channel.send(text);
  }

  if (commandName === 'purge') {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❌ Specifică un număr între 1 și 100!');
    }
    await message.channel.bulkDelete(amount, true).catch(() => {});
    const msg = await message.channel.send(`✅ Șters ${amount} mesaje!`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);
    return;
  }

  // Comenzi Ticket cu Prefix
  const isTicketChannel = message.channel.name.includes('ticket') || message.channel.name.startsWith('『🎫』');

  if (commandName === 'add') {
    if (!isTicketChannel) return message.reply('❌ Această comandă funcționează doar în canale de ticket!');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Menționează utilizatorul pe care vrei să îl adaugi!');
    await message.channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    return message.reply(`✅ Utilizatorul ${target} a fost adăugat în ticket!`);
  }

  if (commandName === 'remove') {
    if (!isTicketChannel) return message.reply('❌ Această comandă funcționează doar în canale de ticket!');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Menționează utilizatorul pe care vrei să îl elimini!');
    await message.channel.permissionOverwrites.delete(target.id).catch(() => {});
    return message.reply(`✅ Utilizatorul ${target} a fost eliminat din ticket!`);
  }

  if (commandName === 'transfer') {
    if (!isTicketChannel) return message.reply('❌ Această comandă funcționează doar în canale de ticket!');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Menționează membrul staff către care vrei să transferi ticketul!');
    const messages = await message.channel.messages.fetch({ limit: 10 });
    const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
    if (botMsg) {
      const oldEmbed = botMsg.embeds[0];
      let newDesc = oldEmbed.description;
      if (newDesc.includes('🛠️ **Claim-uit de:**')) {
        newDesc = newDesc.replace(/🛠️ \*\*Claim-uit de:\*\* .*/, `🛠️ **Claim-uit de:** <@${target.id}>`);
      }
      const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(newDesc);
      await botMsg.edit({ embeds: [updatedEmbed] });
    }
    return message.reply(`🔄 Ticketul a fost transferat către ${target}!`);
  }

  if (commandName === 'unclaim') {
    if (!isTicketChannel) return message.reply('❌ Această comandă funcționează doar în canale de ticket!');
    const messages = await message.channel.messages.fetch({ limit: 10 });
    const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
    if (botMsg) {
      const oldEmbed = botMsg.embeds[0];
      let newDesc = oldEmbed.description;
      if (newDesc.includes('🛠️ **Claim-uit de:**')) {
        newDesc = newDesc.replace(/🛠️ \*\*Claim-uit de:\*\* .*/, '🛠️ **Claim-uit de:** Neclaim-uit');
      }
      const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(newDesc);
      await botMsg.edit({ embeds: [updatedEmbed] });
    }
    return message.reply('↩️ Ticketul este acum neclaim-uit!');
  }

  if (commandName === 'rename') {
    if (!isTicketChannel) return message.reply('❌ Această comandă funcționează doar în canale de ticket!');
    const newName = args.join('-');
    if (!newName) return message.reply('❌ Specifică noul nume pentru ticket!');
    const cleanName = newName.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const formattedName = `『🎫』${cleanName}`;
    await message.channel.setName(formattedName);
    return message.reply(`✏️ Canalul a fost redenumit în \`${formattedName}\`!`);
  }
});

// HANDLER PENTRU INTERACȚIUNI
client.on('interactionCreate', async (interaction) => {

  // Slash Commands
  if (interaction.isChatInputCommand()) {
    const { commandName, options, guild, user } = interaction;

    if (commandName === 'help') return interaction.reply({ content: 'Meniul de ajutor - VLS Bot', ephemeral: true });
    if (commandName === 'ping') return interaction.reply({ content: `Pong! ${client.ws.ping}ms`, ephemeral: true });

    if (commandName === 'server-info') {
      const embed = new EmbedBuilder()
        .setTitle(`Informații Server: ${guild.name}`)
        .addFields(
          { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: '👥 Membri', value: `${guild.memberCount}`, inline: true },
          { name: '📁 Canale', value: `${guild.channels.cache.size}`, inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (commandName === 'user-info') {
      const targetUser = options.getUser('user') || user;
      const embed = new EmbedBuilder()
        .setTitle(`Informații Utilizator: ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🆔 ID', value: targetUser.id, inline: true },
          { name: '📅 Creat la', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setColor(0xffaa00)
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (commandName === 'say') {
      const text = options.getString('mesaj');
      await interaction.channel.send(text);
      return interaction.reply({ content: '✅ Trimis!', ephemeral: true });
    }

    if (commandName === 'purge') {
      const amount = options.getInteger('numar');
      if (amount < 1 || amount > 100) return interaction.reply({ content: 'Specifică un număr între 1 și 100!', ephemeral: true });
      await interaction.channel.bulkDelete(amount, true).catch(() => {});
      return interaction.reply({ content: `✅ Șters ${amount} mesaje!`, ephemeral: true });
    }

    if (commandName === 'channel-lock') {
      await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
      return interaction.reply({ content: '🔒 Canal blocat!', ephemeral: true });
    }

    if (commandName === 'channel-unlock') {
      await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
      return interaction.reply({ content: '🔓 Canal deblocat!', ephemeral: true });
    }

    if (commandName === 'slowmode') {
      const seconds = options.getInteger('secunde');
      await interaction.channel.setRateLimitPerUser(seconds);
      return interaction.reply({ content: `⏱️ Slowmode setat la ${seconds} secunde!`, ephemeral: true });
    }

    // Slash Commands pentru Gestiune Ticket
    if (commandName === 'add') {
      const targetUser = options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      return interaction.reply({ content: `✅ Utilizatorul ${targetUser} a fost adăugat!` });
    }

    if (commandName === 'remove') {
      const targetUser = options.getUser('user');
      await interaction.channel.permissionOverwrites.delete(targetUser.id).catch(() => {});
      return interaction.reply({ content: `✅ Utilizatorul ${targetUser} a fost eliminat!` });
    }

    if (commandName === 'transfer') {
      const targetUser = options.getUser('user');
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
      if (botMsg) {
        const oldEmbed = botMsg.embeds[0];
        let newDesc = oldEmbed.description;
        if (newDesc.includes('🛠️ **Claim-uit de:**')) {
          newDesc = newDesc.replace(/🛠️ \*\*Claim-uit de:\*\* .*/, `🛠️ **Claim-uit de:** <@${targetUser.id}>`);
        }
        const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(newDesc);
        await botMsg.edit({ embeds: [updatedEmbed] });
      }
      return interaction.reply({ content: `🔄 Ticketul a fost transferat către <@${targetUser.id}>!` });
    }

    if (commandName === 'unclaim') {
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
      if (botMsg) {
        const oldEmbed = botMsg.embeds[0];
        let newDesc = oldEmbed.description;
        if (newDesc.includes('🛠️ **Claim-uit de:**')) {
          newDesc = newDesc.replace(/🛠️ \*\*Claim-uit de:\*\* .*/, '🛠️ **Claim-uit de:** Neclaim-uit');
        }
        const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(newDesc);
        await botMsg.edit({ embeds: [updatedEmbed] });
      }
      return interaction.reply({ content: '↩️ Ticketul este acum neclaim-uit!' });
    }

    if (commandName === 'rename') {
      const newName = options.getString('nume');
      const cleanName = newName.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const formattedName = `『🎫』${cleanName}`;
      await interaction.channel.setName(formattedName);
      return interaction.reply({ content: `✏️ Canal redenumit în \`${formattedName}\`!` });
    }

    if (commandName === 'setup-verify') {
      const embed = new EmbedBuilder()
        .setTitle('Bine ai venit pe server!')
        .setDescription('Apasă pe butonul de mai jos pentru a primii accesul complet pe server.')
        .setColor(0x00ff00);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_btn').setLabel('Verifică-te').setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: 'Panoul de verificare a fost creat!', ephemeral: true });
    }

    if (commandName === 'ticket-setup') {
      const embed = new EmbedBuilder()
        .setTitle('🎫 CENTRU DE SUPORT')
        .setDescription('***Ai nevoie de ajutor? Selectează categoria potrivită din meniul de mai jos și deschide un ticket. Echipa noastră îți va răspunde cât mai curând posibil.***\n\n## 🎁 Claim Reward\n**Deschide un ticket pentru a revendica un premiu sau o recompensă. Te rugăm să atașezi dovezile necesare.**\n\n## 🚨 Report a User\n**Raportează un utilizator care a încălcat regulamentul. Include ID-ul utilizatorului, motivul raportării și dovezi clare.**\n\n## 🛡️ General Support\n**Pentru întrebări, probleme sau orice alt tip de ajutor care nu se încadrează în categoriile de mai sus.**\n\n-# Nu deschide ticket-uri fără motiv și nu contacta membrii staff-ului în privat. Abuzul sistemului de suport poate duce la sancțiuni.')
        .setColor(0x2f3136);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_select_menu')
          .setPlaceholder('Support General Menu')
          .addOptions([
            { label: 'Claim Reward', description: 'Revendică un premiu sau o recompensă', value: 'tk_reward', emoji: '🎁' },
            { label: 'Report a User', description: 'Raportează un utilizator', value: 'tk_report', emoji: '📜' },
            { label: 'Support General', description: 'Întrebări și asistență generală', value: 'tk_support', emoji: '🎧' }
          ])
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: 'Panoul de tichete cu meniu a fost creat!', ephemeral: true });
    }
  }

  // Meniu Selectare Categorie Ticket
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select_menu') {
    
    // Anunțăm Discord că procesăm cererea (previne timeout-ul)
    await interaction.deferReply({ ephemeral: true });

    if (activeTicketCreations.has(interaction.user.id)) {
      return interaction.editReply({ content: '⏳ Ticketul tău se creează deja, te rugăm să aștepți!' });
    }

    let cleanUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanUsername) cleanUsername = interaction.user.id;

    const existingChannel = interaction.guild.channels.cache.find(c => c.name.includes(cleanUsername) && (c.name.includes('support') || c.name.includes('reward') || c.name.includes('report')));
    
    if (existingChannel) {
      return interaction.editReply({ content: `❌ Ai deja un ticket deschis: ${existingChannel}` });
    }

    activeTicketCreations.add(interaction.user.id);

    try {
      const selectedValue = interaction.values[0];
      let type = 'support';
      let ticketTitle = 'General Support';

      if (selectedValue === 'tk_reward') {
        type = 'reward';
        ticketTitle = 'Claim Reward';
      } else if (selectedValue === 'tk_report') {
        type = 'report';
        ticketTitle = 'Report a User';
      } else if (selectedValue === 'tk_support') {
        type = 'support';
        ticketTitle = 'General Support';
      }

      const ticketName = `『🎫』${cleanUsername}-${type}`;

      // Configurare permisiuni în mod sigur
      const permissionOverwrites = [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
      ];

      // Verificăm dacă rolul de staff există pe server
      const staffRoleExists = interaction.guild.roles.cache.has(STAFF_ROLE_ID);
      if (staffRoleExists) {
        permissionOverwrites.push({
          id: STAFF_ROLE_ID,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
        });
      }

      // Verificăm dacă categoria există pe server
      const categoryChannel = interaction.guild.channels.cache.get(TICKET_CATEGORY_ID);
      const parentCategoryId = (categoryChannel && categoryChannel.type === ChannelType.GuildCategory) ? TICKET_CATEGORY_ID : null;

      // Creare canal
      const channel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: parentCategoryId,
        permissionOverwrites: permissionOverwrites
      });

      const ticketEmbed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTitle(ticketTitle)
        .setDescription(`👤 **Deschis de:** <@${interaction.user.id}>\n🛠️ **Claim-uit de:** Neclaim-uit\n\n### 📝 Detalii\nDescrie problema sau întrebarea ta cât mai clar, pentru ca echipa să te poată ajuta.\n\n✨ Nu contacta staff-ul în privat. Așteaptă răspunsul în acest ticket.`)
        .setColor(0xff0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('Unclaim Ticket').setStyle(ButtonStyle.Secondary).setEmoji('↩️'),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
      );

      // Ping membru + rol Staff (dacă există)
      const pingContent = staffRoleExists ? `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>` : `<@${interaction.user.id}>`;
      await channel.send({ content: pingContent, embeds: [ticketEmbed], components: [row] });

      await interaction.editReply({ content: `Tichetul tău a fost creat: ${channel}` });

    } catch (err) {
      console.error('❌ Eroare detaliată la crearea ticketului:', err);
      await interaction.editReply({ 
        content: `❌ Nu am putut crea ticketul! Detaliu eroare: \`${err.message}\`. Verifică dacă botul are rolul poziționat suficient de sus în setările serverului și permisiunea **Manage Channels** activă!` 
      });
    } finally {
      activeTicketCreations.delete(interaction.user.id);
    }
    return;
  }

  // Handler Butoane
  if (interaction.isButton()) {
    const { customId, guild, member, user, message } = interaction;

    if (customId === 'verify_btn') {
      const role = guild.roles.cache.get(VERIFIED_ROLE_ID) || guild.roles.cache.find(r => r.name === 'Membru');
      if (role) {
        await member.roles.add(role).catch(() => {});
        return interaction.reply({ content: '✅ Ai fost verificat cu succes!', ephemeral: true });
      } else {
        return interaction.reply({ content: '❌ Rolul de membru nu a fost găsit!', ephemeral: true });
      }
    }

    if (customId === 'claim_ticket') {
      const oldEmbed = message.embeds[0];
      if (!oldEmbed) return;
      const updatedEmbed = EmbedBuilder.from(oldEmbed)
        .setDescription(oldEmbed.description.replace(/🛠️ \*\*Claim-uit de:\*\* .*/, `🛠️ **Claim-uit de:** <@${user.id}>`));

      await interaction.update({ embeds: [updatedEmbed], components: message.components });
      return interaction.followUp({ content: `✅ Tichet preluat de către <@${user.id}>!`, ephemeral: false });
    }

    if (customId === 'unclaim_ticket') {
      const oldEmbed = message.embeds[0];
      if (!oldEmbed) return;
      const updatedEmbed = EmbedBuilder.from(oldEmbed)
        .setDescription(oldEmbed.description.replace(/🛠️ \*\*Claim-uit de:\*\* .*/, '🛠️ **Claim-uit de:** Neclaim-uit'));

      await interaction.update({ embeds: [updatedEmbed], components: message.components });
      return interaction.followUp({ content: `↩️ Ticketul a fost setat ca neclaim-uit de către <@${user.id}>!`, ephemeral: false });
    }

    if (customId === 'close_ticket') {
      const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);

      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setAuthor({ name: `${guild.name} | MM`, iconURL: guild.iconURL({ dynamic: true }) })
          .setTitle('🏠 Channel Deleted:')
          .setDescription(`\`${interaction.channel.name}\``)
          .addFields(
            { name: 'Responsible Moderator:', value: `<@${user.id}>`, inline: false },
            { name: 'Reason:', value: `Closed by ${user.tag} (${user.id}) - No reason provided`, inline: false }
          )
          .setColor(0xff5555)
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }

      await interaction.reply({ content: 'Tichetul se va închide în 5 secunde...', ephemeral: true });

      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);
      return;
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
