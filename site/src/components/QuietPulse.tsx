import { motion } from 'motion/react';

export default function QuietPulse() {
  return (
    <motion.span
      className="qt-pulse"
      initial={{ x: '-100%', opacity: 1 }}
      animate={{ x: ['-100%', '0%', '0%'], opacity: [1, 1, 0] }}
      transition={{ duration: 1.5, times: [0, 0.78, 1], ease: 'easeInOut' }}
    />
  );
}
