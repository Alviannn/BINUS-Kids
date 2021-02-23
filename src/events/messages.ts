/* eslint-disable @typescript-eslint/no-var-requires */

import { client, loadConfig, manager } from '../common/commons';

client.on('message', async (msg) => {
    const { guild, channel, content, author } = msg;

    // the bot should only work in discord servers
    if (!guild)
        return await channel.send("The bot doesn't accept private messages!");

    const config = loadConfig();

    const conf = config.servers[guild.id];
    const prefix = manager.getPrefix(guild);

    const isAdmin = (author.id === client.user!.id) || (author.id === '217970261230747648');
    const isSpecialChannels = (channel.id === conf.schedules_channel) || (channel.id === conf.assignments_channel) || (channel.id === conf.forums_channel);

    // prevents normal user from sending messages to some channels
    if (!isAdmin && isSpecialChannels) {
        await msg.delete({ timeout: 300 });
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
