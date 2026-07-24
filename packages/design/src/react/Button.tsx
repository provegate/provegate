import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '0.8125rem', gap: '6px', height: 32 },
  md: { padding: '9px 16px', fontSize: '0.9375rem', gap: '8px', height: 40 },
  lg: { padding: '12px 22px', fontSize: '1.0625rem', gap: '10px', height: 48 },
};

// Colour law: the primary button is NEUTRAL (`--pg-text`), never green — green
// is reserved for earned, passed work.
function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case 'secondary':
      return {
        background: 'var(--pg-surface)',
        color: 'var(--pg-text)',
        border: '1px solid var(--pg-border-strong)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--pg-text-muted)',
        border: '1px solid transparent',
      };
    case 'primary':
    default:
      return {
        background: 'var(--pg-text)',
        color: 'var(--pg-text-inverted)',
        border: '1px solid var(--pg-text)',
      };
  }
}

export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  block?: boolean;
  disabled?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
  href?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon = null,
  rightIcon = null,
  block = false,
  disabled = false,
  as,
  href,
  className = '',
  style = {},
  ...rest
}: ButtonProps): React.JSX.Element {
  const sz = SIZES[size];
  const Tag = (as ?? (href ? 'a' : 'button')) as React.ElementType;
  return (
    <Tag
      className={`pg-btn pg-btn--${variant} ${className}`}
      href={href}
      aria-disabled={disabled || undefined}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        fontFamily: 'var(--pg-font-sans)',
        fontWeight: 500,
        fontSize: sz.fontSize,
        lineHeight: 1,
        padding: sz.padding,
        borderRadius: 'var(--pg-radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        textDecoration: 'none',
        ...variantStyle(variant),
        ...style,
      }}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Tag>
  );
}
