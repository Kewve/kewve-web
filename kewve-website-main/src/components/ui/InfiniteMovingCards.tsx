'use client';

import { useEffect, useState, useRef, ReactElement } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from 'react-use-draggable-scroll';
import { cn } from '@/utils';

interface InfiniteMovingCardsProps {
  direction?: 'left' | 'right';
  speed?: 'fast' | 'normal' | 'slow';
  pauseOnHover?: boolean;
  className?: string;
  children: ReactElement;
}

export const InfiniteMovingCards = ({
  direction = 'left',
  speed = 'slow',
  pauseOnHover = true,
  className,
  children,
}: InfiniteMovingCardsProps) => {
  const [start, setStart] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLInputElement>;
  const scrollerRef = useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement>;
  const { events } = useDraggable(containerRef, {
    applyRubberBandEffect: false,
    activeMouseButton: 'Left',
  });

  useEffect(() => {
    addAnimation();
  }, []);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }
  const getDirection = () => {
    if (containerRef.current) {
      if (direction === 'left') {
        containerRef.current.style.setProperty('--animation-direction', 'forwards');
      } else {
        containerRef.current.style.setProperty('--animation-direction', 'reverse');
      }
    }
  };
  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === 'fast') {
        containerRef.current.style.setProperty('--animation-duration', '20s');
      } else if (speed === 'normal') {
        containerRef.current.style.setProperty('--animation-duration', '40s');
      } else {
        containerRef.current.style.setProperty('--animation-duration', '80s');
      }
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className={cn('scroller relative z-20 pt-4 w-full overflow-hidden cursor-grab', className)}
      {...events}>
      <div
        ref={scrollerRef}
        className={cn(
          'flex min-w-full shrink-0 gap-4 lg:gap-8 w-max flex-nowrap cursor-grab',
          start && 'animate-scroll ',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}>
        {children}
      </div>
    </motion.div>
  );
};
