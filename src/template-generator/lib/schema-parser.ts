import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';

// Types for our intermediate representation
export type SchemaNode = {
  id: string;
  type: string;
  title?: string;
  description?: string;
  required: boolean;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  enum?: any[];
  conditionals?: Conditional[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: any;
  children?: SchemaNode[];
  // Additional UI specific properties
  inputType?: string;
};

export type Conditional = {
  type: 'if' | 'then' | 'else' | 'allOf' | 'anyOf' | 'oneOf' | 'not';
  schema: SchemaNode | SchemaNode[];
};

// Main schema parsing function
export function parseSchema(schema: any, path: string = '', parentRequired: string[] = []): SchemaNode {
  // Generate a unique ID for this schema node
  const id = generateId(path);
  
  // Determine if this property is required
  const isRequired = path.includes('.') 
    ? parentRequired.includes(path.split('.').pop() || '') 
    : true;
  
  // Extract basic schema properties
  const node: SchemaNode = {
    id,
    type: schema.type || 'object',
    title: schema.title,
    description: schema.description,
    required: isRequired,
    minimum: schema.minimum,
    maximum: schema.maximum,
    minLength: schema.minLength,
    maxLength: schema.maxLength,
    pattern: schema.pattern,
    format: schema.format,
    default: schema.default,
    enum: schema.enum
  };
  
  // Process conditionals
  const conditionals: Conditional[] = [];
  
  if (schema.if && (schema.then || schema.else)) {
    if (schema.then) {
      conditionals.push({
        type: 'if',
        schema: parseSchema(schema.if, `${path}.if`, [])
      });
      
      conditionals.push({
        type: 'then',
        schema: parseSchema(schema.then, `${path}.then`, [])
      });
    }
    
    if (schema.else) {
      conditionals.push({
        type: 'else',
        schema: parseSchema(schema.else, `${path}.else`, [])
      });
    }
  }
  
  if (schema.allOf) {
    conditionals.push({
      type: 'allOf',
      schema: schema.allOf.map((s: any, i: number) => 
        parseSchema(s, `${path}.allOf.${i}`, [])
      )
    });
  }
  
  if (schema.anyOf) {
    conditionals.push({
      type: 'anyOf',
      schema: schema.anyOf.map((s: any, i: number) => 
        parseSchema(s, `${path}.anyOf.${i}`, [])
      )
    });
  }
  
  if (schema.oneOf) {
    conditionals.push({
      type: 'oneOf',
      schema: schema.oneOf.map((s: any, i: number) => 
        parseSchema(s, `${path}.oneOf.${i}`, [])
      )
    });
  }
  
  if (schema.not) {
    conditionals.push({
      type: 'not',
      schema: parseSchema(schema.not, `${path}.not`, [])
    });
  }
  
  if (conditionals.length > 0) {
    node.conditionals = conditionals;
  }
  
  // Process object type
  if (node.type === 'object' && schema.properties) {
    node.properties = {};
    const requiredProps = schema.required || [];
    
    Object.entries(schema.properties).forEach(([key, value]) => {
      node.properties![key] = parseSchema(
        value, 
        path ? `${path}.${key}` : key, 
        requiredProps
      );
    });
  }
  
  // Process array type
  if (node.type === 'array' && schema.items) {
    node.items = parseSchema(schema.items, `${path}.items`, []);
  }
  
  return node;
}

// Helper function to generate unique IDs for schema nodes
function generateId(path: string): string {
  return path ? `field-${path.replace(/\./g, '-')}` : 'root';
} 