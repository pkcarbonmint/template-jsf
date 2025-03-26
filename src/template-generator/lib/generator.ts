import { SchemaNode, Conditional } from './schema-parser';
import logger from '../../utils/logger';

// Import compiled templates
import { genStringMustache } from '../compiled-templates/string.mustache';
import { genNumberMustache } from '../compiled-templates/number.mustache';
import { genBooleanMustache } from '../compiled-templates/boolean.mustache';
import { genObjectMustache } from '../compiled-templates/object.mustache';
import { genArrayMustache } from '../compiled-templates/array.mustache';
import { genPropertyMustache } from '../compiled-templates/property.mustache';
import { genFormMustache } from '../compiled-templates/form.mustache';
import { genEnumMustache } from '../compiled-templates/enum.mustache';
import { genDateMustache } from '../compiled-templates/date.mustache';
import { genEmailMustache } from '../compiled-templates/email.mustache';
import { genUrlMustache } from '../compiled-templates/url.mustache';
import { genTextareaMustache } from '../compiled-templates/textarea.mustache';
import { genObjectGridMustache } from '../compiled-templates/object-grid.mustache';
import { genObjectTabsMustache } from '../compiled-templates/object-tabs.mustache';
import { genObjectVtabsMustache } from '../compiled-templates/object-vtabs.mustache';
import { genObjectWizardMustache } from '../compiled-templates/object-wizard.mustache';
import { genConditionalMustache } from '../compiled-templates/conditional.mustache';

/**
 * Assigns a layout strategy to each object node in the schema tree.
 *
 * The layout strategy determines how the object's properties are displayed in the UI.
 *
 * Layout Assignment Heuristics:
 * 1.  x-layout: If the 'x-layout' property is present on the node, use that value.
 * 2.  Level Limit: After 3 levels of nested objects, force the layout to either 'grid' or 'vertical' to prevent overly complex UIs.
 * 3.  No Wizard Inside Wizard: Wizards cannot be nested inside other wizards; force 'vertical'.
 * 4.  Tabs inside Tabs: Horizontal tabs are used for the first level of tabs, and vertical tabs (vtabs) are used for subsequent levels.
 * 5.  Property Count: If the object has more than 5 properties, use a 'grid' layout; otherwise, use 'vertical'.
 *
 * @param node The schema node to assign a layout strategy to.
 * @param level The current nesting level of the schema node.
 * @param parentLayout The layout strategy of the parent schema node.
 */
function assignLayoutStrategy(node: SchemaNode, level: number = 0, parentLayout?: string): void {
  if (node.type === 'object') {
    // Use x-layout if provided, otherwise determine layout based on number of properties
    if (node['x-layout']) {
      node.layout = node['x-layout'] as any; // Assuming x-layout value is valid
    } else {
      const numProperties = Object.keys(node.properties || {}).length;

      // Heuristics
      if (level >= 3) {
        node.layout = numProperties > 5 ? 'grid' : 'vertical'; // Allow grid or vertical after 3 levels
      } else if (parentLayout === 'wizard') {
        node.layout = 'vertical'; // No wizard inside wizard
      } else if (parentLayout === 'tabs') {
        node.layout = 'vtabs'; // Use vertical tabs when inside tabs
      } else if (parentLayout === 'vtabs') {
        node.layout = 'vertical'; // No nested vtabs
      } else if (numProperties > 5) {
        node.layout = 'grid';
      } else {
        node.layout = 'vertical';
      }
    }

    // Recursively assign layout strategy to child nodes
    if (node.properties) {
      Object.values(node.properties).forEach(propNode => assignLayoutStrategy(propNode, level + 1, node.layout));
    }
  } else if (node.type === 'array' && node.items) {
    // Assign layout strategy to array items
    assignLayoutStrategy(node.items, level, parentLayout);
  }
}

