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
  return schemas.find(schema => schema.id === id);
}

// List all available schemas with name and id
export function listSchemas() {
  return schemas.map(schema => ({
    id: schema.id,
    name: 'title' in schema ? schema.title : schema.id
  }));
}
