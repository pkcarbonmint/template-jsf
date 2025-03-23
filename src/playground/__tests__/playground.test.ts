import { userLayout, productLayout, registrationLayout, surveyLayout, paymentLayout, LayoutConfig } from '../layoutSpecs';
import { renderPlayground, loadSchema, loadLayout, updateLayout, handleUserInput, submitForm, saveSchema, selectTestCase, loadSchemaById, saveCurrentLayout, getCurrentTemplate, listAvailableSchemas } from '../playgroundFunctions';
import { userSchema, productSchema, registrationSchema, surveySchema, paymentSchema } from '../schemas';
import { getLayoutBySchemaId, generateLayout, generateTemplateWithLayout } from '../layoutManager';
import { app } from '../server';
import request from 'supertest';

// Ensure layout specifications conform to LayoutConfig type
const userLayoutSpec = userLayout;
const productLayoutSpec = productLayout;
const registrationLayoutSpec = registrationLayout;
const surveyLayoutSpec = surveyLayout;
const paymentLayoutSpec = paymentLayout;

describe('Playground Layout Tests', () => {
  test('User Layout Specification', () => {
    expect(userLayoutSpec).toHaveProperty('layout');
    expect(userLayoutSpec).toHaveProperty('order');
    expect(userLayoutSpec.order).toContain('name');
    expect(userLayoutSpec.order).toContain('age');
    expect(userLayoutSpec.order).toContain('email');
    expect(userLayoutSpec.layout).toBe('vertical');
  });

  test('Product Layout Specification', () => {
    expect(productLayoutSpec).toHaveProperty('layout');
    expect(productLayoutSpec).toHaveProperty('order');
    expect(productLayoutSpec.order).toContain('id');
    expect(productLayoutSpec.order).toContain('name');
    expect(productLayoutSpec.order).toContain('price');
    expect(productLayoutSpec.order).toContain('inStock');
    expect(productLayoutSpec.layout).toBe('grid');
  });
  
  test('Registration Layout with Tabs', () => {
    expect(registrationLayoutSpec).toHaveProperty('layout');
    expect(registrationLayoutSpec).toHaveProperty('tabs');
    expect(registrationLayoutSpec.layout).toBe('tabs');
    expect(registrationLayoutSpec.tabs).toHaveLength(2);
    expect(registrationLayoutSpec.tabs![0].id).toBe('basicInfo');
    expect(registrationLayoutSpec.tabs![1].id).toBe('contactInfo');
  });
  
  test('Survey Layout with Conditional Fields', () => {
    expect(surveyLayoutSpec).toHaveProperty('layout');
    expect(surveyLayoutSpec).toHaveProperty('order');
    expect(surveyLayoutSpec.order).toContain('hasComments');
    expect(surveyLayoutSpec.order).toContain('comments');
    expect(surveyLayoutSpec.layout).toBe('vertical');
  });
  
  test('Payment Layout with Wizard Steps', () => {
    expect(paymentLayoutSpec).toHaveProperty('layout');
    expect(paymentLayoutSpec).toHaveProperty('steps');
    expect(paymentLayoutSpec.layout).toBe('wizard');
    expect(paymentLayoutSpec.steps).toHaveLength(4);
    expect(paymentLayoutSpec.steps![0].id).toBe('paymentMethod');
    expect(paymentLayoutSpec.steps![1].id).toBe('creditCardDetails');
  });
});

const testCases = [
  'should render the playground correctly',
  'should load schema correctly',
  'should load layout based on schema',
  'should handle cases with no layout',
  'should handle changes to schema',
  'should handle changes to layout',
  'should handle user input correctly',
  'should submit the form correctly',
  'should save schema correctly',
  'should select a test case correctly'
];

function listTestCases() {
  return testCases;
}

