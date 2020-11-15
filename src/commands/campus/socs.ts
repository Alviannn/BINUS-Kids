import { Message } from 'discord.js';
import { Command, onlinejudge, Status } from '../../commons';

class SocsCommand extends Command {

    public async execute(msg: Message): Promise<unknown> {
        const { channel } = msg;
        const { status, contests } = await onlinejudge.getContests();

        if (status == Status.FAILED)
            return await channel.send('Failed to grab the contest titles!');

        const tempList: string[] = [];
        for (let i = 0; i < contests.length; i++)
            tempList.push(`${i + 1}. ${contests[i]}`);

        return await channel.send(tempList.join('\n'));
    }

}

export const command = new SocsCommand(
    'socs',
    ['onlinejudge', 'oj'],
    'Grabs the contests title within SOCS'
);