/* eslint-disable no-undef */
import { useEffect, useRef, RefObject } from 'react';

interface UseResizeObserverOptions {
  debounceMs?: number;
}

export function useResizeObserver<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: (entry: ResizeObserverEntry) => void,
  options: UseResizeObserverOptions = {}
) {
  const { debounceMs = 100 } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        for (const entry of entries) {
          callbackRef.current(entry);
        }
      }, debounceMs);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      observer.disconnect();
    };
  }, [ref, debounceMs]);
}
