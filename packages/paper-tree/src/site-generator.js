export class SiteGenerator {


    /**
     * @param {{
     *   taskHandler: PaperTree.ITaskHandler,
     *   routesProvider: PaperTree.
     * }} 
     */
    constructor({ taskHandler }) {
        this.taskHandler = taskHandler;
    }

    /**
     * @param {string} path 
     */
    async buildPath(path) {
        if (await this.routesProvider.pathIsValid(path))
            await this.dataProvider


        await this.taskHandler.handle(task);
    }
}