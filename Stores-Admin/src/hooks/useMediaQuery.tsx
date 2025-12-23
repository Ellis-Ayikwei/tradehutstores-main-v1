import { useState, useEffect } from 'react';

/**
 * A hook that returns a boolean indicating if the current window matches the given media query
 * 
 * @param query The media query to check (e.g. '(max-width: 768px)')
 * @returns A boolean indicating if the media query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * // Now you can conditionally render based on screen size
 * return isMobile ? <MobileView /> : <DesktopView />;
 */
const useMediaQuery = (query: string): boolean => {
  // Initialize with the current match state
  const [matches, setMatches] = useState<boolean>(() => {
    // For SSR support, check if window exists
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // For SSR support
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Update the state initially
    setMatches(mediaQuery.matches);

    // Create event listener function to track changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      // Clean up
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      // Fallback for older browsers (Safari < 14, IE)
      mediaQuery.addListener(handleChange);
      // Clean up
      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }
  }, [query]);

  return matches;
};

export default useMediaQuery;