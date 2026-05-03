/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/svelte';
import moment from 'moment/moment';
import DateEditorWrapper from './DateEditorWrapper.svelte';

import { getAndCheckRenderedElement } from './RenderingTestHelpers';

window.moment = moment;

function renderDateEditorWrapper(componentOptions: { forwardOnly: boolean }) {
    const { container } = render(DateEditorWrapper, componentOptions);

    expect(() => container).toBeTruthy();

    return container;
}

function testInputValue(container: HTMLElement, inputId: string, expectedText: string) {
    const input = getAndCheckRenderedElement<HTMLInputElement>(container, inputId);
    expect(input.value).toEqual(expectedText);
}

function testDatePickerValue(container: HTMLElement, expectedValue: string) {
    const datePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'date-editor-picker');
    expect(datePicker.value).toEqual(expectedValue);
}

function testTimePickerValue(container: HTMLElement, expectedValue: string) {
    const timePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'time-editor-picker');
    expect(timePicker.value).toEqual(expectedValue);
}

async function testTypingInput(
    {
        userTyped,
        expectedLeftText,
        expectedRightText,
        expectedReturnedDate,
        expectedDatePickerValue = expectedRightText,
        expectedTimePickerValue = '',
        expectedReturnedDateValidity = 'true',
    }: {
        userTyped: string;
        expectedLeftText: string;
        expectedRightText: string;
        expectedReturnedDate: string;
        expectedDatePickerValue?: string;
        expectedTimePickerValue?: string;
        expectedReturnedDateValidity?: 'true' | 'false';
    },
    { forwardOnly }: { forwardOnly: boolean } = { forwardOnly: true },
) {
    const container = renderDateEditorWrapper({ forwardOnly });

    const dueDateInput = getAndCheckRenderedElement<HTMLInputElement>(container, 'due');
    await fireEvent.input(dueDateInput, { target: { value: userTyped } });

    testInputValue(container, 'due', expectedLeftText);
    testInputValue(container, 'parsedDateFromDateEditor', expectedRightText);
    testInputValue(container, 'dueDateFromDateEditor', expectedReturnedDate);
    testInputValue(container, 'parsedDateValidFromDateEditor', expectedReturnedDateValidity);

    if (expectedReturnedDateValidity === 'true') {
        testDatePickerValue(container, expectedDatePickerValue);
        testTimePickerValue(container, expectedTimePickerValue);
    } else {
        const datePicker = container.ownerDocument.getElementById('date-editor-picker') as HTMLInputElement;
        const timePicker = container.ownerDocument.getElementById('time-editor-picker') as HTMLInputElement;
        expect(datePicker).toBeNull();
        expect(timePicker).toBeNull();
    }
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-20'));
});

afterEach(() => {
    jest.useRealTimers();
});

