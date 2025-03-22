/**
 * Mock SchemaForm class for testing
 * This mock simulates the behavior of the actual SchemaForm class
 * but without TypeScript dependencies or DOM manipulation
 */
const mitt = require('mitt');

class MockSchemaForm {
  constructor(element, options = {}) {
    this.element = typeof element === 'string' 
      ? document.querySelector(element) 
      : element;
    
    this.options = options;
    this.schema = options.schema || null;
    this.formData = options.data || {};
    this.processConditionals = true;
    this.emitter = mitt();
    this.fieldVisibilityHistory = {};
    this.errors = []; // Add errors array to store validation errors
    this.validateOnSubmit = options.validateOnSubmit || false;
    
    // Initialize
    this.setupForm();
    
    // Debug mode
    if (options.debug) {
      this.debugEmitter();
    }
  }
  
  setupForm() {
    if (!this.element) return;
    
    // Handle form submission
    if (this.element.tagName === 'FORM') {
      this.element.addEventListener('submit', (event) => {
        event.preventDefault();
        this.submit();
      });
    }
    
    // Set up input event listeners
    this.setupInputEvents();
  }
  
  setupInputEvents() {
    // Find all form inputs
    const inputs = this.element.querySelectorAll('input, select, textarea');
    
    // Add change and input event listeners
    inputs.forEach(input => {
      input.addEventListener('change', (event) => {
        this.handleFieldChange(event);
      });
      
      input.addEventListener('input', (event) => {
        this.handleFieldChange(event);
      });
    });
  }
  
  handleFieldChange(event) {
    const input = event.target;
    const fieldId = this.getFieldId(input);
    
    if (fieldId) {
      // Update form data
      this.updateFormDataFromField(fieldId, input);
      
      // Emit change event
      this.emitter.emit('change', { 
        field: fieldId, 
        value: this.formData[fieldId],
        formData: this.formData
      });
      
      // Re-evaluate conditionals
      this.evaluateConditions();
    }
  }
  
  updateFormDataFromField(fieldId, input) {
    let value;
    
    // Get value based on input type
    if (input.type === 'checkbox') {
      value = input.checked;
    } else if (input.type === 'radio') {
      if (input.checked) {
        value = input.value;
      } else {
        return; // Don't update if radio is not checked
      }
    } else if (input.tagName === 'SELECT' && input.multiple) {
      value = Array.from(input.selectedOptions).map(option => option.value);
    } else {
      value = input.value;
    }
    
    // Handle nested paths (e.g., "address.street")
    if (fieldId.includes('.')) {
      const parts = fieldId.split('.');
      let current = this.formData;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[parts[parts.length - 1]] = value;
    } else {
      this.formData[fieldId] = value;
    }
  }
  
  getFieldId(input) {
    // Try to get field ID from various attributes
    const name = input.getAttribute('name');
    const dataSchemaId = input.getAttribute('data-schema-id');
    
    if (dataSchemaId) {
      return dataSchemaId;
    }
    
    if (name) {
      // Remove 'field-' prefix if present
      return name.startsWith('field-') ? name.substring(6) : name;
    }
    
    return null;
  }
  
  /**
   * Process conditionals in the form
   */
  evaluateConditions() {
    if (!this.element) return;
    
    // Find all conditional fields
    const conditionalFields = this.element.querySelectorAll('[data-condition]');
    
    conditionalFields.forEach(field => {
      const condition = field.getAttribute('data-condition');
      
      if (condition) {
        // Parse condition (format: "fieldName=value")
        const [fieldName, expectedValue] = condition.split('=');
        
        // Get actual value from form data
        const actualValue = this.getFormValue(fieldName);
        
        // Compare values
        let isVisible = false;
        
        if (expectedValue === 'true') {
          isVisible = Boolean(actualValue) === true;
        } else if (expectedValue === 'false') {
          isVisible = Boolean(actualValue) === false;
        } else {
          isVisible = actualValue === expectedValue;
        }
        
        // Update visibility
        if (isVisible) {
          this.showFieldElement(field);
        } else {
          this.hideFieldElement(field);
        }
        
        // Track visibility
        this.trackFieldVisibility(field.getAttribute('data-schema-path'), isVisible);
      }
    });
  }
  
