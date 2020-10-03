const commons = require('./commons');
const dotenv = require('dotenv');
const fs = require('fs');

const { utils } = commons;
const { TextChannel } = require('discord.js');

dotenv.config();
commons.createClient();

const client = commons.client;

commons.manager.loadCommands('./src/commands/');
commons.manager.loadEvents('./src/events/');

// starts the bot
client.login(process.env.TOKEN);

setInterval(async () => {
    if (!client.guilds.cache.size)
        return;

    const dateFormat = 'DD MMM YYYY';
    const moment = utils.moment();
    const asiaMoment = utils.asiaMoment();

    /** Determines if the schedules can be updated */
    const canUpdateSchedules = () => {
        if (!fs.existsSync('./temp.json'))
            return true;

        const { last_update } = require('../temp.json');

        const currentDate = asiaMoment.format(dateFormat);
        const lastUpdateDate = moment(last_update).format(dateFormat);

        return currentDate !== lastUpdateDate;
    };

    /** Handles saving the last updated date */
    const saveLastUpdate = () => {
        const currentMillis = utils.asiaMoment().unix();
        const temp = { last_update: currentMillis };

        fs.writeFileSync('./temp.json', JSON.stringify(temp), { encoding: 'utf8' });
    };

    if (!canUpdateSchedules())
        return;

    let schedules = await utils.getSchedules();
    // don't continue if no schedules are found
    // this is because the grabber failed to grab the schedules
    if (!schedules)
        return;

    const config = require('../config.json');
    const channel = client.channels.cache.get(config['schedules-channel']);
    const currentDate = asiaMoment.format(dateFormat);
    const { formatEmbedSchedule } = require('./objects/schedules');

    // schedules channel must exists and must be a text channel
    if (!channel || !(channel instanceof TextChannel))
        return;

    // deletes all messages on schedules channel
    await channel.bulkDelete(100);

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
        await channel.send('@everyone Yay! No schedules today!');
    else
        await channel.send("@everyone Today schedules are here!");
        
    saveLastUpdate();
}, 120_000);