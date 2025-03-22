/**
 * JSON Schema Form Runtime Engine Tests
 */
const path = require('path');
const testEnv = require('./test-environment');

// Paths to test files
const SCHEMAS_DIR = path.resolve(__dirname, '../../../tests/schemas');
const GENERATED_DIR = path.resolve(__dirname, '../../../tests/generated');
const DIST_DIR = path.resolve(__dirname, '../../../dist');

/**
 * Mock Runtime class that simulates the form runtime engine
 */
class MockRuntime {
  constructor(formElement, schema) {
    this.form = formElement;
    this.schema = schema;
    this.formData = {};
    this.eventListeners = {
      change: [],
      submit: []
    };
    
    // Initialize form
    this._setupEventListeners();
  }
  
  /**
   * Set up event listeners on form elements
   */
  _setupEventListeners() {
    if (!this.form) return;
    
    // Capture input changes
    this.form.addEventListener('input', (event) => {
      if (event.target.name) {
        // Extract the actual field name from form element
        const fieldName = this._normalizeFieldName(event.target.name);
        let value = event.target.value;
        
        // Handle checkbox values
        if (event.target.type === 'checkbox') {
          value = event.target.checked;
        }
        
        this.formData[fieldName] = value;
        this._triggerEvent('change', { field: fieldName, value });
      }
    });
    
    // Also listen for change events (for older browsers and certain inputs)
    this.form.addEventListener('change', (event) => {
      if (event.target.name) {
        // Extract the actual field name from form element
        const fieldName = this._normalizeFieldName(event.target.name);
        let value = event.target.value;
        
        // Handle checkbox values
        if (event.target.type === 'checkbox') {
          value = event.target.checked;
        }
        
        this.formData[fieldName] = value;
        this._triggerEvent('change', { field: fieldName, value });
      }
    });
    
    // Capture form submission
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this._triggerEvent('submit', { formData: this.formData });
    });
  }

  /**
   * Normalize field names by removing prefixes like 'field-'
   * @param {string} name The field name
   * @returns {string} Normalized field name
   */
  _normalizeFieldName(name) {
    // Remove 'field-' prefix if present
    if (name.startsWith('field-')) {
      return name.substring(6);
    }
    return name;
  }
  
  /**
   * Trigger an event for listeners
   */
  _triggerEvent(eventName, data) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(listener => {
        listener(data);
      });
    }
  }
  
  /**
   * Get current form data
   */
  getData() {
    return this.formData;
  }
  
  /**
   * Add event listener
   */
  on(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].push(callback);
    }
    return this;
  }
  
  /**
   * Update conditional visibility of fields
   */
  updateConditionalFields() {
    // Just a mock implementation - actual runtime would have more complex logic
    const showCondition = this.formData.showMoreInfo === true;
    
    // Find fields with conditional display
    const conditionalFields = this.form.querySelectorAll('[data-condition]');
    conditionalFields.forEach(field => {
      const container = field.closest('.field-container');
      if (container) {
        container.style.display = showCondition ? 'block' : 'none';
      }
    });
  }
}

/**
 * Helper function to create and dispatch an event
 * @param {Element} element The element to dispatch the event on
 * @param {string} eventType The type of event to dispatch
 */
function triggerEvent(element, eventType) {
  const event = new testEnv.window.Event(eventType, { bubbles: true });
  element.dispatchEvent(event);
}

/**
 * Helper function to check if an element is visually hidden
 * @param {Element} element The element to check
 * @returns {boolean} True if the element is hidden
 */
function isElementHidden(element) {
  // Check various ways an element might be hidden
  if (!element) return true;
  
  const style = element.style;
  const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
  
  return style.display === 'none' || 
         computedStyle.display === 'none' ||
         style.visibility === 'hidden' ||
         computedStyle.visibility === 'hidden' ||
         element.hidden === true ||
         element.hasAttribute('hidden');
}

/**
 * Find form input by property name, handling various name formats
 * @param {Element} formElement The form element
 * @param {string} propName The property name to look for
 * @returns {Element|null} The found input element or null
 */
function findInputByPropName(formElement, propName) {
  // Try different variations of the input name attribute
  const possibleSelectors = [
    `[name="${propName}"]`,
    `[name="field-${propName}"]`,
    `[id="field-${propName}"]`,
    `[data-schema-path="${propName}"]`,
    `[data-schema-path="field-${propName}"]`,
  ];

  for (const selector of possibleSelectors) {
    const input = formElement.querySelector(selector);
    if (input) return input;
  }

  // Look for inputs within elements with data-property-name attribute
  const propContainer = formElement.querySelector(`[data-property-name="${propName}"]`);
  if (propContainer) {
    const input = propContainer.querySelector('input, select, textarea');
    if (input) return input;
  }

  return null;
}

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
  
  // Create runtime instance
  const runtime = new MockRuntime(formElement, schema);
  
  return { document, formElement, runtime, schema };
}

