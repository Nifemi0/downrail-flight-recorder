/** Retry only failures that look transient; do not repeat schema or validation errors. */
export async function retryTransient<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/timeout|timed out|network|fetch failed|\b429\b|\b502\b|\b503\b|\b504\b/i.test(message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 200));
    return operation();
  }
}