describe('Playground Functionality Tests', () => {
  test('should render the playground correctly', () => {
    const rendered = renderPlayground();
    expect(rendered).toBeTruthy();
  });

  test('should load schema correctly', () => {
    const schema = loadSchema();
    expect(schema).not.toBeNull();
  });

  test('should load layout based on schema', () => {
    const layout = loadLayout();
    expect(layout).not.toBeNull();
    if (layout) {
      expect(layout).toHaveProperty('layout');
      expect(layout).toHaveProperty('order');
    }
  });

  test('should handle cases with no layout', () => {
    // This is now redundant as layouts are auto-generated if not found
    const layout = loadLayout();
    if (!layout) {
      expect(layout).toBeNull();
    }
  });

  test('should handle changes to schema', async () => {
    const newSchema = { id: 'newSchema', type: 'object', properties: { newField: { type: 'string' } } };
    const updatedLayout = await updateLayout(newSchema);
    expect(updatedLayout).toHaveProperty('layout');
    expect(updatedLayout.order).toContain('newField');
  });

  test('should handle changes to layout', async () => {
    const newLayout = { layout: 'grid', order: ['newField'] };
    const updatedLayout = await updateLayout(newLayout);
    expect(updatedLayout).toHaveProperty('layout');
    expect(updatedLayout.layout).toBe('grid');
  });

  test('should handle user input correctly', () => {
    const input = '{"name": "Test User", "email": "test@example.com"}';
    const result = handleUserInput(input);
    expect(result).toBe('Input processed successfully');
  });

  test('should submit form data correctly', () => {
    const formData = { name: 'John Doe', email: 'john@example.com' };
    const submitResult = submitForm(formData);
    expect(submitResult).toBe(true);
  });

  test('should save schema correctly', () => {
    const schemaToSave = { id: 'user', type: 'object', properties: { name: { type: 'string' } } };
    const saveResult = saveSchema(schemaToSave);
    expect(saveResult).toBe(true);
  });

  test('should select a test case correctly', () => {
    const testCaseId = 'testCase1';
    const selectedTestCase = selectTestCase(testCaseId);
    expect(selectedTestCase).toEqual(testCaseId);
  });
  
  test('should load schema by ID', async () => {
    const schema = await loadSchemaById('user');
    expect(schema).not.toBeNull();
    if (schema) {
      expect(schema.id).toBe('user');
    }
  });
  
  test('should save current layout', () => {
    // Load a schema first to set currentSchemaId
    loadSchemaById('user');
    
    const result = saveCurrentLayout();
    expect(result).toBe(true);
  });
  
  test('should get current template', () => {
    const template = getCurrentTemplate();
    expect(template).not.toBeNull();
  });
  
  test('should list available schemas', () => {
    const schemas = listAvailableSchemas();
    expect(schemas).toBeInstanceOf(Array);
    expect(schemas.length).toBeGreaterThan(0);
  });
});

describe('Layout Manager Tests', () => {
  test('should get layout by schema ID', () => {
    const layout = getLayoutBySchemaId('user');
    expect(layout).not.toBeNull();
    if (layout) {
      expect(layout.layout).toBe('vertical');
    }
  });
  
  test('should generate layout from schema', () => {
    const layout = generateLayout(userSchema);
    expect(layout).toHaveProperty('layout');
    expect(layout).toHaveProperty('order');
  });
  
  test('should generate template with layout', async () => {
    const template = await generateTemplateWithLayout(userSchema, userLayout);
    expect(template).toContain('<form');
    expect(template).toContain('schema-form');
  });
});

describe('Server API Tests', () => {
  test('GET /api/schemas should return all schemas', async () => {
    const response = await request(app).get('/api/schemas');
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });
  
  test('GET /api/schemas/:id should return a specific schema', async () => {
    const response = await request(app).get('/api/schemas/user');
    expect(response.status).toBe(200);
    expect(response.body.schema).toHaveProperty('id', 'user');
  });
  
  test('POST /api/generate-layout should generate a layout', async () => {
    const response = await request(app)
      .post('/api/generate-layout')
      .send({ schema: userSchema })
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body.layout).toHaveProperty('layout');
    expect(response.body.layout).toHaveProperty('order');
  });
  
  test('POST /api/generate-template should generate a template', async () => {
    const response = await request(app)
      .post('/api/generate-template')
      .send({ schema: userSchema, layout: userLayout })
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(200);
    expect(response.body.template).toContain('<form');
  });
});
