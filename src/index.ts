/* eslint-disable @typescript-eslint/no-var-requires */

import { TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import * as commons from './commons';

dotenv.config();
commons.createClient();

const { files, times, schedules, client, manager } = commons;

manager.loadCommands('./dist/commands/');
manager.loadEvents('./dist/events/');

// starts the bot
client.login(process.env.TOKEN);

// The class schedules task
setInterval(async () => {
    if (!client.guilds.cache.size)
        return;

    const dateFormat = 'dd MMM yyyy';
    const asiaDate = times.asiaDate();
    const currentDate = asiaDate.toFormat(dateFormat);

    // ----------------------------------------------------------- //

    /** 
     * Determines if the schedules can be updated
     */
    function canUpdateSchedules(): boolean {
        const obj = files.readJson('./temp.json');
        if (!obj)
            return true;

        const { last_update } = obj;
        return currentDate !== last_update;
    }

    /** 
     * Handles saving the last updated date 
     */
    function saveLastUpdate() {
        const tempObj = { last_update: currentDate };
        files.saveJson('./temp.json', tempObj);
    }

    // ----------------------------------------------------------- //

    if (!canUpdateSchedules())
        return;

    const scheduleList = await schedules.getSchedules();
    // don't continue if no schedules are found
    // this is because the grabber failed to grab the schedules
    if (!scheduleList)
        return;

    const config: commons.Config = require('../config.json');
    const channel = client.channels.cache.get(config.schedules_channel);

    // schedules channel must exists and must be a text channel
    if (!channel || !(channel instanceof TextChannel))
        return;

    // deletes all messages on schedules channel
    await channel.bulkDelete(100);

    let foundSchedules = false;

    // prints all schedules
    for (const schedule of scheduleList) {
        if (schedule.date !== currentDate)
            continue;

        foundSchedules = true;

        const embed = schedules.formatEmbedSchedule(client.user!, schedule);
        await channel.send(embed);
    }

    if (!foundSchedules)
        await channel.send('@everyone Yay! No schedules today!');
    else
        await channel.send("@everyone Today schedules are here!");

    saveLastUpdate();
}, 120_000);