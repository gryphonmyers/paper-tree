/**
 * @param {(message: any) => void} postMessage 
 * @param {(message: any) => void} cb 
 * @returns {(message: any) => Promise<void>}
 */
export function createMessageHandler(postMessage, cb) {
    /** @param {any} message */
    return async (message) => {
        if (message?.messageType === 'WorkerDirective')
            return;
        let error;
        let data;
        try {
            data = await cb(message);
        } catch (err) {
            error = err;
        } finally {
            if (error) postMessage({ messageType: 'WorkerResponse', messageName: 'WorkerErrorResponse', error: { 
                    message: error.message,
                    stack: error.stack,
                    ...error 
                } 
            });
            else postMessage({ messageType: 'WorkerResponse', messageName: 'WorkerSuccessResponse', data });
        }
    }
}