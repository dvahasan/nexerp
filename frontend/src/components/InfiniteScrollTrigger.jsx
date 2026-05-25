import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';

export default function InfiniteScrollTrigger({ onVisible, hasMore }) {
  const { theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';
  const triggerRef = useRef();

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) onVisible();
    }, { rootMargin: '100px' });
    if (triggerRef.current) observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [hasMore, onVisible]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        border: `2px solid ${t.border}`,
        borderTopColor: primary,
        animation: 'spin 600ms linear infinite',
      }} />
    </div>
  );
}
