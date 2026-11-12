export function isAbortError(error: unknown): boolean {
  return hasName(error, 'AbortError');
}
export function isTimeoutError(error: unknown): boolean {
  return hasName(error, 'TimeoutError');
}
function hasName(error: unknown, name: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (!('name' in error)) return false;
  return error.name === name;
}
