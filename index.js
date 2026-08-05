// Încărcare opțională dotenv (astfel încât pe Render să NU mai dea eroare "Cannot find module 'dotenv'")
try {
    require('dotenv').config();
} catch (e) {
    // În Render variabilele sunt încărcate automat din panoul Environment Settings
}

const http = require('http');
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, 
    TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, 
    REST, Routes, SlashCommandBuilder 
} = require('discord.js');
const config = require('./config.json');

// --- SERVER HTTP PENTRU RENDER (Keep-Alive) ---
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.write("VNS Market BOT este online si functional!");
    res.end();
}).listen(process.env.PORT || 3000, () => {
    console.log(`🌐 Server Web pornit pe portul ${process.env.PORT || 3000}`);
});
// ------------------------------------------------

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const userSelections = new Map();

// ID-ul implicit pentru "Other" (Spotify / Alte produse) oferit de tine
const DEFAULT_OTHER_ROLE_ID = '1534634684477083808';

// Funcție pentru alocarea dinamica a rolului în funcție de categorie/produs
function getTargetRoleId(categoryOrProduct) {
    if (!categoryOrProduct) {
        return process.env.OTHER_ROLE_ID || DEFAULT_OTHER_ROLE_ID;
    }
    
    const text = categoryOrProduct.toLowerCase();

    if (text.includes('nitro')) {
        return process.env.NITRO_ROLE_ID || process.env.STAFF_ROLE_ID;
    }
    if (text.includes('deco') || text.includes('decorat')) {
        return process.env.DECO_ROLE_ID || process.env.STAFF_ROLE_ID;
    }
    if (text.includes('boost')) {
        return process.env.BOOST_ROLE_ID || process.env.STAFF_ROLE_ID;
    }

    // Spotify și toate celelalte categorii -> Rolul Other (ID: 1534634684477083808)
    return process.env.OTHER_ROLE_ID || DEFAULT_OTHER_ROLE_ID;
}

client.once('ready', async () => {
    console.log(`✅ VNS Market BOT este online ca ${client.user.tag}`);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('setup-ticket')
            .setDescription('Trimite panoul principal VNS Market')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Comanda /setup-ticket a fost înregistrată cu succes!');
    } catch (err) {
        console.error('Eroare la înregistrarea comandei slash:', err);
    }
});