function dbgDumpLayout(schema: SchemaNode, level: number = 0): void {
  const indent = '  '.repeat(level);
  const properties = schema.properties ? Object.keys(schema.properties).length : 0;
  
  logger.debug(`${indent}${schema.id} (${schema.type}): layout=${schema.layout}, properties=${properties}`);
  
  // Output all properties, not just objects and arrays
  if (schema.properties) {
    logger.debug(`${indent}Properties (${properties}):`);
    Object.entries(schema.properties).forEach(([key, propNode]) => {
      logger.debug(`${indent}  ${key} (${propNode.type}): required=${propNode.required}`);
      dbgDumpLayout(propNode, level + 2);
    });
  } else {
    logger.debug(`${indent}No properties defined`);
  }
  
  if (schema.items) {
    logger.debug(`${indent}Items:`);
    dbgDumpLayout(schema.items, level + 1);
  }
  
  if (schema.conditionals) {
    logger.debug(`${indent}Conditionals (${schema.conditionals.length}):`);
    schema.conditionals.forEach(conditional => {
      logger.debug(`${indent}  ${conditional.type}:`);
      if (Array.isArray(conditional.schema)) {
        conditional.schema.forEach((s, i) => {
          logger.debug(`${indent}    [${i}]:`);
          dbgDumpLayout(s, level + 3);
        });
      } else {
        dbgDumpLayout(conditional.schema, level + 2);
      }
    });
  }
}

// Validate schema node to catch critical issues
function validateSchema(schema: SchemaNode, path: string = 'root'): void {
  // Check for required properties on the schema node
  if (!schema) {
    throw new Error(`Schema is null or undefined at path: ${path}`);
  }
  
  if (!schema.id) {
    throw new Error(`Schema missing required 'id' property at path: ${path}`);
  }
  
  if (!schema.type) {
    throw new Error(`Schema missing required 'type' property at path: ${path}`);
  }
  
  // Check type-specific requirements
  if (schema.type === 'object' && !schema.properties) {
    logger.warn(`Object schema has no properties at path: ${path}. This may be intentional, but could indicate a problem.`);
  }
  
  if (schema.type === 'array' && !schema.items) {
    logger.warn(`Array schema has no items defined at path: ${path}`);
  }
  
  // Recursively validate child schemas
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, propNode]) => {
      validateSchema(propNode, `${path}.${key}`);
    });
  }
  
  if (schema.items) {
    validateSchema(schema.items, `${path}.items`);
  }
  
  if (schema.conditionals) {
    schema.conditionals.forEach((conditional, index) => {
      if (Array.isArray(conditional.schema)) {
        conditional.schema.forEach((s, i) => {
          validateSchema(s, `${path}.conditionals[${index}].schema[${i}]`);
        });
      } else {
        validateSchema(conditional.schema, `${path}.conditionals[${index}].schema`);
      }
    });
  }
}

// Generate HTML template from schema - async version
export async function generateTemplateAsync(schema: SchemaNode, templatesDir: string = ''): Promise<string> {
  logger.debug("Starting template generation with schema:", schema.id);
  logger.debug("Templates directory:", templatesDir);
  
  // Validate schema structure
  try {
    logger.debug("Validating schema structure...");
    validateSchema(schema);
    logger.debug("Schema validation successful");
  } catch (error: Error | any) {
    logger.error("Schema validation failed:", error?.message);
    throw error;
  }
  
  // Assign layout strategy to schema
  assignLayoutStrategy(schema);
  logger.debug("Layout assignment complete. Schema structure:");
  dbgDumpLayout(schema);
  
  // Generate HTML for schema
  logger.debug("Generating HTML content for schema");
  const formContent = await generateNodeHTMLAsync(schema, templatesDir);
  
  if (!formContent) {
    logger.error("Generated empty HTML content");
    throw new Error('Generated empty HTML content');
  }
  
  logger.debug("Generated HTML content length:", formContent.length);
  
  // Check if the generated HTML includes any input fields or interactable elements
  const hasInputs = formContent.includes('<input') || formContent.includes('<select') || 
                   formContent.includes('<textarea') || formContent.includes('<button');
  
  if (!hasInputs) {
    logger.warn("Generated HTML content doesn't appear to have any input fields. This might indicate a problem.");
  }
  
  // Render form template with content
  const result = genFormMustache({
    formId: schema.id,
    schemaId: schema.id,
    title: schema.title || 'Form',
    content: formContent
  });
  
  if (!result) {
    throw new Error('Failed to render form template');
  }
  
  logger.info("Template generation complete. Result length:", result.length);
  return result;
}

