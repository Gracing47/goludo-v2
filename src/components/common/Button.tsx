/**
 * Button Component - Reusable UI Primitive
 * 
 * AAA-quality button with variants, sizes, and loading states.
 * Uses clsx for conditional styling and maintains accessibility.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" onClick={handleClick}>
 *   Start Game
 * </Button>
 * ```
 */

import React from 'react';
import clsx from 'clsx';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Visual variant of the button */
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'web3';

    /** Size of the button */
    size?: 'sm' | 'md' | 'lg';

    /** Loading state - shows spinner and disables button */
    isLoading?: boolean;
}

/**
 * Button Component
 * 
 * Reusable button with multiple variants and states.
 * Automatically handles disabled and loading states.
 */
export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading,
    className,
    disabled,
    ...props
}) => {
    return (
        <button
            disabled={disabled || isLoading}
            className={clsx(
                'btn',
                `btn-${variant}`,
                `btn-${size}`,
                {
                    'btn-loading': isLoading,
                    'btn-disabled': disabled || isLoading,
                },
                className
            )}
            {...props}
        >
            {isLoading ? <span className="btn-spinner">⏳</span> : children}
        </button>
    );
};

export default Button;
