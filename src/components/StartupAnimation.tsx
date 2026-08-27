import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StartupAnimationProps {
  onComplete: () => void;
}

export const StartupAnimation: React.FC<StartupAnimationProps> = ({ onComplete }) => {
  // Phase 0: Initial dark stage
  // Phase 1: Small elegant heart appears and smoothly grows
  // Phase 2: Heart gently bursts into subtle light / glow
  // Phase 3: "LOVE YOU" appears smoothly
  // Phase 4: Complete
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    // Stage 1: Heart appears & grows (0ms -> 700ms)
    const t1 = setTimeout(() => setPhase(1), 100);
    // Stage 2: Heart gently bursts into golden light (1200ms)
    const t2 = setTimeout(() => setPhase(2), 1100);
    // Stage 3: "LOVE YOU" text appears smoothly (1700ms)
    const t3 = setTimeout(() => setPhase(3), 1600);
    // Stage 4: Completes quickly (2800ms)
    const t4 = setTimeout(() => {
      setPhase(4);
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <motion.div
      id="startup-animation-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={() => onComplete()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080b] cursor-pointer overflow-hidden"
    >
      {/* Background ambient luxury glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div
          animate={{
            scale: phase >= 2 ? [1, 1.8, 1.4] : 1,
            opacity: phase >= 2 ? [0.15, 0.45, 0.2] : 0.05,
          }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-[#c28b51]/20 via-[#e0a96d]/15 to-transparent blur-[80px]"
        />
      </div>

      <div className="relative flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {phase < 3 && (
            <motion.div
              key="heart-stage"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={
                phase === 1
                  ? { scale: 1.2, opacity: 1 }
                  : phase === 2
                  ? { scale: 2.2, opacity: 0, filter: 'blur(8px)' }
                  : { scale: 0.4, opacity: 0.8 }
              }
              exit={{ opacity: 0 }}
              transition={{
                duration: phase === 2 ? 0.5 : 0.9,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative flex items-center justify-center"
            >
              {/* Elegant luxury heart svg */}
              <svg
                className="w-16 h-16 text-[#e0a96d] drop-shadow-[0_0_25px_rgba(224,169,109,0.6)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>

              {/* Burst glow ring */}
              {phase === 2 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.9 }}
                  animate={{ scale: 3.5, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border border-[#e0a96d]/60"
                />
              )}
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div
              key="brand-stage"
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center px-4"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <svg
                  className="w-5 h-5 text-[#e0a96d]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl tracking-[0.25em] font-medium text-[#f5ede3] uppercase">
                LOVE YOU
              </h1>
              <p className="mt-2 text-xs tracking-[0.2em] uppercase text-[#e0a96d]/70 font-sans">
                Private Space For Two
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 text-[11px] tracking-widest text-[#a0a5b5]/40 uppercase">
        Tap to continue
      </div>
    </motion.div>
  );
};
