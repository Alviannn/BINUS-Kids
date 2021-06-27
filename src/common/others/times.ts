import { DateTime } from 'luxon';

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