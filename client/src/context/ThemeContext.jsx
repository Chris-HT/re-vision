import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({
  children,
  initialTheme = 'dark',
  initialFontSize = 'medium',
  initialReduceAnimations = false,
  initialLiteralLanguage = false,
  initialFocusMode = false
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [reduceAnimations, setReduceAnimations] = useState(initialReduceAnimations);
  const [literalLanguage, setLiteralLanguage] = useState(initialLiteralLanguage);
  const [focusMode, setFocusMode] = useState(initialFocusMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-animations', String(reduceAnimations));
  }, [reduceAnimations]);

  useEffect(() => {
    document.documentElement.setAttribute('data-focus-mode', String(focusMode));
  }, [focusMode]);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme,
      fontSize, setFontSize,
      reduceAnimations, setReduceAnimations,
      literalLanguage, setLiteralLanguage,
      focusMode, setFocusMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark', setTheme: () => {},
      fontSize: 'medium', setFontSize: () => {},
      reduceAnimations: false, setReduceAnimations: () => {},
      literalLanguage: false, setLiteralLanguage: () => {},
      focusMode: false, setFocusMode: () => {}
    };
  }
  return context;
}
