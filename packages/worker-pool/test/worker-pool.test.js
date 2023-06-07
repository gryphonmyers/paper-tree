import { expect, test, vi } from 'vitest';
import { TestWorkerPool } from './fake-worker-context.js'
import { WorkerPool } from '../src/worker-pool.js';
import { CustomEvent } from '@alfatask/custom-event-ponyfill';

test('Spawns workers when ready', async () => {
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js' });

    pool.initialize();

    expect(pool.spawnWorkerContext).toHaveBeenCalledTimes(3);

    //@ts-ignore
    expect(pool.workerContexts.length)
        .toBe(0)

    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });
    
    //@ts-ignore
    expect(pool.workerContexts.length)
        .toBe(3)
});

test('Workers take available tasks when ready, async', async () => {
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js' });

    pool.initialize();

    const myTask = { foo: 'bar' };
    const myTask2 = { fug: 'baz' };

    pool.addTask(myTask);
    pool.addTask(myTask2);

    await new Promise((resolve) => setTimeout(resolve, 10));

    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });

    expect(pool.testContexts[0].task?.message).toBe(myTask);
    expect(pool.testContexts[1].task?.message).toBe(myTask2);
    expect(pool.testContexts[2].task).toBe(null);
});

test('Workers take available tasks if ready in same frame', async () => {
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js' });

    pool.initialize();

    const myTask = { foo: 'bar' };
    const myTask2 = { fug: 'baz' };

    pool.addTask(myTask);
    pool.addTask(myTask2);
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });

    expect(pool.testContexts[0].task?.message).toBe(myTask);
    expect(pool.testContexts[1].task?.message).toBe(myTask2);
    expect(pool.testContexts[2].task).toBe(null);
});

test('postMessage is called with message from taken task', async () => {
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js' });

    pool.initialize();

    const myTask = { foo: 'bar' };
    const myTask2 = { fug: 'baz' };

    pool.addTask(myTask);
    pool.addTask(myTask2);
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });

    expect(pool.testContexts[0].postMessage).toHaveBeenCalledWith(myTask);
    expect(pool.testContexts[1].postMessage).toHaveBeenCalledWith(myTask2);
});

test('Task promise is resolved with message from worker', async () => {
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js' });

    pool.initialize();

    const myTask = { foo: 'bar' };

    const taskPromise = pool.addTask(myTask);
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });
    
    await new Promise((resolve) => setTimeout(resolve, 10));

    const messageFromWorker = { big:'boy' }
    
    pool.testContexts[0].triggerCb('onMessage', messageFromWorker);

    expect(await taskPromise).toBe(messageFromWorker);
    expect(pool.testContexts[0].task).toBe(null);
});


test('WorkerEvent message from worker is dispatched as event and does not resolve task', async () => {
    /** @type {any} */
    const eventTarget = {
        dispatchEvent: vi.fn()
    }
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js', eventTarget });

    pool.initialize();

    const myTask = { foo: 'bar' };

    const taskPromise = pool.addTask(myTask);
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });
    
    await new Promise((resolve) => setTimeout(resolve, 10));

    const messageFromWorker = { data: { myEventData: 'cool' }, messageType: 'WorkerEvent', messageName: 'myeventname' }
    
    pool.testContexts[0].triggerCb('onMessage', messageFromWorker);

    expect(eventTarget.dispatchEvent.mock.calls[0][0].detail).toEqual(messageFromWorker.data);
    expect(eventTarget.dispatchEvent.mock.calls[0][0].type).toEqual(messageFromWorker.messageName);

    const secondMessageFromWorker = { hey: 'sup' }
    
    pool.testContexts[0].triggerCb('onMessage', secondMessageFromWorker);
    expect(await taskPromise).toBe(secondMessageFromWorker);
    expect(pool.testContexts[0].task).toBe(null);
});

test('Worker picks up new task after finishing task', async () => {
    const pool = new TestWorkerPool({ numWorkers: 1, scriptPath: './my-script.js' });

    pool.initialize();

    const myTask = { foo: 'bar' };
    const myTask2 = { fug: 'baz' };

    const taskPromise = pool.addTask(myTask);
    const taskPromise2 = pool.addTask(myTask2);
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });
    
    await new Promise((resolve) => setTimeout(resolve, 10));

    const messageFromWorker = { big:'boy' }
    
    pool.testContexts[0].triggerCb('onMessage', messageFromWorker);

    expect(await taskPromise).toBe(messageFromWorker);
    expect(pool.testContexts[0].task?.message).toBe(myTask2);
    
    const message2FromWorker = { barge: 'ban' }
 
    pool.testContexts[0].triggerCb('onMessage', message2FromWorker);

    expect(await taskPromise2).toBe(message2FromWorker);    
    expect(pool.testContexts[0].task).toBe(null);
});

