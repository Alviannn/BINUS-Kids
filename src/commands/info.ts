/* eslint-disable @typescript-eslint/no-var-requires */

import { Message, MessageEmbed, version } from 'discord.js';
import { Command, getConfig } from '../commons';

class InfoCommand extends Command {

    public async execute(msg: Message): Promise<any> {
        const { channel, client } = msg;
        const config = getConfig();

        const packageJson = require('../../package.json');
        const embed = new MessageEmbed()
            .setColor('AQUA')
            .setAuthor('Bot Information', client.user!.displayAvatarURL())
            .setThumbnail(client.user!.displayAvatarURL())
            .addField('Command Prefix', '`' + config.prefix + '`')
            .addField('Author', 'Alvian#1341')
            .addField('Version', packageJson.version)
            .addField('discord.js', version)
            .addField('Source Code', `[Click here](${packageJson.repository.url})`);

        await channel.send(embed);
    }

}

export const command = new InfoCommand(
    'info',
    ['information', 'idk'],
    'Shows the bot information'
);