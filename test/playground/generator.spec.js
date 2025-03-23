const { expect } = require('chai');
const { generateTemplate } = require('../../src/playground/generator');

describe('Template Generator', () => {
  it('should generate a basic form template from a simple schema', () => {
    const schema = {
      title: 'Simple Form',
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          description: 'Your full name'
        },
        email: {
          type: 'string',
          title: 'Email',
          format: 'email'
        }
      },
      required: ['name', 'email']
    };
    
    const template = generateTemplate(schema);
    
    // Check basic structure
    expect(template).to.include('<form');
    expect(template).to.include('</form>');
    
    // Check field rendering
    expect(template).to.include('Name');
    expect(template).to.include('Email');
    expect(template).to.include('Your full name');
    
    // Check required field indicators
    expect(template).to.include('required');
    
    // Check input types
    expect(template).to.include('type="text"');
    expect(template).to.include('type="email"');
  });
  
  it('should generate a form with nested objects', () => {
    const schema = {
      title: 'Nested Form',
      type: 'object',
      properties: {
        person: {
          type: 'object',
          title: 'Person Information',
          properties: {
            name: {
              type: 'string',
              title: 'Name'
            },
            age: {
              type: 'integer',
              title: 'Age'
            }
          }
        }
      }
    };
    
    const template = generateTemplate(schema);
    
    // Check nested structure
    expect(template).to.include('Person Information');
    expect(template).to.include('Name');
    expect(template).to.include('Age');
    
    // Check input for nested fields
    expect(template).to.include('name="person.name"');
    expect(template).to.include('name="person.age"');
  });
  
  it('should generate a form with array fields', () => {
    const schema = {
      title: 'Array Form',
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          title: 'Tags',
          items: {
            type: 'string'
          }
        }
      }
    };
    
    const template = generateTemplate(schema);
    
    // Check array structure
    expect(template).to.include('Tags');
    expect(template).to.include('data-array-name="tags"');
    expect(template).to.include('string-array-container');
    expect(template).to.include('Add Item');
  });
  
  it('should generate a form with complex array items', () => {
    const schema = {
      title: 'Education History',
      type: 'object',
      properties: {
        education: {
          type: 'array',
          title: 'Education',
          items: {
            type: 'object',
            properties: {
              institution: {
                type: 'string',
                title: 'Institution'
              },
              degree: {
                type: 'string',
                title: 'Degree'
              },
              year: {
                type: 'integer',
                title: 'Year'
              }
            }
          }
        }
      }
    };
    
    const template = generateTemplate(schema);
    
    // Check array table structure
    expect(template).to.include('Education');
    expect(template).to.include('data-array-name="education"');
    expect(template).to.include('array-table-container');
    
    // Check array item fields
    expect(template).to.include('Institution');
    expect(template).to.include('Degree');
    expect(template).to.include('Year');
    
    // Check array item modal
    expect(template).to.include('modal-form');
    expect(template).to.include('data-array-item-modal');
  });
  
  it('should generate a form with select fields from enum', () => {
    const schema = {
      title: 'Select Form',
      type: 'object',
      properties: {
        color: {
          type: 'string',
          title: 'Favorite Color',
          enum: ['red', 'green', 'blue']
        }
      }
    };
    
    const template = generateTemplate(schema);
    
    // Check select structure
    expect(template).to.include('Favorite Color');
    expect(template).to.include('<select');
    expect(template).to.include('</select>');
    
    // Check options
    expect(template).to.include('<option value="red">red</option>');
    expect(template).to.include('<option value="green">green</option>');
    expect(template).to.include('<option value="blue">blue</option>');
  });
  
  it('should generate a form with radio buttons from enum when specified', () => {
    const schema = {
      title: 'Radio Form',
      type: 'object',
      properties: {
        gender: {
          type: 'string',
          title: 'Gender',
          enum: ['male', 'female', 'other']
        }
      }
    };
    
    const options = {
      layout: {
        gender: {
          widget: 'radio'
        }
      }
    };
    
    const template = generateTemplate(schema, options);
    
    // Check radio button structure
    expect(template).to.include('Gender');
    expect(template).to.include('type="radio"');
    expect(template).to.include('male');
    expect(template).to.include('female');
    expect(template).to.include('other');
  });
  
  it('should generate a form with custom layout order', () => {
    const schema = {
      title: 'Custom Layout',
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          title: 'First Name'
        },
        lastName: {
          type: 'string',
          title: 'Last Name'
        },
        email: {
          type: 'string',
          title: 'Email'
        }
      }
    };
    
    const options = {
      layout: {
        form: [
          'email',
          'lastName',
          'firstName'
        ]
      }
    };
    
    const template = generateTemplate(schema, options);
    
    // Check order in generated HTML
    const emailIndex = template.indexOf('Email');
    const lastNameIndex = template.indexOf('Last Name');
    const firstNameIndex = template.indexOf('First Name');
    
    expect(emailIndex).to.be.lessThan(lastNameIndex);
    expect(lastNameIndex).to.be.lessThan(firstNameIndex);
  });
  
  it('should generate a tabbed layout when specified', () => {
    const schema = {
      title: 'Tabbed Form',
      type: 'object',
      properties: {
        personal: {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Name' }
          }
        },
        contact: {
          type: 'object',
          properties: {
            email: { type: 'string', title: 'Email' }
          }
        }
      }
    };
    
    const options = {
      layout: {
        form: [
          {
            type: 'tabs',
            tabs: [
              {
                title: 'Personal',
                items: ['personal']
              },
              {
                title: 'Contact',
                items: ['contact']
              }
            ]
          }
        ]
      }
    };
    
    const template = generateTemplate(schema, options);
    
    // Check tabs structure
    expect(template).to.include('tabs-container');
    expect(template).to.include('tab-content');
    expect(template).to.include('Personal');
    expect(template).to.include('Contact');
  });
  
  it('should generate wizard layout when specified', () => {
    const schema = {
      title: 'Wizard Form',
      type: 'object',
      properties: {
        step1: {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Name' }
          }
        },
        step2: {
          type: 'object',
          properties: {
            email: { type: 'string', title: 'Email' }
          }
        }
      }
    };
    
    const options = {
      layout: {
        form: [
          {
            type: 'wizard',
            steps: [
              {
                title: 'Step 1',
                items: ['step1']
              },
              {
                title: 'Step 2',
                items: ['step2']
              }
            ]
          }
        ]
      }
    };
    
    const template = generateTemplate(schema, options);
    
    // Check wizard structure
    expect(template).to.include('wizard-container');
    expect(template).to.include('wizard-step');
    expect(template).to.include('Step 1');
    expect(template).to.include('Step 2');
    expect(template).to.include('wizard-nav');
    expect(template).to.include('Next');
    expect(template).to.include('Previous');
  });
}); 