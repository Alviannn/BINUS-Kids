/* eslint-disable @typescript-eslint/no-var-requires */
import { client, manager } from '../common/commons';

client.on('message', async (msg) => {
    const { mentions, content } = msg;

    if (!content.match(/<@!?[0-9]{18}>/gi))
        return;

    const prefix = manager.getPrefix();
    if (mentions.users.array()[0] === client.user!)
        await msg.reply(`The bot prefix is **${prefix}**!`);
});