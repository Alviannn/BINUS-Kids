/* eslint-disable @typescript-eslint/no-explicit-any */

import cheerio from 'cheerio';
import { execall } from 'execall2';
import fetch from 'node-fetch';
import { Status, Notification, cookies } from '../commons';

export namespace binusmaya {

    const BINMAY_URL = 'https://binusmaya.binus.ac.id';

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Origin': BINMAY_URL,
        'Referer': BINMAY_URL + '/newStudent/',
        'Cookie': ''
    };

    type Result = {
        status: Status,
        notifs: Notification[]
    }

    /** Login to binusmaya */
    export async function login(): Promise<Status> {
        try {
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
        } catch (e) {
            console.log('ERROR: Logging in to binusmaya!');
            console.error(e); 
            return Status.FAILED;
        }
    }

    /** Logout from binusmaya */
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
            console.error(e);
            return Status.FAILED;
        }
    }

    /** Determines if we still have the session to binusmaya or not */
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
            console.error(e);
            return false;
        }
    }

    /** Gets all binusmaya (unread) assignments */
    export async function getUnreadAssignments(): Promise<Result> {
        const resp = await fetch(BINMAY_URL + '/services/ci/index.php/notification/getUnreadNotificationList', {
            method: 'POST',
            headers
        });

        try {
            const dataList: any[] = await resp.json();
            const notifList: Notification[] = [];

            for (const data of dataList) {
                if (data['CategoryID'] !== 'ASG')
                    continue;

                const notif: Notification = {
                    id: data['NotificationID'],
                    link: BINMAY_URL + '/' + data['Path'] + data['LinkID'],
                    sender: data['From'],
                    title: data['Title'],
                    time: String(data['NotificationTime']).split(' , ').join(' - ')
                };

                notifList.push(notif);
            }

            return {
                status: Status.SUCCESS,
                // only accept assignments
                notifs: notifList
            };
        } catch (e) {
            console.log('ERROR: Reading unread assignments!');
            console.error(e);
            return { status: Status.FAILED, notifs: [] };
        }
    }

    /** Reads a notification */
    export async function readNotification(notif: Notification): Promise<Status> {
        try {
            await fetch(BINMAY_URL + '/services/ci/index.php/notification/readNotification', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 'NotificationID': notif.id })
            });

            return Status.SUCCESS;
        } catch (e) {
            console.log('ERROR: Reading notifications!');
            console.error(e);
            return Status.FAILED;
        }
    }

}