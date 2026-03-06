import React from 'react';
import { Theme, DEFAULT_THEME } from './theme';

/**
 * React context for the video theme.
 *
 * The scene compositor wraps the entire composition in a
 * `<ThemeContext.Provider>` so all animation and layout components
 * can access colors, fonts, and stroke settings without prop drilling.
 */
export const ThemeContext = React.createContext<Theme>(DEFAULT_THEME);

/**
 * Hook to access the current theme from any component
 * within the Remotion composition tree.
 */
export const useTheme = (): Theme => React.useContext(ThemeContext);