// Generate HTML for a schema node - async version
async function generateNodeHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  // Different template based on type
  switch (node.type) {
    case 'object':
      return generateObjectHTMLAsync(node, templatesDir);
    case 'array':
      return generateArrayHTMLAsync(node, templatesDir);
    case 'string':
      return generateStringHTMLAsync(node, templatesDir);
    case 'number':
    case 'integer':
      return generateNumberHTMLAsync(node, templatesDir);
    case 'boolean':
      return generateBooleanHTMLAsync(node, templatesDir);
    default:
      return `<!-- Unknown type: ${node.type} -->`;
  }
}

// Generate HTML for object type - async version
async function generateObjectHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  // Assert that node is valid
  if (!node) {
    throw new Error('Node is null or undefined in generateObjectHTMLAsync');
  }
  
  if (node.type !== 'object') {
    throw new Error(`Expected node type 'object', got '${node.type}' in generateObjectHTMLAsync`);
  }
  
  let propertiesHTML = '';
  
  if (node.properties) {
    logger.debug(`Processing ${Object.keys(node.properties).length} properties for ${node.id}`);
    const propertyPromises = Object.entries(node.properties)
      .map(async ([key, propNode]) => {
        logger.debug(`  Processing property ${key} (${propNode.type})`);
        const propHTML = await generateNodeHTMLAsync(propNode, templatesDir);
        
        return genPropertyMustache({
          id: propNode.id,
          name: key,
          title: propNode.title || key,
          description: propNode.description || '',
          required: propNode.required,
          content: propHTML
        });
      });
    
    try {
      const propertyResults = await Promise.all(propertyPromises);
      propertiesHTML = propertyResults.join('\n');
      logger.debug(`Generated HTML for ${propertyResults.length} properties of ${node.id}`);
    } catch (error) {
      logger.error(`Error generating property HTML for ${node.id}:`, error);
      throw error;
    }
  } else {
    logger.debug(`No properties to process for ${node.id}`);
  }
  
  // Handle conditionals
  const conditionalsHTML = node.conditionals 
    ? await generateConditionalsHTMLAsync(node.conditionals, templatesDir) 
    : '';
  
  try {
    let result;
    switch (node.layout) {
      case 'grid':
        result = genObjectGridMustache({
          id: node.id,
          title: node.title || '',
          description: node.description || '',
          properties: propertiesHTML,
          conditionals: conditionalsHTML
        });
        break;
      case 'tabs':
        result = genObjectTabsMustache({
          id: node.id,
          title: node.title || '',
          description: node.description || '',
          properties: propertiesHTML,
          conditionals: conditionalsHTML
        });
        break;
      case 'vtabs':
        result = genObjectVtabsMustache({
          id: node.id,
          title: node.title || '',
          description: node.description || '',
          properties: propertiesHTML,
          conditionals: conditionalsHTML
        });
        break;
      case 'wizard':
        result = genObjectWizardMustache({
          id: node.id,
          title: node.title || '',
          description: node.description || '',
          properties: propertiesHTML,
          conditionals: conditionalsHTML
        });
        break;
      default:
        result = genObjectMustache({
          id: node.id,
          title: node.title || '',
          description: node.description || '',
          properties: propertiesHTML,
          conditionals: conditionalsHTML
        });
    }
    
    if (!result) {
      throw new Error(`Failed to render object template for ${node.id}`);
    }
    
    logger.debug(`Rendered HTML for ${node.id}, length: ${result.length}`);
    return result;
  } catch (error) {
    logger.error(`Error rendering object template for ${node.id}:`, error);
    throw error;
  }
}

