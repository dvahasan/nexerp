import { useEffect, useRef } from 'react';

export default function InfiniteScrollTrigger({ onVisible, hasMore, className = "py-4 flex justify-center" }) {
  const triggerRef = useRef();

  useEffect(() => {
    if (!hasMore) return;
    
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        onVisible();
      }
    }, { rootMargin: '100px' });
    
    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasMore, onVisible]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className={className}>
      <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}
