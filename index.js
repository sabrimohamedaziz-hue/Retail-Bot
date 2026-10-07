require('dotenv').config();
const {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits, EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '!';
const FOOTER = '『 RS 』 Retail Services';

// Convert text to a fancy bold font
function fancy(text) {
  const U = Array.from('𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙');
  const L = Array.from('𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳');
  return text.split('').map(c => {
    const ui = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c);
    if (ui >= 0) return U[ui];
    const li = 'abcdefghijklmnopqrstuvwxyz'.indexOf(c);
    if (li >= 0) return L[li];
    return c;
  }).join('');
}

client.once('clientReady', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

const products = new Map();
let productId = 0;

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  console.log('MESSAGE:', message.content);

  // ANNOUNCE → button to open form
  if (message.content === `${PREFIX}announce`) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ You need Administrator permission.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('make_announce').setLabel('📝 Fill form').setStyle(ButtonStyle.Primary)
    );
    message.channel.send({ content: `${message.author}, fill this form to post your announcement:`, components: [row] });
    message.delete().catch(() => {});
    return;
  }

  // PRODUCT → button to open form
  if (message.content === `${PREFIX}product`) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ You need Administrator permission.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('make_product').setLabel('📝 Fill form').setStyle(ButtonStyle.Primary)
    );
    message.channel.send({ content: `${message.author}, fill this form to post your product:`, components: [row] });
    message.delete().catch(() => {});
    return;
  }

  if (message.content === `${PREFIX}ticketpanel`) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ You need Administrator permission.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('buy_ticket').setLabel('🛒 Buy').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('replace_ticket').setLabel('🔁 Replace').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('support_ticket').setLabel('🛠️ Support').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('partner_ticket').setLabel('🤝 Partner').setStyle(ButtonStyle.Success),
    );

    const embed = new EmbedBuilder()
      .setTitle('🛒 RETAIL SERVICES — TICKET PANEL')
      .setDescription('Choose a category below to open a ticket.\nOur staff will help you as soon as possible! ⚡')
      .setColor(0x5865F2)
      
      .setFooter({ text: FOOTER })
      .setTimestamp();

    message.channel.send({ embeds: [embed], components: [row] });
    message.delete().catch(() => {});
  }
});

const forms = {
  buy_ticket: {
    customId: 'buy_form', title: '🛒 Buy — Ticket', type: 'buy',
    fields: [
      { id: 'product', label: 'Which product do you want to buy?', short: true },
      { id: 'quantity', label: 'How many?', short: true },
      { id: 'details', label: 'Any extra details?', short: false },
    ],
  },
  replace_ticket: {
    customId: 'replace_form', title: '🔁 Replace — Ticket', type: 'replace',
    fields: [
      { id: 'order', label: 'Order ID / Product?', short: true },
      { id: 'reason', label: 'Why do you want a replacement?', short: false },
    ],
  },
  support_ticket: {
    customId: 'support_form', title: '🛠️ Support — Ticket', type: 'support',
    fields: [
      { id: 'problem', label: 'What is your problem?', short: false },
      { id: 'tried', label: 'What have you tried?', short: false },
    ],
  },
};

