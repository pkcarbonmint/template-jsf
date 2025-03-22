import { SchemaNode } from '../schema-parser';
import { LayoutSpecification, LayoutType } from './layout-types';
import { validateLayoutSpec } from './layout-parser';

/**
 * Applies a layout specification to a schema
 * @param schema The schema to apply the layout to
 * @param layoutSpec The layout specification to apply
 * @param level The nesting level (default: 0)
 * @param parentLayout The layout of the parent (if any)
 * @returns The schema with layout applied
 */
export function applyLayoutSpec(
  schema: SchemaNode, 
  layoutSpec: LayoutSpecification, 
  level: number = 0,
  parentLayout?: LayoutType
): SchemaNode {
  try {
    // Validate layout specification against constraints
    validateLayoutSpec(layoutSpec, schema, level, parentLayout);
  } catch (error) {
    // If validation fails, throw an error with details
    throw new Error(`Layout specification validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Create a deep copy of the schema to avoid mutating the original
  const result = {...schema};
  
  // Apply layout if specified
  if (layoutSpec.layout) {
    result.layout = layoutSpec.layout;
  } else if (!result.layout) {
    // Set a default layout if none exists
    result.layout = 'vertical';
  }
  
  // Apply layout options
  if (layoutSpec.options) {
    result.layoutOptions = layoutSpec.options;
  }
  
  // Apply property order changes
  if (result.type === 'object' && result.properties && layoutSpec.order) {
    // Create a new properties object with ordered keys
    const orderedProperties: Record<string, SchemaNode> = {};
    
    // First add properties in specified order
    for (const key of layoutSpec.order) {
      if (result.properties[key]) {
        orderedProperties[key] = result.properties[key];
      }
    }
    
    // Then add any remaining properties
    for (const key in result.properties) {
      if (!orderedProperties[key]) {
        orderedProperties[key] = result.properties[key];
      }
    }
    
    result.properties = orderedProperties;
  }
  
  // Apply layout to properties recursively
  if (result.type === 'object' && result.properties) {
    for (const key in result.properties) {
      if (layoutSpec[key] && typeof layoutSpec[key] === 'object') {
        result.properties[key] = applyLayoutSpec(
          result.properties[key], 
          layoutSpec[key] as LayoutSpecification,
          level + 1,
          result.layout as LayoutType
        );
      }
    }
  }
  
  // Apply to array items if needed
  if (result.type === 'array' && result.items && layoutSpec.itemLayout) {
    result.items.layout = layoutSpec.itemLayout;
  }
  
  return result;
} 