import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreSparklineProps {
  score: number;
  previousScore?: number;
}

export const ScoreSparkline = ({ score, previousScore = 0 }: ScoreSparklineProps) => {
  const [showDelta, setShowDelta] = useState(false);
  const delta = score - previousScore;

  useEffect(() => {
    if (delta !== 0) {
      setShowDelta(true);
      const timer = setTimeout(() => setShowDelta(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [delta]);

  if (!showDelta || delta === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      className={`absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-bold ${
        delta > 0 
          ? 'bg-green-500/20 text-green-600 border border-green-500' 
          : 'bg-red-500/20 text-red-600 border border-red-500'
      }`}
    >
      {delta > 0 ? '+' : ''}{delta}
    </motion.div>
  );
};
