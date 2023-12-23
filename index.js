const fs = require('fs').promises;
const { Client, Intents, MessageEmbed } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let botToken;

rl.question('Enter your bot token: ', (token) => {
    botToken = token;
    rl.close();
    startBot();
});

function startBot() {
    const client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            Intents.FLAGS.DIRECT_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        ]
    });

const commands = [
  {
    name: 'modmail',
    description: 'Send modmail instructions',
    type: 1, // 1 corresponds to CHAT_INPUT
  },
  {
    name: 'mailsend',
    description: 'Send modmail to staff',
    type: 1,
    options: [
      {
        name: 'message',
        type: 3, // 3 corresponds to STRING
        description: 'The message to send to staff',
        required: true,
      },
    ],
  },
  {
    name: 'reply',
    description: 'Reply to a modmail',
    type: 1,
    options: [
      {
        name: 'user_identifier',
        type: 3,
        description: 'The user ID or username to reply to',
        required: true,
      },
      {
        name: 'text',
        type: 3,
        description: 'The text of the reply',
        required: true,
      },
    ],
  },
  {
    name: 'lock',
    description: 'Lock the channel',
    type: 1,
  },
  {
    name: 'unlock',
    description: 'Unlock the channel',
    type: 1,
  },
  {
    name: 'disable',
    description: 'Disable text messages in a channel',
    type: 1,
    options: [
      {
        name: 'channel',
        type: 7, // 7 corresponds to CHANNEL
        description: 'The channel to disable text messages',
        required: true,
      },
    ],
  },
  {
    name: 'enable',
    description: 'Enable text messages in a channel',
    type: 1,
    options: [
      {
        name: 'channel',
        type: 7,
        description: 'The channel to enable text messages',
        required: true,
      },
    ],
  },
  {
    name: 'rps',
    description: 'Play Rock, Paper, Scissors against the bot.',
    type: 1, // 1 corresponds to CHAT_INPUT
    options: [
      {
        name: 'choice',
        type: 3, // 3 corresponds to STRING
        description: 'Your choice: "rock," "paper," or "scissors."',
        required: true,
        choices: [
          {
            name: 'Rock',
            value: 'rock',
          },
          {
            name: 'Paper',
            value: 'paper',
          },
          {
            name: 'Scissors',
            value: 'scissors',
          },
        ],
      },
    ],
  },
];
  
  
    const rest = new REST({ version: '9' }).setToken(botToken);

    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationGuildCommands('1186184154111557662', '1174409827838079086'), // Replace with your client ID and guild ID
                { body: commands },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();

    async function getUserByIdentifier(identifier) {
        try {
            const user = await client.users.fetch(identifier);
            return user;
        } catch (error) {
            console.error(`Error fetching user by identifier ${identifier}:`, error);
            return null;
        }
    }

    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);
        client.user.setActivity('/Modmail to ask any questions!', { type: 'PLAYING' });
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        const { commandName, options } = interaction;

        if (commandName === 'modmail') {
            sendModmailInstructions(interaction);
        } else if (commandName === 'mailsend') {
            const text = options.getString('message');
            await mailsend(interaction, text);
        } else if (commandName === 'reply') {
            const userIdentifier = options.getString('user_identifier');
            const text = options.getString('text');
            await reply(interaction, userIdentifier, text);
        }
    });

    function sendModmailInstructions(interaction) {
        const embed = new MessageEmbed()
            .setTitle('Mod Mail Instructions')
            .setDescription('To contact the staff team, use the command `/mailsend <your message>`.')
            .setColor('#800080')
            .setFooter('Beep Boop');

        interaction.reply({ embeds: [embed] });
    }

    async function mailsend(interaction, text) {
        const staffChannelId = '1187791162833129583';
        const staffChannel = client.channels.cache.get(staffChannelId);

        if (staffChannel) {
            const userName = interaction.user.username;
            const userId = interaction.user.id;

            // Send modmail to staff
            const modmailEmbed = new MessageEmbed()
                .setTitle(`Mod Mail from ${userName}`)
                .setDescription(`${text}\n\nUser ID: ${userId}`)
                .setColor('#800080')
                .setFooter('Use "reply <user_id or username> <text>" to reply to the user.');

            await staffChannel.send({ embeds: [modmailEmbed] });

            // Inform the user that their modmail has been received
            interaction.reply('Your modmail has been sent to the staff team!');
        }
    }

    async function reply(interaction, userIdentifier, text) {
        const staffChannelId = '1187791162833129583';
        const staffChannel = client.channels.cache.get(staffChannelId);

        if (interaction.channel === staffChannel) {
            // Check if the user has the required role
            const member = interaction.guild.members.cache.get(interaction.user.id);
            const allowedRoles = ["Moderator", "Head Moderator", "Helper", "Admin", "Co-owner", "Owner"];

            if (member && member.roles.cache.some(role => allowedRoles.includes(role.name))) {
                const user = await getUserByIdentifier(userIdentifier);

                if (user) {
                    try {
                        const replyText = `**Staff Reply:** ${text}`;
                        const replyEmbed = new MessageEmbed()
                            .setTitle('Mod Mail Reply')
                            .setDescription(replyText)
                            .setColor('#008000')
                            .setFooter('This message is from a staff member.');

                        await user.send({ embeds: [replyEmbed] });
                        interaction.reply(`Reply sent to ${user.tag} (${user.id}) in DMs!`);
                    } catch (error) {
                        if (error.code === 50007) { // 50007: Cannot send messages to this user
                            interaction.reply(`Error: ${user.tag} (${user.id}) has DMs disabled. Unable to send reply.`);
                        }
                    }
                } else {
                    interaction.reply('Unable to fetch user. Please make sure you provide a valid user ID or username.');
                }
            } else {
                interaction.reply('You do not have the required role to use this command.');
            }
        }
    }

