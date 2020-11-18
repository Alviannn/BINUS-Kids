/* eslint-disable @typescript-eslint/no-var-requires */

import fs, { PathLike } from 'fs';
import path from 'path';
import { Command, NullableCommand } from '../commons';

/** 
 * The common management utilities 
 */
export namespace manager {

    /** All stored commands */
    export const commandMap = new Map<string, Command>();

    /**
     * Loads all commands
     * 
     * @param cmdsPath the commands folder path
     */
    export function loadCommands(dirPath: PathLike): void {
        if (!fs.existsSync(dirPath))
            throw Error('Cannot find commands directory path!');
        if (!fs.lstatSync(dirPath).isDirectory())
            throw Error('File path is not a directory!');

        const commandMap = module.exports.manager.commandMap;
        for (const file of fs.readdirSync(dirPath)) {
            const fullPath = path.join(dirPath.toString(), file);

            // if another directory is found, do recursion
            if (fs.lstatSync(fullPath).isDirectory())
                loadCommands(fullPath);

            // excludes invalid files
            if (file.startsWith('_') || !file.endsWith('.js'))
                continue;

            // resolves the file path to the command file
            // this is necessary for loading another JS files
            const resolvedPath = path.resolve(fullPath);
            // loads the command module
            const commandModule = require(resolvedPath);

            if (!commandModule)
                continue;

            const command = commandModule.command;
            if (!command || !(command instanceof Command))
                continue;

            commandMap.set(command.name, command);
            console.log(`[COMMAND] Loaded ${file}!`);
        }
    }

    /**
     * Loads all events
     * 
     * @param eventsPath the events directory path
     */
    export function loadEvents(eventsPath: PathLike): void {
        if (!fs.existsSync(eventsPath))
            throw Error('Cannot find events folder path!');
        if (!fs.lstatSync(eventsPath).isDirectory())
            throw Error("Events path isn't a folder/directory!");

        for (const file of fs.readdirSync(eventsPath)) {
            const fullPath = path.join(eventsPath.toString(), file);

            // if another directory is found, do recursion
            if (fs.lstatSync(fullPath).isDirectory())
                loadCommands(fullPath);

            // excludes invalid files
            if (file.startsWith('_') || !file.endsWith('.js'))
                continue;

            // resolves the file path to command
            // this is necessary for loading another JS files
            const resolvedPath = path.resolve(fullPath);
            // loads the events codes
            require(resolvedPath);

            console.log(`[EVENT] Loaded ${file}!`);
        }
    }

    /**
     * Finds a command
     * 
     * @param name the possible command name
     */
    export function findCommand(name: string): NullableCommand {
        for (const cmd of commandMap.values()) {
            // attempts to find the command by the name
            if (cmd.name.toLowerCase() === name.toLowerCase())
                return cmd;

            if (!cmd.aliases)
                continue;

            // attempts to find the command by it's aliases
            for (const alias of cmd.aliases) {
                if (alias.toLowerCase() === name.toLowerCase())
                    return cmd;
            }
        }

        return null;
    }

}