import sqlite from 'better-sqlite3';
import fs from 'fs';

/**
 * The common database utilities
 */
export namespace database {

    export let socs_db: sqlite.Database;
    export let schedules_db: sqlite.Database;

    /** Sets up the necessary databases */
    export function setupdb(): void {
        const dirPath = './databases';

        if (!fs.existsSync(dirPath))
            fs.mkdirSync(dirPath);

        socs_db = sqlite(dirPath + '/socs.db');
        schedules_db = sqlite(dirPath + '/schedules.db');

        socs_db.prepare('CREATE TABLE IF NOT EXISTS socs (id VARCHAR(128) NOT NULL, title VARCHAR(128) NOT NULL);')
            .run();
        socs_db.prepare('CREATE TABLE IF NOT EXISTS last_fetch (last_date VARCHAR(64) NOT NULL);')
            .run();

        schedules_db.prepare('CREATE TABLE IF NOT EXISTS schedules ('
            + 'date VARCHAR(64) NOT NULL, '
            + 'time VARCHAR(64) NOT NULL, '

            + 'code VARCHAR(64) NOT NULL, '
            + 'delivery VARCHAR(64) NOT NULL, '
            + 'course VARCHAR(64) NOT NULL, '

            + 'week INT NOT NULL, '
            + 'session INT NOT NULL, '

            // the meeting will be in form of json
            + 'meeting VARCHAR(512)'
            + ');').run();
        schedules_db.prepare('CREATE TABLE IF NOT EXISTS auto_update (last_date VARCHAR(64) NOT NULL);')
            .run();
        schedules_db.prepare('CREATE TABLE IF NOT EXISTS last_fetch (last_date VARCHAR(64) NOT NULL);')
            .run();
    }

    /** Closes all connected databases */
    export function closeAll(): void {
        try {
            socs_db.close();
        } catch (_) {
            // do nothing
        }

        try {
            schedules_db.close();
        } catch (_) {
            // do nothing
        }
    }

    export function lastFetchSocs(date: string | null = null): string | null {
        if (!date) {
            const data = socs_db.prepare('SELECT * FROM last_fetch;').get();
            return !data ? null : data['last_date'];
        } else {
            if (!lastFetchSocs())
                socs_db.prepare('INSERT INTO last_fetch (last_date) VALUES (?);').run(date);
            else
                socs_db.prepare('UPDATE last_fetch SET last_date = ?;').run(date);

            return date;
        }
    }

    export function lastFetchSchedule(date: string | null = null): string | null {
        if (!date) {
            const data = schedules_db.prepare('SELECT * FROM last_fetch;').get();
            return !data ? null : data['last_date'];
        } else {
            if (!lastFetchSchedule())
                schedules_db.prepare('INSERT INTO last_fetch (last_date) VALUES (?);').run(date);
            else
                schedules_db.prepare('UPDATE last_fetch SET last_date = ?;').run(date);

            return date;
        }
    }

    export function lastAutoUpdateSchedule(date: string | null = null): string | null {
        if (!date) {
            const data = schedules_db.prepare('SELECT * FROM auto_update;').get();
            return !data ? null : data['last_date'];
        } else {
            if (!lastAutoUpdateSchedule())
                schedules_db.prepare('INSERT INTO auto_update (last_date) VALUES (?);').run(date);
            else
                schedules_db.prepare('UPDATE auto_update SET last_date = ?;').run(date);

            return date;
        }
    }

}