client.on('interactionCreate', async (interaction) => {
    const userId = interaction.user.id;

    // 1. Comanda Slash /setup-ticket
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
        const mainEmbed = new EmbedBuilder()
            .setTitle('🛒 VNS Market | Panou Comenzi')
            .setDescription('Selectează o categorie mai jos pentru a începe configurarea comenzii.')
            .setFooter({ text: 'VNS Market' })
            .setColor('#2b2d31');

        const categoryMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('step_category')
                .setPlaceholder('Selectează o categorie...')
                .addOptions(config.categories)
        );

        await interaction.reply({ content: 'Panou VNS Market trimis!', ephemeral: true });
        return interaction.channel.send({ embeds: [mainEmbed], components: [categoryMenu] });
    }

    // 2. Selectare Categorie
    if (interaction.isStringSelectMenu() && interaction.customId === 'step_category') {
        const category = interaction.values[0];
        userSelections.set(userId, { category });

        const subProducts = config.products[category];

        if (subProducts) {
            const productMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('step_product')
                    .setPlaceholder('Selectează tipul de produs...')
                    .addOptions(subProducts)
            );
            return interaction.reply({ content: '📦 **Pasul 1:** Alege tipul de produs:', components: [productMenu], ephemeral: true });
        } else {
            return showConfirmation(interaction, userId);
        }
    }

    // 3. Selectare Produs
    if (interaction.isStringSelectMenu() && interaction.customId === 'step_product') {
        const currentData = userSelections.get(userId) || {};
        currentData.product = interaction.values[0];
        userSelections.set(userId, currentData);

        const qtyMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('step_quantity')
                .setPlaceholder('Selectează cantitatea...')
                .addOptions([
                    { label: '1x', value: '1x' },
                    { label: '2x', value: '2x' },
                    { label: '14x (Server Boost Pack)', value: '14x' },
                    { label: 'Cantitate Custom', value: 'custom', description: 'Scrie manual numărul dorit' }
                ])
        );

        return interaction.update({ content: '📊 **Pasul 2:** Alege cantitatea dorită:', components: [qtyMenu] });
    }

    // 4. Selectare Cantitate
    if (interaction.isStringSelectMenu() && interaction.customId === 'step_quantity') {
        const qtyChoice = interaction.values[0];

        if (qtyChoice === 'custom') {
            const modal = new ModalBuilder()
                .setCustomId('modal_custom_qty')
                .setTitle('Introdu cantitatea dorită');

            const qtyInput = new TextInputBuilder()
                .setCustomId('qty_input')
                .setLabel('Numărul de bucăți')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('ex: 5')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));
            return interaction.showModal(modal);
        }

        const currentData = userSelections.get(userId) || {};
        currentData.quantity = qtyChoice;
        userSelections.set(userId, currentData);

        return promptPayment(interaction);
    }

    // Modal Cantitate Custom
    if (interaction.isModalSubmit() && interaction.customId === 'modal_custom_qty') {
        const customQty = interaction.fields.getTextInputValue('qty_input');
        const currentData = userSelections.get(userId) || {};
        currentData.quantity = `${customQty}x`;
        userSelections.set(userId, currentData);

        return promptPayment(interaction, true);
    }

    // 5. Selectare Platǎ
    if (interaction.isStringSelectMenu() && interaction.customId === 'step_payment') {
        const paymentChoice = interaction.values[0];
        const currentData = userSelections.get(userId) || {};

        if (paymentChoice === 'crypto') {
            const cryptoMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('step_crypto_sub')
                    .setPlaceholder('Selectează moneda Crypto...')
                    .addOptions(config.crypto_options)
            );
            return interaction.update({ content: '🪙 **Pasul 4:** Alege rețeaua Crypto:', components: [cryptoMenu] });
        }

        currentData.payment = paymentChoice.toUpperCase();
        userSelections.set(userId, currentData);
        return showConfirmation(interaction, userId, true);
    }

    // Sub-pas Crypto
    if (interaction.isStringSelectMenu() && interaction.customId === 'step_crypto_sub') {
        const currentData = userSelections.get(userId) || {};
        currentData.payment = `Crypto (${interaction.values[0]})`;
        userSelections.set(userId, currentData);

        return showConfirmation(interaction, userId, true);
    }

    // 6. Creare Ticket Privat & Panou Control
    if (interaction.isButton() && interaction.customId === 'btn_create_ticket') {
        const data = userSelections.get(userId);
        if (!data) return interaction.reply({ content: 'Sesiunea a expirat. Încearcă din nou!', ephemeral: true });

        const guild = interaction.guild;
        
        const categoryOrProd = data.product || data.category || 'ticket';
        const targetRoleId = getTargetRoleId(categoryOrProd);

        const cleanType = categoryOrProd.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const cleanUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const channelName = `${cleanType}-${cleanUsername}`;

        // Permisiuni canal
        const permissionOverwrites = [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];

        if (process.env.STAFF_ROLE_ID) {
            permissionOverwrites.push({
                id: process.env.STAFF_ROLE_ID,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            });
        }

        if (targetRoleId && targetRoleId !== process.env.STAFF_ROLE_ID) {
            permissionOverwrites.push({
                id: targetRoleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
            });
        }

        try {
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: targetRoleId,
                parent: process.env.TICKET_CATEGORY_ID || null,
                permissionOverwrites: permissionOverwrites
            });

            const orderEmbed = new EmbedBuilder()
                .setTitle(`🧪 | ${data.product || data.category || 'Comandă Nouă'}`)
                .setDescription(`${interaction.user} • \`PENDING\`\n\nMethod: **${data.payment || 'N/A'}**\nQuantity: **${data.quantity || '1x'}**\nProduct: **${data.product || data.category || 'N/A'}**\nAmount: **Discuss in ticket**`)
                .setFooter({ text: 'VNS Market' })
                .setColor('#2b2d31');

            // Rândurile de butoane
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_claim').setLabel('Claim').setEmoji('🔔').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_transcript').setLabel('Transcript').setEmoji('📋').setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_add_user').setLabel('Add User').setEmoji('👤').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_remove_user').setLabel('Remove User').setEmoji('🚫').setStyle(ButtonStyle.Secondary)
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_change_qty').setLabel('Change Quantity').setEmoji('🛒').setStyle(ButtonStyle.Secondary)
            );

            const row4 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_mm').setLabel('MM').setEmoji('🔀').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_ping_staff').setLabel('Ping Staff').setEmoji('🔔').setStyle(ButtonStyle.Secondary)
            );

            const row5 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ 
                content: `<@&${targetRoleId}> | ${interaction.user}`, 
                embeds: [orderEmbed], 
                components: [row1, row2, row3, row4, row5] 
            });

            await interaction.update({ content: `✅ Ticketul tău a fost creat: ${ticketChannel}`, components: [], ephemeral: true });
            userSelections.delete(userId);
        } catch (err) {
            console.error('Eroare la crearea ticketului:', err);
            await interaction.reply({ content: 'Eroare la crearea ticketului! Verifică permisiunile botului.', ephemeral: true });
        }
    }

    // 7. Handlers Butoane Panou Ticket
    if (interaction.isButton()) {
        const customId = interaction.customId;

        // Claim
        if (customId === 'btn_claim') {
            const seller = interaction.user;

            const claimEmbed = new EmbedBuilder()
                .setTitle('🔔 | Ticket Preluat')
                .setDescription(`${seller} se ocupă acum de comanda ta! Așteaptă instrucțiunile în acest ticket.`)
                .setFooter({ text: 'VNS Market' })
                .setColor('#57F287');

            const updatedRows = interaction.message.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                newRow.components.forEach(btn => {
                    if (btn.data.custom_id === 'btn_claim') {
                        btn.setDisabled(true);
                    }
                });
                return newRow;
            });

            await interaction.message.edit({ components: updatedRows });
            return interaction.reply({ embeds: [claimEmbed] });
        }

        // Close
        if (customId === 'btn_close') {
            await interaction.reply('🔒 Ticketul se va închide în 5 secunde...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

        // Ping Staff
        if (customId === 'btn_ping_staff') {
            const roleToPing = interaction.channel.topic || process.env.STAFF_ROLE_ID || DEFAULT_OTHER_ROLE_ID;
            return interaction.reply({ content: `<@&${roleToPing}> Clientul solicită atenție în acest ticket!` });
        }

        // Middleman (MM)
        if (customId === 'btn_mm') {
            return interaction.reply({ content: '🔀 A fost solicitat un Middleman (MM). Așteaptă ca un reprezentant să preia cererea.', ephemeral: false });
        }

        // Celelalte optiuni de control
        if (['btn_add_user', 'btn_remove_user', 'btn_change_qty', 'btn_transcript'].includes(customId)) {
            return interaction.reply({ content: `Ai apăsat butonul **${customId.replace('btn_', '').replace('_', ' ')}**. Opțiune înregistrată.`, ephemeral: true });
        }
    }
});

