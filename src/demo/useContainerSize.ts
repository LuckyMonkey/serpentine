import { useLayoutEffect, useState } from 'react';

export function useContainerSize(node: HTMLElement | null) {
  const [size, setSize] = useState({ width: 1200, height: 640 });

  useLayoutEffect(() => {
    if (!node) {
      return;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(440, Math.floor(rect.height))
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [node]);

  return size;
}

