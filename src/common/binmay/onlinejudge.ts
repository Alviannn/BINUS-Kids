/* eslint-disable no-inner-declarations */

import cheerio from 'cheerio';
import got, { Got } from 'got';
import { CookieJar } from 'tough-cookie';
import { database, times } from '../commons';

export namespace onlinejudge {

    const SOCS_URL = 'https://socs1.binus.ac.id';
    let session: Got | null = null;

    type Result = {
        status: boolean,
        contests: string[]
    }

    /** Resets the SOCS session */
    function _resetSession() {
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
    async function login(): Promise<boolean> {
        try {
            _resetSession();

            await session!.post(`${SOCS_URL}/quiz/team/index.php`, {
                form: {
                    login: process.env.BINUS_USER + '@binus.ac.id',
                    passwd: process.env.BINUS_PASS,
                    cmd: 'login'
                },
                // it keeps redirecting us infinitely
                // so disabling it and manually redirecting ourself is better
                followRedirect: false
            });

            const resp = await session!.get(SOCS_URL + '/quiz/team/');
            const $ = cheerio.load(resp.body);

            const result = $('div[id="username"]').first();
            if (!result || !result.text().includes('logged in'))
                throw Error();

            return true;
        } catch (_) {
            return false;
        }
    }

    /** Logout from the SOCS online judge */
    async function logout(): Promise<boolean> {
        try {
            await session!.get(`${SOCS_URL}/quiz/auth/logout.php`);
            _resetSession();

            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Gets the list of contest from SOCS or online judge
     */
    export async function getContests(): Promise<Result> {
        const { socs_db, lastFetchSocs } = database;

        const currentDate = times.asiaDate().toFormat(times.BINUS_DATE_FORMAT);
        const contestList: string[] = [];

        // if the day where the last fetch to SOCS is the same as today
        // then use the data from the database
        if (currentDate === lastFetchSocs()) {
            const dataList = socs_db.prepare('SELECT title FROM socs;').all();
            for (const data of dataList)
                contestList.push(data['title']);

            return { status: true, contests: contestList };
        }

        const loginStatus = await login();
        // if the bot fails to login to the web, then cancel everything
        if (!loginStatus)
            return { status: loginStatus, contests: [] };

        const resp = await session!.get(SOCS_URL + '/quiz/team/');
        const $ = cheerio.load(resp.body);

        // scrapes the socs titles
        const rawContests = $('select[name="cid"][id="cid"]').first().children();

        // clears the data on the db
        socs_db.prepare('DELETE FROM socs;').run();

        // iterates over all contest html
        rawContests.each(function (this: unknown, _, elem) {
            elem = elem as cheerio.TagElement;

            const id = elem.attribs['value'];
            const title = $(this).text();

            contestList.push(title);
            socs_db.prepare('INSERT INTO socs (id, title) VALUES (?, ?);')
                .run(id, title);
        });

        // updates the last fetch
        lastFetchSocs(currentDate);

        await logout();
        return { status: true, contests: contestList };
    }

}