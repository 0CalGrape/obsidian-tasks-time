import type { Moment } from 'moment';
import { getSettings } from '../Config/Settings';

export const defaultDailyStartTime = '04:00';

const dailyStartTimeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function isValidDailyStartTime(value: string): boolean {
    return dailyStartTimeRegex.test(value);
}

function parseDailyStartTime(value: string) {
    const match = value.match(dailyStartTimeRegex);
    if (!match) {
        return { hour: 4, minute: 0, second: 0 };
    }

    return {
        hour: Number(match[1]),
        minute: Number(match[2]),
        second: Number(match[3] ?? 0),
    };
}

export function getDailyStartTime(): string {
    const dailyStartTime = getSettings().dailyStartTime;
    return isValidDailyStartTime(dailyStartTime) ? dailyStartTime : defaultDailyStartTime;
}

export function applyDailyStartToMoment(date: Moment, dailyStartTime: string = getDailyStartTime()): Moment {
    const { hour, minute, second } = parseDailyStartTime(dailyStartTime);
    const startOfBusinessDay = date.clone().startOf('day').hour(hour).minute(minute).second(second).millisecond(0);

    if (date.isBefore(startOfBusinessDay)) {
        return date.clone().subtract(1, 'day');
    }

    return date.clone();
}

export function getCurrentDateWithDailyStart(): Moment {
    return applyDailyStartToMoment(window.moment());
}