function promptPayment(interaction, isModal = false) {
    const payMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('step_payment')
            .setPlaceholder('Selectează metoda de plată...')
            .addOptions(config.payments)
    );

    const payload = { content: '💳 **Pasul 3:** Alege metoda de plată:', components: [payMenu] };
    return isModal ? interaction.reply({ ...payload, ephemeral: true }) : interaction.update(payload);
}

function showConfirmation(interaction, userId, isUpdate = false) {
    const data = userSelections.get(userId) || {};

    const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Confirmă Comanda — VNS Market')
        .setDescription('Verifică opțiunile înainte de a deschide ticketul privat:')
        .addFields(
            { name: 'Categorie', value: `${data.category || 'N/A'}`, inline: true },
            { name: 'Produs', value: `${data.product || 'N/A'}`, inline: true },
            { name: 'Cantitate', value: `${data.quantity || '1x'}`, inline: true },
            { name: 'Metodă Platǎ', value: `${data.payment || 'N/A'}`, inline: true }
        )
        .setFooter({ text: 'VNS Market' })
        .setColor('#FEE75C');

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_create_ticket').setLabel('Creează Ticket').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_cancel').setLabel('Anulează').setStyle(ButtonStyle.Danger)
    );

    const payload = { content: '', embeds: [confirmEmbed], components: [buttons], ephemeral: true };
    return isUpdate ? interaction.update(payload) : interaction.reply(payload);
}

client.login(process.env.DISCORD_TOKEN);
            
