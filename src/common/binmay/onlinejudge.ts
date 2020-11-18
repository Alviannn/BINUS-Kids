/* eslint-disable no-inner-declarations */

import got, { Got } from 'got';
import { CookieJar } from 'tough-cookie';
import cheerio from 'cheerio';
import { database, Status, times } from '../commons';

export namespace onlinejudge {

    const SOCS_URL = 'https://socs1.binus.ac.id';
    let session: Got | null = null;

    type Result = {
        status: Status,
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
    async function login(): Promise<Status> {
        try {
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

            const resp = await session!.get(SOCS_URL + '/quiz/team/');
            const $ = cheerio.load(resp.body);

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

            return { status: Status.SUCCESS, contests: contestList };
        }

        const loginStatus = await login();
        // if the bot fails to login to the web, then cancel everything
        if (loginStatus == Status.FAILED)
            return { status: loginStatus, contests: [] };

        const resp = await session!.get(SOCS_URL + '/quiz/team/');
        const $ = cheerio.load(resp.body);

        // scrapes the socs titles
        const rawContests = $('select[name="cid"][id="cid"]').first().children();

        // clears the data on the db
        socs_db.prepare('DELETE FROM socs;').run();

        // iterates over all contest html
        rawContests.each(function (this: unknown, _, elem) {
            const id = elem.attribs['value'];
            const title = $(this).text();

            contestList.push(title);
            socs_db.prepare('INSERT INTO socs (id, title) VALUES (?, ?);')
                .run(id, title);
        });

        // updates the last fetch
        lastFetchSocs(currentDate);

        await logout();
        return { status: Status.SUCCESS, contests: contestList };
    }

}