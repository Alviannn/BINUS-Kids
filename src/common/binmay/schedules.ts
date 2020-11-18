/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-inner-declarations */

import got from 'got';
import { CookieJar } from 'tough-cookie';
import { ClientUser, MessageEmbed } from 'discord.js';
import { database, Meeting, Schedule, ScheduleResult, times } from '../commons';

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
        const { schedules_db, lastFetchSchedule } = database;

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

        lastFetchSchedule(date);
    }

    /**
     * Reads the schedules from the database
     */
    function _readSchedules(): ScheduleResult {
        const { schedules_db, lastFetchSchedule } = database;

        const schedList: Schedule[] = [];
        const tempList = schedules_db.prepare('SELECT * FROM schedules;').all();

        for (const temp of tempList) {
            if (temp['meeting'])
                temp['meeting'] = JSON.parse(temp['meeting']) as Meeting;

            schedList.push(temp as Schedule);
        }

        return { last_fetch: lastFetchSchedule(), schedules: schedList };
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