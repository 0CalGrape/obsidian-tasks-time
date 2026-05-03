import type { DurationInputArg2, Moment, unitOfTime } from 'moment';
import { Notice } from 'obsidian';
import { PropertyCategory } from '../lib/PropertyCategory';
import { TaskRegularExpressions } from '../Task/TaskRegularExpressions';
import { applyDailyStartToMoment, getDailyStartTime, isValidDailyStartTime } from './DailyStart';
import { formatAsDateOrDateTime, hasTimeComponent, parseExactDateOrDateTime } from './DateTimeFormat';

type DateLike = string | Date | Moment | TasksDate;

interface ParsedDateLike {
    date: Moment;
    isDateOnly: boolean;
}

declare module 'moment' {
    interface Moment {
        isSameDayWithDailyStart(otherDate: DateLike, dailyStartTime?: string): boolean;
        isSameDayWithOffset(otherDate: DateLike, dailyStartTime?: string): boolean;
    }
}

function normaliseDailyStartTime(dailyStartTime: string = getDailyStartTime()): string {
    return isValidDailyStartTime(dailyStartTime) ? dailyStartTime : getDailyStartTime();
}

function parseDateLike(value: DateLike): ParsedDateLike | null {
    if (value instanceof TasksDate) {
        const date = value.moment;
        return date ? { date, isDateOnly: !hasTimeComponent(date) } : null;
    }

    if (typeof value === 'string') {
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
        const exactDate = parseExactDateOrDateTime(value);
        return {
            date: exactDate.isValid() ? exactDate : window.moment(value),
            isDateOnly,
        };
    }

    if (value instanceof Date) {
        const date = window.moment(value);
        return { date, isDateOnly: !hasTimeComponent(date) };
    }

    if (window.moment.isMoment(value)) {
        return { date: value.clone(), isDateOnly: !hasTimeComponent(value) };
    }

    return null;
}

function businessDayLabel(date: Moment, dailyStartTime: string, isDateOnly: boolean): string {
    return (isDateOnly ? date : applyDailyStartToMoment(date, dailyStartTime)).format(TaskRegularExpressions.dateFormat);
}

export function isSameDayWithDailyStart(
    date: DateLike,
    otherDate: DateLike,
    dailyStartTime: string = getDailyStartTime(),
): boolean {
    const parsedDate = parseDateLike(date);
    const parsedOtherDate = parseDateLike(otherDate);
    if (!parsedDate || !parsedDate.date.isValid() || !parsedOtherDate || !parsedOtherDate.date.isValid()) {
        return false;
    }

    const effectiveDailyStartTime = normaliseDailyStartTime(dailyStartTime);
    return (
        businessDayLabel(parsedDate.date, effectiveDailyStartTime, parsedDate.isDateOnly) ===
        businessDayLabel(parsedOtherDate.date, effectiveDailyStartTime, parsedOtherDate.isDateOnly)
    );
}

function installMomentDailyStartHelpers() {
    const momentPrototype = window.moment?.fn as
        | (moment.Moment & {
              isSameDayWithDailyStart?: (otherDate: DateLike, dailyStartTime?: string) => boolean;
              isSameDayWithOffset?: (otherDate: DateLike, dailyStartTime?: string) => boolean;
          })
        | undefined;
    if (!momentPrototype || typeof momentPrototype.isSameDayWithDailyStart === 'function') {
        return;
    }

    momentPrototype.isSameDayWithDailyStart = function (this: Moment, otherDate: DateLike, dailyStartTime?: string) {
        return isSameDayWithDailyStart(this, otherDate, normaliseDailyStartTime(dailyStartTime));
    };
    momentPrototype.isSameDayWithOffset = function (this: Moment, otherDate: DateLike, dailyStartTime?: string) {
        return this.isSameDayWithDailyStart(otherDate, dailyStartTime);
    };
}

/**
 * TasksDate encapsulates a date, for simplifying the JavaScript expressions users need to
 * write in 'group by function' lines.
 */
export class TasksDate {
    private readonly _date: Moment | null = null;

    public constructor(date: Moment | null) {
        installMomentDailyStartHelpers();
        this._date = date;
    }

    /**
     * Return the raw underlying moment (or null, if there is no date)
     */
    get moment(): Moment | null {
        installMomentDailyStartHelpers();
        return this._date ? this._date.clone() : null;
    }

    /**
     * Return the date formatted as YYYY-MM-DD, or {@link fallBackText} if there is no date.
     @param fallBackText - the string to use if the date is null. Defaults to empty string.
     */
    public formatAsDate(fallBackText: string = ''): string {
        return this.format(TaskRegularExpressions.dateFormat, fallBackText);
    }

