import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  scale?: boolean;
  className?: string;
}

const FadeIn = ({ 
  children, 
  delay = 0, 
  duration = 0.6,
  scale = false,
  className = ''
}: FadeInProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0,
        ...(scale && { scale: 0.95 })
      }}
      animate={isInView ? { 
        opacity: 1,
        ...(scale && { scale: 1 })
      } : {}}
      transition={{ 
        duration, 
        delay,
        ease: [0.4, 0, 0.2, 1] // ease-smooth
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;





