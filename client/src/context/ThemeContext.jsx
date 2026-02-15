import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({
  children,
  initialTheme = 'dark',
  initialFontSize = 'medium',
  initialReduceAnimations = false,
  initialLiteralLanguage = false
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [reduceAnimations, setReduceAnimations] = useState(initialReduceAnimations);
  const [literalLanguage, setLiteralLanguage] = useState(initialLiteralLanguage);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-animations', String(reduceAnimations));
  }, [reduceAnimations]);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme,
      fontSize, setFontSize,
      reduceAnimations, setReduceAnimations,
      literalLanguage, setLiteralLanguage
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
      literalLanguage: false, setLiteralLanguage: () => {}
    };
  }
  return context;
}
