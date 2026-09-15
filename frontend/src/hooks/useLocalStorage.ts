import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStorage<T>(key, defaultValue));

  useEffect(() => {
    writeStorage(key, value);
  }, [key, value]);

  return [value, setValue];
}

