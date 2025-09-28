import React from 'react';

interface TopBarProps {
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
  /**
   * Border radius behavior for the top bar
   * - 'default': Uses 24px top border radius
   * - 'inherit': Inherits border radius from parent
   * - 'none': No border radius
   */
  radiusMode?: 'default' | 'inherit' | 'none';
  /**
   * Render as a decorative overlay (absolute positioning)
   * or as a separate element (relative positioning)
   */
  overlay?: boolean;
}

/**
 * TopBar - A decorative colored gradient bar component
 * 
 * Displays a thin 4px gradient bar at the top of containers.
 * Uses the project's color palette: Primary Blue → Primary Dark → Primary Light
 * 
 * @example
 * // As an overlay on existing containers
 * <div className="card">
 *   <TopBar />
 *   <div className="content">...</div>
 * </div>
 * 
 * @example
 * // As a standalone element
 * <TopBar overlay={false} radiusMode="none" />
 */
export const TopBar: React.FC<TopBarProps> = ({
  className = '',
  radiusMode = 'default',
  overlay = true
}) => {
  const getRadiusStyle = () => {
    switch (radiusMode) {
      case 'inherit':
        return {
          borderTopLeftRadius: 'inherit',
          borderTopRightRadius: 'inherit'
        };
      case 'none':
        return {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0
        };
      case 'default':
      default:
        return {
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px'
        };
    }
  };

  const baseStyle: React.CSSProperties = {
    height: '4px',
    background: 'linear-gradient(90deg, #0698FE 0%, #051327 50%, #C6E7FF 100%)',
    ...getRadiusStyle(),
    ...(overlay && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1
    })
  };

  return (
    <div 
      className={className}
      style={baseStyle}
      role="presentation"
      aria-hidden="true"
    />
  );
};

export default TopBar;