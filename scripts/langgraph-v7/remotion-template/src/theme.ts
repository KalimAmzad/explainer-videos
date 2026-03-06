export type Theme = {
  background: string;
  primaryFont: string;
  headingFont: string;
  palette: {
    primary: string;
    secondary: string;
    accent1: string;
    accent2: string;
    text: string;
  };
  strokeWidth: number;
};

export const DEFAULT_THEME: Theme = {
  background: '#f5f3ef',
  primaryFont: 'Caveat',
  headingFont: 'Cabin Sketch',
  palette: {
    primary: '#2b7ec2',
    secondary: '#cc3333',
    accent1: '#1e8c5a',
    accent2: '#cc7722',
    text: '#333333',
  },
  strokeWidth: 2.5,
};

/** Alias for backwards compatibility. */
export const defaultTheme = DEFAULT_THEME;