    /**
    * Return the date formatted as YYYY-MM-DD HH:mm:ss, or {@link fallBackText} if there is no date.
     @param fallBackText - the string to use if the date is null. Defaults to empty string.
     */
    public formatAsDateAndTime(fallBackText: string = ''): string {
        return this.format(TaskRegularExpressions.dateTimeFormat, fallBackText);
    }

    public formatAsDateOrDateTime(fallBackText: string = ''): string {
        return this._date ? formatAsDateOrDateTime(this._date, fallBackText) : fallBackText;
    }

    /**
     * Return the date formatted with the given format string, or {@link fallBackText} if there is no date.
     * See https://momentjs.com/docs/#/displaying/ for all the available formatting options.
     * @param format
     * @param fallBackText - the string to use if the date is null. Defaults to empty string.
     */
    public format(format: string, fallBackText: string = ''): string {
        return this._date ? this._date.format(format) : fallBackText;
    }

    /**
     * Return the date as an ISO string, for example '2023-10-13T00:00:00.000Z'.
     * @param keepOffset
     * @returns - The date as an ISO string, for example: '2023-10-13T00:00:00.000Z',
     *            OR an empty string if no date, OR null for an invalid date.
     */
    public toISOString(keepOffset?: boolean): string | null {
        return this._date ? this._date.toISOString(keepOffset) : '';
    }

    /**
     * Return true if this date is in the same business day as otherDate, using the daily start time.
     * Date-only values such as '2026-05-03' are treated as business day labels.
     */
    public isSameDayWithDailyStart(otherDate: DateLike, dailyStartTime: string = getDailyStartTime()): boolean {
        return this._date ? isSameDayWithDailyStart(this._date, otherDate, dailyStartTime) : false;
    }

    public isSameDayWithOffset(otherDate: DateLike, dailyStartTime: string = getDailyStartTime()): boolean {
        return this.isSameDayWithDailyStart(otherDate, dailyStartTime);
    }

    public get category(): PropertyCategory {
        // begin-snippet: use-moment-in-src
        const today = window.moment();
        // end-snippet
        const date = this.moment;
        if (!date) {
            return new PropertyCategory('Undated', 4);
        }
        if (date.isBefore(today, 'day')) {
            return new PropertyCategory('Overdue', 1);
        }
        if (date.isSame(today, 'day')) {
            return new PropertyCategory('Today', 2);
        }
        if (!date.isValid()) {
            return new PropertyCategory('Invalid date', 0);
        }
        return new PropertyCategory('Future', 3);
    }

    public get fromNow(): PropertyCategory {
        const date = this.moment;
        if (!date) {
            return new PropertyCategory('', 0);
        }
        const order = this.fromNowOrder(date);
        return new PropertyCategory(date.fromNow(), order);
    }

    private fromNowOrder(date: moment.Moment) {
        // Always put invalid dates first:
        if (!date.isValid()) {
            return 0;
        }

        // Calculate a number that:
        //   - is the same for all dates with the same 'fromNow()' name,
        //   - sorts in ascending order of the date.

        const now = window.moment();
        const earlier = date.isSameOrBefore(now, 'second');
        const startDateOfThisGroup = this.fromNowStartDateOfGroup(date, earlier, now);
        const splitPastAndFutureDates = earlier ? 1 : 3;
        return Number(splitPastAndFutureDates + startDateOfThisGroup.format('YYYYMMDDHHmm'));
    }

    private fromNowStartDateOfGroup(date: moment.Moment, earlier: boolean, now: any) {
        // Calculate the earliest of all dates with the same 'fromNow()' name.

        // https://momentjs.com/docs/#/displaying/fromnow/
        // 'If you pass true, you can get the value without the suffix.'
        // We change the locale to english, to get values like 'hours', 'days', 'years' that we can pass to Moment.
        const words = date.clone().locale('en').fromNow(true).split(' ');

        let multiplier: number;
        const word0AsNumber = Number(words[0]);
        if (isNaN(word0AsNumber)) {
            multiplier = 1; // examples: 'a year', 'a month', 'a day'
        } else {
            multiplier = word0AsNumber; // examples: '10 years', '6 months', '11 hours'
        }
        const unit = words[1] as DurationInputArg2; // day, days, weeks, month, year
        return earlier ? now.subtract(multiplier, unit) : now.add(multiplier, unit);
    }

    public postpone(unitOfTime: unitOfTime.DurationConstructor = 'days', amount: number = 1) {
        if (!this._date) throw new Notice('Cannot postpone a null date');

        const today = window.moment().startOf('day');
        // According to the moment.js docs, isBefore is not stable so we use !isSameOrAfter: https://momentjs.com/docs/#/query/is-before/
        const isDateBeforeToday = !this._date.isSameOrAfter(today, 'day');

        if (isDateBeforeToday) {
            return today.add(amount, unitOfTime);
        }

        return this._date.clone().add(amount, unitOfTime);
    }
}
