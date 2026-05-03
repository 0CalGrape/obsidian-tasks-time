/**
 * @jest-environment jsdom
 */
import moment from 'moment/moment';
import flatpickr from 'flatpickr';
import { mergeDateWithExistingTime, promptForDate } from '../../../src/ui/Menus/DatePicker';
import { TaskBuilder } from '../../TestingTools/TaskBuilder';

jest.mock('flatpickr', () => jest.fn());

window.moment = moment;

const mockedFlatpickr = flatpickr as unknown as jest.Mock;

function mockFlatpickrInstance() {
    const instance = {
        open: jest.fn(),
        destroy: jest.fn(),
        calendarContainer: document.createElement('div'),
    };
    mockedFlatpickr.mockReturnValue(instance);
    return instance;
}

function openDatePicker() {
    const task = new TaskBuilder().dueDate('2026-05-03 12:34:56').build();
    const taskSaver = jest.fn().mockResolvedValue(undefined);
    const instance = mockFlatpickrInstance();

    promptForDate(document.createElement('span'), task, 'dueDate', taskSaver);

    const options = mockedFlatpickr.mock.calls[0][1];
    return { instance, options, taskSaver };
}

beforeEach(() => {
    mockedFlatpickr.mockReset();
});

describe('DatePicker', () => {
    it('should preserve the existing time when changing the date', () => {
        const selectedDate = new Date('2026-05-04T00:00:00');
        const currentValue = moment('2026-05-03 12:34:56', 'YYYY-MM-DD HH:mm:ss');

        const mergedDate = mergeDateWithExistingTime(selectedDate, currentValue);

        expect(moment(mergedDate).format('YYYY-MM-DD HH:mm:ss')).toEqual('2026-05-04 12:34:56');
    });

    it('should keep midnight when there is no existing date', () => {
        const selectedDate = new Date('2026-05-04T00:00:00');

        const mergedDate = mergeDateWithExistingTime(selectedDate, null);

        expect(moment(mergedDate).format('YYYY-MM-DD HH:mm:ss')).toEqual('2026-05-04 00:00:00');
    });

    it('should not save when the picker closes without a selected date change', async () => {
        const { instance, options, taskSaver } = openDatePicker();

        await options.onClose([new Date('2026-05-03T00:00:00')], '2026-05-03', instance);

        expect(taskSaver).not.toHaveBeenCalled();
        expect(instance.destroy).toHaveBeenCalledTimes(1);
    });

    it('should save a changed date while preserving the existing time', async () => {
        const { instance, options, taskSaver } = openDatePicker();

        options.onChange([new Date('2026-05-04T00:00:00')], '2026-05-04', instance);
        await options.onClose([new Date('2026-05-04T00:00:00')], '2026-05-04', instance);

        expect(taskSaver).toHaveBeenCalledTimes(1);
        const newTasks = taskSaver.mock.calls[0][1];
        expect(newTasks[0].dueDate.format('YYYY-MM-DD HH:mm:ss')).toEqual('2026-05-04 12:34:56');
    });
});
