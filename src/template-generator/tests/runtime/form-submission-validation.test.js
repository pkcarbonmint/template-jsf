/**
 * Form submission and error reporting tests for JSON Schema Form
 * Tests validation during submission and error reporting functionality
 */

import { SchemaForm } from './schema-form-mock';
const path = require('path');
const testEnv = require('./test-environment');

// Basic HTML template for testing - make sure it includes the test container
const basicTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>Form Submission Validation Test</title>
</head>
<body>
  <div id="submission-test-form"></div>
</body>
</html>
`;

// Set up DOM before all tests
beforeAll(() => {
  console.log('Setting up DOM environment for submission tests');
  
  // Set up the DOM with our template
  const domEnvironment = testEnv.setupDOM(basicTemplate);
  
  // Add to global scope to ensure it's available everywhere
  global.document = domEnvironment.document;
  global.window = domEnvironment.window;
  
  // This should report true after the DOM is set up
  const containerExists = !!global.document.getElementById('submission-test-form');
  
  // If the container doesn't exist for some reason, create it
  if (!containerExists) {
    const container = global.document.createElement('div');
    container.id = 'submission-test-form';
    global.document.body.appendChild(container);
  }
});

// Clean up after all tests
afterAll(() => {
  console.log('Cleaning up DOM environment');
  testEnv.cleanup();
});

describe('Form Submission Validation Tests', () => {
  test('should validate form on submission', () => {
    // Setup
    const container = global.document.getElementById('submission-test-form');
    container.innerHTML = '';
    
    // Create a form element
    const form = global.document.createElement('form');
    form.id = 'validation-submit-form';
    container.appendChild(form);
    
    // Schema with required fields
    const schema = {
      type: "object",
      required: ["username", "password"],
      properties: {
        username: { 
          type: "string",
          minLength: 3
        },
        password: {
          type: "string",
          minLength: 6
        }
      }
    };
    
    // Initialize SchemaForm with empty data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: {}
    });
    
    // Spy on validate method
    const validateSpy = jest.spyOn(schemaForm, 'validate');
    
    // Create a mock for the submit event handler
    const submitHandler = jest.fn();
    schemaForm.on('submit', submitHandler);
    
    // Submit the form (should validate and fail)
    schemaForm.submit();
    
    // Validate should have been called
    expect(validateSpy).toHaveBeenCalled();
    
    // Form submission should have occurred despite validation errors
    expect(submitHandler).toHaveBeenCalled();
    
    // Should have validation errors
    expect(schemaForm.errors.length).toBeGreaterThan(0);
    
    // Clean up
    validateSpy.mockRestore();
  });
  
  test('should not submit form on validation failure when validateOnSubmit option is true', () => {
    // Setup
    const container = global.document.getElementById('submission-test-form');
    container.innerHTML = '';
    
    // Create a form element
    const form = global.document.createElement('form');
    form.id = 'validation-prevent-submit-form';
    container.appendChild(form);
    
    // Schema with required fields
    const schema = {
      type: "object",
      required: ["username", "password"],
      properties: {
        username: { 
          type: "string",
          minLength: 3
        },
        password: {
          type: "string",
          minLength: 6
        }
      }
    };
    
    // Mock form submission callback
    const onSubmitMock = jest.fn();
    
    // Initialize SchemaForm with empty data and validateOnSubmit: true
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: {},
      validateOnSubmit: true,
      onSubmit: onSubmitMock
    });
    
    // Create a mock for the event handler
    const submitHandler = jest.fn();
    schemaForm.on('submit', submitHandler);
    
    // Submit the form (should validate and not submit)
    schemaForm.submit();
    
    // The submit event should not have been emitted
    expect(submitHandler).not.toHaveBeenCalled();
    
    // The onSubmit callback should not have been called
    expect(onSubmitMock).not.toHaveBeenCalled();
    
    // Should have validation errors
    expect(schemaForm.errors.length).toBeGreaterThan(0);
    
    // Now set valid data
    schemaForm.setData({
      username: "testuser",
      password: "password123"
    });
    
    // Submit again
    schemaForm.submit();
    
    // Should have been submitted this time
    expect(submitHandler).toHaveBeenCalled();
    expect(onSubmitMock).toHaveBeenCalled();
  });
});

describe('Error Reporting Tests', () => {
  test('should provide access to validation errors after validation', () => {
    // Setup
    const container = global.document.getElementById('submission-test-form');
    container.innerHTML = '';
    
    // Create a form element
    const form = global.document.createElement('form');
    form.id = 'error-access-form';
    container.appendChild(form);
    
    // Schema with required fields
    const schema = {
      type: "object",
      required: ["name", "email", "age"],
      properties: {
        name: { 
          type: "string",
          minLength: 2
        },
        email: {
          type: "string",
          format: "email"
        },
        age: {
          type: "integer",
          minimum: 18
        }
      }
    };
    
    // Initialize SchemaForm
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: {
        name: "A", // Too short
        email: "invalid-email", // Not valid email format
        age: 16 // Below minimum
      }
    });
    
    // Run validation
    const isValid = schemaForm.validate();
    
    // Should not be valid
    expect(isValid).toBe(false);
    
    // Should have errors
    expect(Array.isArray(schemaForm.errors)).toBe(true);
    expect(schemaForm.errors.length).toBe(3); // One for each field
    
    // Each error should have field and message properties
    schemaForm.errors.forEach(error => {
      expect(error).toHaveProperty('field');
      expect(error).toHaveProperty('message');
    });
    
    // Errors should be associated with the correct fields
    const nameError = schemaForm.errors.find(err => err.field === 'name');
    const emailError = schemaForm.errors.find(err => err.field === 'email');
    const ageError = schemaForm.errors.find(err => err.field === 'age');
    
    expect(nameError).toBeTruthy();
    expect(emailError).toBeTruthy();
    expect(ageError).toBeTruthy();
    
    // Error messages should contain the field name
    expect(nameError.message).toContain('name');
    expect(emailError.message).toContain('email');
    expect(ageError.message).toContain('age');
  });
  
  test('should clear previous errors when revalidating', () => {
    // Setup
    const container = global.document.getElementById('submission-test-form');
    container.innerHTML = '';
    
    // Create a form element
    const form = global.document.createElement('form');
    form.id = 'error-clearing-form';
    container.appendChild(form);
    
    // Schema with required fields
    const schema = {
      type: "object",
      required: ["username"],
      properties: {
        username: { 
          type: "string",
          minLength: 3
        }
      }
    };
    
    // Initialize SchemaForm with invalid data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: { username: "ab" } // Too short
    });
    
    // First validation
    schemaForm.validate();
    
    // Should have one error
    expect(schemaForm.errors.length).toBe(1);
    
    // Update data to be valid
    schemaForm.setData({ username: "valid_username" });
    
    // Second validation
    const isValid = schemaForm.validate();
    
    // Should be valid now
    expect(isValid).toBe(true);
    
    // Errors should be cleared
    expect(schemaForm.errors.length).toBe(0);
  });
  
  test('should emit validation error events', () => {
    // Setup
    const container = global.document.getElementById('submission-test-form');
    container.innerHTML = '';
    
    // Create a form element
    const form = global.document.createElement('form');
    form.id = 'error-events-form';
    container.appendChild(form);
    
    // Schema with required fields
    const schema = {
      type: "object",
      required: ["username", "password"],
      properties: {
        username: { 
          type: "string",
          minLength: 3
        },
        password: {
          type: "string",
          minLength: 6
        }
      }
    };
    
    // Initialize SchemaForm with empty data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: {}
    });
    
    // Create mocks for the event handlers
    const validationStartHandler = jest.fn();
    const validationErrorHandler = jest.fn();
    const validationCompleteHandler = jest.fn();
    
    schemaForm.on('validationStart', validationStartHandler);
    schemaForm.on('validationError', validationErrorHandler);
    schemaForm.on('validationComplete', validationCompleteHandler);
    
    // Run validation
    schemaForm.validate();
    
    // All events should have been emitted
    expect(validationStartHandler).toHaveBeenCalled();
    expect(validationErrorHandler).toHaveBeenCalled();
    expect(validationCompleteHandler).toHaveBeenCalled();
    
    // Validate has proper error data
    const errorCallArgs = validationErrorHandler.mock.calls[0][0];
    expect(errorCallArgs).toHaveProperty('errors');
    expect(Array.isArray(errorCallArgs.errors)).toBe(true);
    expect(errorCallArgs.errors.length).toBeGreaterThan(0);
    
    // validationComplete should have isValid property
    const completeCallArgs = validationCompleteHandler.mock.calls[0][0];
    expect(completeCallArgs).toHaveProperty('isValid');
    expect(completeCallArgs.isValid).toBe(false);
  });
  
  test('should provide error summary', () => {
    // Setup
    const container = global.document.getElementById('submission-test-form');
    container.innerHTML = '';
    
    // Create a form element
    const form = global.document.createElement('form');
    form.id = 'error-summary-form';
    container.appendChild(form);
    
    // Schema with required fields
    const schema = {
      type: "object",
      required: ["username", "email"],
      properties: {
        username: { 
          type: "string",
          minLength: 3
        },
        email: {
          type: "string",
          format: "email"
        }
      }
    };
    
    // Initialize SchemaForm with invalid data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: { 
        username: "a", // Too short
        email: "not-an-email" // Invalid email
      }
    });
    
    // Run validation
    schemaForm.validate();
    
    // Get error summary
    const errorSummary = schemaForm.getErrorSummary();
    
    // Should be an object with appropriate properties
    expect(errorSummary).toBeTruthy();
    expect(errorSummary).toHaveProperty('errorCount');
    expect(errorSummary).toHaveProperty('fieldErrors');
    expect(errorSummary.errorCount).toBe(2);
    
    // Field errors should be organized by field
    expect(errorSummary.fieldErrors).toHaveProperty('username');
    expect(errorSummary.fieldErrors).toHaveProperty('email');
    
    // Each field should have an array of error messages
    expect(Array.isArray(errorSummary.fieldErrors.username)).toBe(true);
    expect(Array.isArray(errorSummary.fieldErrors.email)).toBe(true);
    
    // Each field should have at least one error
    expect(errorSummary.fieldErrors.username.length).toBeGreaterThan(0);
    expect(errorSummary.fieldErrors.email.length).toBeGreaterThan(0);
  });
  
  test('should handle custom error messages from schema', () => {
    // Setup
    const container = global.document.getElementById('submission-test-form');
    container.innerHTML = '';
    
    // Create a form element
    const form = global.document.createElement('form');
    form.id = 'custom-error-form';
    container.appendChild(form);
    
    // Schema with custom error messages
    const schema = {
      type: "object",
      required: ["username"],
      properties: {
        username: { 
          type: "string",
          minLength: 3,
          errorMessage: {
            minLength: "Username is too short! Must be at least 3 characters.",
            required: "Please provide a username."
          }
        }
      }
    };
    
    // Initialize SchemaForm with invalid data
    const schemaForm = new SchemaForm(form, { 
      schema,
      data: { 
        username: "a" // Too short
      }
    });
    
    // Run validation
    schemaForm.validate();
    
    // Should have custom error message
    expect(schemaForm.errors.length).toBe(1);
    expect(schemaForm.errors[0].message).toBe("Username is too short! Must be at least 3 characters.");
    
    // Try with missing field
    schemaForm.setData({});
    schemaForm.validate();
    
    expect(schemaForm.errors.length).toBe(1);
    expect(schemaForm.errors[0].message).toBe("Please provide a username.");
  });
}); 