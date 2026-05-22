import { useState, useEffect, useRef } from 'react';

/**
 * LazyScroll — two modes:
 *
 * Default (alwaysRender=false):
 *   Children are NOT rendered until they enter the viewport.
 *   A minHeight placeholder reserves space so the page doesn't collapse.
 *   Use for large sections / heavy components.
 *
 * alwaysRender=true:
 *   Children are always in the DOM (layout preserved, no shifts).
 *   They start opacity-0 and animate fade-in-from-bottom when they enter the viewport.
 *   Use for compact list rows where stable layout matters.
 */
export default function LazyScroll({
  children,
  className = '',
  rootMargin = '150px',
  minHeight = '200px',
  alwaysRender = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const el = domRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  // ── alwaysRender mode: content is in DOM but invisible until it enters viewport ──
  if (alwaysRender) {
    return (
      <div ref={domRef} className={className}>
        <div
          className={
            isVisible
              ? 'animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out'
              : 'opacity-0'
          }
        >
          {children}
        </div>
      </div>
    );
  }

  // ── Default mode: placeholder → render + animate when entering viewport ──
  return (
    <div
      ref={domRef}
      className={className}
      style={{ minHeight: isVisible ? undefined : minHeight }}
    >
      {isVisible && (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out">
          {children}
        </div>
      )}
    </div>
  );
}
