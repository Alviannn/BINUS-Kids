/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */

import cheerio from 'cheerio';
import { execall } from 'execall2';
import { Notification } from '../commons';
import { Assignment } from '../types';
import { HttpClient } from '../extrafetch';

export namespace binusmaya {

    const BINMAY_URL = 'https://binusmaya.binus.ac.id';

    const client = new HttpClient(true, {
        'User-Agent': 'Mozilla/5.0',
        'Origin': BINMAY_URL,
        'Referer': BINMAY_URL + '/newStudent/'
    });

    /** 
     * Login to binusmaya 
     */
    export async function login(): Promise<boolean> {
        try {
            client.cookies.clear();

            const loginResp = await client.get(`${BINMAY_URL}/login`);
            const content = loginResp.content;

            const $ = cheerio.load(content);

            const userId = $('input[placeholder="Username"]').attr('name')!;
            const passId = $('input[placeholder="Password"]').attr('name')!;
            const submId = $('input[type="submit"]').attr('name')!;

            const loaderUrl = cheerio($('script')[4]).attr('src')!;
            const loaderResp = await client.get(BINMAY_URL + loaderUrl);

            const regex = /name="([^"]+)" value="([^"]+)"/g;
            const matches = execall(regex, loaderResp.content);

            const csrf_one = [matches[0][1], matches[0][2]];
            const csrf_two = [matches[1][1], matches[1][2]];

            const lastResp = await client.post(`${BINMAY_URL}/login/sys_login.php`, {
                bodyValue: {
                    query: {
                        [userId]: process.env.BINUS_USER!,
                        [passId]: process.env.BINUS_PASS!,
                        [submId]: 'Login',
                        [csrf_one[0]]: csrf_one[1],
                        [csrf_two[0]]: csrf_two[1],
                    }
                }
            });

            if (!lastResp.url.toLowerCase().includes('newstudent'))
                return false;

            return true;
        } catch (e) {
            console.log('[ERROR]: Logging in to binusmaya!');
            return false;
        }
    }

    /** 
     * Logout from binusmaya
     */
    export async function logout(): Promise<boolean> {
        try {
            await client.get(`${BINMAY_URL}/services/ci/index.php/login/logout`);
            await client.get(`${BINMAY_URL}/simplesaml/module.php/core/as_logout.php?AuthId=default-sp&ReturnTo=https%3A%2F%2Fbinusmaya.binus.ac.id%2Flogin`);

            client.cookies.clear();
            return true;
        } catch (_) {
            console.log('[ERROR]: Logging out from binusmaya!');
            return false;
        }
    }

    /** 
     * Determines if we still have the session to binusmaya or not 
     */
    export async function hasSession(): Promise<boolean> {
        const resp = await client.get(`${BINMAY_URL}/services/ci/index.php/staff/init/check_session`);

        try {
            const data = resp.json as Record<string, number>;
            return data['SessionStatus'] === 1;
        } catch (_) {
            console.log('[ERROR]: Checking binusmaya session!');
            return false;
        }
    }

    /**
     * Attempts to finish the assignment object
     */
    async function _fillAssignment(asg: Assignment): Promise<boolean> {
        try {
            const resp = await client.get(`${BINMAY_URL}/services/ci/index.php/student/classes/assignmentType/${asg.pathId}/01`);

            const list = resp.json as Record<string, unknown>[];
            const data = list[list.length - 1];

            const rawTime = String(data['deadlineTime']).split(':');
            rawTime.pop();

            asg.title = String(data['Title']);
            asg.deadline = String(data['deadlineDuration']) + ' - ' + rawTime.join(':');

            return true;
        } catch (_) {
            return false;
        }
    }

    /** 
     * Gets all binusmaya (unread) assignments 
     */
    export async function getUnreadAssignments(): Promise<Assignment[]> {
        const resp = await client.post(`${BINMAY_URL}/services/ci/index.php/notification/getUnreadNotificationList`);

        try {
            const dataList = resp.json as Record<string, unknown>[];
            const asgList: Assignment[] = [];

            for (const data of dataList) {
                if (data['CategoryID'] !== 'ASG')
                    continue;

                const asg: Assignment = {
                    id: String(data['NotificationID']),
                    title: '-',
                    sender: String(data['From']),
                    link: BINMAY_URL + '/' + data['Path'] + data['LinkID'],
                    time: String(data['NotificationTime']).split(' , ').join(' - '),
                    deadline: '-',
                    pathId: String(data['LinkID'])
                };

                const result = await _fillAssignment(asg);
                if (result)
                    asgList.push(asg);
            }

            return asgList;
        } catch (_) {
            console.log('[ERROR]: Failed to read all unread assignments!');
            return [];
        }
    }

    /** 
     * Gets all binusmaya (unread) forums 
     */
    export async function getUnreadForums(): Promise<Notification[]> {
        const resp = await client.post(`${BINMAY_URL}/services/ci/index.php/notification/getUnreadNotificationList`);

        try {
            const dataList = resp.json as any[];
            const notifList: Notification[] = [];

            for (const data of dataList) {
                if (data['CategoryID'] !== 'FRM')
                    continue;

                const notif: Notification = {
                    id: data['NotificationID'],
                    link: BINMAY_URL + '/' + data['Path'] + data['LinkID'] + '?id=1',
                    sender: data['From'] ? data['From'] : 'Unknown',
                    title: data['Title'],
                    time: String(data['NotificationTime']).split(' , ').join(' - ')
                };

                notifList.push(notif);
            }

            return notifList;
        } catch (_) {
            console.log('[ERROR]: Failed to read all unread forums!');
            return [];
        }
    }

    /** 
     * Reads a notification 
     */
    export async function readNotification(notifId: string): Promise<boolean> {
        client.headers['Content-Type'] = 'application/json';

        try {
            await client.post(`${BINMAY_URL}/services/ci/index.php/notification/readNotification`, {
                bodyValue: {
                    json: { 'NotificationID': notifId }
                }
            });

            delete client.headers['Content-Type'];
            return true;
        } catch (_) {
            console.log('[ERROR]: Failed to set read a notification!');
            delete client.headers['Content-Type'];
            return false;
        }
    }

}