client.on('interactionCreate', async (interaction) => {
  // BUY FROM PRODUCT BUTTON → create buy ticket directly
  if (interaction.isButton() && interaction.customId.startsWith('buyprod_')) {
    const product = products.get(interaction.customId);
    if (!product) return interaction.reply({ content: '❌ Product not found.', flags: 64 });

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `buy-${interaction.user.id}`
    );
    if (existing)
      return interaction.reply({ content: `❌ You already have a ticket: ${existing}`, flags: 64 });

    const channel = await interaction.guild.channels.create({
      name: `buy-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`🛒 Buy — ${product.name}`)
      .setDescription(`**Product:** ${product.name}\n**Price:** ${product.price}\n\nHi ${interaction.user}! Please confirm you want to buy this product, and staff will help you finish the order. ✅`)
      .setColor(0x2ECC71)
      
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await channel.send({ embeds: [embed], components: [closeRow] });
    return interaction.reply({ content: `✅ Ticket created: ${channel}`, flags: 64 });
  }

  // PARTNER → create ticket directly
  if (interaction.isButton() && interaction.customId === 'partner_ticket') {
    const existing = interaction.guild.channels.cache.find(
      c => c.name === `partner-${interaction.user.id}`
    );
    if (existing)
      return interaction.reply({ content: `❌ You already have a ticket: ${existing}`, flags: 64 });

    const channel = await interaction.guild.channels.create({
      name: `partner-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `👋 ${interaction.user}! Please tell us about yourself and your partnership idea. Our team will reply soon. 🤝`,
      components: [closeRow],
    });
    return interaction.reply({ content: `✅ Ticket created: ${channel}`, flags: 64 });
  }

  // BUTTON → show form
  if (interaction.isButton() && forms[interaction.customId]) {
    const form = forms[interaction.customId];
    const modal = new ModalBuilder().setCustomId(form.customId).setTitle(form.title);

    const rows = form.fields.map(f =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(f.id)
          .setLabel(f.label)
          .setStyle(f.short ? TextInputStyle.Short : TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
    modal.addComponents(rows);
    return interaction.showModal(modal);
  }

  // MAKE ANNOUNCE → form
  if (interaction.isButton() && interaction.customId === 'make_announce') {
    const modal = new ModalBuilder().setCustomId('announce_form').setTitle('📢 New Announcement');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('text').setLabel('Announcement message').setStyle(TextInputStyle.Paragraph).setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }

  // MAKE PRODUCT → form
  if (interaction.isButton() && interaction.customId === 'make_product') {
    const modal = new ModalBuilder().setCustomId('product_form').setTitle('🛍️ New Product');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('name').setLabel('Product name').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('price').setLabel('Price (ex: 5€)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }

  // FORM SUBMIT → create ticket
  if (interaction.isModalSubmit()) {
    // ANNOUNCE FORM
    if (interaction.customId === 'announce_form') {
      const text = interaction.fields.getTextInputValue('text');
      const embed = new EmbedBuilder()
        .setTitle('📢  A N N O U N C E M E N T')
        .setDescription(fancy(text))
        .setColor(0xF39C12)
        
        .setFooter({ text: FOOTER })
        .setTimestamp();
      interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: '✅ Announcement posted!', flags: 64 });
    }

    // PRODUCT FORM
    if (interaction.customId === 'product_form') {
      const name = interaction.fields.getTextInputValue('name');
      const price = interaction.fields.getTextInputValue('price');
      const description = interaction.fields.getTextInputValue('description');
      productId++;
      products.set(`buyprod_${productId}`, { name, price });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`buyprod_${productId}`).setLabel('🛒 Buy Now').setStyle(ButtonStyle.Success)
      );
      const embed = new EmbedBuilder()
        .setTitle(`🛍️ ${fancy(name)}`)
        .setDescription(`**${fancy(description)}**`)
        .addFields({ name: '💰 Price', value: `\`${price}\``, inline: true })
        .setColor(0x2ECC71)

        .setFooter({ text: FOOTER })
        .setTimestamp();
      interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: '✅ Product posted!', flags: 64 });
    }

    const form = Object.values(forms).find(f => f.customId === interaction.customId);
    if (!form) return;

    const answers = form.fields.map(f => `**${f.label}**\n${interaction.fields.getTextInputValue(f.id)}`).join('\n\n');

    const channel = await interaction.guild.channels.create({
      name: `${form.type}-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`${form.title} — ${interaction.user.tag}`)
      .setDescription(answers)
      .setColor(0x5865F2)
      
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await channel.send({ content: `👋 ${interaction.user}`, embeds: [embed], components: [closeRow] });
    interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    return;
  }

  // CLOSE TICKET
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await interaction.reply('🔒 Closing ticket in 5 seconds...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

client.login(process.env.DISCORD_TOKEN);
