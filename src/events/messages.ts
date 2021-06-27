/* eslint-disable @typescript-eslint/no-var-requires */

import { client, loadConfig, manager } from '../common/commons';

client.on('message', async (msg) => {
    const { guild, channel, content, author } = msg;

    // the bot should only work in discord servers
    if (!guild)
        return await channel.send("The bot doesn't accept private messages!");

    const config = loadConfig();
    const prefix = manager.getPrefix();

    const isAdmin = author.id === client.user!.id;
    const isSpecialChannels = (channel.id === config.channels.forums) || (channel.id === config.channels.assignments) || (channel.id === config.channels.schedules);

    // prevents normal user from sending messages to some channels
    if (!isAdmin && isSpecialChannels) {
        await msg.delete({ timeout: 800 });
        return;
    }

    // determines if a command supposed to be executed
    if (!content.startsWith(prefix))
        return;
    // prevents listening to bot
    if (author.bot)
        return;

    // grabs the arguments
    const args = content.substr(prefix.length).split(' ');
    if (!args)
        return;

    // grabs the command name
    const cmdName = args.shift()!.toLowerCase();
    // finds command
    const command = manager.findCommand(cmdName);

    // if command isn't found, cancel execution
    if (!command)
        return await channel.send(`Not found command named ${cmdName}!`);

    // executes the command
    await command.execute(msg, args);
});
