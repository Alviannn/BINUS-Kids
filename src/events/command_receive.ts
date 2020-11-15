/* eslint-disable @typescript-eslint/no-var-requires */

import { client, manager, getConfig } from '../commons';

client.on('message', async (msg) => {
    const { channel, content } = msg;
    const config = getConfig();

    // determines if a command supposed to be executed
    if (!content.startsWith(config.prefix))
        return;

    // grabs the arguments
    const args = content.substr(config.prefix.length).split(' ');
    if (!args)
        return;
    
    // grabs the command name
    const cmdName = args.shift()!.toLowerCase();
    // finds command
    const command = manager.findCommand(cmdName);

    // if command isn't found, cancel execution
    if (!command)
        return await channel.send('Not found command named ' + cmdName + '!');

    // executes the command
    await command.execute(msg, args);
});