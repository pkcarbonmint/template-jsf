/**
 * Validation functionality tests for JSON Schema Form
 * Tests basic validation capabilities
 */

import { SchemaForm } from './schema-form-mock';
const path = require('path');
const testEnv = require('./test-environment');

// Basic HTML template for testing - make sure it includes the test container
const basicTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>Validation Test</title>
</head>
<body>
  <div id="validation-test-form"></div>
</body>
</html>
`;

// Set up DOM before all tests
beforeAll(() => {
  console.log('Setting up DOM environment');
  
  // Set up the DOM with our template
  const domEnvironment = testEnv.setupDOM(basicTemplate);
  
  // Add to global scope to ensure it's available everywhere
  global.document = domEnvironment.document;
  global.window = domEnvironment.window;
  
  // Debug log to verify setup
  console.log(`DOM setup complete. document.body exists: ${!!global.document.body}`);
  
  // This should report true after the DOM is set up
  const containerExists = !!global.document.getElementById('validation-test-form');
  console.log(`validation-test-form exists: ${containerExists}`);
  
  // If the container doesn't exist for some reason, create it
  if (!containerExists) {
    console.log('Creating validation-test-form container manually');
    const container = global.document.createElement('div');
    container.id = 'validation-test-form';
    global.document.body.appendChild(container);
  }
});

// Clean up after all tests
afterAll(() => {
  console.log('Cleaning up DOM environment');
  testEnv.cleanup();
});

describe('Schema Form Basic Tests', () => {
  test('should create a simple form', () => {
    // Find the container
    const container = global.document.getElementById('validation-test-form');
    expect(container).toBeTruthy();
    
    // Create a form element manually
    const form = global.document.createElement('form');
    form.id = 'test-form';
    form.className = 'schema-form';
    
    // Add a simple input
    const input = global.document.createElement('input');
    input.type = 'text';
    input.name = 'name';
    form.appendChild(input);
    
    // Add to container
    container.appendChild(form);
    
    // Verify the form is in the DOM
    const formInDOM = global.document.getElementById('test-form');
    expect(formInDOM).toBeTruthy();
    expect(formInDOM).toBe(form);
  });
  
  test('should initialize a SchemaForm without errors', () => {
    // Setup
    const container = global.document.getElementById('validation-test-form');
    container.innerHTML = '';
    
    // Create a simple form
    const form = global.document.createElement('form');
    form.id = 'schema-form';
    container.appendChild(form);
    
    // Simple schema
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" }
      }
    };
    
    // Initialize SchemaForm
    const schemaForm = new SchemaForm(form, { schema });
    
    // Verify initialization
    expect(schemaForm).toBeTruthy();
    expect(schemaForm.element).toBe(form);
    expect(schemaForm.options.schema).toEqual(schema);
  });
  
  test('should validate required fields', () => {
    // Setup
    const container = global.document.getElementById('validation-test-form');
    container.innerHTML = '';
    
    // Create a simple form
    const form = global.document.createElement('form');
    form.id = 'validation-form';
    container.appendChild(form);
    
    // Schema with required fields
    const schema = {
      type: "object",
      required: ["name", "email"],
      properties: {
        name: { 
          type: "string",
          minLength: 2
        },
        email: {
          type: "string",
          format: "email"
        }
      }
    };
    
    // Create SchemaForm with empty data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: {} // Empty data should trigger required validation errors
    });
    
    // Run validation - should not throw errors
    const isValid = schemaForm.validate();
    
    // Should be invalid because of required fields
    expect(isValid).toBe(false);
    
    // Should have at least 2 errors (one for each required field)
    expect(Array.isArray(schemaForm.errors)).toBe(true);
    expect(schemaForm.errors.length).toBeGreaterThanOrEqual(2);
    
    // Errors should mention the field names
    const errorMessages = schemaForm.errors.map(err => err.message);
    expect(errorMessages.some(msg => msg.includes('name'))).toBe(true);
    expect(errorMessages.some(msg => msg.includes('email'))).toBe(true);
  });
});

describe('Schema Form Advanced Validation Tests', () => {
  test('should validate allOf conditions', () => {
    // Setup
    const container = global.document.getElementById('validation-test-form');
    container.innerHTML = '';
    
    // Create a simple form
    const form = global.document.createElement('form');
    form.id = 'validation-allof-form';
    container.appendChild(form);
    
    // Schema with allOf validation
    const schema = {
      type: "object",
      properties: {
        password: { type: "string" }
      },
      allOf: [
        {
          properties: {
            password: { minLength: 8 }
          }
        },
        {
          properties: {
            password: { pattern: "^(?=.*[A-Z])(?=.*[0-9]).*$" } // Requires uppercase and digit
          }
        }
      ]
    };
    
    // Create SchemaForm with invalid data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: { password: "weak" } // Too short, no uppercase, no digit
    });
    
    // Run validation
    const isValid = schemaForm.validate();
    
    // Should be invalid
    expect(isValid).toBe(false);
    
    // Should have errors related to password
    expect(Array.isArray(schemaForm.errors)).toBe(true);
    expect(schemaForm.errors.length).toBeGreaterThan(0);
    
    // Test with valid data
    schemaForm.setData({ password: "StrongPw123" });
    const isValidNow = schemaForm.validate();
    
    // Should be valid now
    expect(isValidNow).toBe(true);
  });
  
  test('should validate anyOf conditions', () => {
    // Setup
    const container = global.document.getElementById('validation-test-form');
    container.innerHTML = '';
    
    // Create a simple form
    const form = global.document.createElement('form');
    form.id = 'validation-anyof-form';
    container.appendChild(form);
    
    // Schema with anyOf validation
    const schema = {
      type: "object",
      properties: {
        identifier: { type: "string" }
      },
      anyOf: [
        {
          properties: {
            identifier: { format: "email" }
          }
        },
        {
          properties: {
            identifier: { pattern: "^[0-9]{10}$" } // 10-digit phone number
          }
        }
      ]
    };
    
    // Create SchemaForm with invalid data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: { identifier: "invalid-id" } // Neither email nor phone
    });
    
    // Run validation
    const isValid = schemaForm.validate();
    
    // Should be invalid
    expect(isValid).toBe(false);
    
    // Test with valid email
    schemaForm.setData({ identifier: "test@example.com" });
    expect(schemaForm.validate()).toBe(true);
    
    // Test with valid phone
    schemaForm.setData({ identifier: "1234567890" });
    expect(schemaForm.validate()).toBe(true);
  });
  
  test('should validate if/then/else conditions', () => {
    // Setup
    const container = global.document.getElementById('validation-test-form');
    container.innerHTML = '';
    
    // Create a simple form
    const form = global.document.createElement('form');
    form.id = 'validation-if-then-else-form';
    container.appendChild(form);
    
    // Schema with if/then/else validation
    const schema = {
      type: "object",
      properties: {
        paymentType: { 
          type: "string",
          enum: ["credit", "check"] 
        },
        creditCardNumber: { type: "string" },
        checkNumber: { type: "string" }
      },
      if: {
        properties: { paymentType: { const: "credit" } }
      },
      then: {
        required: ["creditCardNumber"],
        properties: {
          creditCardNumber: { pattern: "^[0-9]{16}$" } // 16-digit credit card
        }
      },
      else: {
        required: ["checkNumber"],
        properties: {
          checkNumber: { pattern: "^[0-9]{9}$" } // 9-digit check number
        }
      }
    };
    
    // Create SchemaForm with invalid data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: { paymentType: "credit" } // Missing required creditCardNumber
    });
    
    // Run validation
    const isValid = schemaForm.validate();
    
    // Should be invalid
    expect(isValid).toBe(false);
    
    // Test with valid credit card
    schemaForm.setData({ 
      paymentType: "credit", 
      creditCardNumber: "1234567890123456" 
    });
    expect(schemaForm.validate()).toBe(true);
    
    // Test with invalid check payment
    schemaForm.setData({ 
      paymentType: "check"
    });
    expect(schemaForm.validate()).toBe(false);
    
    // Test with valid check payment
    schemaForm.setData({ 
      paymentType: "check", 
      checkNumber: "123456789" 
    });
    expect(schemaForm.validate()).toBe(true);
  });
}); 