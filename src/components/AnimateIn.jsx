// Pembungkus animasi entrance dengan delay — untuk efek stagger (berurutan)
const VARIAN = {
  up: 'anim-up', down: 'anim-down', pop: 'anim-pop',
  left: 'anim-left', right: 'anim-right', in: 'anim-in',
};

export default function AnimateIn({ children, delay = 0, variant = 'up', className = '' }) {
  return (
    <div style={{ animationDelay: `${delay}ms` }} className={`${VARIAN[variant] ?? 'anim-up'} ${className}`}>
      {children}
    </div>
  );
}