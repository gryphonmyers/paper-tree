/**
 * @param {Object} options
 * @param {EventTarget} options.parentEventTarget
 * @param {(message: any) => void} options.postMessage
 * @param {(data: any) => AsyncIterator<any>|Iterator<any>} options.cb 
 */
export function createIterationMessageHandler({ parentEventTarget, postMessage, cb }) {
    /** 
     * @param {{
     *  messageType: 'WorkerDirective',
     *  messageName: 'StartIteration',
     *  data: any
     * }} message
     */
    return (message) => {
        if (isIterationMessage(message)) {
            const it = cb(message.data);

            /** @param {MessageEvent} event */
            const onMessage = async (event) => {
                const data = event?.data;

                switch (data.messageType) {
                    case 'WorkerDirective':
                        switch (data.messageName) {
                            case 'NextIteration':
                                var result = await it.next(data.data);
                                postMessage({
                                    messageType: 'WorkerResponse',
                                    messageName: 'WorkerIterationResponse',
                                    data: result
                                });
                                if (result.done) {
                                    parentEventTarget.removeEventListener('message', onMessage);
                                }
                                break;
                            case 'ReturnIteration':
                                var result = await it.return(data.data);
                                postMessage({
                                    messageType: 'WorkerResponse',
                                    messageName: 'WorkerSuccessResponse',
                                    data: result
                                });
                                parentEventTarget.removeEventListener('message', onMessage);
                                break;
                            case 'ThrowIteration':
                                var error;
                                try {
                                    await it.throw(data.error);
                                } catch (err) {
                                    error = err;
                                } finally {
                                    postMessage({
                                        messageType: 'WorkerResponse',
                                        messageName: 'WorkerErrorResponse',
                                        error
                                    });
                                    parentEventTarget.removeEventListener('message', onMessage);
                                }
                                break;
                                
                        }
                        break;
                }
            }
            parentEventTarget.addEventListener('message', onMessage)
        }
    }
   
}

/**
 * @param {any} message 
 * @returns {boolean}
 */
export function isIterationMessage(message) {
    return message?.messageType === 'WorkerDirective' &&
    message?.messageName === 'StartIteration'   
}