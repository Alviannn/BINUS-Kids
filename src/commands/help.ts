import { Message, MessageEmbed } from 'discord.js';
import { Command, manager } from '../common/commons';

class HelpCommand extends Command {

    public async execute(msg: Message, args: string[]): Promise<unknown> {
        const { commandMap } = manager;
        const { author, client, channel } = msg;

        const embed = new MessageEmbed()
            .setColor('RANDOM')
            .setThumbnail(client.user!.displayAvatarURL())
            .setFooter(`Executed by ${author.tag}`, author.displayAvatarURL());

        if (!args[0]) {
            const results = [...commandMap.keys()].map(key => '`' + key + '`');
            embed.setAuthor('Available Commands')
                .setDescription(`${results.join(', ')}`);

            return await channel.send(embed);
        }

        const possibleName = args[0].toLowerCase();
        const command = manager.findCommand(possibleName);

        if (!command)
            return await channel.send('Cannot find any command named `' + args[0] + '`!');

        embed.setAuthor('Command Information')
            .addField('Name', command.name)
            .addField('Aliases', `[${command.aliases ? command.aliases.join(', ') : ''}]`)
            .addField('Description', command.desc ? command.desc : '_No description_');

        return await channel.send(embed);
    }

}

export const command = new HelpCommand(
    'help',
    [],
    'Shows all available commands for users to use!'
);