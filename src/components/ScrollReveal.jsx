import {
  useEffect,
  useRef,
  useState,
} from 'react';


export default function ScrollReveal({
  children,

  className = '',

  delay = 0,

  distance = 14,

  once = true,

  threshold = 0.08,
}) {
  const ref =
    useRef(
      null
    );


  const [
    visible,
    setVisible,
  ] =
    useState(
      false
    );


  useEffect(
    () => {
      const element =
        ref.current;


      if (!element) {
        return undefined;
      }


      const reducedMotion =
        window.matchMedia?.(
          '(prefers-reduced-motion: reduce)'
        );


      if (
        reducedMotion?.matches
      ) {
        setVisible(
          true
        );

        return undefined;
      }


      const observer =
        new IntersectionObserver(
          (
            entries
          ) => {
            entries.forEach(
              (
                entry
              ) => {
                if (
                  entry.isIntersecting
                ) {
                  setVisible(
                    true
                  );


                  if (
                    once
                  ) {
                    observer.unobserve(
                      entry.target
                    );
                  }
                } else if (
                  !once
                ) {
                  setVisible(
                    false
                  );
                }
              }
            );
          },
          {
            threshold,

            rootMargin:
              '0px 0px -20px 0px',
          }
        );


      observer.observe(
        element
      );


      return () => {
        observer.disconnect();
      };
    },
    [
      once,
      threshold,
    ]
  );


  return (
    <div
      ref={
        ref
      }
      className={`transition-[opacity,transform] duration-[420ms] ease-out ${className}`}
      style={{
        opacity:
          visible
            ? 1
            : 0,

        transform:
          visible
            ? 'translate3d(0,0,0)'
            : `translate3d(0,${distance}px,0)`,

        transitionDelay:
          `${delay}ms`,

        willChange:
          'opacity, transform',
      }}
    >
      {
        children
      }
    </div>
  );
}