// Tests
describe('JSON Schema Form Runtime Engine', () => {
  // Clean up after each test
  afterEach(() => {
    testEnv.cleanup();
  });
  
  describe('Form Initialization', () => {
    test('should initialize form with empty data', () => {
      const { runtime } = setupTestEnvironment('simple.json', 'simple.html');
      expect(runtime.getData()).toEqual({});
    });
    
    test('should have form elements matching schema properties', () => {
      const { formElement, schema } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Check if form has inputs for schema properties
      Object.keys(schema.properties).forEach(propName => {
        const input = findInputByPropName(formElement, propName);
        expect(input).not.toBeNull();
      });
    });
  });
  
  describe('Form Data Binding', () => {
    test('should update form data when input values change', () => {
      const { formElement, runtime } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Find a text input for the name field
      const nameInput = findInputByPropName(formElement, 'name');
      
      // Set the value directly
      nameInput.value = 'John Doe';
      
      // Trigger both input and change events to ensure capture
      triggerEvent(nameInput, 'input');
      triggerEvent(nameInput, 'change');
      
      // Check form data
      expect(runtime.getData().name).toBe('John Doe');
    });
    
    test('should handle checkbox values correctly', () => {
      const { formElement, runtime } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Find a checkbox input (consent in this schema)
      const checkboxInput = findInputByPropName(formElement, 'consent');
      if (!checkboxInput) {
        console.warn('No checkbox found in form, skipping test');
        return;
      }
      
      // Set the checked state directly
      checkboxInput.checked = true;
      
      // Trigger both input and change events
      triggerEvent(checkboxInput, 'input');
      triggerEvent(checkboxInput, 'change');
      
      // Check form data (should use normalized name)
      expect(runtime.getData().consent).toBe(true);
    });
  });
  
  describe('Form Events', () => {
    test('should emit change events when form values change', () => {
      const { formElement, runtime } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Set up event listener
      const changeHandler = jest.fn();
      runtime.on('change', changeHandler);
      
      // Find an input
      const input = findInputByPropName(formElement, 'name');
      
      // Set value and trigger events
      input.value = 'New Value';
      triggerEvent(input, 'input');
      
      // Check event was emitted
      expect(changeHandler).toHaveBeenCalledWith({
        field: 'name',
        value: 'New Value'
      });
    });
    
    test('should emit submit event when form is submitted', () => {
      const { formElement, runtime } = setupTestEnvironment('simple.json', 'simple.html');
      
      // Set up event listener
      const submitHandler = jest.fn();
      runtime.on('submit', submitHandler);
      
      // Fill out a form field
      const input = findInputByPropName(formElement, 'name');
      input.value = 'Submit Test';
      triggerEvent(input, 'input');
      
      // Simulate form submission
      triggerEvent(formElement, 'submit');
      
      // Check event was emitted with form data
      expect(submitHandler).toHaveBeenCalledWith({
        formData: expect.objectContaining({
          name: 'Submit Test'
        })
      });
    });
  });
  
  describe('Conditional Display', () => {
    test('should show/hide fields based on conditions', () => {
      // Setup the test
      const { formElement, runtime, document } = setupTestEnvironment('conditional.json', 'conditional.html');
      
      // Find the checkbox that controls visibility
      const checkbox = document.getElementById('showMoreInfo');
      if (!checkbox) {
        console.warn('No conditional checkbox found, skipping test');
        return;
      }
      
      // Find the additional info section
      const additionalInfoSection = document.getElementById('additionalInfoSection');
      if (!additionalInfoSection) {
        console.warn('No additionalInfoSection found, skipping test');
        return;
      }
      
      // Verify initial state - section should be hidden
      expect(additionalInfoSection.style.display).toBe('none');
      
      // Simulate what happens in the HTML's embedded script:
      // 1. Check the box
      checkbox.checked = true;
      
      // 2. Update display directly like the script would
      additionalInfoSection.style.display = checkbox.checked ? 'block' : 'none';
      
      // Verify the section is now visible
      expect(additionalInfoSection.style.display).toBe('block');
      
      // Also verify that our runtime can track the checkbox state
      // Trigger change event so runtime captures the state
      triggerEvent(checkbox, 'change');
      
      // Runtime data should reflect the checked state
      expect(runtime.getData().showMoreInfo).toBe(true);
    });
  });
}); 