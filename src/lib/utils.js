
export function withTimeout(promise, ms, message = "Request Timed out (offline?)") {
    if (typeof ms !== "number" || ms <= 0) {
    // If ms is invalid, just return the original promise (fail-safe)
        return promise;
    }

    promise.catch(() => {}); // Prevent unhandled rejection if original promise fail

    let timerId;

    const timeoutPromise = new Promise((_, reject) => {
        timerId = setTimeout(() => reject(new Error(message)), ms);
    });

    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
    ]).finally(() => {
        if (timerId) clearTimeout(timerId);
    })
}