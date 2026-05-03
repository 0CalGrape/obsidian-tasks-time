import flatpickr from 'flatpickr';
import type { Moment } from 'moment';
import type { Task } from '../../Task/Task';
import { RemoveTaskDate, SetTaskDate } from '../EditInstructions/DateInstructions';
import type { AllTaskDateFields } from '../../DateTime/DateFieldTypes';
import type { TaskSaver } from './TaskEditingMenu';

/**
 * A calendar date picker which edits a date value in a {@link Task} object.
 * @param parentElement
 * @param task
 * @param dateFieldToEdit
 * @param taskSaver
 */
export function promptForDate(
    parentElement: HTMLElement,
    task: Task,
    dateFieldToEdit: AllTaskDateFields,
    taskSaver: TaskSaver,
) {
    const currentValue = task[dateFieldToEdit];
    let dateWasSelected = false;
    // TODO figure out how Today's date is determined: if Obsidian is left
    //      running overnight, the flatpickr modal shows the previous day as Today.
    const fp = flatpickr(parentElement, {
        defaultDate: currentValue ? currentValue.format('YYYY-MM-DD') : new Date(),
        disableMobile: true,
        enableTime: false, // Optional: Enable time picker
        dateFormat: 'Y-m-d', // Adjust the date and time format as needed
        locale: {
            // Try to determine the first day of the week based on the locale, or use Monday
            // if unavailable
            firstDayOfWeek: (new Intl.Locale(navigator.language) as any).weekInfo?.firstDay ?? 1,
        },
        onChange: () => {
            dateWasSelected = true;
        },
        onClose: async (selectedDates, _dateStr, instance) => {
            if (dateWasSelected && selectedDates.length > 0) {
                const date = mergeDateWithExistingTime(selectedDates[0], currentValue);
                const newTask = new SetTaskDate(dateFieldToEdit, date).apply(task);
                await taskSaver(task, newTask);
            }
            instance.destroy();
        },
        onReady: (_selectedDates, _dateStr, instance) => {
            // Add custom buttons dynamically
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';
            buttonContainer.style.marginTop = '10px';

            // Create "Clear" button
            addButton(buttonContainer, instance, task, taskSaver, 'Clear', () => {
                return new RemoveTaskDate(dateFieldToEdit, task).apply(task);
            });

            // Create "Today" button
            addButton(buttonContainer, instance, task, taskSaver, 'Today', () => {
                const today = mergeDateWithExistingTime(new Date(), currentValue);
                return new SetTaskDate(dateFieldToEdit, today).apply(task);
            });

            // Append the button container to the Flatpickr calendar container
            const calendarContainer = instance.calendarContainer;
            calendarContainer.appendChild(buttonContainer);
        },
    });

    // Open the calendar programmatically
    fp.open();
}

export function mergeDateWithExistingTime(selectedDate: Date, currentValue: Moment | null): Date {
    const mergedDate = window.moment(selectedDate);
    if (currentValue) {
        mergedDate
            .hour(currentValue.hour())
            .minute(currentValue.minute())
            .second(currentValue.second())
            .millisecond(currentValue.millisecond());
    }

    return mergedDate.toDate();
}

function addButton(
    buttonContainer: HTMLDivElement,
    instance: flatpickr.Instance,
    task: Task,
    taskSaver: TaskSaver,
    buttonName: string,
    applyDate: () => Task[],
) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = buttonName;
    button.classList.add('flatpickr-button');

    button.addEventListener('click', async () => {
        const newTask = applyDate();
        await taskSaver(task, newTask);
        instance.destroy();
    });
    buttonContainer.appendChild(button);
}
