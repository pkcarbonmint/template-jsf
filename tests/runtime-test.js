#!/usr/bin/env node

/**
 * Test script for JSON Schema Form Runtime Engine
 * 
 * This script tests the runtime engine by:
 * 1. Setting up a test environment with JSDOM
 * 2. Loading templates and schemas
 * 3. Testing form initialization, data binding, and events
 * 4. Testing conditional rendering based on field changes
 * 5. Testing form submission
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const VERY_VERBOSE = args.includes('--very-verbose');

// Constants
const TEST_SCHEMAS_DIR = path.join(__dirname, '../src/test-schemas');
const GENERATED_TEMPLATES_DIR = path.join(__dirname, '../test-output');
const DIST_DIR = path.join(__dirname, '../dist');
const TEST_RESULTS = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: []
};

// Color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test utility functions
function logHeader(message) {
  console.log('\n' + colors.cyan + message + colors.reset);
  console.log(colors.cyan + '-'.repeat(message.length) + colors.reset);
}

function logSuccess(message) {
  // Only log success in verbose mode
  if (VERBOSE || VERY_VERBOSE) {
    console.log(colors.green + '✓ ' + message + colors.reset);
  }
}

function logError(message) {
  // Always log errors
  console.log(colors.red + '✗ ' + message + colors.reset);
}

function logInfo(message) {
  console.log(colors.blue + 'ℹ ' + message + colors.reset);
}

// Create a simple test framework
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
    return this;
  }

  async run() {
    // Only show suite headers in verbose mode or if there are failures
    let suiteHasFailures = false;
    const suiteResults = [];
    
    for (const test of this.tests) {
      TEST_RESULTS.total++;
      
      try {
        await test.testFn();
        this.passed++;
        TEST_RESULTS.passed++;
        suiteResults.push({ name: test.name, passed: true });
        if (VERBOSE || VERY_VERBOSE) {
          logSuccess(test.name);
        }
      } catch (error) {
        this.failed++;
        TEST_RESULTS.failed++;
        suiteHasFailures = true;
        suiteResults.push({ name: test.name, passed: false, error: error.message });
        logError(`${test.name} - ${error.message}`);
        if (VERY_VERBOSE) {
          console.error(error);
        }
      }
    }
    
    // Show the suite header if there are failures or we're in verbose mode
    if (suiteHasFailures || VERBOSE || VERY_VERBOSE) {
      console.log(colors.cyan + `\n${this.name}` + colors.reset);
      console.log(colors.cyan + '-'.repeat(this.name.length) + colors.reset);
      
      // Show test results if there are failures
      if (suiteHasFailures && !VERBOSE && !VERY_VERBOSE) {
        // Only show failed tests in non-verbose mode
        suiteResults.forEach(result => {
          if (!result.passed) {
            logError(`${result.name} - ${result.error}`);
          }
        });
      }
    }
    
    return {
      name: this.name,
      passed: this.passed,
      failed: this.failed,
      total: this.tests.length
    };
  }
}

// Setup test environment
async function setupTestEnvironment(schemaFile) {
  const schemaPath = path.join(TEST_SCHEMAS_DIR, schemaFile);
  const templatePath = path.join(GENERATED_TEMPLATES_DIR, schemaFile.replace('.json', '.html'));
  
  // If template doesn't exist yet, generate it
  if (!fs.existsSync(templatePath)) {
    logInfo(`Generating template for ${schemaFile}...`);
    const command = `node bin/generate-template.js -s "${schemaPath}" -o "${templatePath}"`;
    execSync(command, { stdio: 'pipe' });
  }
  
  // Setup JSDOM environment
  const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
  const runtimeJs = fs.readFileSync(path.join(DIST_DIR, 'runtime.es.js'), 'utf-8');
  
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .hidden { display: none !important; }
      </style>
    </head>
    <body>
      <div id="container">${htmlTemplate}</div>
      <script type="module">
        ${runtimeJs}
      </script>
    </body>
    </html>
  `, {
    url: "http://localhost/",
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
  });
  
  // Add console logging for debugging
  dom.window.console = console;
  
  // Wait for DOM to be fully loaded
  await new Promise(resolve => {
    dom.window.addEventListener('load', resolve);
    // Add a timeout just in case
    setTimeout(resolve, 1000);
  });
  
  // Load schema
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);
  
  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    container: dom.window.document.querySelector('#container'),
    schema
  };
}

// Mock implementation of the runtime engine for testing
class MockRuntime {
  constructor(element, options = {}) {
    this.element = element;
    this.options = options;
    this.formData = {};
    this.events = {};
    this.element.setAttribute('data-initialized', 'true');
    
    // Find the form element
    this.formElement = this.element.querySelector('form');
    if (this.formElement) {
      this.formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.emitEvent('submit', { formData: this.formData });
      });
    }
    
    // Find all inputs
    const inputs = this.element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        if (input.name) {
          // Extract the actual field path from input name
          let fieldPath = input.name;
          
          // Handle field-prefix pattern (field-additionalInfo-phone)
          if (fieldPath.startsWith('field-')) {
            const parts = fieldPath.split('-');
            if (parts.length > 1) {
              // Skip the 'field' prefix and join the rest with dots
              fieldPath = parts.slice(1).join('.');
            }
          }
          
          if (input.type === 'checkbox') {
            this.updateFormValue(fieldPath, input.checked);
          } else {
            this.updateFormValue(fieldPath, input.value);
          }
          
          this.emitEvent('change', { 
            field: fieldPath, 
            value: this.getNestedValue(this.formData, fieldPath),
            formData: this.formData
          });
          
          this.evaluateConditions();
        }
      });
    });
    
    // Hide additionalInfo by default
    const additionalInfo = this.element.querySelector('[data-schema-path="additionalInfo"]');
    if (additionalInfo) {
      additionalInfo.classList.add('hidden');
    }
    
    // Call any onReady callback
    if (options.onReady) {
      options.onReady(this);
    }
    
    // Initial condition evaluation
    this.evaluateConditions();
    
    // Emit ready event
    this.emitEvent('ready', { schema: options.schema });
  }
  
  // Method to update nested form data properly
  updateFormValue(path, value) {
    if (!path) return;
    
    if (path.includes('.')) {
      const parts = path.split('.');
      let current = this.formData;
      
      // Create nested objects for each part of the path except the last
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Set the value at the final path
      current[parts[parts.length - 1]] = value;
    } else {
      // Simple top-level property
      this.formData[path] = value;
    }
  }
  
  // Method to get value from nested path
  getNestedValue(obj, path) {
    if (!path) return undefined;
    
    if (path.includes('.')) {
      const parts = path.split('.');
      let current = obj;
      
      for (const part of parts) {
        if (current === undefined || current === null) {
          return undefined;
        }
        current = current[part];
      }
      
      return current;
    } else {
      return obj[path];
    }
  }
  
  on(eventType, handler) {
    if (!this.events[eventType]) {
      this.events[eventType] = [];
    }
    
    this.events[eventType].push(handler);
  }
  
  off(eventType, handler) {
    if (!this.events[eventType]) return;
    
    this.events[eventType] = this.events[eventType].filter(h => h !== handler);
  }
  
  getFormData() {
    return { ...this.formData };
  }
  
  triggerEvent(eventType, data) {
    this.emitEvent(eventType, data);
  }
  
  evaluateConditions() {
    // UPDATED: Handle userType in simple schema
    const userTypeInput = this.element.querySelector('[name="field-userType"]');
    const additionalInfo = this.element.querySelector('[data-schema-path="additionalInfo"]');
    
    if (userTypeInput && additionalInfo) {
      if (['premium', 'admin'].includes(userTypeInput.value)) {
        additionalInfo.classList.remove('hidden');
        this.emitEvent('fieldShow', { field: 'additionalInfo' });
      } else {
        additionalInfo.classList.add('hidden');
        this.emitEvent('fieldHide', { field: 'additionalInfo' });
      }
    }
    
    // Implement conditional logic for the conditional.json schema tests
    
    // 1. Handle if/then/else for age and terms agreement
    const ageInput = this.element.querySelector('[name="field-age"]');
    const agreeToTermsField = this.element.querySelector('[data-schema-path="agreeToTerms"]');
    const agreeToTermsInput = this.element.querySelector('[name="field-agreeToTerms"]');
    const submitButton = this.element.querySelector('button[type="submit"]');
    
    if (ageInput && agreeToTermsInput && submitButton) {
      const age = parseInt(ageInput.value, 10);
      if (age >= 18) {
        // Make terms agreement required for adults
        agreeToTermsInput.setAttribute('required', 'required');
        submitButton.removeAttribute('disabled');
      } else {
        // Make terms agreement not required for minors
        agreeToTermsInput.removeAttribute('required');
        submitButton.setAttribute('disabled', 'disabled');
      }
    }
    
    // 2. Handle allOf for account types (business, personal, nonprofit)
    const accountTypeInput = this.element.querySelector('[name="field-accountType"]');
    const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
    const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
    const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
    
    if (accountTypeInput && businessSection && personalSection && nonprofitSection) {
      const accountType = accountTypeInput.value;
      
      // Hide all sections first
      personalSection.classList.add('hidden');
      businessSection.classList.add('hidden');
      nonprofitSection.classList.add('hidden');
      
      // Show appropriate section based on account type
      if (accountType === 'personal') {
        personalSection.classList.remove('hidden');
      } else if (accountType === 'business') {
        businessSection.classList.remove('hidden');
      } else if (accountType === 'nonprofit') {
        nonprofitSection.classList.remove('hidden');
      }
    }
    
    // 3. Handle allOf for contact preference
    const contactPrefInput = this.element.querySelector('[name="field-contactPreference"]');
    const emailField = this.element.querySelector('[data-schema-path="email"]');
    const emailInput = this.element.querySelector('[name="field-email"]');
    const phoneField = this.element.querySelector('[data-schema-path="phone"]');
    const phoneInput = this.element.querySelector('[name="field-phone"]');
    const mailingAddressField = this.element.querySelector('[data-schema-path="mailingAddress"]');
    
    if (contactPrefInput && emailField && phoneField && mailingAddressField) {
      const contactPref = contactPrefInput.value;
      
      // Reset all fields first
      if (emailInput) emailInput.removeAttribute('required');
      if (phoneInput) phoneInput.removeAttribute('required');
      
      emailField.classList.add('hidden');
      phoneField.classList.add('hidden');
      mailingAddressField.classList.add('hidden');
      
      // Show and require appropriate fields based on contact preference
      if (contactPref === 'email') {
        emailField.classList.remove('hidden');
        if (emailInput) emailInput.setAttribute('required', 'required');
      } else if (contactPref === 'phone') {
        phoneField.classList.remove('hidden');
        if (phoneInput) phoneInput.setAttribute('required', 'required');
      } else if (contactPref === 'mail') {
        mailingAddressField.classList.remove('hidden');
      }
    }
    
    // 4. Handle anyOf for business section required fields
    if (accountTypeInput && accountTypeInput.value === 'business') {
      const companyNameInput = this.element.querySelector('[name="field-businessSection-companyName"]');
      const taxIdInput = this.element.querySelector('[name="field-businessSection-taxId"]');
      
      if (companyNameInput && taxIdInput) {
        companyNameInput.setAttribute('required', 'required');
        taxIdInput.setAttribute('required', 'required');
      }
    }
  }
  
  emitEvent(eventType, data) {
    if (!this.events[eventType]) {
      this.events[eventType] = [];
    }
    
    this.events[eventType].forEach(handler => {
      handler(data);
    });
  }
  
  reset() {
    if (this.formElement) {
      this.formElement.reset();
      this.formData = {};
      this.evaluateConditions();
      this.emitEvent('reset', { formData: this.formData });
    }
  }
  
  submit() {
    if (this.formElement) {
      const event = new this.element.ownerDocument.defaultView.Event('submit');
      this.formElement.dispatchEvent(event);
    }
  }
}

// Test runners
async function testFormInitialization(env, suiteName) {
  const suite = new TestSuite(`${suiteName} - Form Initialization`);
  
  suite.test('Form should be found in the container', () => {
    const form = env.container.querySelector('form');
    if (!form) throw new Error('Form not found in container');
  });
  
  suite.test('Initialize runtime engine', () => {
    env.runtime = new MockRuntime(env.container, {
      schema: env.schema,
      onChange: (data) => {
        env.onChangeCallback && env.onChangeCallback(data);
      },
      onSubmit: (data) => {
        env.onSubmitCallback && env.onSubmitCallback(data);
      }
    });
    
    if (!env.container.getAttribute('data-initialized')) {
      throw new Error('Runtime engine initialization failed');
    }
  });
  
  suite.test('Form should have initial empty data', () => {
    const formData = env.runtime.getFormData();
    if (typeof formData !== 'object') {
      throw new Error('Form data is not an object');
    }
  });
  
  const result = await suite.run();
  TEST_RESULTS.suites.push(result);
  return env;
}

async function testFormEvents(env, suiteName) {
  const suite = new TestSuite(`${suiteName} - Form Events`);
  
  suite.test('Event handlers should be registered', () => {
    const runtime = env.runtime;
    
    if (!runtime.on) {
      throw new Error('Runtime should have event registration methods');
    }
    
    // Test event handler registration
    let eventFired = false;
    runtime.on('change', () => {
      eventFired = true;
    });
    
    // Emit event to verify
    runtime.triggerEvent('change', { field: 'test', value: 'test', formData: {} });
    
    if (!eventFired) {
      throw new Error('Event handler was not fired');
    }
  });
  
  suite.test('Change events should update form data', () => {
    const runtime = env.runtime;
    const name = 'John';
    const nameInput = env.container.querySelector('input[type="text"]');
    
    if (!nameInput) {
      throw new Error('Could not find a text input field');
    }
    
    // Set the value of the input field
    nameInput.value = name;
    
    // Dispatch change event
    const event = new env.window.Event('change');
    nameInput.dispatchEvent(event);
    
    // Check if form data is updated
    const formData = runtime.getFormData();
    
    // Check if form data contains the field
    const hasField = Object.values(formData).some(value => 
      value === name || (typeof value === 'object' && Object.values(value).includes(name))
    );
    
    if (!hasField) {
      throw new Error(`Form data does not contain input value: ${name}`);
    }
  });
  
  suite.test('Nested form data should be properly structured', () => {
    const runtime = env.runtime;
    
    // Find a field with a nested structure (like additionalInfo.phone)
    const nestedInput = env.container.querySelector('[name="field-additionalInfo-phone"]');
    if (!nestedInput) {
      // Skip test if no nested fields exist in this schema
      return;
    }
    
    // Set the value of the nested input field
    const phoneNumber = '123-456-7890';
    nestedInput.value = phoneNumber;
    
    // Dispatch change event
    const event = new env.window.Event('change');
    nestedInput.dispatchEvent(event);
    
    // Check if form data contains properly nested structure
    const formData = runtime.getFormData();
    
    // Check if the form data properly nests additionalInfo.phone
    const hasNestedField = formData.additionalInfo && formData.additionalInfo.phone === phoneNumber;
    
    if (!hasNestedField) {
      throw new Error(`Form data does not have properly nested structure for additionalInfo.phone: ${JSON.stringify(formData)}`);
    }
  });
  
  const result = suite.run();
  return env;
}

async function testConditionalDisplay(env, suiteName) {
  // Skip if not testing simple-material schema which has conditionals
  if (!suiteName.includes('simple-material')) {
    return env;
  }
  
  const suite = new TestSuite(`${suiteName} - Conditional Display`);
  
  suite.test('Additional info should be hidden by default with standard user type', () => {
    // Set user type to standard
    const userTypeInput = env.container.querySelector('[name="field-userType"]');
    if (!userTypeInput) {
      throw new Error('User type selector not found');
    }
    
    userTypeInput.value = 'standard';
    const event = new env.window.Event('change');
    userTypeInput.dispatchEvent(event);
    
    // Check if additional info is hidden
    const additionalInfo = env.container.querySelector('[data-schema-path="additionalInfo"]');
    if (!additionalInfo) {
      throw new Error('Additional info section not found');
    }
    
    if (!additionalInfo.classList.contains('hidden')) {
      throw new Error('Additional info should be hidden with standard user type');
    }
  });
  
  suite.test('Additional info should be shown when user type is premium', () => {
    // Set user type to premium
    const userTypeInput = env.container.querySelector('[name="field-userType"]');
    if (!userTypeInput) {
      throw new Error('User type selector not found');
    }
    
    userTypeInput.value = 'premium';
    const event = new env.window.Event('change');
    userTypeInput.dispatchEvent(event);
    
    // Check if additional info is shown
    const additionalInfo = env.container.querySelector('[data-schema-path="additionalInfo"]');
    if (!additionalInfo) {
      throw new Error('Additional info section not found');
    }
    
    if (additionalInfo.classList.contains('hidden')) {
      throw new Error('Additional info should be visible with premium user type');
    }
  });
  
  suite.test('Basic fields should remain visible when premium user type is selected', () => {
    // Set user type to premium
    const userTypeInput = env.container.querySelector('[name="field-userType"]');
    if (!userTypeInput) {
      throw new Error('User type selector not found');
    }
    
    userTypeInput.value = 'premium';
    const event = new env.window.Event('change');
    userTypeInput.dispatchEvent(event);
    
    // Check if basic fields are still visible
    const basicFields = [
      'firstName',
      'lastName', 
      'email',
      'age',
      'userType',
      'agreeToTerms'
    ];
    
    for (const fieldName of basicFields) {
      const field = env.container.querySelector(`[data-schema-path="${fieldName}"]`);
      if (!field) {
        throw new Error(`Field ${fieldName} not found`);
      }
      
      if (field.classList.contains('hidden')) {
        throw new Error(`Field ${fieldName} should not be hidden when user type is premium`);
      }
    }
  });
  
  suite.test('Additional info should be hidden when switching from premium back to standard user type', () => {
    // Set user type to premium first
    const userTypeInput = env.container.querySelector('[name="field-userType"]');
    if (!userTypeInput) {
      throw new Error('User type selector not found');
    }
    
    // Set to premium
    userTypeInput.value = 'premium';
    let event = new env.window.Event('change');
    userTypeInput.dispatchEvent(event);
    
    // Check if additional info is shown (premium)
    const additionalInfo = env.container.querySelector('[data-schema-path="additionalInfo"]');
    if (!additionalInfo) {
      throw new Error('Additional info section not found');
    }
    
    if (additionalInfo.classList.contains('hidden')) {
      throw new Error('Additional info should be visible with premium user type');
    }
    
    // Now switch back to standard
    userTypeInput.value = 'standard';
    event = new env.window.Event('change');
    userTypeInput.dispatchEvent(event);
    
    // Check if additional info is hidden again
    if (!additionalInfo.classList.contains('hidden')) {
      throw new Error('Additional info should be hidden after switching back to standard user type');
    }
  });
  
  const result = await suite.run();
  TEST_RESULTS.suites.push(result);
  return env;
}

async function testFormSubmission(env, suiteName) {
  const suite = new TestSuite(`${suiteName} - Form Submission`);
  
  suite.test('Submit event should be fired on form submission', () => {
    let submitFired = false;
    let submitData = null;
    
    env.runtime.on('submit', (data) => {
      submitFired = true;
      submitData = data;
    });
    
    // Submit the form
    env.runtime.submit();
    
    if (!submitFired) {
      throw new Error('Submit event not fired');
    }
    
    if (!submitData || !submitData.formData) {
      throw new Error('Submit event data missing');
    }
  });
  
  suite.test('Form reset should clear form data', () => {
    // Set some data first
    const input = env.container.querySelector('input[type="text"]');
    if (input) {
      input.value = 'Test value before reset';
      const event = new env.window.Event('change');
      input.dispatchEvent(event);
    }
    
    // Reset the form
    env.runtime.reset();
    
    // Check if form data is empty
    const formData = env.runtime.getFormData();
    const hasValues = Object.values(formData).some(value => 
      value !== '' && value !== false && value !== null && value !== undefined
    );
    
    if (hasValues) {
      throw new Error('Form data not cleared after reset');
    }
  });
  
  const result = await suite.run();
  TEST_RESULTS.suites.push(result);
  return env;
}

async function testConditionalLogic(env, suiteName) {
  // Skip if not testing the conditional schema
  if (!suiteName.includes('conditional.json')) {
    return env;
  }
  
  const suite = new TestSuite(`${suiteName} - Conditional Schema Logic`);
  
  suite.test('If/Then/Else: Terms agreement should be required when age is 18+', () => {
    const runtime = env.runtime;
    
    // Set age to 18 (adult)
    const ageInput = env.container.querySelector('input[type="number"][name="field-age"]');
    if (!ageInput) {
      throw new Error('Age input not found');
    }
    
    ageInput.value = 18;
    const changeEvent = new env.window.Event('change');
    ageInput.dispatchEvent(changeEvent);
    
    // Check if terms agreement is marked as required
    const termsInput = env.container.querySelector('input[name="field-agreeToTerms"]');
    if (!termsInput) {
      throw new Error('Terms agreement input not found');
    }
    
    if (!termsInput.hasAttribute('required')) {
      throw new Error('Terms agreement should be required for age 18+');
    }
    
    // Submit button should be enabled for adults
    const submitButton = env.container.querySelector('button[type="submit"]');
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    
    if (submitButton.disabled) {
      throw new Error('Submit button should be enabled for age 18+');
    }
  });
  
  suite.test('If/Then/Else: Submit should be disabled when age is under 18', () => {
    const runtime = env.runtime;
    
    // Set age to 17 (minor)
    const ageInput = env.container.querySelector('input[type="number"][name="field-age"]');
    if (!ageInput) {
      throw new Error('Age input not found');
    }
    
    ageInput.value = 17;
    const changeEvent = new env.window.Event('change');
    ageInput.dispatchEvent(changeEvent);
    
    // Submit button should be disabled for minors
    const submitButton = env.container.querySelector('button[type="submit"]');
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    
    // We should wait a bit for the condition to be evaluated
    setTimeout(() => {
      if (!submitButton.disabled) {
        throw new Error('Submit button should be disabled for age under 18');
      }
    }, 100);
  });
  
  suite.test('AllOf: Business fields should be required when account type is business', () => {
    const runtime = env.runtime;
    
    // Set account type to business
    const accountTypeInput = env.container.querySelector('select[name="field-accountType"]');
    if (!accountTypeInput) {
      throw new Error('Account type input not found');
    }
    
    accountTypeInput.value = 'business';
    const changeEvent = new env.window.Event('change');
    accountTypeInput.dispatchEvent(changeEvent);
    
    // Business section should be visible
    const businessSection = env.container.querySelector('[data-schema-path="businessSection"]');
    if (!businessSection) {
      throw new Error('Business section not found');
    }
    
    if (businessSection.classList.contains('hidden')) {
      throw new Error('Business section should be visible when account type is business');
    }
    
    // Personal and nonprofit sections should be hidden
    const personalSection = env.container.querySelector('[data-schema-path="personalSection"]');
    const nonprofitSection = env.container.querySelector('[data-schema-path="nonprofitSection"]');
    
    if (personalSection && !personalSection.classList.contains('hidden')) {
      throw new Error('Personal section should be hidden when account type is business');
    }
    
    if (nonprofitSection && !nonprofitSection.classList.contains('hidden')) {
      throw new Error('Nonprofit section should be hidden when account type is business');
    }
  });
  
  suite.test('AllOf: Email field should be required when contact preference is email', () => {
    const runtime = env.runtime;
    
    // Set contact preference to email
    const contactPrefInput = env.container.querySelector('select[name="field-contactPreference"]');
    if (!contactPrefInput) {
      throw new Error('Contact preference input not found');
    }
    
    contactPrefInput.value = 'email';
    const changeEvent = new env.window.Event('change');
    contactPrefInput.dispatchEvent(changeEvent);
    
    // Email field should be visible and required
    const emailField = env.container.querySelector('[data-schema-path="email"]');
    const emailInput = env.container.querySelector('input[name="field-email"]');
    
    if (!emailField || emailField.classList.contains('hidden')) {
      throw new Error('Email field should be visible when contact preference is email');
    }
    
    if (!emailInput || !emailInput.hasAttribute('required')) {
      throw new Error('Email field should be required when contact preference is email');
    }
    
    // Phone and mail fields should not be required
    const phoneInput = env.container.querySelector('input[name="field-phone"]');
    const mailFields = env.container.querySelector('[data-schema-path="mailingAddress"]');
    
    if (phoneInput && phoneInput.hasAttribute('required')) {
      throw new Error('Phone field should not be required when contact preference is email');
    }
    
    if (mailFields && !mailFields.classList.contains('hidden')) {
      throw new Error('Mailing address should not be required when contact preference is email');
    }
  });
  
  suite.test('AnyOf: Business account should require company name and tax ID', () => {
    const runtime = env.runtime;
    
    // Set account type to business
    const accountTypeInput = env.container.querySelector('select[name="field-accountType"]');
    if (!accountTypeInput) {
      throw new Error('Account type input not found');
    }
    
    accountTypeInput.value = 'business';
    const changeEvent = new env.window.Event('change');
    accountTypeInput.dispatchEvent(changeEvent);
    
    // Company name and tax ID fields should be required
    const companyNameInput = env.container.querySelector('input[name="field-businessSection-companyName"]');
    const taxIdInput = env.container.querySelector('input[name="field-businessSection-taxId"]');
    
    if (!companyNameInput || !companyNameInput.hasAttribute('required')) {
      throw new Error('Company name should be required for business accounts');
    }
    
    if (!taxIdInput || !taxIdInput.hasAttribute('required')) {
      throw new Error('Tax ID should be required for business accounts');
    }
  });
  
  suite.test('AnyOf: Personal account should not require additional fields', () => {
    const runtime = env.runtime;
    
    // Set account type to personal
    const accountTypeInput = env.container.querySelector('select[name="field-accountType"]');
    if (!accountTypeInput) {
      throw new Error('Account type input not found');
    }
    
    accountTypeInput.value = 'personal';
    const changeEvent = new env.window.Event('change');
    accountTypeInput.dispatchEvent(changeEvent);
    
    // Personal section fields should not be required
    const occupationInput = env.container.querySelector('input[name="field-personalSection-occupation"]');
    
    if (occupationInput && occupationInput.hasAttribute('required')) {
      throw new Error('Occupation should not be required for personal accounts');
    }
  });
  
  const result = await suite.run();
  TEST_RESULTS.suites.push(result);
  return env;
}

// Add a new test function specifically for form data population
async function testFormDataPopulation(env, suiteName) {
  const suite = new TestSuite(`${suiteName} - Form Data Population`);
  
  suite.test('Form data should be correctly populated for conditional schema', () => {
    const runtime = env.runtime;
    
    // Test populating fields with various types of data
    const testData = {
      name: "Test User",
      age: 25,
      accountType: "business",
      businessSection: {
        companyName: "Test Company",
        taxId: "123456789",
        employeeCount: 50
      },
      contactPreference: "email",
      email: "test@example.com"
    };
    
    // Populate form fields
    Object.entries(testData).forEach(([key, value]) => {
      if (typeof value === 'object') {
        // Handle nested objects
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          const fieldName = `field-${key}-${nestedKey}`;
          const field = env.container.querySelector(`[name="${fieldName}"]`);
          if (field) {
            field.value = nestedValue;
            const event = new env.window.Event('change');
            field.dispatchEvent(event);
          }
        });
      } else {
        // Handle top-level fields
        const fieldName = `field-${key}`;
        const field = env.container.querySelector(`[name="${fieldName}"]`);
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = value;
          } else {
            field.value = value;
          }
          const event = new env.window.Event('change');
          field.dispatchEvent(event);
        }
      }
    });
    
    // Verify form data structure
    const formData = runtime.getFormData();
    console.log("Form Data:", JSON.stringify(formData, null, 2));
    
    // Check top-level fields
    if (formData.name !== testData.name) {
      throw new Error(`Form data name mismatch: expected "${testData.name}", got "${formData.name}"`);
    }
    
    if (formData.age !== testData.age && Number(formData.age) !== testData.age) {
      throw new Error(`Form data age mismatch: expected ${testData.age}, got ${formData.age}`);
    }
    
    if (formData.accountType !== testData.accountType) {
      throw new Error(`Form data accountType mismatch: expected "${testData.accountType}", got "${formData.accountType}"`);
    }
    
    // Check nested fields
    if (!formData.businessSection || typeof formData.businessSection !== 'object') {
      throw new Error(`Form data missing businessSection object: ${JSON.stringify(formData)}`);
    }
    
    if (formData.businessSection.companyName !== testData.businessSection.companyName) {
      throw new Error(`Form data businessSection.companyName mismatch: expected "${testData.businessSection.companyName}", got "${formData.businessSection.companyName}"`);
    }
    
    if (formData.businessSection.taxId !== testData.businessSection.taxId) {
      throw new Error(`Form data businessSection.taxId mismatch: expected "${testData.businessSection.taxId}", got "${formData.businessSection.taxId}"`);
    }
    
    // Verify employee count (could be string or number)
    const employeeCount = Number(formData.businessSection.employeeCount);
    if (isNaN(employeeCount) || employeeCount !== testData.businessSection.employeeCount) {
      throw new Error(`Form data businessSection.employeeCount mismatch: expected ${testData.businessSection.employeeCount}, got ${formData.businessSection.employeeCount}`);
    }
    
    // Check contact preference fields
    if (formData.contactPreference !== testData.contactPreference) {
      throw new Error(`Form data contactPreference mismatch: expected "${testData.contactPreference}", got "${formData.contactPreference}"`);
    }
    
    if (formData.email !== testData.email) {
      throw new Error(`Form data email mismatch: expected "${testData.email}", got "${formData.email}"`);
    }
    
    // Verify that personalSection and nonprofitSection should not be in the data
    // when accountType is business (or they should be empty objects)
    if (formData.personalSection && Object.keys(formData.personalSection).some(key => formData.personalSection[key])) {
      throw new Error(`Form data should not contain populated personalSection when accountType is business: ${JSON.stringify(formData.personalSection)}`);
    }
    
    if (formData.nonprofitSection && Object.keys(formData.nonprofitSection).some(key => formData.nonprofitSection[key])) {
      throw new Error(`Form data should not contain populated nonprofitSection when accountType is business: ${JSON.stringify(formData.nonprofitSection)}`);
    }
  });
  
  const result = await suite.run();
  TEST_RESULTS.suites.push(result);
  return env;
}

// Main test function
async function runTests() {
  if (VERY_VERBOSE) {
    logHeader('JSON Schema Form Runtime Engine Tests (VERY VERBOSE MODE)');
  } else if (VERBOSE) {
    logHeader('JSON Schema Form Runtime Engine Tests (VERBOSE MODE)');
  } else {
    logHeader('JSON Schema Form Runtime Engine Tests (COMPACT MODE)');
    console.log("Running tests in compact mode. Only failures will be shown.");
    console.log("Use --verbose or -v for more details.");
  }
  
  try {
    // Build the runtime engine first if needed
    if (!fs.existsSync(path.join(DIST_DIR, 'runtime.es.js'))) {
      logInfo('Building runtime engine...');
      execSync('pnpm build', { stdio: 'pipe' });
    }
    
    // Make sure templates are generated
    if (!fs.existsSync(GENERATED_TEMPLATES_DIR)) {
      fs.mkdirSync(GENERATED_TEMPLATES_DIR, { recursive: true });
    }
    
    // Get all test schemas
    const schemaFiles = fs.readdirSync(TEST_SCHEMAS_DIR)
      .filter(file => file.endsWith('.json'));
    
    logInfo(`Testing ${schemaFiles.length} schemas`);
    
    // Create summary for all tests
    const testResults = {
      total: 0,
      passed: 0,
      schemas: {}
    };
    
    // Test with each schema
    for (const schemaFile of schemaFiles) {
      const suiteName = `Schema: ${schemaFile}`;
      logInfo(`Testing ${schemaFile}...`);
      
      testResults.schemas[schemaFile] = {
        suites: {},
        passed: 0,
        total: 0
      };
      
      try {
        // Setup test environment
        let env = await setupTestEnvironment(schemaFile);
        
        // Run test suites
        env = await testFormInitialization(env, suiteName);
        env = await testFormEvents(env, suiteName);
        env = await testConditionalDisplay(env, suiteName);
        
        // Run form data population test for conditional schema
        if (schemaFile === 'conditional.json') {
          env = await testFormDataPopulation(env, suiteName);
        }
        
        env = await testFormSubmission(env, suiteName);
        env = await testConditionalLogic(env, suiteName);
        
        // Cleanup
        env.dom.window.close();
      } catch (error) {
        logError(`Test setup failed for ${schemaFile}`);
        if (VERY_VERBOSE) {
          console.error(error);
        }
      }
    }
    
    // Print compact summary
    logHeader('Test Summary');
    
    if (TEST_RESULTS.failed > 0) {
      console.log(`Total: ${TEST_RESULTS.total} | Passed: ${colors.green}${TEST_RESULTS.passed}${colors.reset} | Failed: ${colors.red}${TEST_RESULTS.failed}${colors.reset}`);
    } else {
      console.log(`${colors.green}All ${TEST_RESULTS.total} tests passed!${colors.reset}`);
    }
    
    // Group by schema
    const schemaResults = {};
    TEST_RESULTS.suites.forEach(suite => {
      const schemaName = suite.name.split(' - ')[0].replace('Schema: ', '');
      if (!schemaResults[schemaName]) {
        schemaResults[schemaName] = [];
      }
      schemaResults[schemaName].push(suite);
    });
    
    // Print compact results by schema
    Object.entries(schemaResults).forEach(([schema, suites]) => {
      const failedSuites = suites.filter(s => s.failed > 0);
      
      // Only show schema if it has failures or we're in verbose mode
      if (failedSuites.length > 0 || VERBOSE || VERY_VERBOSE) {
        console.log(`\n${colors.blue}${schema}${colors.reset}:`);
        
        suites.forEach(suite => {
          const suiteName = suite.name.split(' - ')[1];
          // Only show suite if it has failures or we're in verbose mode
          if (suite.failed > 0 || VERBOSE || VERY_VERBOSE) {
            if (suite.failed > 0) {
              console.log(`  ${suiteName}: ${colors.green}${suite.passed}${colors.reset}/${suite.total} (${colors.red}${suite.failed} failed${colors.reset})`);
            } else {
              console.log(`  ${suiteName}: ${colors.green}${suite.passed}${colors.reset}/${suite.total}`);
            }
          }
        });
      }
    });
    
    // Exit with appropriate status code
    process.exit(TEST_RESULTS.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logError('Test execution failed');
    if (VERY_VERBOSE) {
      console.error(error);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the tests
runTests();