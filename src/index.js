const commons = require('./commons');
const dotenv = require('dotenv');

const { schedules, times, files } = commons;
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

    const dateFormat = 'dd MMM yyyy';
    const asiaDate = times.asiaDate();
    const currentDate = asiaDate.toFormat(dateFormat);

    /** Determines if the schedules can be updated */
    function canUpdateSchedules() {
        const obj = files.readJson('./temp.json');
        if (!obj)
            return true;

        const { last_update } = obj;
        return currentDate !== last_update;
    }

    /** Handles saving the last updated date */
    function saveLastUpdate() {
        const tempObj = { last_update: currentDate };
        files.saveJson('./temp.json', tempObj);
    }

    if (!canUpdateSchedules())
        return;

    let scheduleList = await schedules.getSchedules();
    // don't continue if no schedules are found
    // this is because the grabber failed to grab the schedules
    if (!scheduleList)
        return;

    const config = require('../config.json');
    const channel = client.channels.cache.get(config['schedules-channel']);
    const { formatEmbedSchedule } = require('./objects/schedules');

    // schedules channel must exists and must be a text channel
    if (!channel || !(channel instanceof TextChannel))
        return;

    // deletes all messages on schedules channel
    await channel.bulkDelete(100);

    // prints all schedules
    let foundSchedules = 0;
    for (const schedule of scheduleList) {
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