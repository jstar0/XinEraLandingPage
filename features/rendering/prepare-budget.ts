/** Yield to painting/input without depending on a visible tab's animation clock. */
export async function nextPreparationTask(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const scheduler = (
    globalThis as typeof globalThis & {
      scheduler?: { yield?: () => Promise<void> };
    }
  ).scheduler;
  await new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => signal?.removeEventListener("abort", abort);
    const abort = () => {
      if (timer !== undefined) clearTimeout(timer);
      cleanup();
      reject(signal?.reason);
    };
    const complete = () => {
      cleanup();
      resolve();
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (scheduler?.yield) {
      scheduler.yield().then(complete, (error: unknown) => {
        cleanup();
        reject(error);
      });
    } else {
      timer = setTimeout(complete, 0);
    }
  });
  signal?.throwIfAborted();
}
