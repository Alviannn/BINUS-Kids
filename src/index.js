const global = require('./global');
const dotenv = require('dotenv');

const fs = require('fs');
const { utils } = require('./global');
const { TextChannel } = require('discord.js');

dotenv.config();
global.createClient();

const client = global.client;

client.on('message', async (msg) => {
    const { mentions, content, guild } = msg;
    if (!content.match(/<@!?[0-9]{18}>/gi))
        return;

    const clientUser = client.user;
    const member = guild.member(clientUser);
    const config = require('../config.json');

    if (mentions.members.array()[0] === member)
        await msg.reply(`The bot prefix is **${config.prefix}**!`);
});

client.on('ready', async () => {
    console.log('The bot has started correctly!');
});

client.on('message', async (msg) => {
    const { channel, content } = msg;

    const config = require('../config.json');
    // determines if a command supposed to be executed
    if (!content.startsWith(config.prefix))
        return;

    // grabs the arguments
    const args = content.substr(config.prefix.length).split(' ');
    // grabs the command name
    const cmdName = args.shift().toLowerCase();

    // prepares the command variables and what it needs
    const { commandMap } = global.manager;
    const commandList = commandMap.values();
    let command;

    // finds the command
    for (const cmd of commandList) {
        // finds by name
        if (cmd.name.toLowerCase() === cmdName) {
            command = cmd;
            break;
        }

        // finds by aliases
        for (const alias of cmd.aliases) {
            if (alias.toLowerCase() === cmdName) {
                command = cmd;
                break;
            }
        }
    }

    // if command isn't found, cancel execution
    if (!command)
        return await channel.send('Not found command named ' + cmdName + '!');

    // executes the command
    await command.execute(msg, args);
});

global.manager.loadCommands('./src/commands/');

// starts the bot
client.login(process.env.TOKEN);

setInterval(async () => {
    if (!client.guilds.cache.size)
        return;

    const dateFormat = 'DD MMM YYYY';
    const moment = utils.moment();

    /** Determines if the schedules can be updated */
    const canUpdateSchedules = () => {
        if (!fs.existsSync('./temp.json'))
            return true;

        const { last_update } = require('../temp.json');
        const currentMillis = utils.asiaMoment().unix();

        const elapsedDays = moment.duration(currentMillis - last_update, 'ms').asDays();
        return elapsedDays !== 0;
    };

    /** Handles saving the last updated date */
    const saveLastUpdate = () => {
        const currentMillis = utils.asiaMoment().unix();
        const temp = { last_update: currentMillis };

        fs.writeFileSync('./temp.json', JSON.stringify(temp), { encoding: 'utf8' });
    };

    if (!canUpdateSchedules())
        return;

    const currentDate = utils.asiaMoment().format(dateFormat);
    let schedules;

    let result = utils.readSchedules();
    if (!result)
        schedules = await utils.fetchSchedules();
    else if (currentDate !== moment(result.last_save).format(dateFormat))
        schedules = await utils.fetchSchedules();
    else
        schedules = result.schedules;

    // don't continue if no schedules are found
    if (!schedules)
        return;

    const config = require('../config.json');
    const channel = client.channels.cache.get(config['schedules-channel']);

    // schedules channel must exists and must be a text channel
    if (!channel || !(channel instanceof TextChannel))
        return;

    // deletes all messages on schedules channel
    await channel.bulkDelete(100);
    const { formatEmbedSchedule } = require('./objects/schedules');

    // prints all schedules
    let foundSchedules = 0;
    for (const schedule of schedules) {
        if (schedule.date !== currentDate)
            continue;

        foundSchedules++;
        const embed = formatEmbedSchedule(schedule);
        await channel.send(embed);
    }

    if (!foundSchedules)
        return await channel.send('Yay! No schedules!');
    
    await channel.send("[@here] today schedules are here!");
    saveLastUpdate();
}, 120_000);