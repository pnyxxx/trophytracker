import { motion } from 'framer-motion';

interface Car4LProps {
  className?: string;
  withSmoke?: boolean;
  position?: 'start' | 'moving';
}

const Car4L = ({ className = '', withSmoke = true, position = 'moving' }: Car4LProps) => {
  return (
    <div className={`relative ${className}`}>
      {/* Fumée d'échappement animée - TOUJOURS de bas vers le haut */}
      {withSmoke && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          {/* Fumée principale - Plus dense */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <motion.div
              key={i}
              className="absolute w-5 h-5 bg-gray-300/50 rounded-full blur-sm"
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: [0, -40, -80, -120],
                x: [0, Math.random() * 20 - 10, Math.random() * 25 - 12.5, Math.random() * 30 - 15],
                opacity: [0.8, 0.6, 0.3, 0],
                scale: [0.6, 1, 1.5, 2],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* Fumée secondaire - Plus nombreuse */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={`secondary-${i}`}
              className="absolute w-3 h-3 bg-gray-400/40 rounded-full blur-sm"
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: [0, -35, -70, -105],
                x: [0, Math.random() * 15 - 7.5, Math.random() * 20 - 10, Math.random() * 25 - 12.5],
                opacity: [0.6, 0.4, 0.2, 0],
                scale: [0.5, 0.8, 1.2, 1.6],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* Fumée fine - Encore plus */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={`fine-${i}`}
              className="absolute w-2 h-2 bg-gray-500/30 rounded-full blur-sm"
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: [0, -30, -60, -90],
                x: [0, Math.random() * 12 - 6, Math.random() * 18 - 9, Math.random() * 22 - 11],
                opacity: [0.5, 0.3, 0.15, 0],
                scale: [0.4, 0.7, 1, 1.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* Particules de poussière - Plus nombreuses */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <motion.div
              key={`dust-${i}`}
              className="absolute w-1 h-1 bg-amber-200/60 rounded-full blur-sm"
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: [0, -25, -50, -75],
                x: [0, Math.random() * 10 - 5, Math.random() * 15 - 7.5, Math.random() * 18 - 9],
                opacity: [0.4, 0.2, 0.1, 0],
                scale: [0.3, 0.6, 0.9, 1.2],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.08,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* Fumée épaisse de démarrage */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`thick-${i}`}
              className="absolute w-6 h-6 bg-gray-200/60 rounded-full blur-md"
              initial={{ y: 0, opacity: 0 }}
              animate={{
                y: [0, -50, -100, -150],
                x: [0, Math.random() * 8 - 4, Math.random() * 12 - 6, Math.random() * 16 - 8],
                opacity: [0.7, 0.5, 0.2, 0],
                scale: [0.8, 1.2, 1.8, 2.5],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}

      {/* Voiture 4L - Image PNG */}
      <motion.div
        animate={{
          y: [0, -1, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <img
          src="/images/illustrations/4l.webp"
          alt="Renault 4L rouge vue de haut"
          className="w-full h-full object-contain drop-shadow-xl"
        />
        
        {/* Lueur autour de la voiture */}
        <motion.div
          className="absolute inset-0 -z-10 bg-primary/20 rounded-full blur-lg"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </div>
  );
};

export default Car4L;

