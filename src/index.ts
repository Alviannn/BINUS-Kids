/* eslint-disable @typescript-eslint/no-var-requires */

import assert from 'assert';
import { Channel, MessageEmbed, TextChannel, User } from 'discord.js';
import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import { binusmaya, client, createClient, database, loadConfig, manager, schedules, times } from './common/commons';

dotenv.config();
createClient();

try {
    database.setupdb();
} catch (_) {
    throw Error('Failed to setup server database');
}

manager.loadCommands('./dist/commands/');
manager.loadEvents('./dist/events/');

// starts the bot
client.login(process.env.TOKEN);

// The class schedules task (runs every 2 mins)
setInterval(async () => {
    if (!client.guilds.cache.size)
        return;

    const config = loadConfig();
    const channel = client.channels.cache.get(config.channels.schedules);
    // schedules channel must exists and must be a text channel
    if (!channel || !(channel instanceof TextChannel))
        return;

    // if no last auto update date was found
    // we're going to check on the #schedules channel for it
    //
    // this is to prevent schedules re-post when the bot is updated at that day
    // this is happening because of Heroku not saving files every deployments
    if (!database.lastAutoUpdateSchedule()) {
        const msgs = channel.messages.cache.size ? channel.messages.cache : await channel.messages.fetch();
        const msgList = msgs.array()
            .filter(m => m.author === client.user && m.content.includes('schedules') && m.content.includes('@everyone'));

        // if found messages where the bot had posted for auto updates
        // get the timestamp and then save it for the last auto update date
        if (msgList.length) {
            const { createdTimestamp } = msgList[0];
            const lastPostDate = DateTime.fromMillis(createdTimestamp)
                .setZone('Asia/Bangkok', { keepLocalTime: false })
                .toFormat(times.BINUS_DATE_FORMAT);

            database.lastAutoUpdateSchedule(lastPostDate);
        }
    }

    const currentDate = times.asiaDate().toFormat(times.BINUS_DATE_FORMAT);
    // only post schedules if a day has passed
    if (currentDate === database.lastAutoUpdateSchedule())
        return;

    const scheduleList = await schedules.getSchedules();
    // don't continue if no schedules are found
    // this is because the grabber failed to grab the schedules
    if (!scheduleList)
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

    const user = await client.users.fetch(config.user_mention);
    if (!foundSchedules)
        await channel.send(`${user} Yay! No schedules today!`);
    else
        await channel.send(`${user} Today schedules are here!`);

    database.lastAutoUpdateSchedule(currentDate);
}, 120_000);

// ---------------------------------------------------------------------------------------------- //

async function postAssignments(user: User) {
    const config = loadConfig();

    let channel: Channel;
    try {
        // channel must exist and be text channel
        channel = await client.channels.fetch(config.channels.assignments);
        assert(channel instanceof TextChannel);
    } catch (err) {
        console.log('[ERROR]: Failed to get assignments channel!');
        return;
    }

    const assigns = await binusmaya.getUnreadAssignments();
    if (!assigns)
        return;

    let foundAssignments = false;
    for (const asg of assigns) {
        const user = client.user!;
        const icon = user.displayAvatarURL();

        const embed = new MessageEmbed()
            .setAuthor(asg.title, icon)
            .setThumbnail(icon)
            .setColor('RANDOM')

            .addField('**Sender**', asg.sender)
            .addField('**Date**', asg.time)
            .addField('**Deadline**', asg.deadline)
            .addField('**URL**', `[Click here](${asg.link})`);

        await channel.send(embed);
        await binusmaya.readNotification(asg.id);

        foundAssignments = true;
    }

    if (foundAssignments)
        await channel.send(`${user} I found assignments!`);
}

async function postForums(user: User) {
    const config = loadConfig();

    let channel: Channel;
    try {
        // channel must exist and be text channel
        channel = await client.channels.fetch(config.channels.forums);
        assert(channel instanceof TextChannel);
    } catch (err) {
        console.log('[ERROR]: Failed to get forums channel!');
        return;
    }

    const notifs = await binusmaya.getUnreadForums();
    if (!notifs)
        return;

    let foundForums = false;
    for (const notif of notifs) {
        const user = client.user!;
        const icon = user.displayAvatarURL();

        const embed = new MessageEmbed()
            .setAuthor(notif.title, icon)
            .setThumbnail(icon)
            .setColor('RANDOM')

            .addField('**Sender**', notif.sender)
            .addField('**Date**', notif.time)
            .addField('**URL**', `[Click here](${notif.link})`);

        await channel.send(embed);
        await binusmaya.readNotification(notif.id);

        foundForums = true;
    }

    if (foundForums)
        await channel.send(`${user} I found forums!`);
}

// ---------------------------------------------------------------------------------------------- //

// binusmaya post task (runs every 5 mins)
setInterval(async () => {
    if (!client.guilds.cache.size)
        return;

    const hasSession = await binusmaya.hasSession();
    if (!hasSession) {
        const loginStatus = await binusmaya.login();
        if (!loginStatus)
            return;
    }

    const config = loadConfig();
    const user = await client.users.fetch(config.user_mention);

    await postAssignments(user);
    await postForums(user);
}, 120_000);