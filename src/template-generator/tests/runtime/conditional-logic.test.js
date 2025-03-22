/**
 * Tests for Conditional Logic in the JSON Schema Form Runtime
 */
const path = require('path');
const fs = require('fs');
const testEnv = require('./test-environment');
const { SchemaForm } = require('./schema-form-mock');

// Paths to test files
const SCHEMAS_DIR = path.resolve(__dirname, '../../../tests/schemas');
const GENERATED_DIR = path.resolve(__dirname, '../../../tests/generated');

/**
 * Create a test schema with conditional logic
 */
function createConditionalSchema() {
  return {
    type: 'object',
    title: 'Conditional Form',
    properties: {
      userType: {
        type: 'string',
        title: 'User Type',
        enum: ['individual', 'company']
      },
      firstName: {
        type: 'string',
        title: 'First Name'
      },
      lastName: {
        type: 'string',
        title: 'Last Name'
      },
      companyName: {
        type: 'string',
        title: 'Company Name'
      },
      businessType: {
        type: 'string',
        title: 'Business Type',
        enum: ['llc', 'corporation', 'partnership']
      },
      contactInfo: {
        type: 'object',
        title: 'Contact Information',
        properties: {
          email: {
            type: 'string',
            title: 'Email',
            format: 'email'
          },
          phone: {
            type: 'string',
            title: 'Phone'
          }
        }
      },
      agree: {
        type: 'boolean',
        title: 'I agree to terms'
      },
      additionalTerms: {
        type: 'boolean',
        title: 'I agree to additional terms'
      }
    },
    required: ['userType', 'agree'],
    if: {
      properties: {
        userType: { enum: ['individual'] }
      }
    },
    then: {
      required: ['firstName', 'lastName']
    },
    else: {
      required: ['companyName', 'businessType']
    },
    allOf: [
      {
        if: {
          properties: {
            agree: { const: true }
          }
        },
        then: {
          required: ['additionalTerms']
        }
      }
    ]
  };
}

/**
 * Create a simple HTML template for testing
 */
function createConditionalTemplate(schema) {
  // Create a basic form with fields from the schema
  let formHtml = `
    <div class="form-container">
      <form id="conditional-form" data-schema-form="true">
        <div class="field-container" data-schema-path="userType">
          <label for="field-userType">User Type</label>
          <select id="field-userType" name="field-userType" data-schema-id="userType">
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </select>
        </div>
        
        <div class="field-container" data-schema-path="firstName" data-condition="userType=individual">
          <label for="field-firstName">First Name</label>
          <input type="text" id="field-firstName" name="field-firstName" data-schema-id="firstName" />
        </div>
        
        <div class="field-container" data-schema-path="lastName" data-condition="userType=individual">
          <label for="field-lastName">Last Name</label>
          <input type="text" id="field-lastName" name="field-lastName" data-schema-id="lastName" />
        </div>
        
        <div class="field-container" data-schema-path="companyName" data-condition="userType=company">
          <label for="field-companyName">Company Name</label>
          <input type="text" id="field-companyName" name="field-companyName" data-schema-id="companyName" />
        </div>
        
        <div class="field-container" data-schema-path="businessType" data-condition="userType=company">
          <label for="field-businessType">Business Type</label>
          <select id="field-businessType" name="field-businessType" data-schema-id="businessType">
            <option value="llc">LLC</option>
            <option value="corporation">Corporation</option>
            <option value="partnership">Partnership</option>
          </select>
        </div>
        
        <div class="field-container" data-schema-path="contactInfo.email">
          <label for="field-email">Email</label>
          <input type="email" id="field-email" name="field-email" data-schema-id="contactInfo.email" />
        </div>
        
        <div class="field-container" data-schema-path="contactInfo.phone">
          <label for="field-phone">Phone</label>
          <input type="text" id="field-phone" name="field-phone" data-schema-id="contactInfo.phone" />
        </div>
        
        <div class="field-container" data-schema-path="agree">
          <input type="checkbox" id="field-agree" name="field-agree" data-schema-id="agree" />
          <label for="field-agree">I agree to terms</label>
        </div>
        
        <div class="field-container" data-schema-path="additionalTerms" data-condition="agree=true">
          <input type="checkbox" id="field-additionalTerms" name="field-additionalTerms" data-schema-id="additionalTerms" />
          <label for="field-additionalTerms">I agree to additional terms</label>
        </div>
        
        <button type="submit">Submit</button>
      </form>
    </div>
  `;
  
  return formHtml;
}

/**
 * Set up test environment with conditional schema and template
 */
function setupConditionalTestEnvironment() {
  // Create schema
  const schema = createConditionalSchema();
  
  // Create template
  const template = createConditionalTemplate(schema);
  
  // Set up DOM
  const { document } = testEnv.setupDOM(template);
  
  // Save schema to enable SchemaForm to load it
  if (!fs.existsSync(SCHEMAS_DIR)) {
    fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(SCHEMAS_DIR, 'conditional-test.json'), JSON.stringify(schema, null, 2));
  
  return { document, schema };
}

/**
 * Utility to check if an element is visible
 */
function isVisible(element) {
  if (!element) return false;
  
  // Check if element is displayed
  const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
  const isDisplayed = computedStyle.display !== 'none';
  const isVisible = computedStyle.visibility !== 'hidden';
  
  return isDisplayed && isVisible && !element.hidden;
}

