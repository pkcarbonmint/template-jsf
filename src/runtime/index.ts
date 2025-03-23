import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import * as R from 'fp-ts/Record';
import mitt from 'mitt';
import $ from 'jquery';
import { setupArrayHandlers, getArrayItemsData } from './array-handler';

// Types
export type JSONSchema = {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: any;
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  const?: any;
  conditionals?: any[];
  dependencies?: Record<string, any>;
};

export type FormOptions = {
  submitUrl?: string;
  schemaUrl?: string;
  templateUrl?: string;
  onChange?: (data: any) => void;
  onSubmit?: (data: any) => void;
  onError?: (errors: any[]) => void;
  defaultData?: Record<string, any>;
  onReady?: (form: SchemaForm) => void;
  debug?: boolean;
};

interface FormEvents {
  ready: { schema: JSONSchema };
  error: { message: string } | { errors: any[] };
  change: { field: string; value: any; formData: Record<string, any> };
  submit: { formData: Record<string, any> };
  fieldShow: { field: string; reason?: string };
  fieldHide: { field: string; reason?: string };
  reset: { formData: Record<string, any> };
  [key: string]: any; // Allow for other events
  [key: symbol]: any; // Add index signature for symbol
}

export type SchemaPaths = Record<string, string>;

export class SchemaForm {
  private schema: JSONSchema | null = null;
  private element: HTMLElement;
  private formElement: HTMLFormElement | null = null;
  private emitter = mitt<FormEvents>();
  private options: FormOptions;
  private formData: Record<string, any> = {};
  private schemaPathMap: SchemaPaths = {};
  private fieldVisibilityHistory: Record<string, {action: string, reason: string, timestamp: number}[]> = {};
  
  constructor(element: HTMLElement | string, options: FormOptions = {}) {
    // Set element - either directly or by selector
    if (typeof element === 'string') {
      const el = document.querySelector(element);
      if (!el) {
        throw new Error(`Element not found: ${element}`);
      }
      this.element = el as HTMLElement;
    } else {
      this.element = element;
    }
    
    // Set options
    this.options = options;
    
    // Initialize data structures
    this.formData = {};
    this.schemaPathMap = {};
    this.fieldVisibilityHistory = {};
    
    // Create event emitter
    this.emitter = mitt<FormEvents>();
    
    // Add debug log listener for all events if in debug mode
    if (options.debug) {
      this.emitter.on('*', (type, event) => {
        console.log(`[SchemaForm Event] ${type as string}:`, event);
      });
    }
    
    // Initialize the form
    this.init().catch(err => {
      console.error('Failed to initialize form:', err);
    });
  }
  
  public async init(): Promise<void> {
    try {
      // Load schema if URL is provided
      if (this.options.schemaUrl) {
        this.schema = await this.loadSchema(this.options.schemaUrl);
        if (!this.schema) {
          throw new Error('Failed to load schema');
        }
        this.buildSchemaPathMap();
      }
      
      // Load template if URL is provided
      if (this.options.templateUrl) {
        await this.loadTemplate(this.options.templateUrl);
      }
      
      // Setup form
      this.setupForm();
      
      // Initialize form data with default values if provided
      if (this.options.defaultData) {
        this.formData = { ...this.options.defaultData };
        this.updateFormFields();
      } else {
        // Initialize form data from fields that exist in the form
        this.initializeFormDataFromFields();
      }
      
      // Call the initial evaluateAllConditions to set up initial visibility
      this.evaluateAllConditions();
      
      // Emit ready event
      if (this.schema)
        this.emitter.emit('ready', { schema: this.schema });
      
      // Call onReady callback if provided
      if (this.options.onReady) {
        this.options.onReady(this);
      }
    } catch (error) {
      console.error('Error initializing form:', error);
      this.emitter.emit('error', { message: `Initialization error: ${error}` });
    }
  }
  
