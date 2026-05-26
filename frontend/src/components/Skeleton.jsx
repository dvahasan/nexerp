import { useAppContext } from '../context/AppContext';
import { T } from '../theme';

export default function Skeleton({ className = "", shape = "rect" }) {
  const { theme } = useAppContext();
  const t = T[theme] || T.light;

  let borderRadius = '4px';
  if (shape === 'circle') borderRadius = '50%';
  else if (shape === 'text') borderRadius = '3px';

  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ backgroundColor: t.border, borderRadius }}
    />
  );
}
