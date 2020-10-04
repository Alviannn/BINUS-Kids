const commons = require('../commons');

const { command } = commons;
const { MessageEmbed } = require('discord.js');

/** @type {command} */
module.exports = {
    name: 'info',
    aliases: ['information', 'idk'],
    desc: 'Shows the bot information',
    async execute(msg, args) {
        const { channel, client } = msg;
        const config = require('../../config.json');

        const image = 'https://image.psikolif.com/wp-content/uploads/2018/10/Logo-Binus-University-Universitas-Bina-Nusantara-Original-PNG-728x448.png';
        const embed = new MessageEmbed()
            .setColor('AQUA')
            .setAuthor('Bot Information', client.user.displayAvatarURL())
            .setThumbnail(image)
            .addField('Prefix', '`' + config.prefix + '`')
            .addField('Author', 'Alvian#1341')
            .addField('Version', require('../../package.json').version);

        return await channel.send(embed);
    }
};