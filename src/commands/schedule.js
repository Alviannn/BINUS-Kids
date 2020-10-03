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

        let results = utils.readSchedules();
        if (!results) {
            try {
                results = await utils.fetchSchedules();
            } catch (error) {
                return channel.send('Failed to grab class schedules!');
            }
        }

        const moment = utils.moment();
        const lastDate = moment(results.last_save).format('YYYY-MM-DD');
        const currentDate = utils.asiaMoment().format('YYYY-MM-DD');

        if (currentDate !== lastDate) {
            try {
                results = await utils.fetchSchedules();
            } catch (error) {
                return channel.send('Failed to grab class schedules!');
            }
        }

        results = utils.readSchedules();
        const { schedules } = results;

        if (!args[0]) {
            for (const schedule of schedules)
                await channel.send(formatEmbedSchedule(schedule));

            return;
        }

        switch (args[0]) {
            case 'today':
            case 'now': {
                const currentFormatDate = moment().format('DD MMM YYYY');

                let foundSchedule = 0;
                for (const schedule of schedules) {
                    if (schedule.date !== currentFormatDate)
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
                const tomorrowFormatDate = moment(millis + moment.duration(1, 'day').as('ms')).format('DD MMM YYYY');

                let foundSchedule = 0;
                for (const schedule of schedules) {
                    if (schedule.date !== tomorrowFormatDate)
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