// Generate HTML for array type - async version
async function generateArrayHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  // Generate template for array items
  const itemHTML = node.items 
    ? await generateNodeHTMLAsync(node.items, templatesDir)
    : '<!-- No items schema defined -->';
  
  return genArrayMustache({
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    itemTemplate: itemHTML
  });
}

// Generate HTML for string type - async version
async function generateStringHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  // Different templates based on format or enum
  if (node.enum && node.enum.length > 0) {
    return genEnumMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      enum: node.enum,
      default: node.default
    });
  } else if (node.format === 'date-time' || node.format === 'date') {
    return genDateMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      inputType: node.format === 'date-time' ? 'datetime-local' : 'date',
      default: node.default
    });
  } else if (node.format === 'email') {
    return genEmailMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      default: node.default
    });
  } else if (node.format === 'uri') {
    return genUrlMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      default: node.default
    });
  } else if (node.format === 'textarea' || (node.maxLength && node.maxLength > 100)) {
    return genTextareaMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      minLength: node.minLength,
      maxLength: node.maxLength,
      default: node.default
    });
  } else {
    return genStringMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      minLength: node.minLength,
      maxLength: node.maxLength,
      pattern: node.pattern,
      format: node.format,
      default: node.default
    });
  }
}

// Generate HTML for number/integer type - async version
async function generateNumberHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  // Set step to 1 for integer types
  const step = node.type === 'integer' ? 1 : undefined;
  
  return genNumberMustache({
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    minimum: node.minimum,
    maximum: node.maximum,
    type: node.type, // integer or number
    default: node.default,
    step: step
  });
}

// Generate HTML for boolean type - async version
async function generateBooleanHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  return genBooleanMustache({
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    default: node.default
  });
}

// Generate HTML for conditionals - async version
async function generateConditionalsHTMLAsync(conditionals: Conditional[], templatesDir: string): Promise<string> {
  const conditionalPromises = conditionals.map(async conditional => {
    let schemaHTML;
    
    if (Array.isArray(conditional.schema)) {
      // For allOf, anyOf, oneOf
      const schemaPromises = conditional.schema
        .map(schema => generateNodeHTMLAsync(schema, templatesDir));
      const schemaResults = await Promise.all(schemaPromises);
      schemaHTML = schemaResults.join('\n');
    } else {
      // For if, then, else, not
      schemaHTML = await generateNodeHTMLAsync(conditional.schema, templatesDir);
    }
    
    return genConditionalMustache({
      type: conditional.type,
      schema: schemaHTML
    });
  });
  
  const results = await Promise.all(conditionalPromises);
  return results.join('\n');
}

// Generate HTML for a schema node - sync version
function generateNodeHTML(node: SchemaNode, templatesDir: string): string {
  // Different template based on type
  switch (node.type) {
    case 'object':
      return generateObjectHTML(node, templatesDir);
    case 'array':
      return generateArrayHTML(node, templatesDir);
    case 'string':
      return generateStringHTML(node, templatesDir);
    case 'number':
    case 'integer':
      return generateNumberHTML(node, templatesDir);
    case 'boolean':
      return generateBooleanHTML(node, templatesDir);
    default:
      return `<!-- Unknown type: ${node.type} -->`;
  }
}