test('After workers are idle, new tasks get picked up', async () => {
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js' });

    pool.initialize();

    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });
    
    const myTask = { foo: 'bar' };
    const myTask2 = { fug: 'baz' };
    
    pool.addTask(myTask);
    pool.addTask(myTask2);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(pool.testContexts[0].task?.message).toBe(myTask);
    expect(pool.testContexts[1].task?.message).toBe(myTask2);
});

test('Task promise is rejected with error from worker', async () => {
    const pool = new TestWorkerPool({ numWorkers: 1, scriptPath: './my-script.js' });

    pool.initialize();
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });
    
    const myTask = { foo: 'bar' };
    
    const promise = pool.addTask(myTask);

    await new Promise((resolve) => setTimeout(resolve, 10));

    pool.testContexts[0].triggerCb('onDied', new Error('Ugh'));

    await expect(() => promise).rejects.toThrowError('Ugh');
});

test('New worker is spawned when worker dies', async () => {
    const pool = new TestWorkerPool({ numWorkers: 1, scriptPath: './my-script.js' });

    pool.initialize();
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });
    
    const myTask = { foo: 'bar' };
    const myTask2 = { bas: 'bing' };
    
    const promise = pool.addTask(myTask);
    const promise2 = pool.addTask(myTask2);

    await new Promise((resolve) => setTimeout(resolve, 10));
    
    //@ts-ignore
    expect(pool.workerContexts.length).toBe(1);
    //@ts-ignore
    const oldWorkerContext = pool.workerContexts[0];

    pool.testContexts[0].triggerCb('onDied', new Error('Ugh'));

    await expect(() => promise).rejects.toThrow();

    //@ts-ignore
    expect(pool.workerContexts.length).toBe(0);

    //@ts-ignore
    pool.testContexts[1].triggerCb('onReady');

    //@ts-ignore
    expect(pool.workerContexts.length).toBe(1);
    //@ts-ignore
    expect(pool.workerContexts[0]).not.toBe(oldWorkerContext);
    
    await new Promise((resolve) => setTimeout(resolve, 10));

    //@ts-ignore
    expect(pool.workerContexts[0].task?.message).toBe(myTask2);
});

test('WorkerPool#spawnWorkerContext throws when not overridden', () => {
    const pool = new WorkerPool({ numWorkers: 1, scriptPath: './my-script.js' });
    //@ts-ignore
    expect(() => pool.spawnWorkerContext()).toThrowError('spawnWorkerContext not implemented');
});

test.todo('WorkerPool#awaitCurrentTasks');
test.todo('onTaskCompleted option');


test('WorkerPool#iterate returns iterator facilitating worker communications', async () => {
    const pool = new TestWorkerPool({ numWorkers: 1, scriptPath: './my-script.js' });

    pool.initialize();
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });

    const it = pool.iterate({ foo: 'bar' });

    expect(typeof it[Symbol.asyncIterator]).toBe('function');

    const itr = it[Symbol.asyncIterator]();

    expect(pool.testContexts[0].task.eventTarget.constructor).toBe(EventTarget);
    
    expect(pool.testContexts[0].task.eventTarget.constructor).toBe(EventTarget);

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(1, {
        messageType: 'WorkerDirective',
        messageName: 'StartIteration',
        data: { foo: 'bar' }
    });

    const nextProm = itr.next();

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(2, {
        messageType: 'WorkerDirective',
        messageName: 'NextIteration',
        data: undefined
    });
    
    pool.testContexts[0].triggerCb('onMessage', {
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse',
        data: {
            value: {
                grub: 'dub'
            },
            done: false
        }
    });

    expect(await nextProm).toEqual({
        value: {
            grub: 'dub'
        },
        done: false
    });

    const nextProm2 = itr.next();

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(3, {
        messageType: 'WorkerDirective',
        messageName: 'NextIteration',
        data: undefined
    });

    pool.testContexts[0].triggerCb('onMessage', {
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse',
        data: {
            value: {
                smag: 'mam'
            },
            done: true
        }
    });

    expect(await nextProm2).toEqual({
        value: {
            smag: 'mam'
        },
        done: true
    });
    expect(pool.testContexts[0].postMessage).toHaveBeenCalledTimes(3);
    expect(pool.testContexts[0].task).toBe(null);
});