  getFormValue(path) {
    if (!path.includes('.')) {
      return this.formData[path];
    }
    
    // Handle nested paths
    const parts = path.split('.');
    let value = this.formData;
    
    for (const part of parts) {
      if (!value || typeof value !== 'object') {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }
  
  showFieldElement(element) {
    element.style.display = '';
    element.classList.remove('hidden');
    
    // Emit fieldShow event
    const path = element.getAttribute('data-schema-path');
    if (path) {
      this.emitter.emit('fieldShow', { field: path });
    }
  }
  
  hideFieldElement(element) {
    element.style.display = 'none';
    element.classList.add('hidden');
    
    // Emit fieldHide event
    const path = element.getAttribute('data-schema-path');
    if (path) {
      this.emitter.emit('fieldHide', { field: path });
    }
  }
  
  trackFieldVisibility(fieldPath, isVisible) {
    if (!fieldPath) return;
    
    // Initialize history array if needed
    if (!this.fieldVisibilityHistory[fieldPath]) {
      this.fieldVisibilityHistory[fieldPath] = [];
    }
    
    // Add entry to history
    this.fieldVisibilityHistory[fieldPath].push({
      action: isVisible ? 'show' : 'hide',
      reason: 'condition',
      timestamp: Date.now()
    });
  }
  
  /* Public API methods */
  
  /**
   * Register event handler
   */
  on(type, handler) {
    this.emitter.on(type, handler);
  }
  
  /**
   * Unregister event handler
   */
  off(type, handler) {
    this.emitter.off(type, handler);
  }
  
  /**
   * Get form data
   */
  getData() {
    return this.formData;
  }
  
  /**
   * Set form data
   */
  setData(data) {
    this.formData = { ...data };
    this.updateFormFields();
  }
  
  /**
   * Update form fields based on formData
   */
  updateFormFields() {
    if (!this.element) return;
    
    // Find all inputs
    const inputs = this.element.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const fieldId = this.getFieldId(input);
      
      if (fieldId) {
        const value = this.getFormValue(fieldId);
        
        if (value !== undefined) {
          if (input.type === 'checkbox') {
            input.checked = Boolean(value);
          } else if (input.type === 'radio') {
            input.checked = (input.value === value);
          } else if (input.tagName === 'SELECT' && input.multiple && Array.isArray(value)) {
            Array.from(input.options).forEach(option => {
              option.selected = value.includes(option.value);
            });
          } else {
            input.value = value;
          }
        }
      }
    });
    
    // Re-evaluate conditionals
    this.evaluateConditions();
  }
  
