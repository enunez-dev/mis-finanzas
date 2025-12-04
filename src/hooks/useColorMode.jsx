import { useEffect } from 'react';
import { useState } from 'react';

const useColorMode = () => {
  const [colorMode, setColorMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('color-theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const className = 'dark';
    const bodyClass = window.document.body.classList;

    colorMode === 'dark'
      ? bodyClass.add(className)
      : bodyClass.remove(className);

    localStorage.setItem('color-theme', colorMode);
  }, [colorMode]);

  return [colorMode, setColorMode];
};

export default useColorMode;
