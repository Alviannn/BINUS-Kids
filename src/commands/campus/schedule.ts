/* eslint-disable @typescript-eslint/no-var-requires */

import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';
import { Command, schedules, times, manager } from '../../common/commons';

class ScheduleCommand extends Command {

    public async execute(msg: Message, args: string[]): Promise<unknown> {
        const { channel, client } = msg;
        const prefix = manager.getPrefix();

        if (!(channel instanceof TextChannel))
            return;

        const asiaDate = times.asiaDate();
        const currentDate = asiaDate.toFormat(times.BINUS_DATE_FORMAT);
        const tomorrowDate = asiaDate.plus({ days: 1 }).toFormat(times.BINUS_DATE_FORMAT);


        if (!args[0]) {
            const embed = new MessageEmbed()
                .setAuthor('Schedule command usage')
                .setColor('RANDOM')
                .setDescription(
                    `Use \`${prefix}schedule help\` or not use any arguments at all`
                    + `\nto view how this command works!`
                    + `\n`
                    + `\nYou can use other arguments to use the schedule command like using`
                    + `\n\`${prefix}schedule today\` to view today's schedule`
                    + `\n${prefix}schedule tomorrow\` to view tomorrow's schedule`
                    + `\n\`${prefix}schedule ${currentDate}\` to view the schedule on specified date`
                    + `\n`
                    + `\nExample: \`${prefix}schedule ${currentDate}\``
                    + `\n`
                    + `\nFor quite less information like the aliases and command description do \`${prefix}help schedule\``
                );

            await channel.send(embed);
            return;
        }

        let foundSchedule = false;
        const schedList = await schedules.getSchedules();

        switch (args[0].toLowerCase()) {
            case 'today':
            case 'now': {
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
            case 'tolong': {
                await this.execute(msg, []);
                break;
            }
            case 'dates':
            case 'days':
            case 'datelist':
            case 'list': {
                const dateSet = new Set<string>();
                for (const sched of schedList) {
                    if (dateSet.size >= 10)
                        break;

                    dateSet.add(`- **${sched.date}**`);
                }

                const dateList = Array.from(dateSet);
                const embed = new MessageEmbed()
                    .setAuthor('All schedules (in dates)')
                    .setDescription(
                        dateList.join('\n')
                        + `\n`
                        + `\nYou can view the classes within a date by using`
                        + `\n\`${prefix}schedule ${times.BINUS_DATE_FORMAT}\``
                        + `\n`
                        + `\nExample: \`${prefix}schedule ${currentDate}\``
                    ).setColor('RANDOM');

                await channel.send(embed);
                break;
            }
            default: {
                let foundDate: DateTime;

                try {
                    foundDate = DateTime.fromFormat(args.join(' '), times.BINUS_DATE_FORMAT, { zone: 'Asia/Bangkok', setZone: true });
                    if (!foundDate || !foundDate.isValid)
                        throw Error();
                } catch (_) {
                    return await channel.send(
                        `Cannot process the given arguments!`
                        + `\n`
                        + `\nIf you want to use a custom date format to get schedules`
                        + `\nThen use the format of \`${times.BINUS_DATE_FORMAT}\`!`
                        + `\n`
                        + `\nExample: \`${currentDate}\``
                    );
                }

                const formattedDate = foundDate.toFormat(times.BINUS_DATE_FORMAT);
                for (const sched of schedList) {
                    if (sched.date !== formattedDate)
                        continue;

                    foundSchedule = true;
                    await channel.send(schedules.formatEmbedSchedule(client.user!, sched));
                }

                if (!foundSchedule)
                    await channel.send(`No classes on ${formattedDate}!`);

                break;
            }
        }
    }

}

export const command = new ScheduleCommand(
    'schedule',
    ['sched', 'class', 'classes'],
    'Checks the BINUS class schedules'
);