const commons = require('../commons');
const { client } = commons;

client.on('message', async (msg) => {
    const { channel, content } = msg;

    const config = require('../../config.json');
    // determines if a command supposed to be executed
    if (!content.startsWith(config.prefix))
        return;

    // grabs the arguments
    const args = content.substr(config.prefix.length).split(' ');
    // grabs the command name
    const cmdName = args.shift().toLowerCase();

    // prepares the command variables and what it needs
    const { commandMap } = commons.manager;
    const commandList = commandMap.values();
    let command;

    // finds the command
    for (const cmd of commandList) {
        // finds by name
        if (cmd.name.toLowerCase() === cmdName) {
            command = cmd;
            break;
        }

        // finds by aliases
        for (const alias of cmd.aliases) {
            if (alias.toLowerCase() === cmdName) {
                command = cmd;
                break;
            }
        }
    }

    // if command isn't found, cancel execution
    if (!command)
        return await channel.send('Not found command named ' + cmdName + '!');

    // executes the command
    await command.execute(msg, args);
});