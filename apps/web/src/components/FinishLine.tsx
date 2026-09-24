import React from 'react';
import { motion } from 'framer-motion';

interface FinishLineProps {
  topPosition: string;
  className?: string;
}

const FinishLine: React.FC<FinishLineProps> = ({ topPosition, className = "" }) => {
  return (
    <div 
      className={`absolute left-0 right-0 flex items-center justify-center z-70 pointer-events-none ${className}`}
      style={{ top: topPosition }}
    >
      <motion.div
        className="w-32 md:w-40"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <div className="relative">
          {/* Damier de fin de course */}
          <div className="h-20 shadow-2xl">
            <svg width="100%" height="100%" className="w-full h-full">
              <defs>
                <pattern id="checkerboard" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="10" height="10" fill="black" />
                  <rect x="10" y="10" width="10" height="10" fill="black" />
                  <rect x="10" y="0" width="10" height="10" fill="white" />
                  <rect x="0" y="10" width="10" height="10" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#checkerboard)" />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FinishLine;
