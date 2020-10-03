const commons = require('../commons');

const { MessageEmbed } = require('discord.js');
const { command } = commons;

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
            .addField('Bot prefix', '`' + config.prefix + '`')
            .addField('Bot author', 'Alvian#1341');

        return await channel.send(embed);
    }
};