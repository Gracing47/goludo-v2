import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Visual variant of the button */
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';

    /** Size of the button */
    size?: 'sm' | 'md' | 'lg';

    /** Full width button */
    fullWidth?: boolean;

    /** Loading state */
    loading?: boolean;

    /** Icon to display before text */
    icon?: React.ReactNode;

    /** Icon to display after text */
    iconAfter?: React.ReactNode;

    /** Accessible label for screen readers */
    ariaLabel?: string;

    children: React.ReactNode;
}

/**
 * Reusable Button Component
 * 
 * Features:
 * - Multiple variants (primary, secondary, ghost, danger)
 * - Three sizes (sm, md, lg)
 * - Loading state with spinner
 * - Icon support
 * - Full accessibility (keyboard navigation, ARIA labels)
 * - Follows design system tokens
 * 
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click Me
 * </Button>
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon,
    iconAfter,
    ariaLabel,
    disabled,
    className = '',
    children,
    ...props
}) => {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full-width',
        loading && 'btn-loading',
        disabled && 'btn-disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            aria-label={ariaLabel}
            aria-busy={loading}
            {...props}
        >
            {loading && (
                <span className="btn-spinner" aria-hidden="true">
                    <svg className="spinner-icon" viewBox="0 0 24 24">
                        <circle
                            className="spinner-circle"
                            cx="12"
                            cy="12"
                            r="10"
                            fill="none"
                            strokeWidth="3"
                        />
                    </svg>
                </span>
            )}

            {!loading && icon && (
                <span className="btn-icon" aria-hidden="true">
                    {icon}
                </span>
            )}

            <span className="btn-text">{children}</span>

            {!loading && iconAfter && (
                <span className="btn-icon-after" aria-hidden="true">
                    {iconAfter}
                </span>
            )}
        </button>
    );
};

export default Button;
