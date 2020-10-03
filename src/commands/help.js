const commons = require('../commons');
const { command, manager } = commons;
const { MessageEmbed } = require('discord.js');

/** @type {command} */
module.exports = {
    name: 'help',
    aliases: [],
    desc: 'Shows all available commands for users to use!',
    async execute(msg, args) {
        const { commandMap } = manager;
        const { author, client, channel } = msg;

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
        const command = manager.findCommand(possibleName);

        if (!command)
            return await channel.send('Cannot find any command named `' + args[0] + '`!');

        const embed = new MessageEmbed()
            .setAuthor('Command Information')
            .setColor('RANDOM')
            .setThumbnail(client.user.displayAvatarURL())
            .addField('Name', command.name)
            .addField('Aliases', `[${command.aliases ? command.aliases.join(', ') : ''}]`)
            .addField('Description', command.desc ? command.desc : '_No description_')
            .setFooter(`Executed by ${author.tag}`, author.displayAvatarURL());

        return await channel.send(embed);
    }
};