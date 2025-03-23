/**
 * Test configuration for the playground functionality
 */

const path = require('path');

module.exports = {
  // Base paths for the playground
  paths: {
    // Path for storing schemas
    schemas: path.join(__dirname, '../../examples/schemas'),
    
    // Path for storing generated templates
    templates: path.join(__dirname, '../../examples/generated-templates'),
    
    // Path to the default schema template
    defaultSchema: path.join(__dirname, '../../examples/schemas/simple-form.json')
  },
  
  // Sample schemas for testing
  sampleSchemas: {
    // Simple user form schema
    simpleForm: {
      title: 'Simple User Form',
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
        },
        age: {
          type: 'integer',
          title: 'Age',
          minimum: 18
        }
      },
      required: ['name', 'email']
    },
    
    // Registration form with array tables
    registrationWithArray: {
      title: 'Registration with Array Tables',
      type: 'object',
      properties: {
        personalInfo: {
          type: 'object',
          title: 'Personal Information',
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
              title: 'Email',
              format: 'email'
            }
          },
          required: ['firstName', 'lastName', 'email']
        },
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
                title: 'Year',
                minimum: 1970,
                maximum: new Date().getFullYear()
              }
            }
          }
        },
        skills: {
          type: 'array',
          title: 'Skills',
          items: {
            type: 'string'
          }
        }
      }
    },
    
    // Tabbed form layout
    tabbedForm: {
      title: 'Tabbed Form Layout',
      type: 'object',
      properties: {
        personalInfo: {
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
            gender: {
              type: 'string',
              title: 'Gender',
              enum: ['male', 'female', 'other']
            }
          }
        },
        contactInfo: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              title: 'Email',
              format: 'email'
            },
            phone: {
              type: 'string',
              title: 'Phone Number'
            },
            address: {
              type: 'string',
              title: 'Address'
            }
          }
        }
      }
    },
    
    // Sample layout definitions
    layouts: {
      // Layout for tabbed form
      tabbedForm: {
        form: [
          {
            type: 'tabs',
            tabs: [
              {
                title: 'Personal Information',
                items: ['personalInfo']
              },
              {
                title: 'Contact Information',
                items: ['contactInfo']
              }
            ]
          }
        ]
      },
      
      // Layout for wizard form
      wizardForm: {
        form: [
          {
            type: 'wizard',
            steps: [
              {
                title: 'Personal Information',
                items: ['personalInfo']
              },
              {
                title: 'Contact Information',
                items: ['contactInfo']
              },
              {
                title: 'Education',
                items: ['education']
              },
              {
                title: 'Skills',
                items: ['skills']
              }
            ]
          }
        ]
      }
    }
  }
}; 