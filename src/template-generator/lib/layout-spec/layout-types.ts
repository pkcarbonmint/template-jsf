import { SchemaNode } from '../schema-parser';

/**
 * Layout specification for form templates
 */
export interface LayoutSpecification {
  /** Layout type for the current node */
  layout?: LayoutType;
  
  /** Ordering of child properties */
  order?: string[];
  
  /** Optional description */
  description?: string;
  
  /** CSS classes to apply to the element */
  classNames?: string;
  
  /** Layout-specific configuration options */
  options?: LayoutOptions;
  
  /** Responsive layout overrides */
  responsive?: {
    [breakpoint: string]: LayoutSpecification;
  };
  
  /** Information about conditional rendering */
  conditionals?: ConditionalSpecification[];
  
  /** Information about additional properties */
  additionalProperties?: any;
  
  /** Read-only flag */
  readOnly?: boolean;
  
  /** Write-only flag */
  writeOnly?: boolean;
  
  /** Default value */
  default?: any;

  /** Item layout for arrays */
  itemLayout?: string;
  
  /** Child property configurations - matches schema properties */
  [propertyName: string]: LayoutSpecification | any;
}

/** Conditional directive types */
export type ConditionalType = 'if' | 'then' | 'else' | 'allOf' | 'anyOf' | 'oneOf';

/** 
 * Specification for conditional schema directives
 */
export interface ConditionalSpecification {
  /** Type of conditional */
  type: ConditionalType;
  
  /** 
   * Layout specification for single schema conditionals (if/then/else)
   * This is used for if/then/else conditionals
   */
  spec?: LayoutSpecification;
  
  /**
   * Array of layout specifications for multiple schema conditionals (allOf/anyOf/oneOf)
   * This is used for allOf/anyOf/oneOf conditionals
   */
  specs?: LayoutSpecification[];
}

/** Supported layout types */
export type LayoutType = 'vertical' | 'grid' | 'tabs' | 'vtabs' | 'wizard';

/** Layout options interface */
export interface LayoutOptions {
  /** Number of columns for grid layout */
  columns?: number;
  
  /** Spacing between grid items */
  gap?: string;
  
  /** Position for tabs: top, left, right, bottom */
  tabPosition?: 'top' | 'left' | 'right' | 'bottom';
  
  /** Padding around elements */
  padding?: string;
  
  /** Show steps for wizard layout */
  showSteps?: boolean;
  
  /** Allow jumping between wizard steps */
  allowJump?: boolean;
  
  /** Number of rows for textarea */
  rows?: number;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Control type for enums (select, radio, etc.) */
  control?: string;
  
  /** Additional custom options */
  [key: string]: any;
} 