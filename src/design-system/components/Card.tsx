import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Visual variant of the card */
    variant?: 'glass' | 'solid' | 'elevated';

    /** Padding size */
    padding?: 'none' | 'sm' | 'md' | 'lg';

    /** Make card clickable */
    clickable?: boolean;

    /** Hover effect */
    hoverable?: boolean;

    /** Card header content */
    header?: React.ReactNode;

    /** Card footer content */
    footer?: React.ReactNode;

    /** Accessible label for screen readers */
    ariaLabel?: string;

    children: React.ReactNode;
}

/**
 * Reusable Card Component
 * 
 * Features:
 * - Multiple variants (glass, solid, elevated)
 * - Configurable padding
 * - Optional header and footer
 * - Clickable and hoverable states
 * - Follows design system tokens
 * - Accessibility support
 * 
 * @example
 * <Card variant="glass" padding="md" hoverable>
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </Card>
 */
export const Card: React.FC<CardProps> = ({
    variant = 'glass',
    padding = 'md',
    clickable = false,
    hoverable = false,
    header,
    footer,
    ariaLabel,
    className = '',
    children,
    onClick,
    ...props
}) => {
    const classes = [
        'card',
        `card-${variant}`,
        `card-padding-${padding}`,
        clickable && 'card-clickable',
        hoverable && 'card-hoverable',
        className
    ].filter(Boolean).join(' ');

    const Component = clickable ? 'button' : 'div';
    const role = clickable ? 'button' : undefined;
    const tabIndex = clickable ? 0 : undefined;

    return (
        <Component
            className={classes}
            role={role}
            tabIndex={tabIndex}
            aria-label={ariaLabel}
            onClick={onClick}
            {...props}
        >
            {header && (
                <div className="card-header">
                    {header}
                </div>
            )}

            <div className="card-body">
                {children}
            </div>

            {footer && (
                <div className="card-footer">
                    {footer}
                </div>
            )}
        </Component>
    );
};

export default Card;
