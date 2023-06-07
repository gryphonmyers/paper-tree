import { createMessageHandler } from "./create-message-handler.js";

/**
 * @param {Object} options
 * @param {Record<string, Record<string, any>>} options.objects
 * @param {(message: any) => void} options.postMessage
 */
export function createMessageToMethodMapper({ postMessage, objects }) {
    return createMessageHandler(postMessage, async (message) => {
        const [ objectName, methodName ] = message.messageName.split('.');
        const object = await objects[objectName];
        return object[methodName](...message.args);
    })        
}

/**
 * @param {any} message 
 * @returns {boolean}
 */
export function isMethodCallMessage(message) {
    return message?.messageType === 'WorkerMethodCall'
}

/**
 * @param {Object} options
 * @param {(cb: (message: any) => void, filter?: (message: any) => boolean) => void} options.onMessage
 * @param {(message: any) => void} options.postMessage
 */
export function createMapMessagesToMethodsHandler({ onMessage, postMessage }) {
    /**
     * @param {Record<string, Record<string, any>>} objects
     * @param {(message: any) => boolean} [filter]
     */
    return (objects, filter) => {
        return onMessage(
            createMessageToMethodMapper({ objects, postMessage }),
            (message) => {
                const [ objectName, methodName ] = message.messageName.split('.');
                return isMethodCallMessage(message) && 
                    objects[objectName] && 
                    typeof objects[objectName] === 'object' && 
                    (typeof objects[objectName][methodName] === 'function' || typeof objects[objectName].then === 'function') && 
                    (!filter || filter(message))
            }
        )
    }
        
}