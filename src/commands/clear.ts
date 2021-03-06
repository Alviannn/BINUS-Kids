/* eslint-disable @typescript-eslint/no-var-requires */

import { Message, TextChannel } from 'discord.js';
import { Command, manager } from '../common/commons';

class ClearCommand extends Command {

    public async execute(msg: Message, args: string[]): Promise<unknown> {
        const { channel, member } = msg;
        const prefix = manager.getPrefix();

        if (!(channel instanceof TextChannel))
            return;

        if (!member!.hasPermission('MANAGE_MESSAGES'))
            return await channel.send("You don't have enough permission!");
        if (!args[0])
            return await channel.send(`**Usage:** ${prefix}clear <amount of messages>`);

        let amount = 0;
        try {
            amount = parseInt(args[0]);
        } catch (error) {
            return await channel.send('Please input the amount of messages you want to delete!');
        }

        if (amount > 100)
            return await channel.send('That amount is WAAAAYYY TOO HIGH! Limit is 100 my men!');

        await channel.bulkDelete(amount)
            .then(async (msgs) => await channel.send(`Successfully deleted ${msgs.size}/${amount} messages!`))
            .catch(async () => await channel.send('Failed to clear messages!'));
    }

}

export const command = new ClearCommand(
    'clear',
    ['purge'],
    'Clears specified amount of messages within a discord channel'
);