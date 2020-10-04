const commons = require('../commons');
const { command, utils, times } = commons;
const { formatEmbedSchedule } = require('../objects/schedules');

/** @type {command} */
module.exports = {
    name: 'schedule',
    aliases: ['sched', 'class', 'classes'],
    desc: 'Checks the BINUS class schedules for LC-01 class',
    async execute(msg, args) {
        const { channel } = msg;

        const asiaDate = times.asiaDate();
        const schedules = await utils.getSchedules();

        if (!args[0]) {
            for (const schedule of schedules)
                await channel.send(formatEmbedSchedule(schedule));

            return;
        }

        const dateFormat = 'DD MMM YYYY';
        switch (args[0]) {
            case 'today':
            case 'now': {
                const currentDate = asiaDate.toFormat(dateFormat);

                let foundSchedule = 0;
                for (const schedule of schedules) {
                    if (schedule.date !== currentDate)
                        continue;

                    await channel.send(formatEmbedSchedule(schedule));
                    foundSchedule++;
                }

                if (!foundSchedule)
                    return await channel.send('No classes today!');

                break;
            }
            case 'tmr':
            case 'tomorrow':
            case 'next': {
                const tomorrowDate = asiaDate.plus({ day: 1 }).toFormat(dateFormat);

                let foundSchedule = 0;
                for (const schedule of schedules) {
                    if (schedule.date !== tomorrowDate)
                        continue;

                    await channel.send(formatEmbedSchedule(schedule));
                    foundSchedule++;
                }

                if (!foundSchedule)
                    return await channel.send('No classes tomorrow!');
                break;
            }
            default:
                return await channel.send('Invalid argument!');
        }
    }
};