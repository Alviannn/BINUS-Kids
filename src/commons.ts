/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-var-requires */

import { Client, ClientUser, Message, MessageEmbed, PresenceData } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { execall } from 'execall2';
import sqlite from 'better-sqlite3';

import got, { Got } from 'got';
import { CookieJar } from 'tough-cookie';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

export abstract class Command {

    /** Command name */
    public readonly name: string;
    /** Command aliases */
    public readonly aliases: string[];
    /** command descriptions */
    public readonly desc: string;

    constructor(name: string, aliases: string[] | null, desc: string) {
        this.name = name;
        this.aliases = aliases ? aliases : [];
        this.desc = desc;
    }

    /**
     * Executes the command asynchronously
     * 
     * @param msg the message instance
     * @param args the arguments
     */
    public abstract execute(msg: Message, args: string[]): Promise<any>

}

export type Meeting = {
    id: string,
    password: string,
    url: string
}

export type Schedule = {
    date: string,
    time: string,
    code: string,
    delivery: string,
    course: string,
    week: number,
    session: number,
    meeting: Meeting | null
}

export type NullableCommand = Command | null;

export type ScheduleResult = {
    /** Last fetch date */
    last_fetch: string | null,
    /** All of the schedules */
    schedules: Schedule[]
};

export type Config = {
    prefix: string,
    schedules_channel: string
};

export let client: Client;

export enum Status { SUCCESS, FAILED }

/**
 * Gets the current config values
 */
export function getConfig(): Config {
    const resolved = path.resolve('./config.json');
    return require(resolved) as Config;
}

/** Handles creating a client object */
export function createClient(): void {
    const presenceData: PresenceData = {
        status: 'online',
        activity: {
            type: 'WATCHING',
            name: 'LC01 schedules'
        }
    };

    client = new Client({ presence: presenceData });
}

// ------------------------------------------------------------------------------------------------------------------------------------------------ //

/** 
 * The common database utilities 
 */
export namespace database {

    export let socs_db: sqlite.Database;
    export let schedules_db: sqlite.Database;

