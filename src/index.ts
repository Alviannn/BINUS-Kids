/* eslint-disable @typescript-eslint/no-var-requires */

import { TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import * as commons from './commons';

dotenv.config();
commons.createClient();

const { times, schedules, client, manager, database } = commons;

try {
    database.setupdb();
} catch (_) {
    throw Error('Failed to setup server database');
}

manager.loadCommands('./dist/commands/');
manager.loadEvents('./dist/events/');

// starts the bot
client.login(process.env.TOKEN);

// The class schedules task
setInterval(async () => {
    if (!client.guilds.cache.size)
        return;

    const currentDate = times.asiaDate().toFormat(times.BINUS_DATE_FORMAT);
    if (currentDate === database.getLastAutoUpdateSchedule())
        return;

    const scheduleList = await schedules.getSchedules();
    // don't continue if no schedules are found
    // this is because the grabber failed to grab the schedules
    if (!scheduleList)
        return;

    const config = commons.getConfig();
    const channel = client.channels.cache.get(config.schedules_channel);

    // schedules channel must exists and must be a text channel
    if (!channel || !(channel instanceof TextChannel))
        return;

    // deletes all messages on schedules channel
    await channel.bulkDelete(100);

    // prints all schedules
    let foundSchedules = false;
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

    database.setLastAutoUpdateSchedule(currentDate);
}, 120_000);