  private async loadSchema(schemaUrl: string): Promise<JSONSchema | null> {
    try {
      const response = await fetch(schemaUrl);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }
      
      const schema = await response.json();
      
      // Process the schema to extract conditionals
      this.processSchemaConditionals(schema);
      
      return schema;
    } catch (error) {
      console.error(`Error loading schema: ${error}`);
      this.emitter.emit('error', { message: `Failed to load schema: ${error}` });
      return null;
    }
  }
  
  private processSchemaConditionals(schema: JSONSchema): void {
    schema.conditionals = schema.conditionals || [];
    const conditionals = schema.conditionals;
    // Extract if/then/else at root level
    if (schema.if && (schema.then || schema.else)) {
      schema.conditionals.push({
        if: schema.if,
        then: schema.then,
        else: schema.else
      });
    }
    
    // Look for conditionals in allOf
    if (schema.allOf) {
      schema.allOf.forEach(subSchema => {
        if (subSchema.if && (subSchema.then || subSchema.else)) {
          conditionals.push({
            if: subSchema.if,
            then: subSchema.then,
            else: subSchema.else
          });
        }
      });
    }
    
    // Process dependencies (another form of conditionals)
    if (schema.dependencies) {
      Object.entries(schema.dependencies).forEach(([propName, dependency]) => {
        if (typeof dependency === 'object' && !Array.isArray(dependency)) {
          // Schema dependency
          const conditionalSchema = {
            if: {
              properties: {
                [propName]: { type: 'string' } // Exists and has any value
              },
              required: [propName]
            },
            then: dependency
          };
          
          conditionals.push(conditionalSchema);
        }
      });
    }
  }
  
  private async loadTemplate(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load template from ${url}: ${response.statusText}`);
      }
      const html = await response.text();
      this.element.innerHTML = html;
    } catch (error) {
      console.error('Error loading template:', error);
      throw error;
    }
  }
  
  private setupForm(): void {
    // Find form element
    this.formElement = this.element.querySelector('form');
    
    if (!this.formElement) {
      console.warn('No form element found in container');
      return;
    }
    
    // Make sure the form has our identifier
    if (!this.formElement.hasAttribute('data-schema-form')) {
      this.formElement.setAttribute('data-schema-form', 'true');
    }
    
    // Initialize array handling
    setupArrayHandlers(this.element);
    
    // Setup input events
    this.setupInputEvents();
    
    // Setup form submission
    this.formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
    
    // Initialize conditionals
    this.evaluateConditions();
    
    // Listen for array change events
    this.element.addEventListener('array:change', this.handleArrayChange.bind(this) as EventListener);
  }
  
  private setupInputEvents(): void {
    // Find all input elements
    const inputs = this.element.querySelectorAll(
      'input, select, textarea'
    );
    
    inputs.forEach(input => {
      // Try to get field identifier from data-schema-id, data-schema-path, or input name
      const fieldId = input.getAttribute('data-schema-id') || 
                      input.getAttribute('data-schema-path') || 
                      (input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name;
      
      if (!fieldId && (input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).name === '') {
        // Skip elements without any identifier
        return;
      }
      
      // Remove existing event listeners to prevent duplicates
      const newInput = input.cloneNode(true);
      if (input.parentNode) {
        input.parentNode.replaceChild(newInput, input);
      }
      
      // Handle change events
      newInput.addEventListener('change', (event) => {
        this.handleFieldChange(event);
      });
      
      // Handle input events for immediate feedback
      newInput.addEventListener('input', (event) => {
        this.handleFieldChange(event);
      });
      
      // Initialize with default values
      this.updateFormDataFromField(fieldId, newInput as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement);
    });
    
    // Add logging to help debug
    console.log(`Setup events for ${inputs.length} form fields`);
  }
  
  private handleFieldChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    
    // Try to get the schema path from data-schema-id, data-schema-path, or name
    const schemaElement = input.closest('[data-schema-id], [data-schema-path]');
    const fieldId = schemaElement?.getAttribute('data-schema-id') || 
                    schemaElement?.getAttribute('data-schema-path') || 
                    input.name;
    
    if (!fieldId) return;
    
    // Update form data
    this.updateFormDataFromField(fieldId, input);
    
    // Evaluate conditional rules
    this.evaluateAllConditions();
    
    // Emit change event
    this.emitter.emit('change', { field: fieldId, value: input.value, formData: this.getFormData() });
    
    // Call onChange callback if provided
    if (this.options.onChange) {
      this.options.onChange(this.getFormData());
    }
  }
  
  private updateFormDataFromField(fieldId: string, input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
    if (!fieldId) return;
    
    let value: any;
    
    // Handle different input types
    if (input.type === 'checkbox') {
      value = (input as HTMLInputElement).checked;
    } else if (input.type === 'number' || input.type === 'range') {
      value = parseFloat((input as HTMLInputElement).value);
      if (isNaN(value)) value = null;
    } else {
      value = input.value;
    }

    // Extract actual field path from the input name or fieldId
    // Handle inputs with names like "field-additionalInfo-phone" which should map to additionalInfo.phone
    let actualFieldPath = fieldId;

    // Check if it's a field with prefixed name (field-xxx-yyy)
    if (fieldId.startsWith('field-')) {
      const parts = fieldId.split('-');
      if (parts.length > 1) {
        // Skip the 'field' prefix and join the rest with dots
        actualFieldPath = parts.slice(1).join('.');
      }
    }
    
    // Update nested path in form data
    if (actualFieldPath.includes('.')) {
      const parts = actualFieldPath.split('.');
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
      this.formData[actualFieldPath] = value;
    }
    
    console.log('Updated form data:', this.formData);
  }
  
  private handleSubmit(event: Event): void {
    event.preventDefault();
    
    // Validate form data against schema
    // (Implementation would depend on validation library)
    
    // Emit submit event
    this.emitter.emit('submit', { formData: { ...this.formData } });
    
    // Call onSubmit callback if provided
    if (this.options.onSubmit) {
      this.options.onSubmit({ ...this.formData });
    }
    
    // Submit form data to server if submitUrl is provided
    if (this.options.submitUrl) {
      this.submitToServer();
    }
  }
  
  private async submitToServer(): Promise<void> {
    if (!this.options.submitUrl) return;
    
    try {
      const response = await fetch(this.options.submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.formData)
      });
      
      if (!response.ok) {
        throw new Error(`Server submission failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Server response:', result);
    } catch (error) {
      console.error('Error submitting form to server:', error);
      this.emitter.emit('error', { errors: [error] });
    }
  }
  
  private buildSchemaPathMap(): void {
    if (!this.schema) return;
    
    // Reset path map
    this.schemaPathMap = {};
    
    // Build path map recursively
    this.mapSchemaPaths(this.schema, '');
  }
  
  private mapSchemaPaths(schema: JSONSchema, path: string): void {
    // Map the current schema node
    const id = path || 'root';
    this.schemaPathMap[id] = path;
    
    // Map properties for object types
    if (schema.type === 'object' && schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        const propPath = path ? `${path}.${key}` : key;
        this.mapSchemaPaths(propSchema, propPath);
      });
    }
    
    // Map items for array types
    if (schema.type === 'array' && schema.items) {
      const itemsPath = path ? `${path}.items` : 'items';
      this.mapSchemaPaths(schema.items, itemsPath);
    }
    
    // Map conditional schemas
    if (schema.if) {
      const ifPath = path ? `${path}.if` : 'if';
      this.mapSchemaPaths(schema.if, ifPath);
    }
    
    if (schema.then) {
      const thenPath = path ? `${path}.then` : 'then';
      this.mapSchemaPaths(schema.then, thenPath);
    }
    
    if (schema.else) {
      const elsePath = path ? `${path}.else` : 'else';
      this.mapSchemaPaths(schema.else, elsePath);
    }
    
    // Map allOf schemas
    if (schema.allOf) {
      schema.allOf.forEach((subSchema, index) => {
        const subPath = path ? `${path}.allOf[${index}]` : `allOf[${index}]`;
        this.mapSchemaPaths(subSchema, subPath);
      });
    }
    
    // Map anyOf schemas
    if (schema.anyOf) {
      schema.anyOf.forEach((subSchema, index) => {
        const subPath = path ? `${path}.anyOf[${index}]` : `anyOf[${index}]`;
        this.mapSchemaPaths(subSchema, subPath);
      });
    }
    
    // Map oneOf schemas
    if (schema.oneOf) {
      schema.oneOf.forEach((subSchema, index) => {
        const subPath = path ? `${path}.oneOf[${index}]` : `oneOf[${index}]`;
        this.mapSchemaPaths(subSchema, subPath);
      });
    }
  }
  
  private evaluateAllConditions(): void {
    if (!this.schema) return;
    
    // First ensure basic fields are visible
    this.showBasicFields();
    
    // Then hide conditional fields that should be hidden by default
    this.hideConditionalFields();
    
    // Check and apply JSON Schema conditionals
    this.evaluateSchemaConditionals();
    
    // Check for application-specific conditionals
    if (this.schema.conditionals) {
      this.schema.conditionals.forEach((conditional, index) => {
        this.evaluateConditional(conditional, index);
      });
    }
  }
  
  private showBasicFields(): void {
    // Make sure all basic fields in the schema properties are visible by default
    if (!this.schema || !this.schema.properties) return;
    
    console.log('Ensuring basic schema properties are visible');
    
    // Get all top-level property names from the schema
    const topLevelProperties = Object.keys(this.schema.properties);
    
    // Show each property field by default
    topLevelProperties.forEach(propName => {
      // Skip special fields and known conditional sections
      if (propName.startsWith('_') || 
          propName === 'additionalInfo' || 
          propName === 'personalSection' || 
          propName === 'businessSection' || 
          propName === 'nonprofitSection') {
        return;
      }
      
      const field = this.element.querySelector(`[data-schema-path="${propName}"]`);
      if (field) {
        console.log(`Ensuring field is visible: ${propName}`);
        this.showFieldElement(field as HTMLElement, "Basic schema property");
      }
    });
  }
  
  private hideConditionalFields(): void {
    // Hide the additionalInfo section by default (specifically for simple schema)
    const additionalInfoField = this.element.querySelector('[data-schema-path="additionalInfo"]');
    if (additionalInfoField) {
      this.hideFieldElement(additionalInfoField as HTMLElement, "Hidden by default (additionalInfo)");
      console.log('Hiding additionalInfo field by default');
    }
    
    // Find all fields that are explicitly marked as conditional
    const conditionalFields = this.element.querySelectorAll('[data-conditional="true"]');
    conditionalFields.forEach((field) => {
      this.hideFieldElement(field as HTMLElement, "Marked as conditional");
    });
  }
  
  private evaluateSchemaConditionals(): void {
    if (!this.schema) return;
    
    // Process if/then/else conditional
    if (this.schema.if && (this.schema.then || this.schema.else)) {
      const ifConditionMet = this.evaluateSchemaCondition(this.schema.if);
      console.log(`If condition evaluated: ${ifConditionMet ? 'TRUE' : 'FALSE'}`);
      
      if (ifConditionMet && this.schema.then) {
        this.applySchemaConditional(this.schema.then);
      } else if (!ifConditionMet && this.schema.else) {
        this.applySchemaConditional(this.schema.else);
      }
    }
    
    // Process allOf conditionals
    if (this.schema.allOf && Array.isArray(this.schema.allOf)) {
      this.schema.allOf.forEach((condition, index) => {
        if (condition.if) {
          const ifConditionMet = this.evaluateSchemaCondition(condition.if);
          console.log(`AllOf[${index}] if condition evaluated: ${ifConditionMet ? 'TRUE' : 'FALSE'}`);
          
          if (ifConditionMet && condition.then) {
            this.applySchemaConditional(condition.then);
          } else if (!ifConditionMet && condition.else) {
            this.applySchemaConditional(condition.else);
          }
        }
      });
    }
    
    // Process anyOf conditionals
    if (this.schema.anyOf && Array.isArray(this.schema.anyOf)) {
      const accountType = this.getNestedValue(this.formData, 'accountType');
      console.log(`Processing anyOf with accountType: ${accountType}`);
      
      // First handle the business account case
      if (accountType === 'business') {
        const businessCondition = this.schema.anyOf.find(condition => 
          condition.properties && 
          condition.properties.accountType && 
          condition.properties.accountType.const === 'business'
        );
        
        if (businessCondition) {
          console.log('Applying business account anyOf condition');
          this.applySchemaConditional(businessCondition);
          
          // Specifically handle the businessSection and its required fields
          if (businessCondition.properties && businessCondition.properties.businessSection) {
            const businessSectionSchema = businessCondition.properties.businessSection;
            
            // Show the business section
            const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
            if (businessSection) {
              this.showFieldElement(businessSection as HTMLElement);
              
              // If there are required fields defined, make them required
              if (businessSectionSchema.required && Array.isArray(businessSectionSchema.required)) {
                businessSectionSchema.required.forEach((fieldName: string) => {
                  const fieldInput = this.element.querySelector(`[name="field-businessSection-${fieldName}"]`);
                  if (fieldInput) {
                    console.log(`Making business field ${fieldName} required from anyOf`);
                    (fieldInput as HTMLElement).setAttribute('required', 'required');
                  }
                });
              }
            }
            
            // Hide the personal and nonprofit sections
            const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
            const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
            
            if (personalSection) {
              this.hideFieldElement(personalSection as HTMLElement);
            }
            
            if (nonprofitSection) {
              this.hideFieldElement(nonprofitSection as HTMLElement);
            }
          }
        }
      } 
      // Handle personal account case
      else if (accountType === 'personal') {
        const personalCondition = this.schema.anyOf.find(condition => 
          condition.properties && 
          condition.properties.accountType && 
          condition.properties.accountType.const === 'personal'
        );
        
        if (personalCondition) {
          console.log('Applying personal account anyOf condition');
          this.applySchemaConditional(personalCondition);
          
          // Specifically show the personal section
          const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
          if (personalSection) {
            this.showFieldElement(personalSection as HTMLElement);
          }
          
          // Hide the business and nonprofit sections
          const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
          const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
          
          if (businessSection) {
            this.hideFieldElement(businessSection as HTMLElement);
            
            // Remove required attribute from business fields
            const companyNameInput = this.element.querySelector('[name="field-businessSection-companyName"]');
            const taxIdInput = this.element.querySelector('[name="field-businessSection-taxId"]');
            
            if (companyNameInput) {
              (companyNameInput as HTMLElement).removeAttribute('required');
            }
            
            if (taxIdInput) {
              (taxIdInput as HTMLElement).removeAttribute('required');
            }
          }
          
          if (nonprofitSection) {
            this.hideFieldElement(nonprofitSection as HTMLElement);
          }
        }
      }
    }
  }
  
  private evaluateSchemaCondition(condition: any): boolean {
    // For if conditions that check properties
    if (condition.properties) {
      return Object.entries(condition.properties).every(([propName, propCondition]) => {
        const fieldValue = this.getNestedValue(this.formData, propName);
        console.log(`Evaluating schema condition for ${propName}:`, { fieldValue, condition: propCondition });
        
        // Check minimum value
        if ((propCondition as any).minimum !== undefined) {
          return fieldValue >= (propCondition as any).minimum;
        }
        
        // Check maximum value
        if ((propCondition as any).maximum !== undefined) {
          return fieldValue <= (propCondition as any).maximum;
        }
        
        // Check enum condition
        if ((propCondition as any).enum) {
          return (propCondition as any).enum.includes(fieldValue);
        }
        
        // Check const condition
        if ((propCondition as any).const !== undefined) {
          return fieldValue === (propCondition as any).const;
        }
        
        return true;
      });
    }
    
    return false;
  }
  
  private applySchemaConditional(schema: any): void {
    console.log('Applying schema conditional:', schema);
    
    // Handle required fields
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((fieldName: string) => {
        console.log(`Making field required by schema conditional: ${fieldName}`);
        const field = this.element.querySelector(`[data-schema-path="${fieldName}"]`);
        if (field) {
          // Make field visible
          this.showFieldElement(field as HTMLElement);
          
          // Make inputs required
          const inputs = field.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            (input as HTMLElement).setAttribute('required', 'required');
          });
          
          // Show required markers
          const markers = field.querySelectorAll('.required-marker');
          markers.forEach(marker => {
            (marker as HTMLElement).style.display = 'inline';
          });
        }
      });
      
      // Hide sections not in required if they're part of a multi-section group
      if (schema.required.includes('personalSection') ||
          schema.required.includes('businessSection') ||
          schema.required.includes('nonprofitSection')) {
        
        // Get all section names
        const allSections = ['personalSection', 'businessSection', 'nonprofitSection'];
        
        // Hide sections not in required list
        allSections.forEach(sectionName => {
          if (!schema.required.includes(sectionName)) {
            const section = this.element.querySelector(`[data-schema-path="${sectionName}"]`);
            if (section) {
              this.hideFieldElement(section as HTMLElement);
            }
          }
        });
      }
    }
    
    // Handle specific properties
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        if (propName.startsWith('_')) {
          // Handle special properties
          if (propName === '_submitDisabled' && (propSchema as any).const === true) {
            const submitBtn = this.element.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.setAttribute('disabled', 'disabled');
            }
          }
        } else if (propName === 'businessSection' || propName === 'personalSection' || propName === 'nonprofitSection') {
          // Show the section if it's in the properties
          const section = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (section) {
            this.showFieldElement(section as HTMLElement);
            
            // For business section, we need to make the companyName and taxId required
            if (propName === 'businessSection' && propSchema && (propSchema as any).required) {
              const requiredFields = (propSchema as any).required;
              requiredFields.forEach((fieldName: string) => {
                const fieldId = `${propName}-${fieldName}`;
                const fieldInput = this.element.querySelector(`[name="field-${fieldId}"]`);
                if (fieldInput) {
                  (fieldInput as HTMLElement).setAttribute('required', 'required');
                  console.log(`Making nested field required: ${fieldId}`);
                }
              });
            }
            
            // Hide other sections
            const otherSections = ['personalSection', 'businessSection', 'nonprofitSection'].filter(s => s !== propName);
            otherSections.forEach(sectionName => {
              const otherSection = this.element.querySelector(`[data-schema-path="${sectionName}"]`);
              if (otherSection) {
                this.hideFieldElement(otherSection as HTMLElement);
              }
            });
          }
        } else if (propName === 'accountType' && (propSchema as any).const) {
          // When accountType is set, handle visibility of sections
          const accountType = (propSchema as any).const;
          
          if (accountType === 'business') {
            // Show business section and hide others
            const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
            if (businessSection) {
              this.showFieldElement(businessSection as HTMLElement);
              
              // Make companyName and taxId required
              const companyNameInput = this.element.querySelector('[name="field-businessSection-companyName"]');
              const taxIdInput = this.element.querySelector('[name="field-businessSection-taxId"]');
              
              if (companyNameInput) {
                (companyNameInput as HTMLElement).setAttribute('required', 'required');
              }
              
              if (taxIdInput) {
                (taxIdInput as HTMLElement).setAttribute('required', 'required');
              }
            }
            
            // Hide other sections
            const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
            const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
            
            if (personalSection) {
              this.hideFieldElement(personalSection as HTMLElement);
            }
            
            if (nonprofitSection) {
              this.hideFieldElement(nonprofitSection as HTMLElement);
            }
          } else if (accountType === 'personal') {
            // Show personal section and hide others
            const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
            if (personalSection) {
              this.showFieldElement(personalSection as HTMLElement);
            }
            
            // Hide other sections
            const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
            const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
            
            if (businessSection) {
              this.hideFieldElement(businessSection as HTMLElement);
            }
            
            if (nonprofitSection) {
              this.hideFieldElement(nonprofitSection as HTMLElement);
            }
          }
        } else if (propName === 'contactPreference' && (propSchema as any).const) {
          // When contactPreference is set, handle required fields
          const contactPref = (propSchema as any).const;
          
          if (contactPref === 'email') {
            // Make email required
            const emailInput = this.element.querySelector('[name="field-email"]');
            if (emailInput) {
              (emailInput as HTMLElement).setAttribute('required', 'required');
              
              // Show email field
              const emailField = this.element.querySelector('[data-schema-path="email"]');
              if (emailField) {
                this.showFieldElement(emailField as HTMLElement);
              }
            }
            
            // Make phone not required
            const phoneInput = this.element.querySelector('[name="field-phone"]');
            if (phoneInput) {
              (phoneInput as HTMLElement).removeAttribute('required');
            }
            
            // Hide mailing address
            const mailingAddressField = this.element.querySelector('[data-schema-path="mailingAddress"]');
            if (mailingAddressField) {
              this.hideFieldElement(mailingAddressField as HTMLElement);
            }
          }
        } else if (propName === 'phone' || propName === 'email' || propName === 'mailingAddress') {
          // Handle showing fields for specific contact preferences
          const field = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (field) {
            this.showFieldElement(field as HTMLElement);
          }
        } else {
          // Handle nested required fields for section objects
          if (propSchema && typeof propSchema === 'object' && (propSchema as any).required) {
            const requiredFields = (propSchema as any).required;
            requiredFields.forEach((fieldName: string) => {
              const fullPath = `${propName}-${fieldName}`;
              const field = this.element.querySelector(`[name="field-${fullPath}"]`);
              if (field) {
                (field as HTMLElement).setAttribute('required', 'required');
                console.log(`Making nested field required: ${fullPath}`);
              }
            });
          }
        }
      });
    }
  }
  
  private showFieldElement(element: HTMLElement, reason: string = 'Unknown'): void {
    // Remove hidden class
    element.classList.remove('hidden');
    
    // Find parent containers that might need to be shown
    const parentContainer = element.closest('[data-schema-path]');
    if (parentContainer && parentContainer !== element) {
      this.showFieldElement(parentContainer as HTMLElement, `Parent of ${element.getAttribute('data-schema-path')}`);
    }
    
    // Track visibility history
    const path = element.getAttribute('data-schema-path');
    if (path) {
      if (!this.fieldVisibilityHistory[path]) {
        this.fieldVisibilityHistory[path] = [];
      }
      
      this.fieldVisibilityHistory[path].push({
        action: 'show',
        reason,
        timestamp: Date.now()
      });
      
      // Emit event with path and reason
      this.emitter.emit('fieldShow', { field: path, reason });
    }
  }
  
  private hideFieldElement(element: HTMLElement, reason: string = 'Unknown'): void {
    // Add hidden class
    element.classList.add('hidden');
    
    // Track visibility history
    const path = element.getAttribute('data-schema-path');
    if (path) {
      if (!this.fieldVisibilityHistory[path]) {
        this.fieldVisibilityHistory[path] = [];
      }
      
      this.fieldVisibilityHistory[path].push({
        action: 'hide',
        reason,
        timestamp: Date.now()
      });
      
      // Emit event with path and reason
      this.emitter.emit('fieldHide', { field: path, reason });
    }
  }
  
  private handleArrayChange(event: CustomEvent): void {
    const { arrayId, container } = event.detail;
    if (!arrayId || !container) return;
    
    // Get the data from the array items
    const itemsData = getArrayItemsData(container);
    
    // Update the form data
    this.formData[arrayId] = itemsData;
    
    // Evaluate conditions that might depend on this field
    this.evaluateAllConditions();
    
    // Emit change event
    console.log(`Array change event for ${arrayId}`, itemsData);
    this.emitter.emit('change', {
      field: arrayId,
      value: itemsData,
      formData: { ...this.formData }
    });
    
    // Call onChange callback if provided
    if (this.options.onChange) {
      this.options.onChange({ ...this.formData });
    }
  }
  
  /**
   * Public methods
   */
  
  public on<K extends keyof FormEvents>(type: K, handler: (e: FormEvents[K]) => void): void {
    this.emitter.on(type, handler as any);
  }
  
  public off<K extends keyof FormEvents>(type: K, handler: (e: FormEvents[K]) => void): void {
    this.emitter.off(type, handler as any);
  }
  
  public getData(): Record<string, any> {
    return { ...this.formData };
  }
  
  public setData(data: Record<string, any>): void {
    this.formData = { ...data };
    this.updateFormFields();
    this.evaluateAllConditions();
  }
  
  private updateFormFields(): void {
    if (!this.formElement) return;
    
    // Process flat keys
    this.processFormData(this.formData);
  }
  
  private processFormData(data: Record<string, any>, prefix = ''): void {
    Object.entries(data).forEach(([key, value]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      // If the value is an object (but not array or null), process it recursively
      if (value && typeof value === 'object' && !Array.isArray(value) && value !== null) {
        this.processFormData(value, fieldName);
      } else {
        // Set value to the form element
        const input = this.formElement!.querySelector(`[name="${fieldName}"]`) as 
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        
        if (!input) return;
        
        if (input.type === 'checkbox') {
          (input as HTMLInputElement).checked = !!value;
        } else if (input.type === 'radio') {
          const radio = this.formElement!.querySelector(`[name="${fieldName}"][value="${value}"]`) as HTMLInputElement | null;
          if (radio) {
            radio.checked = true;
          }
        } else {
          input.value = value;
        }
      }
    });
  }
  
  public validate(): boolean {
    // Simplified validation
    // A real implementation would need a JSON Schema validator
    if (this.formElement) {
      return this.formElement.checkValidity();
    }
    return true;
  }
  
  /**
   * Reset the form to its initial state
   */
  public reset(): void {
    // Reset form data
    this.formData = this.options.defaultData ? { ...this.options.defaultData } : {};
    
    // Reset form element if available
    if (this.formElement) {
      this.formElement.reset();
    }
    
    // Re-evaluate conditions
    this.evaluateAllConditions();
    
    // Update form fields with the reset data
    this.updateFormFields();
    
    // Emit reset event
    console.log('Form reset', this.formData);
    this.emitter.emit('reset', { formData: { ...this.formData } });
  }
  
  public submit(): void {
    if (this.formElement) {
      this.formElement.requestSubmit();
    }
  }
  
  // Add a method to help debugging
  public debugEmitter(): void {
    console.log('Event emitter:', this.emitter);
    const eventTypes = ['ready', 'change', 'submit', 'error', 'fieldShow', 'fieldHide', 'reset'];
    
    eventTypes.forEach(type => {
      const listeners = (this.emitter as any).all.get(type);
      console.log(`Event type [${type}] has ${listeners ? listeners.length : 0} listeners`);
    });
  }
  
  // Method to manually trigger an event (useful for debugging)
  public triggerEvent(type: string, data: any = {}): void {
    console.log(`Manually triggering event: ${type}`, data);
    (this.emitter as any).emit(type, data);
  }
  
  /**
   * Get the current form data
   */
  public getFormData(): Record<string, any> {
    return { ...this.formData };
  }

  private evaluateConditions(): void {
    // Check if schema has conditionals
    if (!this.schema || !this.schema.conditionals || !Array.isArray(this.schema.conditionals)) {
      return;
    }

    // Loop through conditionals and evaluate each one
    for (const condition of this.schema.conditionals) {
      if (condition.if && condition.then) {
        const ifCondition = condition.if;
        const thenAction = condition.then;
        
        // Check if the IF condition matches current form data
        const isConditionMet = this.evaluateIfCondition(ifCondition);
        
        // Apply the THEN actions if condition is met
        if (isConditionMet) {
          this.applyThenAction(thenAction);
        } else if (condition.else) {
          // Apply ELSE actions if condition is not met and there's an else clause
          this.applyThenAction(condition.else);
        }
      }
    }
  }

  private evaluateIfCondition(ifCondition: any): boolean {
    // If the if condition has properties, check each property
    if (ifCondition.properties) {
      for (const [propName, _propCondition] of Object.entries(ifCondition.properties)) {
        const formValue = this.getFormValue(propName);
        const propCondition = _propCondition as any;

        // Check enum condition
        if (propCondition.enum && Array.isArray(propCondition.enum)) {
          if (!propCondition.enum.includes(formValue)) {
            return false;
          }
        }
        
        // Check const condition
        if ('const' in propCondition && formValue !== propCondition.const) {
          return false;
        }
      }
      
      // All conditions matched
      return true;
    }
    
    return false;
  }

  private getFormValue(path: string): any {
    const parts = path.split('.');
    let value = this.formData;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  private applyThenAction(thenAction: any): void {
    // Handle required fields
    if (thenAction.required && Array.isArray(thenAction.required)) {
      thenAction.required.forEach((fieldPath: string) => {
        const element = this.element.querySelector(`[data-schema-path="${fieldPath}"]`);
        if (element) {
          // Show the field
          element.classList.remove('hidden');
          // Mark inputs as required
          const inputs = element.querySelectorAll('input, select, textarea');
          inputs.forEach((input: Element, index, parent) => {
            (input as HTMLInputElement).setAttribute('required', 'required');
          });
        }
      });
    }
    
    // Handle hidden fields - implied by not being in the required array
    if (thenAction.required && Array.isArray(thenAction.required) && this.schema?.properties) {
      // Hide elements that aren't in the required array
      for (const propName of Object.keys(this.schema.properties)) {
        if (!thenAction.required.includes(propName)) {
          const element = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (element) {
            this.hideField(propName, element);
          }
        }
      }
    }
    
    // Handle specific properties actions (like showing/hiding specific fields)
    if (thenAction.properties) {
      for (const [propName, _propAction] of Object.entries(thenAction.properties)) {
        const propAction = _propAction as any;
        if (propName.startsWith('_')) {
          // Handle special properties (like _submitDisabled)
          this.handleSpecialProperty(propName, propAction);
        } else {
          // Handle regular property actions
          const element = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (element) {
            // If the property has a const:true, show the field
            if (propAction.const === true) {
              element.classList.remove('hidden');
              this.emitter.emit('fieldShow', { field: propName });
            } 
            // If the property has a const:false, hide the field
            else if (propAction.const === false) {
              this.hideField(propName, element);
            }
          }
        }
      }
    }
  }

  private hideField(fieldId: string, element: Element, reason: string = 'Unknown'): void {
    element.classList.add('hidden');
    
    // Make inputs not required
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach((input: Element) => {
      (input as HTMLElement).removeAttribute('required');
    });
    
    // Track in visibility history and emit event
    if (!this.fieldVisibilityHistory[fieldId]) {
      this.fieldVisibilityHistory[fieldId] = [];
    }
    
    this.fieldVisibilityHistory[fieldId].push({
      action: 'hide',
      reason,
      timestamp: Date.now()
    });
    
    this.emitter.emit('fieldHide', { field: fieldId, reason });
  }

  private handleSpecialProperty(propName: string, propAction: any): void {
    if (propName === '_submitDisabled') {
      const submitButton = this.formElement?.querySelector('[type="submit"]');
      if (submitButton && propAction.const === true) {
        (submitButton as HTMLButtonElement).disabled = true;
      } else if (submitButton) {
        (submitButton as HTMLButtonElement).disabled = false;
      }
    }
  }

  private evaluateConditional(conditional: any, index: number): void {
    if (!conditional.if || !conditional.then) return;
    
    const ifConditionMet = this.evaluateCondition(conditional.if);
    console.log(`Conditional ${index} evaluated: ${ifConditionMet ? 'TRUE' : 'FALSE'}`, conditional);
    
    if (ifConditionMet) {
      this.applyConditional(conditional.then, `Condition ${index} IF matched`);
    } else if (conditional.else) {
      this.applyConditional(conditional.else, `Condition ${index} ELSE applied`);
    }
  }

  private evaluateCondition(condition: any): boolean {
    // Check properties conditions
    if (condition.properties) {
      return Object.entries(condition.properties).every(([propName, propCondition]) => {
        // Get the field value, handling nested properties
        const fieldValue = this.getNestedValue(this.formData, propName);
        
        console.log(`Evaluating condition for ${propName}:`, { 
          fieldValue, 
          condition: propCondition,
          formData: this.formData 
        });
        
        // Check enum condition
        if ((propCondition as any).enum) {
          const result = (propCondition as any).enum.includes(fieldValue);
          console.log(`  - Enum check: ${result} (${fieldValue} in [${(propCondition as any).enum}])`);
          return result;
        }
        
        // Check const condition
        if ((propCondition as any).const !== undefined) {
          const result = fieldValue === (propCondition as any).const;
          console.log(`  - Const check: ${result} (${fieldValue} === ${(propCondition as any).const})`);
          return result;
        }
        
        return true;
      });
    }
    
    return true;
  }

  private applyConditional(schema: any, reason: string = 'Unknown'): void {
    console.log(`Applying conditional: ${reason}`, schema);
    
    // Apply required fields
    if (schema.required) {
      schema.required.forEach((fieldName: string) => {
        console.log(`Making field required: ${fieldName}`);
        const field = this.element.querySelector(`[data-schema-path="${fieldName}"]`);
        if (field) {
          // Make fields required
          const inputs = field.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            input.setAttribute('required', 'required');
          });
          
          // Show required marker
          const markers = field.querySelectorAll('.required-marker');
          markers.forEach(marker => {
            (marker as HTMLElement).style.display = 'inline';
          });
          
          // Ensure the field is visible with reason
          this.showFieldElement(field as HTMLElement, `Required by condition: ${reason}`);
        } else {
          console.log(`Required field not found: ${fieldName}`);
        }
      });
    }
    
    // Show/hide fields based on property rules
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        if (propName.startsWith('_')) {
          // Handle special property for disabling submit button
          if (propName === '_submitDisabled' && (propSchema as any).const === true) {
            const submitBtn = this.element.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.setAttribute('disabled', 'disabled');
            }
          }
        } else {
          const field = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (field) {
            console.log(`Showing field: ${propName}`);
            this.showFieldElement(field as HTMLElement, `Property in schema condition: ${reason}`);
          } else {
            console.log(`Field not found for path: ${propName}`);
          }
        }
      });
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  // New method to initialize form data from existing fields
  private initializeFormDataFromFields(): void {
    if (!this.formElement) return;
    
    console.log('Initializing form data from fields');
    
    // Find all input elements in the form
    const inputs = this.formElement.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      
      // Get the field ID based on attributes or name
      const schemaElement = element.closest('[data-schema-id], [data-schema-path]');
      const fieldId = schemaElement?.getAttribute('data-schema-id') || 
                     schemaElement?.getAttribute('data-schema-path') || 
                     element.name;
      
      if (fieldId) {
        // Initialize form data with empty values
        this.updateFormDataFromField(fieldId, element);
      }
    });
    
    console.log('Initial form data:', this.formData);
    
    // Make sure we call onChange with the initial data
    if (this.options.onChange) {
      this.options.onChange(this.getFormData());
    }
  }

  // Public method to get field visibility history
  public getFieldVisibilityHistory(): Record<string, any> {
    return { ...this.fieldVisibilityHistory };
  }

  /**
   * Returns detailed information about all fields including visibility state
   */
  public getFieldVisibilityReport(): Record<string, any> {
    if (!this.element) return {};
    
    const fields = this.element.querySelectorAll('[data-schema-path]');
    const report: Record<string, any> = {};
    
    fields.forEach(field => {
      const path = field.getAttribute('data-schema-path');
      if (!path) return;
      
      const isVisible = !field.classList.contains('hidden');
      const inputs = field.querySelectorAll('input, select, textarea');
      const inputDetails = Array.from(inputs).map(input => ({
        name: (input as HTMLInputElement).name,
        type: (input as HTMLInputElement).type,
        value: (input as HTMLInputElement).value,
        required: input.hasAttribute('required')
      }));
      
      // Get the most recent history entry for this field
      const history = this.fieldVisibilityHistory[path] || [];
      const lastAction = history.length > 0 ? history[history.length - 1] : undefined;
      
      report[path] = {
        visible: isVisible,
        lastAction,
        history: history.slice(-5), // Get the 5 most recent actions
        inputs: inputDetails.length > 0 ? inputDetails : undefined
      };
    });
    
    return report;
  }
}

/**
 * Factory function to create a new SchemaForm instance.
 * @param element The element or selector to attach the form to
 * @param options Form configuration options
 * @returns A new SchemaForm instance
 */
export function createSchemaForm(
  element: HTMLElement | string, 
  options: FormOptions
): SchemaForm {
  const form = new SchemaForm(element, options);
  // Don't call init() again - it's already called in the constructor
  return form;
}

// Export the setupArrayHandlers and getArrayItemsData functions from array-handler
export { setupArrayHandlers, getArrayItemsData } from './array-handler';