import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface AnimatedCounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  label: string;
  duration?: number;
}

const AnimatedCounter = ({ end, prefix = '', suffix = '', label, duration = 2 }: AnimatedCounterProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="text-3xl sm:text-4xl font-extrabold text-primary">
        {prefix}{count.toLocaleString('es-AR')}{suffix}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
};

export default AnimatedCounter;
