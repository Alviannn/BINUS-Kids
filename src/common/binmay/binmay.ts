/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */

import cheerio from 'cheerio';
import { execall } from 'execall2';
import fetch from 'node-fetch';
import { Status, Notification, cookies } from '../commons';
import { Assignment } from '../types';

export namespace binusmaya {

    const BINMAY_URL = 'https://binusmaya.binus.ac.id';

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Origin': BINMAY_URL,
        'Referer': BINMAY_URL + '/newStudent/',
        'Cookie': ''
    };

    /** 
     * Login to binusmaya 
     */
    export async function login(): Promise<Status> {
        try {
            const loginResp = await fetch(BINMAY_URL + '/login', {
                headers,
                method: 'GET'
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
        } catch (e) {
            console.log('ERROR: Logging in to binusmaya!');
            return Status.FAILED;
        }
    }

    /** 
     * Logout from binusmaya
     */
    export async function logout(): Promise<Status> {
        try {
            await fetch(BINMAY_URL + 'services/ci/index.php/login/logout', {
                method: 'GET',
                headers
            });
            await fetch(BINMAY_URL + 'simplesaml/module.php/core/as_logout.php?AuthId=default-sp&ReturnTo=https%3A%2F%2Fbinusmaya.binus.ac.id%2Flogin', {
                method: 'GET',
                headers
            });

            headers['Cookie'] = '';
            return Status.SUCCESS;
        } catch (e) {
            console.log('ERROR: Logging out from binusmaya!');
            return Status.FAILED;
        }
    }

    /** 
     * Determines if we still have the session to binusmaya or not 
     */
    export async function hasSession(): Promise<boolean> {
        const resp = await fetch(BINMAY_URL + '/services/ci/index.php/staff/init/check_session', {
            method: 'GET',
            headers
        });

        try {
            const data: Record<string, number> = JSON.parse(await resp.text());
            return data['SessionStatus'] === 1;
        } catch (e) {
            console.log('ERROR: Checking binusmaya session!');
            return false;
        }
    }

    /**
     * Attempts to finish the assignment object
     */
    async function _fillAssignment(asg: Assignment): Promise<boolean> {
        try {
            const resp = await fetch(
                BINMAY_URL + '/services/ci/index.php/student/classes/assignmentType/COMP6649/017465/2010/LEC/20639/01',
                {
                    headers,
                    method: 'GET'
                }
            );

            const list: Record<string, unknown>[] = await resp.json();
            const data = list[list.length - 1];

            const rawTime = String(data['deadlineTime']).split(':');
            rawTime.pop();

            asg.title = String(data['Title']);
            asg.deadline = String(data['deadlineDuration']) + ' - ' + rawTime.join(':');

            return true;
        } catch (e) {
            return false;
        }
    }

    /** 
     * Gets all binusmaya (unread) assignments 
     */
    export async function getUnreadAssignments(): Promise<Assignment[]> {
        const resp = await fetch(BINMAY_URL + '/services/ci/index.php/notification/getUnreadNotificationList', {
            method: 'POST',
            headers
        });

        try {
            const dataList: Record<string, unknown>[] = await resp.json();
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
                    deadline: '-'
                };

                const result = await _fillAssignment(asg);
                if (result)
                    asgList.push(asg);
            }

            return asgList;
        } catch (e) {
            console.log('ERROR: Reading unread assignments!');
            return [];
        }
    }

    /** 
     * Gets all binusmaya (unread) forums 
     */
    export async function getUnreadForums(): Promise<Notification[]> {
        const resp = await fetch(BINMAY_URL + '/services/ci/index.php/notification/getUnreadNotificationList', {
            method: 'POST',
            headers
        });

        try {
            const dataList: any[] = await resp.json();
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
        } catch (e) {
            console.log('ERROR: Reading unread forums!');
            return [];
        }
    }

    /** 
     * Reads a notification 
     */
    export async function readNotification(notifId: string): Promise<Status> {
        try {
            await fetch(BINMAY_URL + '/services/ci/index.php/notification/readNotification', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 'NotificationID': notifId })
            });

            return Status.SUCCESS;
        } catch (e) {
            console.log('ERROR: Reading notifications!');
            return Status.FAILED;
        }
    }

}