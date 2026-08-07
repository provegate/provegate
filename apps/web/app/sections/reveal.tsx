'use client';

import * as React from 'react';

/** Reveal-on-scroll: adds `.pg-in` when the element enters the viewport. Motion
 * is CSS-gated by `prefers-reduced-motion` (see globals.css); if the observer is
 * unavailable or reduced motion is on, content is simply visible. */
export function Reveal({
  children,
  as: Tag = 'div',
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  as?: keyof React.JSX.IntrinsicElements;
}): React.JSX.Element {
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.classList.add('pg-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('pg-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Comp = Tag as React.ElementType;
  return (
    <Comp ref={ref} className="pg-reveal" {...rest}>
      {children}
    </Comp>
  );
}
