import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast(duration = 2200): [string | null, (msg: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (msg: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(msg);
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return [message, show];
}
