import { useState, useEffect, useCallback } from 'react';

export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    return initialValue;
  });

  const setPersistentState = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setState(prev => {
          const nextValue = value instanceof Function ? value(prev) : value;
          if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(nextValue));
          }
          return nextValue;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [state, setPersistentState];
}
