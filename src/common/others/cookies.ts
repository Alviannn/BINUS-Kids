import { execall } from 'execall2';

export namespace cookies {

    /** Converts a raw cookies to cookies (in map) */
    export function listToCookies(raw: string[]): Map<string, string> {
        const cookiesMap = new Map<string, string>();
        const rawBetter = raw.join('; ');

        const matches = execall(/(PHPSESSID|_SID_BinusLogin_)=([^;\s]+)/g, rawBetter);
        matches.forEach(match => cookiesMap.set(match[1], match[2]));

        return cookiesMap;
    }

    /** Converts a cookies to string */
    export function cookiesToString(cookies: Map<string, string>): string {
        const tempList: string[] = [];

        for (const [key, value] of cookies)
            tempList.push(`${key}=${value}`);

        return tempList.join('; ');
    }

}