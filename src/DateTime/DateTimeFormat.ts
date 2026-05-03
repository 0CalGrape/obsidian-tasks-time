import type { Moment } from 'moment';
import { TaskRegularExpressions } from '../Task/TaskRegularExpressions';

const dateTimeWithoutSecondsFormat = 'YYYY-MM-DD HH:mm';
const supportedDateOrDateTimeFormats = [
    TaskRegularExpressions.dateTimeFormat,
    dateTimeWithoutSecondsFormat,
    TaskRegularExpressions.dateFormat,
];

export function hasTimeComponent(date: Moment): boolean {
    return date.hour() !== 0 || date.minute() !== 0 || date.second() !== 0 || date.millisecond() !== 0;
}

export function formatAsDateOrDateTime(date: Moment, fallBackText: string = ''): string {
    if (!date) {
        return fallBackText;
    }

    return date.format(hasTimeComponent(date) ? TaskRegularExpressions.dateTimeFormat : TaskRegularExpressions.dateFormat);
}

export function parseDateOrDateTime(value: string): Moment {
    const format = value.includes(':') ? TaskRegularExpressions.dateTimeFormat : TaskRegularExpressions.dateFormat;
    return window.moment(value, format);
}

export function parseExactDateOrDateTime(value: string): Moment {
    return window.moment(value, supportedDateOrDateTimeFormats, true);
}