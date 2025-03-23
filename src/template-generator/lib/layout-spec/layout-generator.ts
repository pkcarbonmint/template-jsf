import { parseSchema, SchemaNode } from '../schema-parser';
import { LayoutSpecification, LayoutType, LayoutOptions } from './layout-types';

/**
 * Generates a layout specification from a schema
 * @param schemaJson The JSON string of the schema to generate a layout specification for
 * @param level The nesting level (default: 0)
 * @param parentLayout The layout of the parent (if any)
 * @returns A layout specification
 */
export function generateLayoutSpec(schemaJson: string, level: number = 0, parentLayout?: LayoutType): LayoutSpecification {
  // Parse the JSON string into a schema object
  const schema = parseSchema(JSON.parse(schemaJson));

  // Create a base layout specification
  const spec: LayoutSpecification = {
    layout: determineLayoutType(schema, level, parentLayout),
    order: schema.properties ? Object.keys(schema.properties) : []
  };
  
  // Add description if available
  if (schema.description) {
    spec.description = schema.description;
  }
  
  // Add layout options if available
  if (schema.layoutOptions) {
    spec.options = processLayoutOptions(schema.layoutOptions, spec.layout);
  }
  
  // Process properties recursively
  if (schema.properties) {
    for (const [key, propNode] of Object.entries(schema.properties)) {
      spec[key] = generateLayoutSpec(JSON.stringify(propNode), level + 1, spec.layout);
    }
  }
  
  // Handle array items
  if (schema.type === 'array' && schema.items) {
    spec.itemLayout = schema.items.type;
  }
  
  // Handle conditional directives
  if (schema.conditionals && Array.isArray(schema.conditionals) && schema.conditionals.length > 0) {
    spec.conditionals = processConditionals(schema.conditionals, level);
  }
  
  return spec;
}

/**
 * Process layout options based on layout type
 * @param options Raw layout options from schema
 * @param layoutType The layout type to process options for
 * @returns Processed layout options
 */
function processLayoutOptions(options: any, layoutType?: LayoutType): LayoutOptions {
  // Start with the provided options
  const processedOptions: LayoutOptions = { ...options };
  
  // Apply defaults and validation based on layout type
  if (layoutType) {
    switch (layoutType) {
      case 'grid':
        // Set default columns if not specified
        if (!processedOptions.columns) {
          processedOptions.columns = 2;
        }
        // Ensure gap has a default value
        if (!processedOptions.gap) {
          processedOptions.gap = '1rem';
        }
        break;
        
      case 'tabs':
      case 'vtabs':
        // Set default tab position if not specified
        if (!processedOptions.tabPosition) {
          processedOptions.tabPosition = layoutType === 'vtabs' ? 'left' : 'top';
        }
        break;
        
      case 'wizard':
        // Set default wizard options if not specified
        if (processedOptions.showSteps === undefined) {
          processedOptions.showSteps = true;
        }
        if (processedOptions.allowJump === undefined) {
          processedOptions.allowJump = true;
        }
        break;
    }
  }
  
  return processedOptions;
}

/**
 * Process JSON Schema conditional directives
 * @param conditionals Array of conditional directives
 * @param level The nesting level of the conditionals
 * @returns Processed conditionals for layout spec
 */
function processConditionals(conditionals: any[], level: number): any[] {
  return conditionals.map(conditional => {
    const result: any = {
      type: conditional.type
    };
    
    // Handle different types of conditionals
    if (conditional.type === 'if' || conditional.type === 'then' || conditional.type === 'else') {
      // For if/then/else, process the schema
      if (conditional.schema) {
        result.spec = generateLayoutSpec(JSON.stringify(conditional.schema), level + 1);
      }
    } else if (conditional.type === 'allOf' || conditional.type === 'anyOf' || conditional.type === 'oneOf') {
      // For allOf/anyOf/oneOf, process the array of schemas
      if (Array.isArray(conditional.schema)) {
        result.specs = conditional.schema.map((subSchema: SchemaNode) => 
          generateLayoutSpec(JSON.stringify(subSchema), level + 1)
        );
      }
    }
    
    return result;
  });
}

/**
 * Determines the appropriate layout type for a schema node
 * @param schema Schema node
 * @param level The nesting level of the schema node
 * @param parentLayout The layout of the parent schema node 
 * @returns Layout type
 */
function determineLayoutType(schema: SchemaNode, level: number = 0, parentLayout?: LayoutType): LayoutType {
  // Use x-layout if provided
  if (schema['x-layout']) {
    return schema['x-layout'] as LayoutType;
  }
  
  // For objects, determine based on constraints and number of properties
  if (schema.type === 'object') {
    const propCount = schema.properties ? Object.keys(schema.properties).length : 0;
    
    // Apply constraints from assignLayoutStrategy:
    
    // 1. Level Limit: After 3 levels of nested objects, force to grid or vertical
    if (level >= 3) {
      return propCount > 5 ? 'grid' : 'vertical';
    }
    
    // 2. No Wizard Inside Wizard
    if (parentLayout === 'wizard') {
      return 'vertical';
    }
    
    // 3. Tabs inside Tabs: Use vtabs for the second level
    if (parentLayout === 'tabs') {
      return 'vtabs';
    }
    
    // 4. No nested vtabs
    if (parentLayout === 'vtabs') {
      return 'vertical';
    }
    
    // For objects with many properties, consider using tabs or grid
    if (propCount > 10) {
      // If more than 10 properties, consider using tabs if properties are objects
      const hasObjectProperties = schema.properties ? 
        Object.values(schema.properties).some((prop: SchemaNode) => prop.type === 'object') : false;
      
      if (hasObjectProperties) {
        return 'tabs';
      }
      return 'grid';
    }
    
    // For objects with medium number of properties, use grid
    if (propCount > 5) {
      return 'grid';
    }
  }
  
  // Default layout is vertical
  return 'vertical';
} 