/* eslint-disable @typescript-eslint/no-var-requires */
import { client, manager } from '../common/commons';

client.on('message', async (msg) => {
    const { mentions, content, guild } = msg;
    if (!content.match(/<@!?[0-9]{18}>/gi))
        return;

    const clientUser = client.user;
    const member = guild!.member(clientUser!);
    const prefix = manager.getPrefix(guild);

    if (mentions.members!.array()[0] === member)
        await msg.reply(`The bot prefix is **${prefix}**!`);
});