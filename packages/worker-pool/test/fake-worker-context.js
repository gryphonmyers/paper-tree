import { vi } from 'vitest';
import { WorkerPool } from '../src/worker-pool.js';
/**
 * @typedef {import('../src/worker-pool.js').WorkerContext & { triggerCb: (name: string, ...args: any[]) => void}} TestContext
 */
export class TestWorkerPool extends WorkerPool {
    /** @type {TestContext[]} */
    testContexts = []
    spawnWorkerContext = vi.fn(() => {
        /** @type {Record<string, Function>} */
        const cbs = {
            onReady: null,
            onDied: null,
            onMessage: null,
            posMessage: null
        }
        /** @type {TestContext} */
        const context = {
            onReady: vi.fn((cb) => {
                cbs.onReady = cb
            }),
            onDied: vi.fn((cb) => {
                cbs.onDied = cb
            }),
            onMessage: vi.fn((cb) => {
                cbs.onMessage = cb
            }),
            postMessage: vi.fn((cb) => {
                cbs.postMessage = cb
            }),
            task: null,
            takeTask: null,
            triggerCb(name, ...args){
                cbs[name](...args)
            }
        }
        this.testContexts.push(context)
        return context
    })
}