describe('date editor wrapper tests', () => {
    it('should initialise fields correctly', () => {
        const container = renderDateEditorWrapper({ forwardOnly: true });

        testInputValue(container, 'due', '');
        testInputValue(container, 'parsedDateFromDateEditor', '<i>no due date</i>');
        testInputValue(container, 'dueDateFromDateEditor', '');

        testDatePickerValue(container, '');
        testTimePickerValue(container, '');
    });

    it('should replace an empty date field with typed date value', async () => {
        await testTypingInput({
            userTyped: '2024-10-01',
            expectedLeftText: '2024-10-01',
            expectedRightText: '2024-10-01',
            expectedReturnedDate: '2024-10-01',
        });
    });

    it('should show a typed date and time to the second', async () => {
        await testTypingInput({
            userTyped: '2024-10-01 12:34:56',
            expectedLeftText: '2024-10-01 12:34:56',
            expectedRightText: '2024-10-01 12:34:56',
            expectedReturnedDate: '2024-10-01 12:34:56',
            expectedDatePickerValue: '2024-10-01',
            expectedTimePickerValue: '12:34:56',
        });
    });

    it('should replace an empty date field with typed abbreviation', async () => {
        await testTypingInput({
            userTyped: 'tm ',
            expectedLeftText: 'tomorrow',
            expectedRightText: '2024-04-21',
            expectedReturnedDate: 'tomorrow',
        });
    });

    it('should show an error message for invalid date', async () => {
        await testTypingInput({
            userTyped: 'blah',
            expectedLeftText: 'blah',
            expectedRightText: '<i>invalid due date</i>',
            expectedReturnedDate: 'blah',
            expectedReturnedDateValidity: 'false',
        });
    });

    it('should select a forward date', async () => {
        await testTypingInput(
            {
                userTyped: 'friday',
                expectedLeftText: 'friday',
                expectedRightText: '2024-04-26',
                expectedReturnedDate: 'friday',
            },
            { forwardOnly: true },
        );
    });

    it('should select a backward/earlier date', async () => {
        await testTypingInput(
            {
                userTyped: 'friday',
                expectedLeftText: 'friday',
                expectedRightText: '2024-04-19',
                expectedReturnedDate: 'friday',
            },
            { forwardOnly: false },
        );
    });

    it('should pick a date', async () => {
        const container = renderDateEditorWrapper({ forwardOnly: false });
        const datePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'date-editor-picker');

        await fireEvent.change(datePicker, { target: { value: '2024-11-03' } });

        expect(datePicker.value).toEqual('2024-11-03');

        testInputValue(container, 'due', '2024-11-03');
        testInputValue(container, 'parsedDateFromDateEditor', '2024-11-03');
        testInputValue(container, 'dueDateFromDateEditor', '2024-11-03');
        testInputValue(container, 'parsedDateValidFromDateEditor', 'true');
    });

    it('should pick a time after picking a date', async () => {
        const container = renderDateEditorWrapper({ forwardOnly: false });
        const datePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'date-editor-picker');
        const timePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'time-editor-picker');

        await fireEvent.change(datePicker, { target: { value: '2024-11-03' } });
        await fireEvent.change(timePicker, { target: { value: '12:34:56' } });

        testInputValue(container, 'due', '2024-11-03 12:34:56');
        testInputValue(container, 'parsedDateFromDateEditor', '2024-11-03 12:34:56');
        testInputValue(container, 'dueDateFromDateEditor', '2024-11-03 12:34:56');
        testInputValue(container, 'parsedDateValidFromDateEditor', 'true');
        testDatePickerValue(container, '2024-11-03');
        testTimePickerValue(container, '12:34:56');
    });

    it('should keep the picked time when changing the picked date', async () => {
        const container = renderDateEditorWrapper({ forwardOnly: false });
        const dueDateInput = getAndCheckRenderedElement<HTMLInputElement>(container, 'due');
        const datePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'date-editor-picker');

        await fireEvent.input(dueDateInput, { target: { value: '2024-11-03 12:34:56' } });
        await fireEvent.change(datePicker, { target: { value: '2024-11-04' } });

        testInputValue(container, 'due', '2024-11-04 12:34:56');
        testDatePickerValue(container, '2024-11-04');
        testTimePickerValue(container, '12:34:56');
    });

    it('should not clear the time when the date picker emits input without a confirmed change', async () => {
        const container = renderDateEditorWrapper({ forwardOnly: false });
        const dueDateInput = getAndCheckRenderedElement<HTMLInputElement>(container, 'due');
        const datePicker = getAndCheckRenderedElement<HTMLInputElement>(container, 'date-editor-picker');

        await fireEvent.input(dueDateInput, { target: { value: '2024-11-03 12:34:56' } });
        await fireEvent.input(datePicker, { target: { value: '2024-11-03' } });

        testInputValue(container, 'due', '2024-11-03 12:34:56');
        testInputValue(container, 'parsedDateFromDateEditor', '2024-11-03 12:34:56');
        testInputValue(container, 'dueDateFromDateEditor', '2024-11-03 12:34:56');
    });
});
