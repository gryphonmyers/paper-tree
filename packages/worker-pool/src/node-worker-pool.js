import { WorkerPool as BaseWorkerPool } from './worker-pool.js';
import { Worker } from "worker_threads";
import * as url from 'url';
import path from "path";
import getCallSites from 'callsites'

export class WorkerPool extends BaseWorkerPool {
    /**
     * @param {Object} options
     * @param {number} options.numWorkers
     * @param {string} options.scriptPath 
     * @param {any} [options.workerData]
     * @param {(message: any) => void} [options.onTaskCompleted] 
     * @param {EventTarget} [options.eventTarget]
     */
    constructor(options) {
        super({...options, scriptPath: path.resolve(url.fileURLToPath(new URL('.', getCallSites()[1].getFileName())), options.scriptPath) })
    }
    /**
     * @param {Object} [options]
     * @param {any} [options.workerData]
     * @returns {import('./worker-pool.js').WorkerContext}
     */
    spawnWorkerContext({workerData}={}) {        
        const worker = new Worker(this.scriptPath, { workerData });

        /** @type {Error} */
        let currErr = null;
        
        worker.on('error', err => {
            currErr = err;
        });

        return {
            /**
             * @param {() => void} cb 
             */
            onReady(cb) {
                worker.on('online', cb);
            },
            /**
             * @param {(err: Error) => void} cb 
             */
            onDied(cb) {
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        cb(currErr);
                    }
                })
            },
            /**
             * @param {(message: any) => void} cb 
             */
            onMessage(cb) {
                worker.on('message', (event) => {
                    cb(event);
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