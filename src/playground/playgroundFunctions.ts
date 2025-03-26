import { schemas, getSchemaById, listSchemas } from './schemaManager';
import { getLayoutBySchemaId, generateLayout, generateTemplateWithLayout, saveLayout } from './layoutManager';
import { LayoutConfig } from './layoutSpecs';

// Current state
let currentSchemaId: string | null = null;
let currentSchema: any = null;
let currentLayout: LayoutConfig | null = null;
let currentTemplate: string | null = null;
let formData: any = {};

/**
 * Render the playground interface
 * @returns Success status
 */
export function renderPlayground(): boolean {
  try {
    // In a full implementation, this would render the UI components
    console.log('Rendering playground interface');
    const schemas = listSchemas();
    
    // Initialize with the first schema if available
    if (schemas.length > 0) {
      loadSchemaById(schemas[0].id);
    }
    
    return true;
  } catch (error) {
    console.error('Error rendering playground:', error);
    return false;
  }
}

/**
 * Load a schema by ID
 * @param schemaId 
 * @returns The loaded schema
 */
export async function loadSchemaById(schemaId: string): Promise<any> {
  try {
    const schema = getSchemaById(schemaId);
    if (!schema) {
      throw new Error(`Schema with ID ${schemaId} not found`);
    }
    
    currentSchemaId = schemaId;
    currentSchema = schema;
    
    // Load or generate a layout for this schema
    const existingLayout = getLayoutBySchemaId(schemaId);
    currentLayout = existingLayout || generateLayout(schema);
    
    // Generate the template with the layout
    currentTemplate = await generateTemplateWithLayout(schema, currentLayout);
    
    return schema;
  } catch (error) {
    console.error('Error loading schema:', error);
    return null;
  }
}

/**
 * Get the current schema
 * @returns Current schema object
 */
export function loadSchema(): any {
  return currentSchema;
}

/**
 * Get the current layout
 * @returns Current layout configuration
 */
export function loadLayout(): LayoutConfig | null {
  return currentLayout;
}

/**
 * Update the layout based on schema changes or direct layout edits
 * @param input Schema or layout object
 * @returns Updated layout
 */
export async function updateLayout(input: any): Promise<LayoutConfig> {
  try {
    let updatedLayout: LayoutConfig;
    
    if (input.id && input.type && input.properties) {
      // Input is a schema
      updatedLayout = generateLayout(input);
    } else if (input.layout && input.order) {
      // Input is a layout
      updatedLayout = input;
    } else {
      throw new Error('Invalid input for updateLayout');
    }
    
    // Update current layout
    currentLayout = updatedLayout;
    
    // If we have a current schema, regenerate the template
    if (currentSchema) {
      currentTemplate = await generateTemplateWithLayout(currentSchema, updatedLayout);
    }
    
    return updatedLayout;
  } catch (error) {
    console.error('Error updating layout:', error);
    return {
      layout: 'vertical',
      order: []
    };
  }
}

/**
 * Handle user input in the form
 * @param input User input data
 * @returns Processed output
 */
export function handleUserInput(input: string): string {
  try {
    // Parse user input as JSON if possible
    try {
      const parsedInput = JSON.parse(input);
      formData = parsedInput;
    } catch {
      // Not JSON, treat as raw input
      formData = { input };
    }
    
    return 'Input processed successfully';
  } catch (error) {
    console.error('Error handling user input:', error);
    return `Error: ${(error as Error).message}`;
  }
}

/**
 * Submit form data
 * @param formData Form data object
 * @returns Success status
 */
export function submitForm(formData: any): boolean {
  try {
    console.log('Form submitted with data:', formData);
    return true;
  } catch (error) {
    console.error('Error submitting form:', error);
    return false;
  }
}

/**
 * Save a schema
 * @param schema Schema to save
 * @returns Success status
 */
export function saveSchema(schema: any): boolean {
  try {
    // In a real implementation, this would save to a file or database
    console.log('Saving schema:', schema);
    
    // Update current schema
    if (schema.id) {
      currentSchemaId = schema.id;
      currentSchema = schema;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving schema:', error);
    return false;
  }
}

/**
 * Save the current layout
 * @returns Success status
 */
export function saveCurrentLayout(): boolean {
  if (!currentSchemaId || !currentLayout) {
    return false;
  }
  
  return saveLayout(currentSchemaId, currentLayout);
}

/**
 * Select a test case
 * @param testCaseId Test case ID
 * @returns Selected test case ID
 */
export function selectTestCase(testCaseId: string): string {
  // In a real implementation, this would load test data
  console.log(`Selected test case: ${testCaseId}`);
  return testCaseId;
}

/**
 * Get the current template HTML
 * @returns HTML template string
 */
export function getCurrentTemplate(): string | null {
  return currentTemplate;
}

/**
 * List all available schemas
 * @returns Array of schema info objects
 */
export function listAvailableSchemas(): any[] {
  return listSchemas();
}