  /**
   * Validate form
   */
  validate() {
    // Reset errors
    this.errors = [];
    
    if (!this.schema || !this.element) return true;

    // Emit validation start event
    this.emitter.emit('validationStart', { formData: this.formData });
    
    let isValid = true;
    
    // Check required fields
    if (this.schema.required && Array.isArray(this.schema.required)) {
      for (const field of this.schema.required) {
        if (this.formData[field] === undefined || this.formData[field] === '') {
          const customMessage = this.getCustomErrorMessage(field, 'required');
          
          this.errors.push({
            field,
            message: customMessage || `Field '${field}' is required but missing`
          });
          isValid = false;
        }
      }
    }
    
    // Check schema properties for type and format validation
    if (this.schema.properties) {
      for (const [field, propSchema] of Object.entries(this.schema.properties)) {
        const value = this.formData[field];
        
        // Skip validation if the field is not in the form data
        if (value === undefined) continue;
        
        // Type validation
        if (propSchema.type === 'string' && typeof value !== 'string') {
          this.errors.push({
            field,
            message: `Field '${field}' must be a string`
          });
          isValid = false;
        }
        
        // String validations
        if (propSchema.type === 'string' && typeof value === 'string') {
          // MinLength
          if (propSchema.minLength !== undefined && value.length < propSchema.minLength) {
            const customMessage = this.getCustomErrorMessage(field, 'minLength');
            
            this.errors.push({
              field,
              message: customMessage || `Field '${field}' must be at least ${propSchema.minLength} characters long`
            });
            isValid = false;
          }
          
          // Pattern
          if (propSchema.pattern && !new RegExp(propSchema.pattern).test(value)) {
            const customMessage = this.getCustomErrorMessage(field, 'pattern');
            
            this.errors.push({
              field,
              message: customMessage || `Field '${field}' must match pattern ${propSchema.pattern}`
            });
            isValid = false;
          }
          
          // Format (email)
          if (propSchema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            const customMessage = this.getCustomErrorMessage(field, 'format');
            
            this.errors.push({
              field,
              message: customMessage || `Field '${field}' must be a valid email address`
            });
            isValid = false;
          }
        }
        
        // Number validations
        if ((propSchema.type === 'number' || propSchema.type === 'integer') && 
            (typeof value === 'number' || !isNaN(Number(value)))) {
          const numValue = Number(value);
          
          // Minimum
          if (propSchema.minimum !== undefined && numValue < propSchema.minimum) {
            const customMessage = this.getCustomErrorMessage(field, 'minimum');
            
            this.errors.push({
              field,
              message: customMessage || `Field '${field}' must be at least ${propSchema.minimum}`
            });
            isValid = false;
          }
          
          // Maximum
          if (propSchema.maximum !== undefined && numValue > propSchema.maximum) {
            const customMessage = this.getCustomErrorMessage(field, 'maximum');
            
            this.errors.push({
              field,
              message: customMessage || `Field '${field}' must not exceed ${propSchema.maximum}`
            });
            isValid = false;
          }
        }
      }
    }
    
    // allOf validation
    if (this.schema.allOf && Array.isArray(this.schema.allOf)) {
      for (const subSchema of this.schema.allOf) {
        if (subSchema.properties) {
          for (const [field, propSchema] of Object.entries(subSchema.properties)) {
            const value = this.formData[field];
            
            // Skip validation if the field is not in the form data
            if (value === undefined) continue;
            
            // MinLength
            if (propSchema.minLength !== undefined && typeof value === 'string' && 
                value.length < propSchema.minLength) {
              this.errors.push({
                field,
                message: `Field '${field}' must be at least ${propSchema.minLength} characters long`
              });
              isValid = false;
            }
            
            // Pattern
            if (propSchema.pattern && typeof value === 'string' && 
                !new RegExp(propSchema.pattern).test(value)) {
              this.errors.push({
                field,
                message: `Field '${field}' must match pattern ${propSchema.pattern}`
              });
              isValid = false;
            }
          }
        }
      }
    }
    
    // anyOf validation
    if (this.schema.anyOf && Array.isArray(this.schema.anyOf)) {
      let anyOfValid = false;
      
      for (const subSchema of this.schema.anyOf) {
        let subSchemaValid = true;
        
        if (subSchema.properties) {
          for (const [field, propSchema] of Object.entries(subSchema.properties)) {
            const value = this.formData[field];
            
            // Skip if field is not in form data
            if (value === undefined) continue;
            
            // Format
            if (propSchema.format === 'email' && typeof value === 'string' && 
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              subSchemaValid = false;
              break;
            }
            
            // Pattern
            if (propSchema.pattern && typeof value === 'string' && 
                !new RegExp(propSchema.pattern).test(value)) {
              subSchemaValid = false;
              break;
            }
          }
        }
        
        if (subSchemaValid) {
          anyOfValid = true;
          break;
        }
      }
      
      if (!anyOfValid) {
        this.errors.push({
          message: `Data doesn't match any of the required schemas`
        });
        isValid = false;
      }
    }
    
    // if/then/else validation
    if (this.schema.if && this.schema.then) {
      let matchesIf = true;
      
      // Check if condition
      if (this.schema.if.properties) {
        for (const [field, condition] of Object.entries(this.schema.if.properties)) {
          const value = this.formData[field];
          
          if (condition.const !== undefined && value !== condition.const) {
            matchesIf = false;
            break;
          }
        }
      }
      
      // Apply then or else schema
      const validationSchema = matchesIf ? this.schema.then : (this.schema.else || {});
      
      // Check required fields in the conditional schema
      if (validationSchema.required && Array.isArray(validationSchema.required)) {
        for (const field of validationSchema.required) {
          if (this.formData[field] === undefined || this.formData[field] === '') {
            this.errors.push({
              field,
              message: `Field '${field}' is required based on condition`
            });
            isValid = false;
          }
        }
      }
      
      // Check property validations in the conditional schema
      if (validationSchema.properties) {
        for (const [field, propSchema] of Object.entries(validationSchema.properties)) {
          const value = this.formData[field];
          
          // Skip validation if the field is not in the form data
          if (value === undefined) continue;
          
          // Pattern
          if (propSchema.pattern && typeof value === 'string' && 
              !new RegExp(propSchema.pattern).test(value)) {
            this.errors.push({
              field,
              message: `Field '${field}' must match pattern ${propSchema.pattern}`
            });
            isValid = false;
          }
        }
      }
    }
    
    // Emit events based on validation results
    if (!isValid) {
      this.emitter.emit('validationError', { errors: this.errors, formData: this.formData });
    }
    
    this.emitter.emit('validationComplete', { isValid, errors: this.errors, formData: this.formData });
    
    return isValid;
  }
  
