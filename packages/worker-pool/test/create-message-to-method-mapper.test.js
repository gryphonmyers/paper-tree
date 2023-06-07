import { expect, test, vi } from 'vitest';
import { createMessageToMethodMapper, createMapMessagesToMethodsHandler } from '../src/create-message-to-method-mapper.js';

test('Can create message to method mapper', async () => {
    const objects = {
        garbo: {
                /**
             * @param {*} foo 
             * @param {*} bar 
             */
            gringle: vi.fn(async (foo, bar) => {
                return foo * bar
            })
        }
    }
    const postMessage = vi.fn();

    const mapper = createMessageToMethodMapper({ postMessage, objects });

    await expect(mapper({ messageType: 'WorkerMethodCall', messageName: 'garbo.gringle', args: [3,2] })).resolves.toBeFalsy();

    expect(postMessage).toHaveBeenCalledWith({
        "data": 6,
        "messageName": "WorkerSuccessResponse",
        "messageType": "WorkerResponse",
    });
    expect(objects.garbo.gringle).toHaveBeenCalledWith(3,2);
});

test('Can create message to method mapper handler', async () => {
    /** @type {Function[]} */
    const onMessageCbs = [];

    /**
     * @param {*} message 
     */
    const onMessage = vi.fn((cb, filter) => {
        onMessageCbs.push(
            /**
             * @param {any} message
             */
            message => !filter || filter(message) ? cb(message) : null
        );
    });
    const objects = {
        garbo: {
                /**
             * @param {*} foo 
             * @param {*} bar 
             */
            gringle: vi.fn(async (foo, bar) => {
                return foo * bar
            })
        }
    }
    
    const postMessage = vi.fn();
    const map = createMapMessagesToMethodsHandler({ onMessage, postMessage })

    map(objects);

    expect(onMessageCbs.length).toBe(1);
    await expect(onMessageCbs[0]({ messageType: 'WorkerMethodCall', messageName: 'garbo.gringle', args: [3,2] })).resolves.toBeFalsy();
    expect(postMessage).toHaveBeenCalledWith({
        "data": 6,
        "messageName": "WorkerSuccessResponse",
        "messageType": "WorkerResponse",
    });
    expect(objects.garbo.gringle).toHaveBeenCalledWith(3,2);
});

test('Can create message to method mapper handler with filter', async () => {
    /** @type {Function[]} */
    const onMessageCbs = [];

    /**
     * @param {*} message 
     */
    const onMessage = vi.fn((cb, filter) => {
        onMessageCbs.push(
            /**
             * @param {any} message
             */
            async message => !filter || filter(message) ? cb(message) : null
        );
    });
    const objects = {
        gringo: {
                /**
             * @param {*} foo 
             * @param {*} bar 
             */
            gringle: vi.fn(async (foo, bar) => {
                return foo * bar
            })
        }
    }
    
    const postMessage = vi.fn();
    const map = createMapMessagesToMethodsHandler({ onMessage, postMessage })

    map(objects, message => message.stinky === 'gringo');

    expect(onMessageCbs.length).toBe(1);

    await expect(onMessageCbs[0]({ messageType: 'WorkerMethodCall', stinky: 'stupid', messageName: 'gringo.gringle', args: [3,2] })).resolves.toBeFalsy();
    
    expect(postMessage).toHaveBeenCalledTimes(0);
    expect(objects.gringo.gringle).toHaveBeenCalledTimes(0);
    
    await expect(onMessageCbs[0]({ messageType: 'WorkerMethodCall', stinky: 'gringo', messageName: 'gringo.garble', args: [3,2] })).resolves.toBeFalsy();
    
    expect(postMessage).toHaveBeenCalledTimes(0);
    expect(objects.gringo.gringle).toHaveBeenCalledTimes(0);
    
    await expect(onMessageCbs[0]({ messageType: 'WorkerMethodCall', stinky: 'gringo', messageName: 'gringo.gringle', args: [3,2] })).resolves.toBeFalsy();
    
    expect(postMessage).toHaveBeenCalledWith({
        "data": 6,
        "messageName": "WorkerSuccessResponse",
        "messageType": "WorkerResponse",
    });
    expect(objects.gringo.gringle).toHaveBeenCalledWith(3,2);
});