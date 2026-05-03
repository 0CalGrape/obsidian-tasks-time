import type { App, Component } from 'obsidian';
import { GlobalQuery } from '../Config/GlobalQuery';
import type { IQuery } from '../IQuery';
import { PerformanceTracker } from '../lib/PerformanceTracker';
import { State } from '../Obsidian/Cache';
import { Query } from '../Query/Query';
import { getQueryForQueryRenderer } from '../Query/QueryRendererHelper';
import type { QueryResult } from '../Query/QueryResult';
import type { TasksFile } from '../Scripting/TasksFile';
import type { Task } from '../Task/Task';
import { type HTMLQueryRendererParameters, HtmlQueryResultsRenderer } from './HtmlQueryResultsRenderer';
import { MarkdownQueryResultsRenderer } from './MarkdownQueryResultsRenderer';
import type { TextRenderer } from './TaskLineRenderer';

export type BacklinksEventHandler = (ev: MouseEvent, task: Task) => Promise<void>;
export type EditButtonClickHandler = (event: MouseEvent, task: Task, allTasks: Task[]) => void;

/**
 * The `QueryResultsRenderer` class is responsible for rendering the results
 * of a query applied to a set of tasks.
 *
 * It handles the construction of task groupings and the application of visual styles.
 */
export class QueryResultsRenderer {
    /**
     * The complete text in the instruction block, such as:
     * ```
     *   not done
     *   short mode
     * ```
     *
     * This does not contain the Global Query from the user's settings.
     * Use {@link getQueryForQueryRenderer} to get this value prefixed with the Global Query.
     */
    public readonly source: string;

    // The path of the file that contains the instruction block, and cached data from that file.
    // This can be updated when the query file's frontmatter is modified.
    // It is up to the caller to determine when to do this though.
    private _tasksFile: TasksFile;

    public query: IQuery;
    protected queryType: string; // whilst there is only one query type, there is no point logging this value
    public queryResult: QueryResult;
    public filteredQueryResult: QueryResult;

    private readonly renderMarkdown: (
        app: App,
        markdown: string,
        el: HTMLElement,
        sourcePath: string,
        component: Component,
    ) => Promise<void>;
    private readonly obsidianComponent: Component | null;
    private readonly obsidianApp: App;
    private readonly textRenderer: TextRenderer;
    private readonly htmlQueryRendererParameters: HTMLQueryRendererParameters;

    constructor(
        className: string,
        source: string,
        tasksFile: TasksFile,
        renderMarkdown: (
            app: App,
            markdown: string,
            el: HTMLElement,
            sourcePath: string,
            component: Component,
        ) => Promise<void>,
        obsidianComponent: Component | null,
        obsidianApp: App,
        textRenderer: TextRenderer,
        htmlQueryRendererParameters: HTMLQueryRendererParameters,
    ) {
        this.source = source;
        this._tasksFile = tasksFile;

        // Store empty query result for now
        this.queryResult = new Query('').applyQueryToTasks([]);
        this.filteredQueryResult = this.queryResult;

        // The engine is chosen on the basis of the code block language. Currently,
        // there is only the main engine for the plugin, this allows others to be
        // added later.
        switch (className) {
            case 'block-language-tasks':
                this.query = this.makeQueryFromSourceAndTasksFile();
                this.queryType = 'tasks';
                break;

            default:
                this.query = this.makeQueryFromSourceAndTasksFile();
                this.queryType = 'tasks';
                break;
        }

        this.renderMarkdown = renderMarkdown;
        this.obsidianComponent = obsidianComponent;
        this.obsidianApp = obsidianApp;
        this.textRenderer = textRenderer;
        this.htmlQueryRendererParameters = htmlQueryRendererParameters;
    }

    private makeQueryFromSourceAndTasksFile() {
        return getQueryForQueryRenderer(this.source, GlobalQuery.getInstance(), this.tasksFile);
    }

    public get tasksFile(): TasksFile {
        return this._tasksFile;
    }

    /**
     * Reload the query with new file information, such as to update query placeholders.
     * @param newFile
     */
    public setTasksFile(newFile: TasksFile) {
        this._tasksFile = newFile;
        this.rereadQueryFromFile();
    }

    /**
     * Reads the query from the source file and tasks file.
     *
     * This is for when some change in the vault invalidates the current
     * Query object, and so it needs to be reloaded.
     *
     * For example, the user edited their Tasks plugin settings in some
     * way that changes how the query is interpreted, such as changing a
     * 'presets' definition.
     */
    public rereadQueryFromFile() {
        this.query = this.makeQueryFromSourceAndTasksFile();
    }

    public get filePath(): string | undefined {
        return this.tasksFile.path;
    }

    public async render(state: State, tasks: Task[], content: HTMLDivElement) {
        this.performSearch(tasks);
        await this.renderQueryResult(state, this.filteredQueryResult, content);
    }

    private performSearch(tasks: Task[]) {
        const measureSearch = new PerformanceTracker(`Search: ${this.query.queryId} - ${this.filePath}`);
        measureSearch.start();
        this.queryResult = this.query.applyQueryToTasks(tasks);
        this.filteredQueryResult = this.queryResult;
        measureSearch.finish();
    }

    private async renderQueryResult(state: State, queryResult: QueryResult, content: HTMLDivElement) {
        const measureRender = new PerformanceTracker(`Render: ${this.query.queryId} - ${this.filePath}`);
        measureRender.start();

        const htmlRenderer = new HtmlQueryResultsRenderer(
            this.renderMarkdown,
            this.obsidianComponent,
            this.obsidianApp,
            this.textRenderer,
            this.htmlQueryRendererParameters,
            this.source,
            this.tasksFile,
            this.query,
        );

        htmlRenderer.content = content;
        await htmlRenderer.renderQuery(state, queryResult);
        measureRender.finish();
    }

    public async resultsAsMarkdown() {
        const markdownRenderer = new MarkdownQueryResultsRenderer(this.source, this.tasksFile, this.query);

        await markdownRenderer.renderQuery(State.Warm, this.filteredQueryResult);
        return markdownRenderer.markdown;
    }
}
