/* eslint-disable @typescript-eslint/no-var-requires */
import { client, getConfig } from '../common/commons';

client.on('message', async (msg) => {
    const { mentions, content, guild } = msg;
    if (!content.match(/<@!?[0-9]{18}>/gi))
        return;

    const clientUser = client.user;
    const member = guild!.member(clientUser!);
    const config = getConfig();

    if (mentions.members!.array()[0] === member)
        await msg.reply(`The bot prefix is **${config.prefix}**!`);
});