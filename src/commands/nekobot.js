const commons = require('../commons');
const superagent = require('superagent');
const { command } = commons;
const { MessageEmbed } = require('discord.js');

/** @type {command} */
module.exports = {
    name: 'nekobot',
    aliases: [],
    desc: 'View NSFW content from nekobot.xyz ( ͡° ͜ʖ ͡°)',
    async execute(msg, args) {
        const { channel } = msg;
        if (!channel.nsfw)
            return await channel.send('You can only execute this command within an NSFW channel!');

        const agent = superagent.agent();
        const apiUrl = 'https://nekobot.xyz/api/image?type=';

        const embed = new MessageEmbed()
            .setTitle('NSFW TAIMU!')
            .setFooter('Thanks nekobot.xyz!', 'https://nekobot.xyz/apple-touch-icon.png');

        let query;
        const queries = 'hass, hmidriff, pgif, 4k, hentai, holo, hneko, neko, hkitsune, kemonomimi, anal, hanal, gonewild, kanna, ass, pussy, thigh, hthigh, gah, coffee, food, paizuri, tentacle, boobs, hboobs'
            .split(', ');

        if (!args[0]) {
            return await channel.send('Invalid query!\nUsage: **nekobot [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');
        } else {
            if (!queries.includes(args[0].toLowerCase()))
                return await channel.send('Invalid query!\nUsage: **nekobot [query type]**\nAvailable queries: `[' + queries.join(', ') + ']`');
                
            query = args[0].toLowerCase();
        }

        try {
            const resp = await agent.get(apiUrl + query);
            const { body } = resp;

            embed.setColor(body.color)
                .setImage(body.message);

            await channel.send(embed);
        } catch (error) {
            return await channel.send('Failed to get NSFW content :<');
        }
    }
};