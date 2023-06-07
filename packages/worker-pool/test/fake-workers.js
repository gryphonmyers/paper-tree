export class FakeWorker extends EventTarget {
    onerror() {

    }
    onmessage() {

    }
    onmessageerror() {

    }
    terminate() {

    }
    // onterminate() {

    // }
    /**
     * @param {MessageEvent} m
     */
    postMessage(m) {
        this.messages.push(m);
    }
    /** @type {MessageEvent[]} */
    messages = []
}

globalThis.Worker = FakeWorker