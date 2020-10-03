const commons = require('../commons');
const { command, utils } = commons;
const { formatEmbedSchedule } = require('../objects/schedules');

/** @type {command} */
module.exports = {
    name: 'schedule',
    aliases: ['sched', 'class', 'classes'],
    desc: 'Checks the BINUS class schedules for LC-01 class',
    async execute(msg, args) {
        const { channel } = msg;

        const moment = utils.moment();
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
                const currentDate = moment().format(dateFormat);

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
                const millis = moment.now();
                const tomorrowDate = moment(millis + moment.duration(1, 'day').as('ms')).format(dateFormat);

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