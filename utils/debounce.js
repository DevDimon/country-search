export function debounce(fn, delay) {
    let timer = null;
    let lastArgs = null;
    const debounced = (...args) => {
        lastArgs = args;
        if (timer !== null)
            clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            const callArgs = lastArgs;
            lastArgs = null;
            if (callArgs)
                fn(...callArgs);
        }, delay);
    };
    debounced.cancel = () => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        lastArgs = null;
    };
    debounced.flush = () => {
        if (timer === null)
            return;
        clearTimeout(timer);
        timer = null;
        const callArgs = lastArgs;
        lastArgs = null;
        if (callArgs)
            fn(...callArgs);
    };
    return debounced;
}
//# sourceMappingURL=debounce.js.map