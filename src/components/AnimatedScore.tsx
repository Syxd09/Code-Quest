import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface AnimatedScoreProps {
  score: number;
  className?: string;
}

export const AnimatedScore = ({ score, className = "" }: AnimatedScoreProps) => {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(score);
  }, [score, spring]);

  return (
    <motion.span
      className={className}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.3 }}
      key={score}
    >
      {display}
    </motion.span>
  );
};
