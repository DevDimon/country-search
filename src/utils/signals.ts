export interface TimedSignal {
  signal: AbortSignal;
  dispose: () => void;
}
type AbortSignalConstructor = typeof AbortSignal & {
  any?: (signals: AbortSignal[]) => AbortSignal;
};

export function createTimedSignal(userSignal: AbortSignal, timeoutMs: number): TimedSignal {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new DOMException('The request timed out', 'TimeoutError'));
  }, timeoutMs);
  return {
    signal: anySignal([userSignal, timeoutController.signal]),
    dispose: () => clearTimeout(timer),
  };
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const ctor = AbortSignal as AbortSignalConstructor;
  if (typeof ctor.any === 'function') return ctor.any(signals);
  const controller = new AbortController();
  const abortFrom = (source: AbortSignal): void => {
    if (!controller.signal.aborted) controller.abort(source.reason);
  };
  for (const source of signals) {
    if (source.aborted) {
      abortFrom(source);
      break;
    }
    source.addEventListener('abort', () => abortFrom(source), { once: true });
  }
  return controller.signal;
}
