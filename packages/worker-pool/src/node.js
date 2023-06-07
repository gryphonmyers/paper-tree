import { parentPort, workerData } from "worker_threads";
export * from './node-worker-pool.js';
import { createMessageHandler } from './create-message-handler.js';
import { createIterationMessageHandler, isIterationMessage } from "./create-iteration-message-handler.js";
import { createMapMessagesToMethodsHandler } from './create-message-to-method-mapper.js';

/**
 * @typedef {import('./worker-pool.js').Task} Task
 * @typedef {import('./worker-pool.js').WorkerEventMessage} WorkerEventMessage
 */

const parentEventTarget = /** @type {EventTarget} */(/** @type {unknown} */(parentPort));

/**
 * @param {(message: any) => void} cb 
 * @param {(message: any) => boolean} [filter]
 */
export const onMessage = (cb, filter) =>
    parentEventTarget?.addEventListener('message', event => {
        const message = /** @type {MessageEvent} */(event).data;
        if (!filter || filter(message))
            cb(message);
    });

export const postMessage = parentPort?.postMessage.bind(parentPort);

/**
 * @returns {undefined|Promise<any>}
 */
export const getWorkerData = () => Promise.resolve(workerData);

export const dispatchEvent = parentPort 
    ? /** @param {CustomEvent} event */
        event => postMessage({ messageType: 'WorkerEvent', messageName: event.type, data: event.detail })
    : null;

/**
 * @param {(message: any) => void} cb 
 * @param {(message: any) => boolean} [filter]
 */
export const addMessageHandler = (cb, filter) => 
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
        createIterationMessageHandler({ cb, parentEventTarget, postMessage}),
        (message) => isIterationMessage(message) && filter(message?.data)
    )

/**
 * @param {Record<string, any>} object 
 * @param {(message: any) => boolean} [filter]
 */
export const mapMessagesToMethods = createMapMessagesToMethodsHandler({ onMessage, postMessage });