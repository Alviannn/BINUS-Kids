import { Message, TextChannel, MessageEmbed } from 'discord.js';
import superagent from 'superagent';
import { Command } from '../../commons';

class NekosLifeCommand extends Command {

    public async execute(msg: Message, args: string[]): Promise<any> {
        const queries = ('femdom, tickle, classic, ngif, erofeet, meow, erok, '
            + 'les, hololewd, lewdk, keta, feetg, nsfw_neko_gif, '
            + 'eroyuri, kiss, kuni, tits, pussy_jpg, cum_jpg, pussy, lewdkemo, '
            + 'slap, lewd, cum, cuddle, spank, smallboobs, Random_hentai_gif, avatar, fox_girl, '
            + 'nsfw_avatar, hug, boobs, pat, feet, smug, kemonomimi, solog, holo, wallpaper, bj, '
            + 'yuri, anal, baka, blowjob, holoero, feed, neko, gasm, hentai, '
            + 'ero, solo, waifu, pwankg, eron, erokemo').split(', ');

        const { channel } = msg;
        
        if (!(channel instanceof TextChannel))
            return;
        if (!channel.nsfw)
            return await channel.send('You can only execute this command within an NSFW channel!');

        const agent = superagent.agent();
        const apiUrl = 'https://nekos.life/api/v2/img/';

        const embed = new MessageEmbed()
            .setTitle('NekosLife Images!')
            .setFooter('Thanks nekos.life!', 'https://nekos.life/static/icons/favicon-194x194.png');

        let query;
        if (!args[0]) {
            return await channel.send('Invalid query!\nUsage: **nekoslife [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');
        } else {
            if (!queries.includes(args[0].toLowerCase()))
                return await channel.send('Invalid query!\nUsage: **nekoslife [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');

            query = args[0].toLowerCase();
        }

        if (!queries.includes(query))
            return await channel.send('Invalid query!\nUsage: **nekoslife [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');

        try {
            const resp = await agent.get(apiUrl + query);
            const { body } = resp;

            embed.setColor('RANDOM')
                .setImage(body.url);

            await channel.send(embed);
        } catch (error) {
            return await channel.send('Failed to get (N)SFW content :<');
        }
    }

}

export const command = new NekosLifeCommand(
    'nekoslife',
    [],
    'View (N)SFW content from nekos.life ( ͡° ͜ʖ ͡°)'
);