client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'lock') {
            lockChannel(interaction);
        } else if (commandName === 'unlock') {
            unlockChannel(interaction);
        }
    });

    function lockChannel(interaction) {
        if (!interaction.guild) return;

        const channel = interaction.guild.channels.cache.get(interaction.channelId);

        if (channel) {
            channel.permissionOverwrites.create(interaction.guild.roles.everyone, {
                SEND_MESSAGES: false,
            });

            const embed = new MessageEmbed()
                .setTitle('Channel Locked')
                .setDescription('This channel has been locked. No one can send messages here.')
                .setColor('#3498db');

            interaction.reply({ embeds: [embed] });
        }
    }

    function unlockChannel(interaction) {
        if (!interaction.guild) return;

        const channel = interaction.guild.channels.cache.get(interaction.channelId);

        if (channel) {
            channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SEND_MESSAGES: null,
            });

            const embed = new MessageEmbed()
                .setTitle('Channel Unlocked')
                .setDescription('This channel has been unlocked. Messages can now be sent here.')
                .setColor('#3498db');

            interaction.reply({ embeds: [embed] });
        }
    }
const channelsFilePath = './channels.json';

client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand()) return;

        const { commandName, options } = interaction;

        if (commandName === 'disable') {
            const channel = options.getChannel('channel');
            await disableText(channel, interaction);
        } else if (commandName === 'enable') {
            const channel = options.getChannel('channel');
            await enableText(channel, interaction);
        }
    });

    async function disableText(channel, interaction) {
        const channelsData = await readChannelsFile();

        if (!channelsData[channel.id]) {
            channelsData[channel.id] = { isEnabled: true };
        }

        if (channelsData[channel.id].isEnabled) {
            channelsData[channel.id].isEnabled = false;
            await writeChannelsFile(channelsData);
            interaction.reply(`Text messages have been disabled in ${channel}`);
        } else {
            interaction.reply(`Text messages are already disabled in ${channel}`);
        }
    }

    async function enableText(channel, interaction) {
        const channelsData = await readChannelsFile();

        if (!channelsData[channel.id]) {
            channelsData[channel.id] = { isEnabled: true };
        }

        if (!channelsData[channel.id].isEnabled) {
            channelsData[channel.id].isEnabled = true;
            await writeChannelsFile(channelsData);
            interaction.reply(`Text messages have been enabled in ${channel}`);
        } else {
            interaction.reply(`Text messages are already enabled in ${channel}`);
        }
    }

    async function readChannelsFile() {
        try {
            const data = await fs.readFile(channelsFilePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    async function writeChannelsFile(data) {
        await fs.writeFile(channelsFilePath, JSON.stringify(data, null, 2));
    }

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const channelsData = await readChannelsFile();

        if (channelsData[message.channel.id] && !channelsData[message.channel.id].isEnabled) {
            if (message.content && !message.attachments.size) {
                const embed = new MessageEmbed()
                    .setTitle('Error: Text Only')
                    .setDescription('You cannot send text without attaching an image here.')
                    .setColor('#3498db');

                const replyMessage = await message.channel.send({ embeds: [embed] });
                setTimeout(() => replyMessage.delete(), 180000); // Delete the message after 3 minutes
                message.delete();
            }
        }
    });
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'rps') {
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    await interaction.reply(`I choose ${botChoice}!`);

    const userChoice = interaction.options.getString('choice');

    if (!userChoice || !choices.includes(userChoice)) {
      return interaction.followUp('Please choose either "rock," "paper," or "scissors."');
    }

    if (userChoice === botChoice) {
      return interaction.followUp('It\'s a tie!');
    }

    if (
      (userChoice === 'rock' && botChoice === 'scissors') ||
      (userChoice === 'paper' && botChoice === 'rock') ||
      (userChoice === 'scissors' && botChoice === 'paper')
    ) {
      return interaction.followUp('You win!');
    } else {
      return interaction.followUp('I win!');
    }
  }
});
    client.login(botToken);
                  }
      
