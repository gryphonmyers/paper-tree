/**
 * @implements {PaperTree.ITaskHandler}
 */
export class WorkerPoolTaskHandler {
    
    /**
     * @param {{ workerPool: import('paper-tree-worker-pool').WorkerPool }} options 
     */
    constructor({ workerPool }) {
        /** @protected */
        this.workerPool = workerPool;
    }

    /**
     * @param {PaperTree.Task} task 
     */
    async handle(task) {
        return this.workerPool.addTask(task);
    }
}