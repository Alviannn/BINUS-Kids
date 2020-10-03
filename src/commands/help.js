const commons = require('../commons');
const { command } = commons;
const { MessageEmbed } = require('discord.js');

/** @type {command} */
module.exports = {
    name: 'help',
    aliases: [],
    desc: 'Shows all available commands for users to use!',
    async execute(msg, args) {
        const { author, client, channel } = msg;
        const { commandMap } = commons.manager;

        if (!args[0]) {
            const result = [];
            for (const key of commandMap.keys())
                result.push('`' + key + '`');

            const embed = new MessageEmbed()
                .setAuthor('Available Commands')
                .setColor('RANDOM')
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(`${result.join(', ')}`)
                .setFooter(`Executed by ${author.tag}`, author.displayAvatarURL());

            return await channel.send(embed);
        }

        const possibleName = args[0].toLowerCase();
        /** @type {command} */
        let cmd;

        // tries to find the command
        for (const temp of commandMap.values()) {
            if (temp.name.toLowerCase() === possibleName) {
                cmd = possibleName;
                break;
            }

            for (const alias of temp.aliases) {
                if (alias.toLowerCase() === possibleName) {
                    cmd = possibleName;
                    break;
                }
            }

            if (cmd)
                break;
        }

        if (!cmd)
            return await channel.send('Cannot find any command named `' + args[0] + '`!');

        const embed = new MessageEmbed()
            .setAuthor('Command Information')
            .setColor('RANDOM')
            .setThumbnail(client.user.displayAvatarURL())
            .addField('Name', cmd.name)
            .addField('Aliases', `[${cmd.aliases ? cmd.aliases.join(', ') : ''}]`)
            .addField('Description', cmd.desc ? cmd.desc : '_No description_')
            .setFooter(`Executed by ${author.tag}`, author.displayAvatarURL());

        return await channel.send(embed);
    }
};