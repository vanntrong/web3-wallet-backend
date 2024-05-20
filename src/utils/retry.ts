export const retry = async <T>(
  promise: (currentAttempt: number) => T,
  time = 3,
) => {
  let current = 1;
  while (current <= time) {
    try {
      console.log('retry', current);
      const res = await promise(current);
      return res;
    } catch (error) {
      if (current === time) throw error;
      current += 1;
    }
  }
};
