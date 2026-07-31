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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const PREFIX = '-';

// Toate comenzile Slash cu descrierile tale originale
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
  ))
];

client.once('ready', async () => {
  console.log(`Logat ca ${client.user.tag}!`);
  client.user.setPresence({ activities: [{ name: '🥇VLS ON TOP 🔝' }], status: 'online' });

  if (!process.env.GUILD_ID) {
    console.error('❌ Eroare: GUILD_ID nu este setat în variabilele de mediu!');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Se înregistrează comenzile Slash...');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands.map(command => command.toJSON()) },
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
});

// HANDLER PENTRU INTERACȚIUNI
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName, options, guild, user } = interaction;

    if (commandName === 'help') {
      await interaction.reply({ content: 'Meniul de ajutor - VLS Bot', ephemeral: true });
      return;
    }

    if (commandName === 'ping') {
      await interaction.reply({ content: `Pong! ${client.ws.ping}ms`, ephemeral: true });
      return;
    }

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
      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
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
      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    if (commandName === 'say') {
      const text = options.getString('mesaj');
      await interaction.channel.send(text);
      await interaction.reply({ content: '✅ Trimis!', ephemeral: true });
      return;
    }

    if (commandName === 'purge') {
      const amount = options.getInteger('numar');
      if (amount < 1 || amount > 100) {
        return interaction.reply({ content: 'Specifică un număr între 1 și 100!', ephemeral: true });
      }
      await interaction.channel.bulkDelete(amount, true).catch(() => {});
      await interaction.reply({ content: `✅ Șters ${amount} mesaje!`, ephemeral: true });
      return;
    }

    if (commandName === 'channel-lock') {
      await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
      await interaction.reply({ content: '🔒 Canal blocat!', ephemeral: true });
      return;
    }

    if (commandName === 'channel-unlock') {
      await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
      await interaction.reply({ content: '🔓 Canal deblocat!', ephemeral: true });
      return;
    }

    if (commandName === 'slowmode') {
      const seconds = options.getInteger('secunde');
      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply({ content: `⏱️ Slowmode setat la ${seconds} secunde!`, ephemeral: true });
      return;
    }

    if (commandName === 'setup-verify') {
      const embed = new EmbedBuilder()
        .setTitle('🔐 CENTRE DE VERIFICARE')
        .setDescription('Apasă pe butonul de mai jos pentru a primi accesul complet.')
        .setColor(0x00ff00);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_btn').setLabel('Verifică-te').setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Panoul de verificare a fost creat!', ephemeral: true });
      return;
    }

    if (commandName === 'ticket-setup') {
      const embed = new EmbedBuilder()
        .setTitle('Support General Menu')
        .setDescription('• **Claim Reward**\nDeschide un ticket pentru a revendica un premiu sau o recompensă.\n\n• **Report a User**\nRaportează un utilizator care a încălcat regulamentul.\n\n• **Support General**\nPentru întrebări, probleme sau orice altceva.')
        .setColor(0x2f3136);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_select_menu')
          .setPlaceholder('Support General Menu')
          .addOptions([
            {
              label: 'Claim Reward',
              description: 'Revendică un premiu sau o recompensă',
              value: 'tk_reward',
              emoji: '🎁'
            },
            {
              label: 'Report a User',
              description: 'Raportează un utilizator',
              value: 'tk_report',
              emoji: '📜'
            },
            {
              label: 'Support General',
              description: 'Întrebări și asistență generală',
              value: 'tk_support',
              emoji: '🎧'
            }
          ])
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Panoul de tichete cu meniu a fost creat!', ephemeral: true });
      return;
    }
  }

  // Handler pentru Meniul Dropdown (Select Menu)
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'ticket_select_menu') {
      const selectedValue = interaction.values[0];
      let ticketName = 'support';
      let ticketTitle = 'General Support';

      if (selectedValue === 'tk_reward') {
        ticketName = `reward-${interaction.user.username}`;
        ticketTitle = 'Claim Reward';
      } else if (selectedValue === 'tk_report') {
        ticketName = `report-${interaction.user.username}`;
        ticketTitle = 'Report a User';
      } else if (selectedValue === 'tk_support') {
        ticketName = `support-${interaction.user.username}`;
        ticketTitle = 'General Support';
      }

      const channel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTitle(ticketTitle)
        .setDescription(`👤 **Deschis de:** <@${interaction.user.id}>\n🛠️ **Claim-uit de:** Neclaim-uit\n\n### 📝 Detalii\nDescrie problema sau întrebarea ta cât mai clar, pentru ca echipa să te poată ajuta.\n\n✨ Nu contacta staff-ul în privat. Așteaptă răspunsul în acest ticket.`)
        .setColor(0xff0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
      );

      // Ping pentru utilizator + @everyone sau rol de staff (poți schimba "@everyone" cu ID-ul rolului tău de staff dacă dorești)
      await channel.send({ content: `<@${interaction.user.id}> @everyone`, embeds: [ticketEmbed], components: [row] });
      await interaction.reply({ content: `Tichetul tău a fost creat: ${channel}`, ephemeral: true });
      return;
    }
  }

  // Handler butoane
  if (interaction.isButton()) {
    const { customId, guild, member, user, message } = interaction;

    if (customId === 'verify_btn') {
      const role = guild.roles.cache.find(r => r.name === 'Membru');
      if (role) {
        await member.roles.add(role).catch(() => {});
        await interaction.reply({ content: '✅ Ai fost verificat cu succes!', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Rolul de membru nu a fost găsit!', ephemeral: true });
      }
      return;
    }

    if (customId === 'claim_ticket') {
      const oldEmbed = message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(oldEmbed)
        .setDescription(oldEmbed.description.replace('🛠️ **Claim-uit de:** Neclaim-uit', `🛠️ **Claim-uit de:** <@${user.id}>`));

      await interaction.update({ embeds: [updatedEmbed], components: message.components });
      await interaction.followUp({ content: `✅ Tichet preluat de către <@${user.id}>!`, ephemeral: false });
      return;
    }

    if (customId === 'close_ticket') {
      const logChannelId = '1530184671827071160';
      const logChannel = guild.channels.cache.get(logChannelId);

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
                                    
