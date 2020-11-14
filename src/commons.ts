/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-var-requires */

import { Client, ClientUser, Message, MessageEmbed, PresenceData } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { execall } from 'execall2';

import got from 'got';
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

export class Meeting {

    public readonly id: string;
    public readonly password: string;
    public readonly url: string;

    constructor(id: string, password: string, url: string) {
        this.id = id;
        this.password = password;
        this.url = url;
    }

}

export class Schedule {

    public readonly date: string;
    public readonly time: string;
    public readonly code: string;
    public readonly delivery: string;
    public readonly course: string;
    public readonly week: number;
    public readonly session: number;
    public readonly meeting: Meeting | null;

    constructor(
        date: string, time: string,
        code: string, delivery: string, course: string,
        week: number, session: number,
        meeting: Meeting | null
    ) {
        this.date = date;
        this.time = time;
        this.code = code;
        this.delivery = delivery;
        this.course = course;
        this.week = week;
        this.session = session;
        this.meeting = meeting;
    }

}

export type NullableCommand = Command | null;

export type ScheduleResult = {
    /** Last timestamp where the program saved the schedules */
    last_save: number,
    /** All of the schedules */
    schedules: Schedule[]
};

export type Config = {
    prefix: string,
    schedules_channel: string
};

export let client: Client;

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

/** 
 * The common times utilities 
 */
export namespace times {

    /** Gets the current asia date */
    export function asiaDate(): DateTime {
        return DateTime.utc().setZone('Asia/Bangkok', { keepLocalTime: false });
    }

    /** Creates a date instance from millis (for Asia timezone) */
    export function fromMillisAsia(millis: number): DateTime {
        return DateTime.fromMillis(millis, { zone: 'Asia/Bangkok', setZone: true });
    }

}

/** 
 * The common string utilities 
 */
export namespace utils {

    /** Capitalizes a word */
    export function capitalize(text: string): string {
        return text[0].toUpperCase() + text.substring(1);
    }

    /** 
     * Copies map entires to another map
     * 
     * @param src the source map
     * @param dest the destination map
     */
    export function copyMap(src: Map<any, any>, dest: Map<any, any>) {
        for (const [key, value] of src)
            dest.set(key, value);
    }

}

/** 
 * The common files utilities 
 */
export namespace files {

    /**
     * Reads a JSON file and parses it
     * 
     * @param {fs.PathLike} filePath the file path
     * @returns {object} the JSON object
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function readJson(filePath: fs.PathLike): any | null {
        if (!fs.existsSync(filePath))
            return null;

        try {
            const rawJson = fs.readFileSync(filePath, { encoding: 'utf-8' });
            return JSON.parse(rawJson);
        } catch (_) {
            return null;
        }
    }

    /**
     * Saves an object as a JSON file on a file
     * 
     * @param filePath the file path
     * @param obj the object 
     */
    export function saveJson(filePath: fs.PathLike, obj: any): void {
        const json = JSON.stringify(obj, null, 4);
        fs.writeFileSync(filePath, json, { encoding: 'utf-8' });
    }

}

/**
 * The common schedules utilities
 */
export namespace schedules {

    /** Handles parsing a schedule class */
    export function parseSchedule(data: any): Schedule {
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
            meeting = new Meeting(meetingId, meetingPassword, meetingUrl);
        if (String(data['CourseCode']).includes('EESE'))
            meeting = null;

        return new Schedule(date, time, code, delivery, course, week, session, meeting);
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
     * Handles saving the schedules
     * 
     * @param schedules the schedules
     */
    export function saveSchedules(schedules: Schedule[]): void {
        const finalData: ScheduleResult = {
            last_save: times.asiaDate().toMillis(),
            schedules: schedules
        };

        const dumped = JSON.stringify(finalData, null, 4);
        fs.writeFileSync('./schedules.json', dumped, { encoding: 'utf8' });
    }

    /**
     * Reads the schedules from the saved file
     */
    export function _readSchedules(): ScheduleResult | null {
        const rawData = files.readJson('./schedules.json');
        if (!rawData)
            return null;

        try {
            const schedList: Schedule[] = [];

            for (const data of rawData.schedules) {
                const sched = new Schedule('', '', '', '', '', 0, 0, null);
                Object.assign(sched, data);
                schedList.push(sched);
            }

            return { last_save: Number(rawData.last_save), schedules: schedList };
        } catch (_) {
            return null;
        }
    }

    /**
     * Fetches the schedules from the myclass binus website
     */
    export async function _fetchSchedules(): Promise<Schedule[]> {
        const cookieJar = new CookieJar();

        const session = got.extend({
            cookieJar,
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

        saveSchedules(schedules);
        return schedules;
    }

    /** 
     * Handles grabbing the schedules 
     */
    export async function getSchedules(): Promise<Schedule[]> {
        const result = _readSchedules();
        if (!result)
            return await _fetchSchedules();

        const dateFormat = 'dd MMM yyyy';
        const currentDate = times.asiaDate().toFormat(dateFormat);
        const lastSaveDate = times.fromMillisAsia(result.last_save).toFormat(dateFormat);

        if (lastSaveDate !== currentDate)
            return await _fetchSchedules();

        return result.schedules;
    }

}

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

export namespace binusmaya {

    const URL = 'https://binusmaya.binus.ac.id';

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Origin': URL,
        'Referer': URL + '/newStudent/',
        'Cookie': ''
    };

    enum Status { SUCCESS, FAILED }

    /** Login to binusmaya */
    export async function login(): Promise<Status> {
        const loginResp = await fetch(URL + '/login', {
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
        const loaderResp = await fetch(URL + loaderPage, {
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

        const lastResp = await fetch(URL + '/login/sys_login.php', {
            method: 'POST', headers, body: params
        });

        if (!lastResp.url.toLowerCase().includes('newstudent'))
            return Status.FAILED;

        return Status.SUCCESS;
    }

    /** Logout from binusmaya */
    export async function logout(): Promise<Status> {
        try {
            await fetch(URL + 'services/ci/index.php/login/logout');
            await fetch(URL + 'simplesaml/module.php/core/as_logout.php?AuthId=default-sp&ReturnTo=https%3A%2F%2Fbinusmaya.binus.ac.id%2Flogin');

            return Status.SUCCESS;
        } catch (_) {
            return Status.FAILED;
        }
    }

    export async function getAssignments(): Promise<Status> {
        return Status.FAILED;
    }

}