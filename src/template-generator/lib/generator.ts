import * as fs from 'fs';
import * as path from 'path';
import Mustache from 'mustache';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { SchemaNode, Conditional } from './schema-parser';

// Templates cache
const templatesCache: Record<string, string> = {};

// Load template from file
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
}

// Generate HTML template from schema
export function generateTemplate(schema: SchemaNode, templatesDir: string): string {
  // Create base form structure
  const formTemplate = loadTemplate(path.join(templatesDir, 'form.mustache'));
  
  // Generate HTML for schema
  const formContent = generateNodeHTML(schema, templatesDir);
  
  // Render form template with content
  return Mustache.render(formTemplate, {
    formId: schema.id,
    title: schema.title || 'Form',
    content: formContent
  });
}

// Generate HTML for a schema node
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

// Generate HTML for object type
function generateObjectHTML(node: SchemaNode, templatesDir: string): string {
  const objectTemplate = loadTemplate(path.join(templatesDir, 'object.mustache'));
  
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

// Generate HTML for array type
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

// Generate HTML for string type
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

// Generate HTML for number/integer type
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

// Generate HTML for boolean type
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

// Generate HTML for conditionals
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