// Generate HTML for object type - sync version
function generateObjectHTML(node: SchemaNode, templatesDir: string): string {
  let propertiesHTML = '';
  
  if (node.properties) {
    propertiesHTML = Object.entries(node.properties)
      .map(([key, propNode]) => {
        const propHTML = generateNodeHTML(propNode, templatesDir);
        
        return genPropertyMustache({
          id: propNode.id,
          name: key,
          title: propNode.title || key,
          description: propNode.description || '',
          required: propNode.required,
          content: propHTML
        });
      })
      .join('\n');
  }
  
  // Handle conditionals
  const conditionalsHTML = node.conditionals 
    ? generateConditionalsHTML(node.conditionals, templatesDir) 
    : '';
  
  let result;
  switch (node.layout) {
    case 'grid':
      result = genObjectGridMustache({
        id: node.id,
        title: node.title || '',
        description: node.description || '',
        properties: propertiesHTML,
        conditionals: conditionalsHTML
      });
      break;
    case 'tabs':
      result = genObjectTabsMustache({
        id: node.id,
        title: node.title || '',
        description: node.description || '',
        properties: propertiesHTML,
        conditionals: conditionalsHTML
      });
      break;
    case 'vtabs':
      result = genObjectVtabsMustache({
        id: node.id,
        title: node.title || '',
        description: node.description || '',
        properties: propertiesHTML,
        conditionals: conditionalsHTML
      });
      break;
    case 'wizard':
      result = genObjectWizardMustache({
        id: node.id,
        title: node.title || '',
        description: node.description || '',
        properties: propertiesHTML,
        conditionals: conditionalsHTML
      });
      break;
    default:
      result = genObjectMustache({
        id: node.id,
        title: node.title || '',
        description: node.description || '',
        properties: propertiesHTML,
        conditionals: conditionalsHTML
      });
  }
  
  if (!result) {
    throw new Error(`Failed to render object template for ${node.id}`);
  }
  
  return result;
}

// Generate HTML for array type - sync version
function generateArrayHTML(node: SchemaNode, templatesDir: string): string {
  // Generate template for array items
  const itemHTML = node.items 
    ? generateNodeHTML(node.items, templatesDir)
    : '<!-- No items schema defined -->';
  
  return genArrayMustache({
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    itemTemplate: itemHTML
  });
}

// Generate HTML for string type - sync version
function generateStringHTML(node: SchemaNode, templatesDir: string): string {
  // Different templates based on format or enum
  if (node.enum && node.enum.length > 0) {
    return genEnumMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      enum: node.enum,
      default: node.default
    });
  } else if (node.format === 'date-time' || node.format === 'date') {
    return genDateMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      inputType: node.format === 'date-time' ? 'datetime-local' : 'date',
      default: node.default
    });
  } else if (node.format === 'email') {
    return genEmailMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      default: node.default
    });
  } else if (node.format === 'uri') {
    return genUrlMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      default: node.default
    });
  } else if (node.format === 'textarea' || (node.maxLength && node.maxLength > 100)) {
    return genTextareaMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      minLength: node.minLength,
      maxLength: node.maxLength,
      default: node.default
    });
  } else {
    return genStringMustache({
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      required: node.required,
      minLength: node.minLength,
      maxLength: node.maxLength,
      pattern: node.pattern,
      format: node.format,
      default: node.default
    });
  }
}

// Generate HTML for number/integer type - sync version
function generateNumberHTML(node: SchemaNode, templatesDir: string): string {
  // Set step to 1 for integer types
  const step = node.type === 'integer' ? 1 : undefined;
  
  return genNumberMustache({
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    minimum: node.minimum,
    maximum: node.maximum,
    type: node.type, // integer or number
    default: node.default,
    step: step
  });
}

// Generate HTML for boolean type - sync version
function generateBooleanHTML(node: SchemaNode, templatesDir: string): string {
  return genBooleanMustache({
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    default: node.default
  });
}

// Generate HTML for conditionals - sync version
function generateConditionalsHTML(conditionals: Conditional[], templatesDir: string): string {
  return conditionals.map(conditional => {
    let schemaHTML;
    
    if (Array.isArray(conditional.schema)) {
      // For allOf, anyOf, oneOf
      schemaHTML = conditional.schema
        .map(schema => generateNodeHTML(schema, templatesDir))
        .join('\n');
    } else {
      // For if, then, else, not
      schemaHTML = generateNodeHTML(conditional.schema, templatesDir);
    }
    
    return genConditionalMustache({
      type: conditional.type,
      schema: schemaHTML
    });
  }).join('\n');
}