  /**
   * Get custom error message from schema
   */
  getCustomErrorMessage(field, errorType) {
    if (!this.schema || !this.schema.properties || !this.schema.properties[field]) {
      return null;
    }
    
    const propSchema = this.schema.properties[field];
    
    if (propSchema.errorMessage) {
      if (typeof propSchema.errorMessage === 'string') {
        return propSchema.errorMessage;
      } else if (typeof propSchema.errorMessage === 'object' && propSchema.errorMessage[errorType]) {
        return propSchema.errorMessage[errorType];
      }
    }
    
    return null;
  }
  
  /**
   * Get error summary organized by field
   */
  getErrorSummary() {
    if (!this.errors.length) {
      return {
        errorCount: 0,
        fieldErrors: {}
      };
    }
    
    const fieldErrors = {};
    
    // Group errors by field
    this.errors.forEach(error => {
      const field = error.field || 'general';
      
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      
      fieldErrors[field].push(error.message);
    });
    
    return {
      errorCount: this.errors.length,
      fieldErrors
    };
  }
  
  /**
   * Reset form
   */
  reset() {
    if (!this.element) return;
    
    // Reset form element if it's a form
    if (this.element.tagName === 'FORM') {
      this.element.reset();
    }
    
    // Clear form data
    this.formData = {};
    
    // Emit reset event
    this.emitter.emit('reset', { formData: this.formData });
    
    // Re-evaluate conditionals
    this.evaluateConditions();
  }
  
  /**
   * Submit form
   */
  submit() {
    // Always validate, but only prevent submission if validateOnSubmit is true
    const isValid = this.validate();
    
    // Don't proceed with submission if validateOnSubmit is true and validation fails
    if (this.validateOnSubmit && !isValid) {
      return;
    }
    
    // Emit submit event
    this.emitter.emit('submit', { formData: this.formData });
    
    // Call onSubmit callback if provided
    if (this.options.onSubmit) {
      this.options.onSubmit(this.formData);
    }
  }
  
  /**
   * Enable debug mode
   */
  debugEmitter() {
    this.emitter.on('*', (type, event) => {
      console.log(`[SchemaForm Event] ${type}:`, event);
    });
  }
  
  /**
   * Trigger event manually
   */
  triggerEvent(type, data = {}) {
    this.emitter.emit(type, data);
    
    // Handle special events
    if (type === 'evaluateConditions') {
      this.evaluateConditions();
    }
  }
  
  /**
   * Get field visibility history
   */
  getFieldVisibilityHistory() {
    return this.fieldVisibilityHistory;
  }
  
  /**
   * Get field visibility report
   */
  getFieldVisibilityReport() {
    const report = {};
    
    Object.keys(this.fieldVisibilityHistory).forEach(fieldPath => {
      const history = this.fieldVisibilityHistory[fieldPath];
      const lastEntry = history[history.length - 1];
      
      report[fieldPath] = {
        isVisible: lastEntry.action === 'show',
        lastChange: lastEntry.timestamp,
        changeCount: history.length,
        lastReason: lastEntry.reason
      };
    });
    
    return report;
  }
}

module.exports = {
  SchemaForm: MockSchemaForm
}; 