// Tests
describe('Schema Form Conditional Logic', () => {
  // Clean up after each test
  afterEach(() => {
    testEnv.cleanup();
  });
  
  describe('If/Then/Else Conditions', () => {
    test('should show/hide fields based on if/then/else conditions', () => {
      const { document, schema } = setupConditionalTestEnvironment();
      const formElement = document.querySelector('#conditional-form');
      
      // Create SchemaForm instance with direct schema
      const schemaForm = new SchemaForm(formElement);
      
      // Set the schema directly to avoid async loading
      schemaForm.processConditionals = true;
      schemaForm.schema = schema;
      
      // Set userType to 'individual'
      schemaForm.setData({
        userType: 'individual'
      });
      
      // Update visibility (this would normally happen through event handlers)
      schemaForm.triggerEvent('evaluateConditions');
      
      // Individual fields should be visible, company fields hidden
      const firstNameField = document.querySelector('[data-schema-path="firstName"]');
      const lastNameField = document.querySelector('[data-schema-path="lastName"]');
      const companyNameField = document.querySelector('[data-schema-path="companyName"]');
      const businessTypeField = document.querySelector('[data-schema-path="businessType"]');
      
      // Check visibility directly based on display style
      expect(firstNameField.style.display).not.toBe('none');
      expect(lastNameField.style.display).not.toBe('none');
      expect(companyNameField.style.display).toBe('none');
      expect(businessTypeField.style.display).toBe('none');
      
      // Change userType to 'company'
      schemaForm.setData({
        userType: 'company'
      });
      
      // Update visibility
      schemaForm.triggerEvent('evaluateConditions');
      
      // Company fields should be visible, individual fields hidden
      expect(firstNameField.style.display).toBe('none');
      expect(lastNameField.style.display).toBe('none');
      expect(companyNameField.style.display).not.toBe('none');
      expect(businessTypeField.style.display).not.toBe('none');
    });
  });
  
  describe('AllOf Conditions', () => {
    test('should show/hide fields based on allOf conditions', () => {
      const { document, schema } = setupConditionalTestEnvironment();
      const formElement = document.querySelector('#conditional-form');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Set the schema directly
      schemaForm.processConditionals = true;
      schemaForm.schema = schema;
      
      // Set initial data - agree is false
      schemaForm.setData({
        userType: 'individual',
        agree: false
      });
      
      // Update visibility
      schemaForm.triggerEvent('evaluateConditions');
      
      // Additional terms should be hidden when agree is false
      const additionalTermsField = document.querySelector('[data-schema-path="additionalTerms"]');
      expect(additionalTermsField.style.display).toBe('none');
      
      // Change agree to true
      schemaForm.setData({
        userType: 'individual',
        agree: true
      });
      
      // Update visibility
      schemaForm.triggerEvent('evaluateConditions');
      
      // Additional terms should be visible when agree is true
      expect(additionalTermsField.style.display).not.toBe('none');
    });
  });
  
  describe('Field Visibility History', () => {
    test('should track visibility history of conditional fields', () => {
      const { document, schema } = setupConditionalTestEnvironment();
      const formElement = document.querySelector('#conditional-form');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Set the schema directly
      schemaForm.processConditionals = true;
      schemaForm.schema = schema;
      
      // Set initial data
      schemaForm.setData({
        userType: 'individual'
      });
      
      // Update visibility multiple times to build history
      schemaForm.triggerEvent('evaluateConditions');
      
      // Change data and update again
      schemaForm.setData({
        userType: 'company'
      });
      schemaForm.triggerEvent('evaluateConditions');
      
      // Change back
      schemaForm.setData({
        userType: 'individual'
      });
      schemaForm.triggerEvent('evaluateConditions');
      
      // Get visibility history 
      const history = schemaForm.getFieldVisibilityHistory();
      
      // History should exist and have entries
      expect(history).toBeDefined();
      
      // Get visibility report
      const report = schemaForm.getFieldVisibilityReport();
      expect(report).toBeDefined();
    });
  });
  
  describe('Nested Conditional Fields', () => {
    test('should handle nested conditions correctly', () => {
      const { document, schema } = setupConditionalTestEnvironment();
      const formElement = document.querySelector('#conditional-form');
      
      // Create SchemaForm instance
      const schemaForm = new SchemaForm(formElement);
      
      // Set the schema directly
      schemaForm.processConditionals = true;
      schemaForm.schema = schema;
      
      // Set a complex condition
      schemaForm.setData({
        userType: 'company',
        agree: true
      });
      
      // Update visibility
      schemaForm.triggerEvent('evaluateConditions');
      
      // Company fields should be visible
      const companyNameField = document.querySelector('[data-schema-path="companyName"]');
      const businessTypeField = document.querySelector('[data-schema-path="businessType"]');
      expect(companyNameField.style.display).not.toBe('none');
      expect(businessTypeField.style.display).not.toBe('none');
      
      // Additional terms should be visible since agree is true
      const additionalTermsField = document.querySelector('[data-schema-path="additionalTerms"]');
      expect(additionalTermsField.style.display).not.toBe('none');
    });
  });
}); 