import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import Mustache from 'mustache';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { SchemaNode, Conditional } from './schema-parser';
import logger from '../../utils/logger';

// Templates cache
const templatesCache: Record<string, string> = {};

// Asynchronously load template from file
export async function loadTemplateAsync(templatePath: string, template?: string): Promise<string> {
  if (templatesCache[templatePath]) {
    return templatesCache[templatePath];
  }
  
  try {
    if (template) {
      // If template is provided directly, cache and return it
      templatesCache[templatePath] = template;
      return template;
    }
    
    const templateContent = await fsPromises.readFile(templatePath, 'utf-8');
    templatesCache[templatePath] = templateContent;
    return templateContent;
  } catch (error) {
    console.warn(`Template not found: ${templatePath}. Using fallback template.`);
    // Provide a basic fallback template
    const fallbackTemplate = getFallbackTemplate(templatePath);
    templatesCache[templatePath] = fallbackTemplate;
    return fallbackTemplate;
  }
}

// Synchronously load template from file (for backwards compatibility)
export function loadTemplate(templatePath: string, template?: string): string {
  if (templatesCache[templatePath]) {
    return templatesCache[templatePath];
  }
  
  try {
    if (template) {
      // If template is provided directly, cache and return it
      templatesCache[templatePath] = template;
      return template;
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    templatesCache[templatePath] = templateContent;
    return templateContent;
  } catch (error) {
    console.warn(`Template not found: ${templatePath}. Using fallback template.`);
    // Provide a basic fallback template
    const fallbackTemplate = getFallbackTemplate(templatePath);
    templatesCache[templatePath] = fallbackTemplate;
    return fallbackTemplate;
  }
}

// Get a fallback template based on the path
function getFallbackTemplate(templatePath: string): string {
  if (templatePath.includes('string.mustache')) {
    return '<input type="text" id="{{id}}" name="{{id}}" class="w-full px-3 py-2 border" data-schema-id="{{id}}" {{#required}}required{{/required}} />';
  } else if (templatePath.includes('number.mustache')) {
    return '<input type="number" id="{{id}}" name="{{id}}" class="w-full px-3 py-2 border" data-schema-id="{{id}}" {{#required}}required{{/required}} />';
  } else if (templatePath.includes('boolean.mustache')) {
    return '<input type="checkbox" id="{{id}}" name="{{id}}" data-schema-id="{{id}}" />';
  } else if (templatePath.includes('object.mustache')) {
    return '<div id="{{id}}" data-schema-id="{{id}}"><div class="space-y-4">{{{properties}}}{{{conditionals}}}</div></div>';
  } else if (templatePath.includes('array.mustache')) {
    return '<div id="{{id}}" data-schema-id="{{id}}"><div class="array-items">{{{itemTemplate}}}</div><button type="button">Add Item</button></div>';
  } else {
    return '<div id="{{id}}" data-schema-id="{{id}}">{{{content}}}</div>';
  }
}


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
export async function generateTemplateAsync(schema: SchemaNode, templatesDir: string): Promise<string> {
  logger.debug("Starting template generation with schema:", schema.id);
  logger.debug("Templates directory:", templatesDir);
  
  // Check if templates directory exists
  try {
    await fsPromises.access(templatesDir);
    // logger.debug("Templates directory exists");
    
    // List template files to verify they exist
    const files = await fsPromises.readdir(templatesDir);
    
    // Check for essential templates
    const essentialTemplates = [
      'form.mustache', 'object.mustache', 'string.mustache', 
      'number.mustache', 'boolean.mustache', 'property.mustache'
    ];
    const missingTemplates = essentialTemplates.filter(template => !files.includes(template));
    
    if (missingTemplates.length > 0) {
      logger.error("Missing essential templates:", missingTemplates);
      throw new Error("Missing essential templates: " + missingTemplates.join(","));

    }
  } catch (error) {
    logger.error("Templates directory not found:", templatesDir);
    throw new Error(`Templates directory not found: ${templatesDir}`);
  }
  
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
  
  // Create base form structure
  const formTemplatePath = path.join(templatesDir, 'form.mustache');
  logger.debug("Loading form template from:", formTemplatePath);
  const formTemplate = await loadTemplateAsync(formTemplatePath);
  
  if (!formTemplate) {
    throw new Error('Failed to load form template');
  }
  
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
  const result = Mustache.render(formTemplate, {
    formId: schema.id,
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
  
  let templateName = 'object.mustache';
  if (node.layout === 'grid') {
    templateName = 'object-grid.mustache';
  } else if (node.layout === 'tabs') {
    templateName = 'object-tabs.mustache';
  } else if (node.layout === 'vtabs') {
    templateName = 'object-vtabs.mustache';
  } else if (node.layout === 'wizard') {
    templateName = 'object-wizard.mustache';
  }
  
  logger.debug(`Using template ${templateName} for ${node.id} (layout: ${node.layout})`);
  const templatePath = path.join(templatesDir, templateName);
  const objectTemplate = await loadTemplateAsync(templatePath);
  
  if (!objectTemplate) {
    throw new Error(`Failed to load template ${templateName}`);
  }
  
  let propertiesHTML = '';
  
  if (node.properties) {
    logger.debug(`Processing ${Object.keys(node.properties).length} properties for ${node.id}`);
    const propertyPromises = Object.entries(node.properties)
      .map(async ([key, propNode]) => {
        logger.debug(`  Processing property ${key} (${propNode.type})`);
        const propertyTemplate = await loadTemplateAsync(path.join(templatesDir, 'property.mustache'));
        
        if (!propertyTemplate) {
          throw new Error('Failed to load property template');
        }
        
        const propHTML = await generateNodeHTMLAsync(propNode, templatesDir);
        
        return Mustache.render(propertyTemplate, {
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
    const result = Mustache.render(objectTemplate, {
      id: node.id,
      title: node.title || '',
      description: node.description || '',
      properties: propertiesHTML,
      conditionals: conditionalsHTML
    });
    
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
  const arrayTemplate = await loadTemplateAsync(path.join(templatesDir, 'array.mustache'));
  
  // Generate template for array items
  const itemHTML = node.items 
    ? await generateNodeHTMLAsync(node.items, templatesDir)
    : '<!-- No items schema defined -->';
  
  return Mustache.render(arrayTemplate, {
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    itemTemplate: itemHTML
  });
}

// Generate HTML for string type - async version
async function generateStringHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  // Different templates based on format or enum
  let templateName = 'string.mustache';
  if (node.enum && node.enum.length > 0) {
    templateName = 'enum.mustache';
  } else if (node.format === 'date-time' || node.format === 'date') {
    templateName = 'date.mustache';
    // Set input type based on format
    node = {
      ...node,
      inputType: node.format === 'date-time' ? 'datetime-local' : 'date'
    };
  } else if (node.format === 'email') {
    templateName = 'email.mustache';
  } else if (node.format === 'uri') {
    templateName = 'url.mustache';
  } else if (node.format === 'textarea' || (node.maxLength && node.maxLength > 100)) {
    templateName = 'textarea.mustache';
  }
  
  const stringTemplate = await loadTemplateAsync(path.join(templatesDir, templateName));
  
  return Mustache.render(stringTemplate, {
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    minLength: node.minLength,
    maxLength: node.maxLength,
    pattern: node.pattern,
    format: node.format,
    default: node.default,
    enum: node.enum,
    inputType: (node as any).inputType
  });
}

// Generate HTML for number/integer type - async version
async function generateNumberHTMLAsync(node: SchemaNode, templatesDir: string): Promise<string> {
  const numberTemplate = await loadTemplateAsync(path.join(templatesDir, 'number.mustache'));
  
  // Set step to 1 for integer types
  const step = node.type === 'integer' ? 1 : undefined;
  
  return Mustache.render(numberTemplate, {
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
  const booleanTemplate = await loadTemplateAsync(path.join(templatesDir, 'boolean.mustache'));
  
  return Mustache.render(booleanTemplate, {
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    default: node.default
  });
}

// Generate HTML for conditionals - async version
async function generateConditionalsHTMLAsync(conditionals: Conditional[], templatesDir: string): Promise<string> {
  const conditionalTemplate = await loadTemplateAsync(path.join(templatesDir, 'conditional.mustache'));
  
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
    
    return Mustache.render(conditionalTemplate, {
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
  let templateName = 'object.mustache';
  if (node.layout === 'grid') {
    templateName = 'object-grid.mustache';
  } else if (node.layout === 'tabs') {
    templateName = 'object-tabs.mustache';
  } else if (node.layout === 'vtabs') {
    templateName = 'object-vtabs.mustache';
  } else if (node.layout === 'wizard') {
    templateName = 'object-wizard.mustache';
  }
  
  const objectTemplate = loadTemplate(path.join(templatesDir, templateName));
  
  let propertiesHTML = '';
  
  if (node.properties) {
    propertiesHTML = Object.entries(node.properties)
      .map(([key, propNode]) => {
        const propertyTemplate = loadTemplate(path.join(templatesDir, 'property.mustache'));
        const propHTML = generateNodeHTML(propNode, templatesDir);
        
        return Mustache.render(propertyTemplate, {
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
  
  return Mustache.render(objectTemplate, {
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    properties: propertiesHTML,
    conditionals: conditionalsHTML
  });
}

// Generate HTML for array type - sync version
function generateArrayHTML(node: SchemaNode, templatesDir: string): string {
  const arrayTemplate = loadTemplate(path.join(templatesDir, 'array.mustache'));
  
  // Generate template for array items
  const itemHTML = node.items 
    ? generateNodeHTML(node.items, templatesDir)
    : '<!-- No items schema defined -->';
  
  return Mustache.render(arrayTemplate, {
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    itemTemplate: itemHTML
  });
}

// Generate HTML for string type - sync version
function generateStringHTML(node: SchemaNode, templatesDir: string): string {
  // Different templates based on format or enum
  let templateName = 'string.mustache';
  if (node.enum && node.enum.length > 0) {
    templateName = 'enum.mustache';
  } else if (node.format === 'date-time' || node.format === 'date') {
    templateName = 'date.mustache';
    // Set input type based on format
    node = {
      ...node,
      inputType: node.format === 'date-time' ? 'datetime-local' : 'date'
    };
  } else if (node.format === 'email') {
    templateName = 'email.mustache';
  } else if (node.format === 'uri') {
    templateName = 'url.mustache';
  } else if (node.format === 'textarea' || (node.maxLength && node.maxLength > 100)) {
    templateName = 'textarea.mustache';
  }
  
  const stringTemplate = loadTemplate(path.join(templatesDir, templateName));
  
  return Mustache.render(stringTemplate, {
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    minLength: node.minLength,
    maxLength: node.maxLength,
    pattern: node.pattern,
    format: node.format,
    default: node.default,
    enum: node.enum,
    inputType: (node as any).inputType
  });
}

// Generate HTML for number/integer type - sync version
function generateNumberHTML(node: SchemaNode, templatesDir: string): string {
  const numberTemplate = loadTemplate(path.join(templatesDir, 'number.mustache'));
  
  // Set step to 1 for integer types
  const step = node.type === 'integer' ? 1 : undefined;
  
  return Mustache.render(numberTemplate, {
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
  const booleanTemplate = loadTemplate(path.join(templatesDir, 'boolean.mustache'));
  
  return Mustache.render(booleanTemplate, {
    id: node.id,
    title: node.title || '',
    description: node.description || '',
    required: node.required,
    default: node.default
  });
}

// Generate HTML for conditionals - sync version
function generateConditionalsHTML(conditionals: Conditional[], templatesDir: string): string {
  const conditionalTemplate = loadTemplate(path.join(templatesDir, 'conditional.mustache'));
  
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
    
    return Mustache.render(conditionalTemplate, {
      type: conditional.type,
      schema: schemaHTML
    });
  }).join('\n');
}