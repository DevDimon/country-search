export function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  return new DOMException(
    typeof reason === 'string' ? reason : 'The operation was aborted',
    'AbortError',
  );
}
