/* eslint-disable @typescript-eslint/no-var-requires */

import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';
import { Command, Config, schedules, times } from '../../commons';

class ScheduleCommand extends Command {

    public async execute(msg: Message, args: string[]): Promise<any> {
        const { channel, client } = msg;
        if (!(channel instanceof TextChannel))
            return;

        const config: Config = require('../../../config.json');
        const dateFormat = 'dd MMM yyyy';
        const asiaDate = times.asiaDate();

        const currentDate = asiaDate.toFormat(dateFormat);
        const tomorrowDate = asiaDate.plus({ days: 1 }).toFormat(dateFormat);

        if (!args[0]) {
            const embed = new MessageEmbed()
                .setAuthor('Schedule command usage', client.user!.displayAvatarURL())
                .setColor('RANDOM')
                .setDescription(
                    "Use `" + config.prefix + "schedule help` or not use any arguments at all"
                    + "\nto view how this command works!"
                    + "\n"
                    + "\nYou can use other arguments to use the schedule command like using"
                    + "\n`" + config.prefix + "schedule today` to view today's schedule"
                    + "\n`" + config.prefix + "schedule tomorrow` to view tomorrow's schedule"
                    + "\n`" + config.prefix + "schedule " + currentDate + "` to view the schedule on specified date"
                    + "\n"
                    + "\nExample: `" + config.prefix + "schedule " + currentDate + "`"
                    + "\n"
                    + "\nFor quite less information like the aliases and command description do `" + config.prefix + "help schedule`"
                );

            await channel.send(embed);
            return;
        }

        let foundSchedule = false;
        switch (args[0]) {
            case 'today':
            case 'now': {
                await channel.send('Fetching schedules...');
                const schedList = await schedules.getSchedules();

                for (const sched of schedList) {
                    if (sched.date !== currentDate)
                        continue;

                    foundSchedule = true;
                    await channel.send(schedules.formatEmbedSchedule(client.user!, sched));
                }

                if (!foundSchedule)
                    await channel.send('No classes for today!');

                break;
            }
            case 'tmr':
            case 'tomorrow':
            case 'besok':
            case 'next': {
                await channel.send('Fetching schedules...');
                const schedList = await schedules.getSchedules();

                for (const sched of schedList) {
                    if (sched.date !== tomorrowDate)
                        continue;

                    foundSchedule = true;
                    await channel.send(schedules.formatEmbedSchedule(client.user!, sched));
                }

                if (!foundSchedule)
                    await channel.send('No classes for tomorrow!');
                break;
            }
            case 'help':
            case 'info':
            case 'how':
            case '?':
            case 'tolong':
                await this.execute(msg, []);
                break;
            default: {
                let foundDate: DateTime;

                try {
                    foundDate = DateTime.fromFormat(args.join(' '), dateFormat, { zone: 'Asia/Bangkok', setZone: true });
                    if (!foundDate || !foundDate.isValid)
                        throw Error();
                } catch (_) {
                    return await channel.send(
                        'Cannot process the given arguments!'
                        + '\n'
                        + '\nIf you want to use a custom date format to get schedules'
                        + '\nThen use the format of `' + dateFormat + '`!'
                        + '\n'
                        + '\nExample: `' + currentDate + '`'
                    );
                }

                const formattedDate = foundDate.toFormat(dateFormat);

                await channel.send('Fetching schedules...');
                const schedList = await schedules.getSchedules();

                for (const sched of schedList) {
                    if (sched.date !== formattedDate)
                        continue;

                    foundSchedule = true;
                    await channel.send(schedules.formatEmbedSchedule(client.user!, sched));
                }

                if (!foundSchedule)
                    await channel.send('No classes on ' + formattedDate + '!');

                break;
            }
        }
    }

}

export const command = new ScheduleCommand(
    'schedule',
    ['sched', 'class', 'classes'],
    'Checks the BINUS class schedules for LC-01 class'
);