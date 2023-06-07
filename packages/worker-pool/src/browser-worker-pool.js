import { WorkerPool as BaseWorkerPool } from './worker-pool.js';

export class WorkerPool extends BaseWorkerPool {
    
    /**
     * @param {Object} [options]
     * @param {any} [options.workerData]
     * @returns {import('./worker-pool.js').WorkerContext}
     */

    spawnWorkerContext({workerData}={}) {
        const worker = new Worker(this.scriptPath, { type: 'module' });

        worker.postMessage({
            messageName: 'WorkerDataMessage',
            messageType: 'WorkerDirective',
            workerData
        });

        return {
            /**
             * @param {() => void} cb 
             */
            onReady(cb) {
                cb();
            },
            /**
             * @param {(err: Error) => void} cb 
             */
            onDied(cb) {
                worker.addEventListener('error', (event) => {
                    // console.log('WICKER', event)
                    worker.terminate();
                    cb(event.error || new Error(event.message));
                });
            },
            /**
             * @param {(message: any) => void} cb 
             */
            onMessage(cb) {
                worker.addEventListener('message', (event) => {
                    cb(event.data);
                });
            },
            /**
             * @param {any} message 
             */
            postMessage(message) {
                worker.postMessage(message);
            },
            task: null,
            takeTask: null
        }
    }
}