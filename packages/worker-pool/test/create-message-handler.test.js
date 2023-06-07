import { expect, test, vi } from 'vitest';
import { createMessageHandler } from '../src/create-message-handler.js';

test('Can create message handler that posts success message', async () => {
    const postMessage = vi.fn();
    /**
     * @param {*} message 
     */
    const cb = vi.fn(async message => {
        return message.foo * 2;
    });

    const handler = createMessageHandler(postMessage, cb);

    await expect(handler({ foo: 2 })).resolves.toBeFalsy();

    expect(postMessage).toHaveBeenCalledWith({
        "data": 4,
        "messageName": "WorkerSuccessResponse",
        "messageType": "WorkerResponse",
    });
});

test('Can create message handler that posts failure message', async () => {
    const postMessage = vi.fn();
    /**
     * @param {*} message 
     */
    const cb = vi.fn(async message => {
        throw new Error('Nooo')
    });

    const handler = createMessageHandler(postMessage, cb);

    await handler({ foo: 2 });

    expect(postMessage).toHaveBeenCalledWith({
        error: new Error('Nooo'),
        "messageName": "WorkerErrorResponse",
        "messageType": "WorkerResponse",
    });
});

test('Does not handle worker directives', async () => {
    const postMessage = vi.fn();
    /**
     * @param {*} message 
     */
    const cb = vi.fn(async message => {
        throw new Error('Nooo')
    });

    const handler = createMessageHandler(postMessage, cb);

    await expect(handler({ messageType: 'WorkerDirective', messageName: 'Goo' })).resolves.toBeFalsy();

    expect(postMessage).toHaveBeenCalledTimes(0);
    expect(cb).toHaveBeenCalledTimes(0);
});