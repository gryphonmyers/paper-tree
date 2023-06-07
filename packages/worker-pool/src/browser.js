export * from './browser-worker-pool.js';
import { createMessageHandler } from './create-message-handler.js';
import { createIterationMessageHandler, isIterationMessage } from './create-iteration-message-handler.js';
import { createMapMessagesToMethodsHandler } from './create-message-to-method-mapper.js';

const workerScope = /** @type {DedicatedWorkerGlobalScope} */(/** @type {unknown} */(self))

/** @type {undefined|Promise<any>} */
let workerData;

if (typeof WorkerGlobalScope !== 'undefined' && workerScope instanceof WorkerGlobalScope) {
    workerData = new Promise(resolve => {
        /**
         * @param {MessageEvent} event 
         */
        const onWorkerDataMessage = event => {
            if (event.data.messageName === 'WorkerDataMessage') {
                workerScope.removeEventListener('message', onWorkerDataMessage);
                resolve(event.data.workerData);
            }
        }
        workerScope.addEventListener('message', onWorkerDataMessage);
    });
}

/**
 * @returns {undefined|Promise<any>}
 */
export const getWorkerData = () => workerData

/**
 * @param {(message: any) => void} cb 
 * @param {(message: any) => boolean} [filter]
 */
export const onMessage = (cb, filter) =>
    workerScope.addEventListener('message', event => {
        const message = event.data;
        if (!filter || filter(message))
            cb(message)
    });

export const postMessage = workerScope.postMessage?.bind(workerScope);

/** @param {CustomEvent} event */
export const dispatchEvent = event => 
    postMessage({ messageType: 'WorkerEvent', messageName: event.type, data: event.detail });

/**
 * @param {(message: any) => void} cb 
 * @param {(message: any) => boolean} [filter]
 */
export const addMessageHandler = async (cb, filter) =>
    onMessage(
        createMessageHandler(postMessage, cb),
        filter
    )

/**
 * @param {(message: any) => AsyncIterator<any>|Iterator<any>} cb 
 * @param {(message: any) => boolean} [filter]
 */
export const addIterationHandler = (cb, filter) => 
    onMessage(
        createIterationMessageHandler({ cb, parentEventTarget: workerScope, postMessage}),
        message => isIterationMessage(message) && filter(message?.data) 
    )

/**
 * @param {Record<string, any>} object 
 * @param {(message: any) => boolean} [filter]
 */
export const mapMessagesToMethods = createMapMessagesToMethodsHandler({ onMessage, postMessage });