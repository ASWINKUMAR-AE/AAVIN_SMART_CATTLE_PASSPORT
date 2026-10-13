import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  NativeTouchEvent,
} from 'react-native';

interface ScrollContextType {
  isScrolled: boolean;
  scrollY: number;
  barsVisible: boolean;
  setIsScrolled: (scrolled: boolean) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onTouchStart: (event: NativeSyntheticEvent<NativeTouchEvent>) => void;
  onTouchMove: (event: NativeSyntheticEvent<NativeTouchEvent>) => void;
  resetScroll: () => void;
}

const ScrollContext = createContext<ScrollContextType>({
  isScrolled: false,
  scrollY: 0,
  barsVisible: false,
  setIsScrolled: () => {},
  onScroll: () => {},
  onTouchStart: () => {},
  onTouchMove: () => {},
  resetScroll: () => {},
});

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [barsVisible, setBarsVisible] = useState(false);
  const previousScrollY = React.useRef(0);
  const touchStartY = React.useRef<number | null>(null);

  const updateScrollPosition = useCallback((y: number) => {
    if (y < previousScrollY.current) {
      setBarsVisible(true);
    } else if (y > previousScrollY.current) {
      setBarsVisible(false);
    }

    previousScrollY.current = y;
    setScrollY(y);
    setIsScrolled(y > 8);
  }, []);

  // For Web: Automatically listen to DOM scroll events in the capture phase
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement | Document;
      let top = 0;
      if (target && 'scrollTop' in target && typeof (target as HTMLElement).scrollTop === 'number') {
        top = (target as HTMLElement).scrollTop;
      } else {
        top = window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
      }

      updateScrollPosition(top);
    };

    // Capture phase intercepts scroll events from ANY scrollable container / ScrollView
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
    };
  }, [updateScrollPosition]);

  // For Native (iOS / Android): onScroll handler for ScrollView
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateScrollPosition(event.nativeEvent.contentOffset.y);
  }, [updateScrollPosition]);

  const onTouchStart = useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    touchStartY.current = event.nativeEvent.touches[0]?.pageY ?? null;
  }, []);

  const onTouchMove = useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const currentY = event.nativeEvent.touches[0]?.pageY;
    const startY = touchStartY.current;
    if (currentY === undefined || startY === null) return;

    const deltaY = currentY - startY;
    if (Math.abs(deltaY) < 8) return;

    if (deltaY > 0) {
      setBarsVisible(true);
    } else {
      setBarsVisible(false);
    }
    touchStartY.current = currentY;
  }, []);

  const resetScroll = useCallback(() => {
    setScrollY(0);
    setIsScrolled(false);
    previousScrollY.current = 0;
    touchStartY.current = null;
  }, []);

  return (
    <ScrollContext.Provider
      value={{
        isScrolled,
        scrollY,
        barsVisible,
        setIsScrolled,
        onScroll,
        onTouchStart,
        onTouchMove,
        resetScroll,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => useContext(ScrollContext);
