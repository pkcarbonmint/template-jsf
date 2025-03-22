import { SchemaNode } from './schema-parser';

/**
 * Performs a deep validation of the schema to ensure it meets all requirements
 * @param schema The schema to validate
 * @returns An array of validation errors, empty if the schema is valid
 */
export function validateSchemaDeep(schema: SchemaNode): string[] {
  const errors: string[] = [];
  
  function validateNode(node: SchemaNode, path: string = ''): void {
    // Check required properties
    if (!node.id) {
      errors.push(`Missing required 'id' at path: ${path}`);
    }
    
    if (!node.type) {
      errors.push(`Missing required 'type' at path: ${path}`);
    }
    
    // Type-specific validations
    switch (node.type) {
      case 'object':
        if (!node.properties || Object.keys(node.properties).length === 0) {
          errors.push(`Object has no properties at path: ${path}`);
        } else {
          Object.entries(node.properties).forEach(([key, prop]) => {
            validateNode(prop, `${path ? path + '.' : ''}${key}`);
          });
        }
        break;
        
      case 'array':
        if (!node.items) {
          errors.push(`Array has no items schema at path: ${path}`);
        } else {
          validateNode(node.items, `${path ? path + '.' : ''}items`);
        }
        break;
        
      case 'string':
        // Validate string-specific properties
        if (node.enum && (!Array.isArray(node.enum) || node.enum.length === 0)) {
          errors.push(`Invalid enum at path: ${path}`);
        }
        break;
        
      case 'number':
      case 'integer':
        // Validate number constraints
        if (node.minimum !== undefined && node.maximum !== undefined && node.minimum > node.maximum) {
          errors.push(`Invalid range: minimum (${node.minimum}) > maximum (${node.maximum}) at path: ${path}`);
        }
        break;
    }
    
    // Validate conditionals
    if (node.conditionals && node.conditionals.length > 0) {
      node.conditionals.forEach((conditional, index) => {
        if (!conditional.type) {
          errors.push(`Conditional missing type at path: ${path}.conditionals[${index}]`);
        }
        
        if (!conditional.schema) {
          errors.push(`Conditional missing schema at path: ${path}.conditionals[${index}]`);
        } else if (Array.isArray(conditional.schema)) {
          conditional.schema.forEach((s, i) => {
            validateNode(s, `${path}.conditionals[${index}].schema[${i}]`);
          });
        } else {
          validateNode(conditional.schema, `${path}.conditionals[${index}].schema`);
        }
      });
    }
  }
  
  validateNode(schema);
  return errors;
}
