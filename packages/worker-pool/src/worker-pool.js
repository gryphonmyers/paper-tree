import { CustomEvent } from '@alfatask/custom-event-ponyfill';

/**
 * @typedef {{ messageType: 'WorkerEvent', messageName: string, data: any }} WorkerEventMessage
 * @typedef {{resolve: (value: any) => void, reject: (err: Error) => void, message: any, promise: Promise<void>, eventTarget?: EventTarget }} Task
 * @typedef {{ 
 *  onReady: (cb: () => void) => void, 
 *  onDied: (cb: (err: Error) => void) => void, 
 *  onMessage: (cb: (message: any) => void) => void, 
 *  task: null|Task, 
 *  takeTask: null|Function, 
 *  postMessage: Function
 * }} WorkerContext
 */

export class WorkerPool {
    
    /**
     * @param {Object} options
     * @param {number} options.numWorkers
     * @param {string} options.scriptPath 
     * @param {any} [options.workerData]
     * @param {(message: any) => void} [options.onTaskCompleted] 
     * @param {EventTarget} [options.eventTarget]
     */
    constructor({ numWorkers=1, scriptPath, workerData, eventTarget=null, onTaskCompleted=null }) {
        this.numWorkers = numWorkers;
        this.scriptPath = scriptPath;
        /** @protected @type {Task[]} */
        this.tasks = [];
        /** @protected @type {WorkerContext[]} */
        this.workerContexts = [];
        /** @protected @type {(message: any) => void|null} */
        this.onTaskCompleted = onTaskCompleted;
        /** @protected @type {EventTarget|null} */
        this.eventTarget = eventTarget;
        /** @protected */
        this.workerData = workerData;
    }
    /**
     * @public
     */
    initialize() {
        for (let ii = 0; ii < this.numWorkers; ++ii) {
            this.addWorker();
        }
    }

    /**
     * @abstract
     * @protected
     * @param {Object} [options]
     * @param {any} [options.workerData]
     * @returns {WorkerContext}
     */
    spawnWorkerContext({workerData}={}) {
        throw new Error('spawnWorkerContext not implemented');
    }

    /**
     * @param {Parameters<typeof Array.prototype.filter>[0]} [filter]
     * @returns {Promise<void>}
     */
    async awaitCurrentTasks(filter) {
        await Promise.all(
            this.workerContexts
                .filter((context, ii, arr) =>
                    filter ? context.task && filter(context.task.message, ii, arr) : context.task
                )
                .map(context => context.task.promise)
        )
    }

    /**
     * @protected
     * @returns {void}
     */
    addWorker() {
        const workerContext = this.spawnWorkerContext({ workerData: this.workerData });

        /** @param {CustomEvent} event */
        const onWorkerContextIterationDirective = event => {
            workerContext.postMessage(/** @type {CustomEvent} */(event).detail);
        }

        workerContext.task = null;
        workerContext.takeTask = () => {
            if (!workerContext.task && this.tasks.length) {
                workerContext.task = this.tasks.shift();
                
                if (workerContext.task.eventTarget) {
                    workerContext.task.eventTarget.addEventListener('workeriterationdirective', onWorkerContextIterationDirective);
                }

                workerContext.postMessage(workerContext.task.message);
            }
        }
        
        workerContext.onReady(() => {
            this.workerContexts.push(workerContext);
            workerContext.takeTask();
        });

        workerContext.onDied((err) => {
            console.error('Error from worker:', err, 'spawning new worker...');
            workerContext.task?.reject(err);
            this.workerContexts.splice(this.workerContexts.indexOf(workerContext), 1);
            this.addWorker();
        });

        workerContext.onMessage((message) => {
            switch (message?.messageType) {
                case 'WorkerEvent':
                    this.eventTarget?.dispatchEvent(new CustomEvent(message.messageName, { detail: message.data }));
                    return;
                case 'WorkerResponse':
                    switch (message.messageName) {
                        case 'WorkerIterationResponse':
                            workerContext.task.eventTarget.dispatchEvent(new CustomEvent('workeriterationresponse', { detail: message.data }));
                            if (!message.data?.done) {
                                return;
                            }
                            break;
                        case 'WorkerErrorResponse':
                            workerContext.task.reject(message.error);
                            break;
                        case 'WorkerSuccessResponse':
                            workerContext.task.resolve(message.data);
                            break;
                        default:
                            throw new Error(`Unrecognized WorkerResponse type: ${message.messageName}`);
                    }
                    break;
                default:
                    workerContext.task.resolve(message);
                    break;
            }
            
            this.onTaskCompleted?.(message);
            if (workerContext.task.eventTarget) 
                workerContext.task.eventTarget.removeEventListener('workeriterationdirective', onWorkerContextIterationDirective)
            workerContext.task = null;
            workerContext.takeTask();
        });
    }
    /**
     * @protected
     * @returns {void}
     */
    drain() {
        this.workerContexts.forEach(workerContext => {
            workerContext.takeTask();
        })
    }

    /**
     * @param {any} message
     * @returns {Promise<any>}
     */
    addTask(message) {
        let resolve;
        let reject;

        const promise = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        this.tasks.push({
            resolve,
            reject,
            promise,
            message
        });

        this.drain();

        return promise;
    }
    
    /**
     * @param {string} methodPath
     * @param {any[]} args
     * @returns {Promise<any>}
     */
    callMethod(methodPath, ...args) {
        return this.addTask({
            messageType: 'WorkerMethodCall',
            messageName: methodPath,
            args
        })
    }

    /**
     * @param {any} iterationData
     * 
     * @returns {AsyncIterableIterator<any>}
     */
    iterate(iterationData) {
        const eventTarget = new EventTarget;

        let resolve;
        let reject;

        const promise = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        /** @type {AsyncIterableIterator<any>} */
        const iterable = {
            [Symbol.asyncIterator]() {
                return this;
            },
            async next(data) {
                return new Promise(resolve => {
                    /** @param {CustomEvent} event */
                    const onResponse = (event) => {
                        eventTarget.removeEventListener('workeriterationresponse', onResponse);
                        resolve(event.detail)
                    }
                    eventTarget.addEventListener('workeriterationresponse', onResponse);                        
                    eventTarget.dispatchEvent(new CustomEvent('workeriterationdirective', { 
                        detail:  {
                            messageType: 'WorkerDirective',
                            messageName: 'NextIteration',
                            data
                        }
                    }));
                });
            },
            async return(data) {
                eventTarget.dispatchEvent(new CustomEvent('workeriterationdirective', { 
                    detail:  {
                        messageType: 'WorkerDirective',
                        messageName: 'ReturnIteration',
                        data
                    }
                }));
                return promise
            },
            async throw(error) {
                eventTarget.dispatchEvent(new CustomEvent('workeriterationdirective', { 
                    detail:  {
                        messageType: 'WorkerDirective',
                        messageName: 'ThrowIteration',
                        error
                    }
                }));
                return promise
            }
        };

        this.tasks.push({
            resolve,
            reject,
            promise,
            eventTarget,
            message: {
                messageType: 'WorkerDirective',
                messageName: 'StartIteration',
                data: iterationData
            }
        });

        this.drain();
        
        return iterable;
    }
}