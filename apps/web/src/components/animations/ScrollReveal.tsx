import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}

const ScrollReveal = ({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 0.8,
  className = ''
}: ScrollRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const directionOffset = {
    up: { y: 60, x: 0 },
    down: { y: -60, x: 0 },
    left: { y: 0, x: 60 },
    right: { y: 0, x: -60 },
  };

  const offset = directionOffset[direction];

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        y: offset.y,
        x: offset.x,
      }}
      animate={isInView ? { 
        opacity: 1, 
        y: 0,
        x: 0,
      } : {}}
      transition={{ 
        duration, 
        delay,
        ease: [0.16, 1, 0.3, 1] // ease-out-expo
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;





