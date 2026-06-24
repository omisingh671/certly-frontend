export const createSingleFlight = <T>() => {
  let activePromise: Promise<T> | null = null;

  return (task: () => Promise<T>): Promise<T> => {
    if (activePromise !== null) {
      return activePromise;
    }

    activePromise = task().finally(() => {
      activePromise = null;
    });

    return activePromise;
  };
};
