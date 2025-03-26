import { parseArgs } from 'util';
import { parseSchemaStr } from '../template-generator/lib/schema-parser';
import { userSchema, productSchema, registrationSchema, surveySchema, paymentSchema } from './schemas';

// Export all schemas for use in the playground
export const schemas = [
  userSchema,
  productSchema,
  registrationSchema,
  surveySchema,
  paymentSchema
];

// Get schema by ID
export function getSchemaById(id: string) {
  
  // won't work because all schemas have "root" as their id at the root of the schema
  const matching = schemas.find(schema => {
    const json = JSON.parse(schema);
    return json.id === id;
  });
  if (!matching) {
    return null;
  }
  const parsed = parseSchemaStr(matching);
  parsed.id = id;
  return parsed;
}

// List all available schemas with name and id
export function listSchemas() {
  const parsedArr = schemas.map(parseSchemaStr);
  return parsedArr.map(schema => ({
    id: schema.id,
    name: 'title' in schema ? schema.title : schema.id
  }));
}
