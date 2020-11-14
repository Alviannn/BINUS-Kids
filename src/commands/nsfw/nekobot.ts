import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { Command } from '../../commons';
import got from 'got';

class NekobotCommand extends Command {

    public async execute(msg: Message, args: string[]): Promise<any> {
        const { channel } = msg;

        if (!(channel instanceof TextChannel))
            return;
        if (!channel.nsfw)
            return await channel.send('You can only execute this command within an NSFW channel!');

        const apiUrl = 'https://nekobot.xyz/api/image?type=';
        const embed = new MessageEmbed()
            .setTitle('NSFW TAIMU!')
            .setFooter('Thanks nekobot.xyz!', 'https://nekobot.xyz/apple-touch-icon.png');

        let query;
        const queries = ('hass, hmidriff, pgif, 4k, hentai, holo, hneko, neko, hkitsune, kemonomimi, anal, '
            + 'hanal, gonewild, kanna, ass, pussy, thigh, hthigh, gah, coffee, food, '
            + 'paizuri, tentacle, boobs, hboobs').split(', ');

        if (!args[0]) {
            return await channel.send('Invalid query!\nUsage: **nekobot [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');
        } else {
            if (!queries.includes(args[0].toLowerCase()))
                return await channel.send('Invalid query!\nUsage: **nekobot [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');

            query = args[0].toLowerCase();
        }

        if (!queries.includes(query))
            return await channel.send('Invalid query!\nUsage: **nekoslife [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');

        try {
            const resp = await got.get(apiUrl + query);
            const body = JSON.parse(resp.body);

            embed.setColor(body.color)
                .setImage(body.message);

            await channel.send(embed);
        } catch (error) {
            return await channel.send('Failed to get NSFW content :<');
        }
    }

}

export const command = new NekobotCommand(
    'nekobot',
    [],
    'View NSFW content from nekobot.xyz ( ͡° ͜ʖ ͡°)'
);