test('WorkerPool#iterate iterator response to return method by ending iteration', async () => {
    const pool = new TestWorkerPool({ numWorkers: 1, scriptPath: './my-script.js' });

    pool.initialize();
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });

    const it = pool.iterate({ foo: 'bar' });

    expect(typeof it[Symbol.asyncIterator]).toBe('function');

    const itr = it[Symbol.asyncIterator]();

    expect(pool.testContexts[0].task.eventTarget.constructor).toBe(EventTarget);
    
    expect(pool.testContexts[0].task.eventTarget.constructor).toBe(EventTarget);

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(1, {
        messageType: 'WorkerDirective',
        messageName: 'StartIteration',
        data: { foo: 'bar' }
    });

    const nextProm = itr.next();

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(2, {
        messageType: 'WorkerDirective',
        messageName: 'NextIteration',
        data: undefined
    });
    
    pool.testContexts[0].triggerCb('onMessage', {
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse',
        data: {
            value: {
                grub: 'dub'
            },
            done: false
        }
    });

    expect(await nextProm).toEqual({
        value: {
            grub: 'dub'
        },
        done: false
    });

    const returnProm = itr.return({foo:'abr'});

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(3, {
        messageType: 'WorkerDirective',
        messageName: 'ReturnIteration',
        data: {foo:'abr'}
    });

    pool.testContexts[0].triggerCb('onMessage', {
        messageType: 'WorkerResponse',
        messageName: 'WorkerSuccessResponse',
        data: {
            value: 'twigs',
            done: true
        }
    });

    expect(await returnProm).toEqual({
        value: 'twigs',
        done: true
    });
    expect(pool.testContexts[0].postMessage).toHaveBeenCalledTimes(3);
    expect(pool.testContexts[0].task).toBe(null);
});

test('WorkerPool#iterate iterator response to throw method by throwing error', async () => {
    const pool = new TestWorkerPool({ numWorkers: 1, scriptPath: './my-script.js' });

    pool.initialize();
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });

    const it = pool.iterate({ foo: 'bar' });

    expect(typeof it[Symbol.asyncIterator]).toBe('function');

    const itr = it[Symbol.asyncIterator]();

    expect(pool.testContexts[0].task.eventTarget.constructor).toBe(EventTarget);
    
    expect(pool.testContexts[0].task.eventTarget.constructor).toBe(EventTarget);

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(1, {
        messageType: 'WorkerDirective',
        messageName: 'StartIteration',
        data: { foo: 'bar' }
    });

    const nextProm = itr.next();

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(2, {
        messageType: 'WorkerDirective',
        messageName: 'NextIteration',
        data: undefined
    });
    
    pool.testContexts[0].triggerCb('onMessage', {
        messageType: 'WorkerResponse',
        messageName: 'WorkerIterationResponse',
        data: {
            value: {
                grub: 'dub'
            },
            done: false
        }
    });

    expect(await nextProm).toEqual({
        value: {
            grub: 'dub'
        },
        done: false
    });

    const throwProm = expect(async () => itr.throw(new Error('Uh oh'))).rejects.toThrowError(new Error('yeah no waht'));

    expect(pool.testContexts[0].postMessage).toHaveBeenNthCalledWith(3, {
        messageType: 'WorkerDirective',
        messageName: 'ThrowIteration',
        error: new Error('Uh oh')
    });

    pool.testContexts[0].triggerCb('onMessage', {
        messageType: 'WorkerResponse',
        messageName: 'WorkerErrorResponse',
        error: new Error('yeah no waht')
    });
    
    await throwProm;
});

test('Can send callMethod messages', async () => {
    const pool = new TestWorkerPool({ numWorkers: 3, scriptPath: './my-script.js' });

    pool.initialize();

    const myTask = { foo: 'bar' };

    const taskPromise = pool.callMethod('grango.boogis', '123', 5)
    
    pool.testContexts
        .forEach(context => {
            context.triggerCb('onReady');
        });

    expect(pool.testContexts[0].postMessage).toHaveBeenCalledWith({
        "args": [
            "123",
            5,
        ],
        "messageType": "WorkerMethodCall",
        "messageName": "grango.boogis",
    })
});


test.todo('Filtering of iteration')