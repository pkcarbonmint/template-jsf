import { SchemaNode } from '../schema-parser';
import { LayoutSpecification, LayoutType } from './layout-types';

/**
 * Parses a layout specification
 * @param spec The layout specification to parse
 * @returns The parsed layout specification
 */
export function parseLayoutSpec(spec: LayoutSpecification): LayoutSpecification {
  // For now, we'll just return a copy of the spec
  // In a real implementation, we might do more validation, transformation, etc.
  return {...spec};
}

/**
 * Validates a layout specification against a schema
 * @param spec The layout specification to validate
 * @param schema The schema to validate against
 * @param level The nesting level (default: 0)
 * @param parentLayout The layout of the parent (if any)
 * @throws Error if the specification is invalid
 */
export function validateLayoutSpec(
  spec: LayoutSpecification, 
  schema: SchemaNode, 
  level: number = 0, 
  parentLayout?: LayoutType
): void {
  // Validate layout type
  if (spec.layout && !isValidLayoutType(spec.layout)) {
    throw new Error(`Invalid layout type: ${spec.layout}`);
  }
  
  // Validate layout constraints
  if (spec.layout) {
    // 1. Level Limit: After 3 levels of nested objects, force to grid or vertical
    if (level >= 3 && !['grid', 'vertical'].includes(spec.layout)) {
      throw new Error(`Invalid layout '${spec.layout}' at level ${level}. Only 'grid' or 'vertical' layouts are allowed at level 3+.`);
    }
    
    // 2. No Wizard Inside Wizard
    if (parentLayout === 'wizard' && spec.layout === 'wizard') {
      throw new Error(`Wizard layout cannot be nested inside another wizard layout.`);
    }
    
    // 3. Tabs inside Tabs: Use vtabs for the second level
    if (parentLayout === 'tabs' && spec.layout === 'tabs') {
      throw new Error(`Horizontal tabs cannot be nested inside tabs. Use 'vtabs' instead.`);
    }
    
    // 4. No nested vtabs
    if (parentLayout === 'vtabs' && spec.layout === 'vtabs') {
      throw new Error(`Vertical tabs cannot be nested inside vertical tabs.`);
    }
  }
  
  // Validate layout options
  if (spec.options) {
    validateLayoutOptions(spec.options, spec.layout);
  }
  
  // Validate that referenced properties exist in the schema
  if (spec.order && schema.properties) {
    for (const propName of spec.order) {
      if (!schema.properties[propName]) {
        throw new Error(`Property '${propName}' specified in order does not exist in schema`);
      }
    }
  }
  
  // Validate child property specifications
  if (schema.properties) {
    for (const key in spec) {
      // Skip special properties
      if (['layout', 'order', 'options', 'description', 'classNames', 'responsive', 'conditionals', 'itemLayout'].includes(key)) {
        continue;
      }
      
      // If this property exists in the schema, recursively validate
      if (schema.properties[key]) {
        // This is a child property specification
        const childSpec = spec[key] as LayoutSpecification;
        if (childSpec && typeof childSpec === 'object') {
          validateLayoutSpec(childSpec, schema.properties[key], level + 1, spec.layout);
        }
      }
    }
  }
}

/**
 * Checks if a layout type is valid
 * @param layoutType The layout type to check
 * @returns True if valid, false otherwise
 */
function isValidLayoutType(layoutType: string): boolean {
  return ['vertical', 'grid', 'tabs', 'vtabs', 'wizard'].includes(layoutType);
}

/**
 * Validates layout options based on layout type
 * @param options The layout options to validate
 * @param layoutType The layout type
 * @throws Error if options are invalid
 */
function validateLayoutOptions(options: any, layoutType?: string): void {
  // Validate common options
  if (options.columns !== undefined && typeof options.columns !== 'number') {
    throw new Error(`'columns' option must be a number`);
  }
  
  // Type-specific validations
  if (layoutType === 'tabs' || layoutType === 'vtabs') {
    if (options.tabPosition && !['top', 'left', 'right', 'bottom'].includes(options.tabPosition)) {
      throw new Error(`Invalid tab position: ${options.tabPosition}`);
    }
  }
} 