    /** Sets up the necessary databases */
    export function setupdb() {
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
    export function closeAll() {
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

    export function getLastFetchSocs(): string | null {
        const data = socs_db.prepare('SELECT * FROM last_fetch;').get();
        return !data ? null : data['last_date'];
    }

    export function setLastFetchSocs(date: string): void {
        if (!date)
            return;

        if (!getLastFetchSocs())
            socs_db.prepare('INSERT INTO last_fetch (last_date) VALUES (?);').run(date);
        else
            socs_db.prepare('UPDATE last_fetch SET last_date = ? WHERE last_date = ?;').run(date, date);
    }

    export function getLastFetchSchedule(): string | null {
        const data = schedules_db.prepare('SELECT * FROM last_fetch;').get();
        return !data ? null : data['last_date'];
    }

    export function setLastFetchSchedule(date: string): void {
        if (!date)
            return;

        if (!getLastFetchSchedule())
            schedules_db.prepare('INSERT INTO last_fetch (last_date) VALUES (?);').run(date);
        else
            schedules_db.prepare('UPDATE last_fetch SET last_date = ? WHERE last_date = ?;').run(date, date);
    }

    export function getLastAutoUpdateSchedule(): string | null {
        const data = schedules_db.prepare('SELECT * FROM auto_update;').get();
        return !data ? null : data['last_date'];
    }

    export function setLastAutoUpdateSchedule(date: string): void {
        if (!date)
            return;

        if (!getLastAutoUpdateSchedule())
            schedules_db.prepare('INSERT INTO auto_update (last_date) VALUES (?);').run(date);
        else
            schedules_db.prepare('UPDATE auto_update SET last_date = ? WHERE last_date = ?;').run(date, date);
    }

}

// ------------------------------------------------------------------------------------------------------------------------------------------------ //

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
    export function loadCommands(dirPath: fs.PathLike): void {
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
    export function loadEvents(eventsPath: fs.PathLike) {
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

// ------------------------------------------------------------------------------------------------------------------------------------------------ //

/** 
 * The common times utilities 
 */
export namespace times {

    export const BINUS_DATE_FORMAT = 'dd MMM yyyy';

    /** Gets the current asia date */
    export function asiaDate(): DateTime {
        return DateTime.utc().setZone('Asia/Bangkok', { keepLocalTime: false });
    }

    /** Creates a date instance from millis (for Asia timezone) */
    export function fromMillisAsia(millis: number): DateTime {
        return DateTime.fromMillis(millis, { zone: 'Asia/Bangkok', setZone: true });
    }

}

// ------------------------------------------------------------------------------------------------------------------------------------------------ //

/**
 * The common schedules utilities
 */
export namespace schedules {

    /** Handles parsing a schedule class */
    export function parseSchedule(data: Record<string, unknown>): Schedule {
        const date = String(data['DisplayStartDate']);
        const time = `${data['StartTime']} - ${data['EndTime']}`;

        const code = String(data['ClassCode']);
        const delivery = String(data['DeliveryMode']);
        const course = `${data['CourseCode']} - ${data['CourseTitleEn']}`;

        const week = Number(data['WeekSession']);
        const session = Number(data['CourseSessionNumber']);

        const meetingUrl = String(data['MeetingUrl']);
        const meetingId = String(data['MeetingId']);
        const meetingPassword = String(data['MeetingPassword']);

        let meeting: Meeting | null = null;

        if (meetingUrl !== '-')
            meeting = { id: meetingId, password: meetingPassword, url: meetingUrl };
        if (String(data['CourseCode']).includes('EESE'))
            meeting = null;

        return { date, time, code, delivery, course, week, session, meeting };
    }

    /** Handles formatting a schedule to an embed */
    export function formatEmbedSchedule(botUser: ClientUser, schedule: Schedule | null): MessageEmbed {
        if (!schedule)
            throw Error('Invalid schedule object!');

        const icon = botUser.displayAvatarURL();
        const embed = new MessageEmbed()
            .setAuthor(botUser.username, icon)
            .setThumbnail(icon)
            .setColor('RANDOM')

            .addField('**Date**', schedule.date, true)
            .addField('**Time**', schedule.time, true)
            .addField('**Class Code**', schedule.code)
            .addField('**Delivery**', schedule.delivery)
            .addField('**Course**', schedule.course)
            .addField('**Week**', schedule.week, true)
            .addField('**Session**', schedule.session, true);

        const { meeting } = schedule;
        if (meeting)
            embed.addField('**Meeting**',
                `
                **ID**: ${meeting.id}
                **Password**: ${meeting.password}
                **URL**: [Click here](${meeting.url})
                `
            );

        return embed;
    }

    /**
     * Handles saving the schedules to the database
     */
    function _saveSchedules(schedList: Schedule[], date: string) {
        const { schedules_db, setLastFetchSchedule } = database;

        schedules_db.prepare('DELETE FROM schedules;').run();
        schedList.forEach((sched) => {
            schedules_db.prepare(
                'INSERT INTO schedules '
                + '(date, time, code, delivery, course, week, session, meeting)'
                + ' VALUES '
                + '(?, ?, ?, ?, ?, ?, ?, ?);'
            ).run(
                sched.date,
                sched.time,

                sched.code,
                sched.delivery,
                sched.course,

                sched.week,
                sched.session,

                sched.meeting ? JSON.stringify(sched.meeting) : null
            );
        });

        setLastFetchSchedule(date);
    }

    /**
     * Reads the schedules from the database
     */
    function _readSchedules(): ScheduleResult {
        const { schedules_db, getLastFetchSchedule } = database;

        const schedList: Schedule[] = [];
        const tempList = schedules_db.prepare('SELECT * FROM schedules;').all();

        for (const temp of tempList) {
            if (temp['meeting'])
                temp['meeting'] = JSON.parse(temp['meeting']) as Meeting;

            schedList.push(temp as Schedule);
        }

        return { last_fetch: getLastFetchSchedule(), schedules: schedList };
    }

    /**
     * Fetches the schedules from the myclass binus website
     */
    async function _fetchSchedules(): Promise<Schedule[]> {
        const session = got.extend({
            cookieJar: new CookieJar(),
            headers: { 'user-agent': 'Mozilla/5.0' }
        });

        const schedules: Schedule[] = [];

        const LOGIN_URL = 'https://myclass.apps.binus.ac.id/Auth/Login';
        const LOGOUT_URL = 'https://myclass.apps.binus.ac.id/Auth/Logout';
        const CLASSES_URL = 'https://myclass.apps.binus.ac.id/Home/GetViconSchedule';

        try {
            const loginResp = await session.post(LOGIN_URL, {
                json: {
                    Username: process.env.BINUS_USER,
                    Password: process.env.BINUS_PASS,
                    btnSubmit: true
                }
            });

            let jsonBody: any;
            try {
                jsonBody = JSON.parse(loginResp.body);
            } catch (_) {
                throw Error('Failed to login to myclass binusmaya!');
            }

            if (!jsonBody['Status'])
                throw Error('Failed to login to myclass binusmaya!');

            const classesResp = await session.get(CLASSES_URL);
            const rawData = JSON.parse(classesResp.body);

            if (!(rawData instanceof Array))
                throw Error('Failed to fetch schedules!');

            for (const data of rawData) {
                const schedule: Schedule = parseSchedule(data);
                schedules.push(schedule);
            }
        } catch (error) {
            console.error(error);
        }

        try {
            await session.get(LOGOUT_URL);
        } catch (error) {
            // program fails to logout, who cares
        }

        const currentDate = times.asiaDate().toFormat(times.BINUS_DATE_FORMAT);
        _saveSchedules(schedules, currentDate);

        return schedules;
    }

    /** 
     * Handles grabbing the schedules 
     */
    export async function getSchedules(): Promise<Schedule[]> {
        const result = _readSchedules();
        if (!result)
            return await _fetchSchedules();

        const currentDate = times.asiaDate().toFormat(times.BINUS_DATE_FORMAT);
        const lastSaveDate = result.last_fetch;

        if (lastSaveDate !== currentDate)
            return await _fetchSchedules();

        return result.schedules;
    }

}

// ------------------------------------------------------------------------------------------------------------------------------------------------ //

export namespace cookies {

    /** Converts a raw cookies to cookies (in map) */
    export function listToCookies(raw: string[]) {
        const cookiesMap = new Map<string, string>();
        const rawBetter = raw.join('; ');

        const matches = execall(/(PHPSESSID|_SID_BinusLogin_)=([^;\s]+)/g, rawBetter);
        matches.forEach(match => cookiesMap.set(match[1], match[2]));

        return cookiesMap;
    }

    /** Converts a cookies to string */
    export function cookiesToString(cookies: Map<string, string>) {
        const tempList: string[] = [];

        for (const [key, value] of cookies)
            tempList.push(`${key}=${value}`);

        return tempList.join('; ');
    }

}

// ------------------------------------------------------------------------------------------------------------------------------------------------ //

export namespace binusmaya {

    const BINMAY_URL = 'https://binusmaya.binus.ac.id';

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Origin': BINMAY_URL,
        'Referer': BINMAY_URL + '/newStudent/',
        'Cookie': ''
    };

    /** Login to binusmaya */
    export async function login(): Promise<Status> {
        const loginResp = await fetch(BINMAY_URL + '/login', {
            headers, method: 'GET'
        });
        const content = await loginResp.text();

        const cookieMap = cookies.listToCookies(loginResp.headers.raw()['set-cookie']);
        headers['Cookie'] = cookies.cookiesToString(cookieMap);

        const $ = cheerio.load(content);
        const inputList = $('input').toArray();

        const userId = inputList[0].attribs.name;
        const passId = inputList[1].attribs.name;
        const submId = inputList[2].attribs.name;

        const loaderPage = $('script').toArray()[4].attribs.src.substr(2);
        const loaderResp = await fetch(BINMAY_URL + loaderPage, {
            method: 'GET', headers
        });

        const regex = /name="([^"]+)" value="([^"]+)"/g;
        const matches = execall(regex, await loaderResp.text());

        const csrf_one = [matches[0][1], matches[0][2]];
        const csrf_two = [matches[1][1], matches[1][2]];

        const params = new URLSearchParams();
        params.append(userId, process.env.BINUS_USER!);
        params.append(passId, process.env.BINUS_PASS!);
        params.append(submId, 'Login');
        params.append(csrf_one[0], csrf_one[1]);
        params.append(csrf_two[0], csrf_two[1]);

        const lastResp = await fetch(BINMAY_URL + '/login/sys_login.php', {
            method: 'POST', headers, body: params
        });

        if (!lastResp.url.toLowerCase().includes('newstudent'))
            return Status.FAILED;

        return Status.SUCCESS;
    }

    /** Logout from binusmaya */
    export async function logout(): Promise<Status> {
        try {
            await fetch(BINMAY_URL + 'services/ci/index.php/login/logout', { method: 'GET', headers });
            await fetch(BINMAY_URL + 'simplesaml/module.php/core/as_logout.php?AuthId=default-sp&ReturnTo=https%3A%2F%2Fbinusmaya.binus.ac.id%2Flogin', { method: 'GET', headers });

            headers['Cookie'] = '';

            return Status.SUCCESS;
        } catch (_) {
            return Status.FAILED;
        }
    }

    export async function getAssignments(): Promise<Status> {
        return Status.FAILED;
    }

}

// ------------------------------------------------------------------------------------------------------------------------------------------------ //

export namespace onlinejudge {

    const SOCS_URL = 'https://socs1.binus.ac.id/';
    let session: Got | null = null;

    /** Resets the SOCS session */
    export function _resetSession() {
        session = got.extend({
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Host': 'socs1.binus.ac.id',
                'Origin': SOCS_URL,
                'Referer': SOCS_URL + '/quiz/team/'
            },
            cookieJar: new CookieJar()
        });
    }

    /** Login to the SOCS online judge */
    async function login(): Promise<Status> {
        if (!session)
            _resetSession();

        await session!.post(SOCS_URL + '/quiz/team/index.php', {
            form: {
                login: process.env.BINUS_USER + '@binus.ac.id',
                passwd: process.env.BINUS_PASS,
                cmd: 'login'
            },
            // it keeps redirecting us infinitely
            // so disabling it and manually redirecting ourself is better
            followRedirect: false
        });

        const resp = await session!.get(SOCS_URL + '/quiz/team');
        const $ = cheerio.load(resp.body);

        try {
            const result = $('div[id="username"]').first();
            if (!result || !result.text().includes('logged in'))
                throw Error();

            return Status.SUCCESS;
        } catch (_) {
            return Status.FAILED;
        }
    }

    /** Logout from the SOCS online judge */
    async function logout(): Promise<Status> {
        try {
            await session!.get(SOCS_URL + 'quiz/auth/logout.php');
            _resetSession();

            return Status.SUCCESS;
        } catch (_) {
            return Status.FAILED;
        }
    }

    export async function getContests(): Promise<void> {
        await login();
        await logout();
    }

}