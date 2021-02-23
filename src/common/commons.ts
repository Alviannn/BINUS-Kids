/* eslint-disable @typescript-eslint/no-var-requires */

import { Config } from './types';
import { PresenceData, Client } from 'discord.js';
import path from 'path';

// -------------------------------------------------------------- //

export let client: Client;

// -------------------------------------------------------------- //

/**
 * Gets the current config values
 */
export function loadConfig(): Config {
    const resolved = path.resolve('./config.json');
    return require(resolved) as Config;
}

/** Handles creating a client object */
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

export * from './types';

export * from './others/database';
export * from './others/times';

export * from './managers/manager';

export * from './binmay/schedules';
export * from './binmay/binmay';
export * from './binmay/onlinejudge';