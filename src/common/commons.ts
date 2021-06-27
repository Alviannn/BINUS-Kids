/* eslint-disable @typescript-eslint/no-var-requires */

import { Client, PresenceData } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Config } from './types';

// -------------------------------------------------------------- //

/** the bot client instance */
export let client: Client;

// -------------------------------------------------------------- //

/**
 * Gets the current config values
 */
export function loadConfig(): Config {
    const resolved = path.resolve('./config.json');

    const content = fs.readFileSync(resolved, { encoding: 'utf8' });
    return JSON.parse(content) as Config;
}

/**
 * Handles creating a client object
 */
export function createClient(): void {
    const presenceData: PresenceData = {
        status: 'online',
        activity: {
            type: 'WATCHING',
            name: 'BINUS Class Schedules'
        }
    };

    client = new Client({ presence: presenceData });
}

// -------------------------------------------------------------- //

export * from './binmay/binmay';
export * from './binmay/onlinejudge';
export * from './binmay/schedules';
export * from './managers/manager';
export * from './others/database';
export * from './others/times';
export * from './types';

