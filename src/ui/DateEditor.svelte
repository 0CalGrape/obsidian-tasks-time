<script lang="ts">
    import { doAutocomplete } from '../DateTime/DateAbbreviations';
    import { parseTypedDateForDisplayUsingFutureDate } from '../DateTime/DateTools';
    import { labelContentWithAccessKey } from './EditTaskHelpers';

    export let id: 'start' | 'scheduled' | 'due' | 'done' | 'created' | 'cancelled';
    export let dateSymbol: string;
    export let date: string;
    export let isDateValid: boolean;
    export let forwardOnly: boolean;
    export let accesskey: string | null;

    // Use this for testing purposes only
    export let parsedDate: string = '';

    let pickedDate = '';
    let pickedTime = '';

    function parsePickerValues(parsedDateText: string) {
        const match = parsedDateText.match(/^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}(?::\d{2})?))?$/);
        return {
            date: match?.[1] ?? '',
            time: match?.[2] ?? '',
        };
    }

    function normalisePickedTime(time: string) {
        return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
    }

    function updateDateFromPickers(nextPickedDate = pickedDate, nextPickedTime = pickedTime) {
        if (!nextPickedDate) {
            return;
        }

        date = nextPickedTime ? `${nextPickedDate} ${normalisePickedTime(nextPickedTime)}` : nextPickedDate;
    }

    $: {
        date = doAutocomplete(date);
        parsedDate = parseTypedDateForDisplayUsingFutureDate(id, date, forwardOnly);
        isDateValid = !parsedDate.includes('invalid');
        if (isDateValid) {
            const pickerValues = parsePickerValues(parsedDate);
            pickedDate = pickerValues.date;
            pickedTime = pickerValues.time;
        }
    }

    function onDatePicked(e: Event) {
        const input = e.currentTarget as HTMLInputElement | null;
        if (input === null) {
            return;
        }
        updateDateFromPickers(input.value, pickedTime);
    }

    function onTimePicked(e: Event) {
        const input = e.currentTarget as HTMLInputElement | null;
        if (input === null) {
            return;
        }
        updateDateFromPickers(pickedDate, input.value);
    }

    // 'weekend' abbreviation omitted due to lack of space.
    const datePlaceholder = "Try 'Mon', 'tm ' or YYYY-MM-DD HH:mm:ss";
</script>

<label for={id}>{@html labelContentWithAccessKey(id, accesskey)}</label>
<!-- svelte-ignore a11y-accesskey -->
<input
    bind:value={date}
    {id}
    type="text"
    class:tasks-modal-error={!isDateValid}
    class="tasks-modal-date-input"
    placeholder={datePlaceholder}
    {accesskey}
/>

{#if isDateValid}
    <div class="tasks-modal-parsed-date">
        {dateSymbol}<span class="tasks-modal-date-time-pickers">
            <input
                class="tasks-modal-date-editor-picker"
                type="date"
                value={pickedDate}
                id="date-editor-picker"
                title="Pick date"
                aria-label="Pick date"
                on:change={onDatePicked}
                tabindex="-1"
            />
            <input
                class="tasks-modal-time-editor-picker"
                type="time"
                step="1"
                value={pickedTime}
                id="time-editor-picker"
                title="Pick time, HH:mm:ss"
                aria-label="Pick time, HH:mm:ss"
                on:change={onTimePicked}
                tabindex="-1"
            />
        </span>
    </div>
{:else}
    <code class="tasks-modal-parsed-date">{dateSymbol} {@html parsedDate}</code>
{/if}

<style>
</style>
