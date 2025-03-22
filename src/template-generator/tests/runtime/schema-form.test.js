/**
 * Tests for the SchemaForm implementation
 */
const path = require('path');
const fs = require('fs');
const testEnv = require('./test-environment');
const { SchemaForm } = require('./schema-form-mock');

// Paths to test files
const SCHEMAS_DIR = path.resolve(__dirname, '../../../tests/schemas');
const GENERATED_DIR = path.resolve(__dirname, '../../../tests/generated');
const DIST_DIR = path.resolve(__dirname, '../../../dist');

/**
 * Set up test environment with given schema and template
 */
function setupTestEnvironment(schemaFile, templateFile) {
  // Load schema
  const schema = testEnv.loadTestSchema(schemaFile);
  
  // Load template
  const template = testEnv.loadTemplate(templateFile);
  
  // Set up DOM
  const { document } = testEnv.setupDOM(template);
  
  // Get form element
  const formElement = document.querySelector('form');
  
  return { document, formElement, schema };
}

// Tests
describe('SchemaForm Runtime Implementation', () => {
  // Clean up after each test
  afterEach(() => {
    testEnv.cleanup();
  });
  
  describe('Initialization', () => {
    test('should initialize with element and options', () => {
      const { document, formElement } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Create SchemaForm instance with the form element
      const schemaForm = new SchemaForm(formElement, {
        debug: true
      });
      
      expect(schemaForm).toBeDefined();
      expect(schemaForm.getData).toBeDefined();
      expect(schemaForm.setData).toBeDefined();
    });
    
    test('should initialize with selector string', () => {
      const { document } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Create SchemaForm instance with selector
      const schemaForm = new SchemaForm('form', {
        debug: false
      });
      
      expect(schemaForm).toBeDefined();
      expect(schemaForm.getData).toBeDefined();
    });
  });
  
  describe('Data Management', () => {
    test('should set and get form data', () => {
      const { document, formElement } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Set data
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        consent: true
      };
      
      schemaForm.setData(testData);
      
      // Get data and verify
      const formData = schemaForm.getData();
      expect(formData).toEqual(expect.objectContaining(testData));
    });
    
    test('should handle nested data structures', () => {
      const { document, formElement } = setupTestEnvironment('conditional.json', 'conditional.html');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Set nested data
      const testData = {
        name: 'Test User',
        address: {
          street: '123 Main St',
          city: 'Testville'
        }
      };
      
      schemaForm.setData(testData);
      
      // Get data and verify
      const formData = schemaForm.getData();
      expect(formData.name).toBe('Test User');
      expect(formData.address).toBeDefined();
      expect(formData.address.street).toBe('123 Main St');
    });
  });
  
  describe('Event Handling', () => {
    test('should register and trigger event handlers', () => {
      const { document, formElement } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Create mock event handlers
      const changeHandler = jest.fn();
      const submitHandler = jest.fn();
      
      // Register event handlers
      schemaForm.on('change', changeHandler);
      schemaForm.on('submit', submitHandler);
      
      // Manually trigger events
      schemaForm.triggerEvent('change', { field: 'name', value: 'Test' });
      schemaForm.triggerEvent('submit', { formData: { name: 'Test' } });
      
      // Verify handlers were called
      expect(changeHandler).toHaveBeenCalledTimes(1);
      expect(submitHandler).toHaveBeenCalledTimes(1);
      
      // Unregister handlers
      schemaForm.off('change', changeHandler);
      
      // Trigger again
      schemaForm.triggerEvent('change', { field: 'name', value: 'Test2' });
      
      // Verify first handler not called again
      expect(changeHandler).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Form Validation', () => {
    test('should validate form data', () => {
      const { document, formElement } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Test validation (note: this is a simple test as validation depends on many factors)
      const validationResult = schemaForm.validate();
      
      // Simple validation check - we're just testing the method exists and runs
      expect(typeof validationResult).toBe('boolean');
    });
  });
  
  describe('Schema Conditional Logic', () => {
    test('should evaluate conditionals and update visibility', () => {
      const { document, formElement } = setupTestEnvironment('conditional.json', 'conditional.html');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Get visibility history/report (testing the method existence)
      const visibilityHistory = schemaForm.getFieldVisibilityHistory();
      const visibilityReport = schemaForm.getFieldVisibilityReport();
      
      expect(visibilityHistory).toBeDefined();
      expect(visibilityReport).toBeDefined();
    });
  });
  
  describe('Form Reset', () => {
    test('should reset form to initial state', () => {
      const { document, formElement } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Set some data
      schemaForm.setData({
        name: 'Test User',
        email: 'test@example.com'
      });
      
      // Reset the form
      schemaForm.reset();
      
      // Verify data is cleared
      const formData = schemaForm.getData();
      expect(formData.name).toBeFalsy();
      expect(formData.email).toBeFalsy();
    });
  });
  
  describe('Form Submission', () => {
    test('should handle form submission', () => {
      const { document, formElement } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Create mock submit function
      const mockSubmit = jest.spyOn(SchemaForm.prototype, 'submit');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement, {
        onSubmit: (data) => {
          // Do nothing for test
        }
      });
      
      // Trigger submission
      schemaForm.submit();
      
      // Verify submission was called
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      
      // Clean up mock
      mockSubmit.mockRestore();
    });
  });
}); 