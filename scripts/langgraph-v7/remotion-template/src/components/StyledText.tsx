import React from 'react';
import { useTheme } from '../ThemeContext';

type TextVariant = 'heading' | 'subheading' | 'body' | 'caption' | 'label';

type StyledTextProps = {
  /** Visual variant controlling font family, size, and weight. */
  variant: TextVariant;
  children: React.ReactNode;
  /** Override the theme-derived text color. */
  color?: string;
  /** Additional inline styles merged after variant styles. */
  style?: React.CSSProperties;
};

const variantStyles: Record<
  TextVariant,
  (theme: { headingFont: string; primaryFont: string }) => React.CSSProperties
> = {
  heading: (t) => ({
    fontFamily: t.headingFont,
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 1.2,
  }),
  subheading: (t) => ({
    fontFamily: t.headingFont,
    fontSize: 36,
    fontWeight: 'normal',
    lineHeight: 1.3,
  }),
  body: (t) => ({
    fontFamily: t.primaryFont,
    fontSize: 24,
    fontWeight: 'normal',
    lineHeight: 1.6,
  }),
  caption: (t) => ({
    fontFamily: t.primaryFont,
    fontSize: 18,
    fontWeight: 'normal',
    fontStyle: 'italic',
    lineHeight: 1.5,
  }),
  label: (t) => ({
    fontFamily: t.primaryFont,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 1.4,
  }),
};

/**
 * Theme-aware text component.
 *
 * Selects font family, size, weight, and line-height based on the `variant`
 * prop. Color defaults to the theme's `palette.text` unless overridden.
 *
 * Usage:
 * ```tsx
 * <StyledText variant="heading" color="#cc3333">Title</StyledText>
 * ```
 */
export const StyledText: React.FC<StyledTextProps> = ({
  variant,
  children,
  color,
  style,
}) => {
  const theme = useTheme();
  const base = variantStyles[variant](theme);

  return (
    <span
      style={{
        ...base,
        color: color ?? theme.palette.text,
        ...style,
      }}
    >
      {children}
    </span>
  );
};
