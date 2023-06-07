import { expect, test, vi } from 'vitest';
import { TestWorkerPool } from './fake-worker-context.js'
import { WorkerPool } from '../src/worker-pool.js';
import { CustomEvent } from '@alfatask/custom-event-ponyfill';
import { createIterationMessageHandler } from '../src/create-iteration-message-handler.js';

test('Handles iteration messages', async () => {
    /** @type {any} */
    const eventTarget = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
    };
    const postMessage = vi.fn();
    
    let ii = 0;
    /** @type {AsyncIterator<any>} */
    const it = {
        next: vi.fn(async () => {
            switch (ii++) {
                case 0:
                    return {
                        value: '12',
                        done: false
                    }
                case 1:
                    return {
                        value: '63',
                        done: false
                    }
                case 2:
                    return {
                        value: '99',
                        done: true
                    }
            }
        }),
        return: vi.fn(async () => ({
            value: '82',
            done: true
        })),
        throw: vi.fn(async (error) => {
            throw error
        })
    }
    const cb = vi.fn(() => it);

    const handler = createIterationMessageHandler({ parentEventTarget: eventTarget, postMessage, cb });

    handler({
        messageName: 'StartIteration',
        messageType: 'WorkerDirective',
        data: { foo: 'boo' }
    })

    expect(cb).toHaveBeenCalledWith({ foo: 'boo' });

    const onMessage = eventTarget.addEventListener.mock.calls[0][1];

    onMessage({
        data: {
            messageType: 'WorkerDirective',
            messageName: 'NextIteration'
        }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(it.next).toHaveBeenCalled();
    expect(it.next).toHaveReturnedWith({
        value: '12',
        done: false
    })

    expect(postMessage).toHaveBeenCalledWith({
        data: {
            value: '12',
            done: false
        },
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse'
    });

    expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(0);

    onMessage({
        data: {
            messageType: 'WorkerDirective',
            messageName: 'NextIteration'
        }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(it.next).toHaveBeenCalledTimes(2);
    expect(it.next).toHaveReturnedWith({
        value: '63',
        done: false
    })

    expect(postMessage).toHaveBeenCalledWith({
        data: {
            value: '63',
            done: false
        },
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse'
    });
    
    expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(0);
    
    onMessage({
        data: {
            messageType: 'WorkerDirective',
            messageName: 'NextIteration'
        }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(it.next).toHaveBeenCalledTimes(3);
    expect(it.next).toHaveReturnedWith({
        value: '99',
        done: true
    })

    expect(postMessage).toHaveBeenCalledWith({
        data: {
            value: '99',
            done: true
        },
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse'
    });
    
    expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(1);
    expect(eventTarget.removeEventListener).toHaveBeenCalledWith('message', onMessage);
});

test('Handles return method', async () => {
    /** @type {any} */
    const eventTarget = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
    };
    const postMessage = vi.fn();
    
    let ii = 0;
    /** @type {AsyncIterator<any>} */
    const it = {
        next: vi.fn(async () => {
            switch (ii++) {
                case 0:
                    return {
                        value: '12',
                        done: false
                    }
                case 1:
                    return {
                        value: '63',
                        done: false
                    }
                case 2:
                    return {
                        value: '99',
                        done: true
                    }
            }
        }),
        return: vi.fn(async () => ({
            value: '82',
            done: true
        })),
        throw: vi.fn(async (error) => {
            throw error
        })
    }
    const cb = vi.fn(() => it);

    const handler = createIterationMessageHandler({ parentEventTarget: eventTarget, postMessage, cb });

    handler({
        messageName: 'StartIteration',
        messageType: 'WorkerDirective',
        data: { foo: 'boo' }
    })

    expect(cb).toHaveBeenCalledWith({ foo: 'boo' });

    const onMessage = eventTarget.addEventListener.mock.calls[0][1];

    onMessage({
        data: {
            messageType: 'WorkerDirective',
            messageName: 'NextIteration'
        }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(it.next).toHaveBeenCalled();
    expect(it.next).toHaveReturnedWith({
        value: '12',
        done: false
    })

    expect(postMessage).toHaveBeenCalledWith({
        data: {
            value: '12',
            done: false
        },
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse'
    });

    expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(0);
    
    onMessage({
        data: {
            messageType: 'WorkerDirective',
            messageName: 'ReturnIteration',
            data: {
                blig: 'wig'
            }
        }
    });

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(it.return).toHaveBeenCalledTimes(1);
    expect(it.return).toHaveReturnedWith({
        value: '82',
        done: true
    });
    
    expect(postMessage).toHaveBeenNthCalledWith(2, {
        data: {
            value: '82',
            done: true
        },
        messageType: 'WorkerResponse',
        messageName: 'WorkerSuccessResponse'
    });
    
    expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(1);
    expect(eventTarget.removeEventListener).toHaveBeenCalledWith('message', onMessage);
});

test('Handles throw method', async () => {
    /** @type {any} */
    const eventTarget = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
    };
    const postMessage = vi.fn();
    
    let ii = 0;
    /** @type {AsyncIterator<any>} */
    const it = {
        next: vi.fn(async () => {
            switch (ii++) {
                case 0:
                    return {
                        value: '12',
                        done: false
                    }
                case 1:
                    return {
                        value: '63',
                        done: false
                    }
                case 2:
                    return {
                        value: '99',
                        done: true
                    }
            }
        }),
        return: vi.fn(async () => ({
            value: '82',
            done: true
        })),
        throw: vi.fn(async (error) => {
            throw error
        })
    }
    const cb = vi.fn(() => it);

    const handler = createIterationMessageHandler({ parentEventTarget: eventTarget, postMessage, cb });

    handler({
        messageName: 'StartIteration',
        messageType: 'WorkerDirective',
        data: { foo: 'boo' }
    })

    expect(cb).toHaveBeenCalledWith({ foo: 'boo' });

    const onMessage = eventTarget.addEventListener.mock.calls[0][1];

    onMessage({
        data: {
            messageType: 'WorkerDirective',
            messageName: 'NextIteration'
        }
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(it.next).toHaveBeenCalled();
    expect(it.next).toHaveReturnedWith({
        value: '12',
        done: false
    })

    expect(postMessage).toHaveBeenCalledWith({
        data: {
            value: '12',
            done: false
        },
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse'
    });

    expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(0);
    
    onMessage({
        data: {
            messageType: 'WorkerDirective',
            messageName: 'ThrowIteration',
            error: new Error('Whoops')
        }
    });

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(it.throw).toHaveBeenCalledTimes(1);
    
    expect(postMessage).toHaveBeenNthCalledWith(2, {
        error: new Error('Whoops'),
        messageType: 'WorkerResponse',
        messageName: 'WorkerErrorResponse'
    });
    
    expect(eventTarget.removeEventListener).toHaveBeenCalledTimes(1);
    expect(eventTarget.removeEventListener).toHaveBeenCalledWith('message', onMessage);
});