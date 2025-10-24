// Utilidades para eventos y arrays
export const toggleItemInArray = <T,>(arr: T[], value: T): T[] => {
  if (arr.includes(value)) {
    return arr.filter(item => item !== value);
  }
  return [...arr, value];
};

export const sortNumericArray = (arr: number[]) => [...arr].sort((a, b) => a - b);
