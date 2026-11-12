export function isAbortError(error) {
    return hasName(error, 'AbortError');
}
export function isTimeoutError(error) {
    return hasName(error, 'TimeoutError');
}
function hasName(error, name) {
    if (typeof error !== 'object' || error === null)
        return false;
    if (!('name' in error))
        return false;
    return error.name === name;
}
//# sourceMappingURL=errors.js.map