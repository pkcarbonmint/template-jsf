

// Monaco Editor instances
let schemaEditor = null;
let layoutEditor = null;

// Current schema and layout
let currentSchema = null;
let currentLayout = null;
let currentTemplate = null;
let formData = {};

// DOM Elements
const schemaSelect = document.getElementById('schema-select');
const newSchemaBtn = document.getElementById('new-schema');
const saveSchemaBtn = document.getElementById('save-schema');
const saveLayoutBtn = document.getElementById('save-layout');
const submitFormBtn = document.getElementById('submit-form');
const formContainer = document.getElementById('form-container');
const templateCode = document.getElementById('template-code');
const formDataDisplay = document.getElementById('form-data');

// Initialize the app
async function init() {
  // Initialize Monaco Editor
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });
  
  require(['vs/editor/editor.main'], () => {
    // Create schema editor
    schemaEditor = monaco.editor.create(document.getElementById('schema-editor'), {
      value: '{\n  "type": "object",\n  "properties": {}\n}',
      language: 'json',
      theme: 'vs',
      automaticLayout: true,
      minimap: { enabled: false }
    });
    
    // Create layout editor
    layoutEditor = monaco.editor.create(document.getElementById('layout-editor'), {
      value: '{\n  "layout": "vertical",\n  "order": []\n}',
      language: 'json',
      theme: 'vs',
      automaticLayout: true,
      minimap: { enabled: false }
    });
    
    // Set up editor change events
    schemaEditor.onDidChangeModelContent(debounce(handleSchemaChange, 500));
    layoutEditor.onDidChangeModelContent(debounce(handleLayoutChange, 500));
  });
  
  // Load available schemas
  await loadSchemas();
  
  // Set up event listeners
  schemaSelect.addEventListener('change', handleSchemaSelect);
  newSchemaBtn.addEventListener('click', handleNewSchema);
  saveSchemaBtn.addEventListener('click', handleSaveSchema);
  saveLayoutBtn.addEventListener('click', handleSaveLayout);
  submitFormBtn.addEventListener('click', handleFormSubmit);
  
  // Set up tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const tabId = button.dataset.tab;
      document.getElementById(`${tabId}-preview`).classList.add('active');
    });
  });
}

// Load available schemas from API
async function loadSchemas() {
  try {
    const response = await fetch('/api/schemas');
    const schemaTable = await response.json();
    
    // Clear existing options
    while (schemaSelect.options.length > 1) {
      schemaSelect.remove(1);
    }
    
    console.log("schemas from the serer", schemaTable);
    Object.keys(schemaTable).forEach((name) => {
      const schema = schemaTable[name];
      console.log(name, schema);
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      schemaSelect.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading schemas:', error);
  }
}

// Handle schema selection
async function handleSchemaSelect() {
  const schemaId = schemaSelect.value;
  if (!schemaId) return;
  
  try {
    const response = await fetch(`/api/schemas/${schemaId}`);
    const data = await response.json();
    
    currentSchema = data.schema;
    schemaEditor.setValue(JSON.stringify(currentSchema, null, 2));
    // Get layout for this schema
    await loadLayout(schemaId);
  } catch (error) {
    console.error('Error loading schema:', error);
  }
}

// Load layout for a schema
async function loadLayout(schemaId) {
  try {
    const response = await fetch(`/api/layouts/${schemaId}`);
    
    if (response.ok) {
      const data = await response.json();
      currentLayout = data.layout;
    } else {
      // Generate layout if not found
      const generatedResponse = await fetch('/api/generate-layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schema: currentSchema })
      });
      
      const data = await generatedResponse.json();
      currentLayout = data.layout;
    }
    
    layoutEditor.setValue(JSON.stringify(currentLayout, null, 2));
    
    // Generate template with the schema and layout
    await generateTemplate();
  } catch (error) {
    console.error('Error loading layout:', error);
  }
}

// Generate HTML template
async function generateTemplate() {
  if (!currentSchema || !currentLayout) return;
  
  try {
    const response = await fetch('/api/generate-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        schema: currentSchema,
        layout: currentLayout
      })
    });
    
    const data = await response.json();
    currentTemplate = data.template;
    
    // Update template display
    templateCode.textContent = currentTemplate;
    
    // Update form preview
    formContainer.innerHTML = currentTemplate;
    
    // Initialize form if it has a schema-form class
    const formElement = formContainer.querySelector('.schema-form');
    if (formElement && window.SchemaForm) {
      const schemaForm = new window.SchemaForm(formElement, {
        validateOnSubmit: true,
        showErrors: true
      });
      
      // Listen for form changes
      schemaForm.on('change', (data) => {
        formData = data;
        formDataDisplay.textContent = JSON.stringify(formData, null, 2);
      });
    }
  } catch (error) {
    console.error('Error generating template:', error);
  }
}

// Handle schema editor changes
function handleSchemaChange() {
  try {
    const schemaValue = schemaEditor.getValue();
    currentSchema = JSON.parse(schemaValue);
    
    // Auto-generate layout based on schema changes
    fetch('/api/generate-layout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ schema: currentSchema })
    })
    .then(response => response.json())
    .then(data => {
      currentLayout = data.layout;
      layoutEditor.setValue(JSON.stringify(currentLayout, null, 2));
      
      // Generate template with the updated schema and layout
      generateTemplate();
    })
    .catch(error => {
      console.error('Error generating layout:', error);
    });
  } catch (error) {
    console.error('Error parsing schema JSON:', error);
  }
}

// Handle layout editor changes
function handleLayoutChange() {
  try {
    const layoutValue = layoutEditor.getValue();
    currentLayout = JSON.parse(layoutValue);
    
    // Generate template with the updated layout
    generateTemplate();
  } catch (error) {
    console.error('Error parsing layout JSON:', error);
  }
}

// Handle new schema button click
function handleNewSchema() {
  currentSchema = {
    id: `schema_${Date.now()}`,
    type: 'object',
    title: 'New Schema',
    properties: {}
  };
  
  schemaEditor.setValue(JSON.stringify(currentSchema, null, 2));
  
  // Generate a new layout
  fetch('/api/generate-layout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ schema: currentSchema })
  })
  .then(response => response.json())
  .then(data => {
    currentLayout = data.layout;
    layoutEditor.setValue(JSON.stringify(currentLayout, null, 2));
    
    // Generate template with the new schema and layout
    generateTemplate();
  })
  .catch(error => {
    console.error('Error generating layout:', error);
  });
}

// Handle save schema button click
async function handleSaveSchema() {
  if (!currentSchema || !currentSchema.id) {
    alert('No schema selected or schema has no ID');
    return;
  }
  
  try {
    const response = await fetch(`/api/schemas/${currentSchema.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ schema: currentSchema })
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Schema saved successfully');
      
      // Reload schemas to ensure the new one appears in the list
      await loadSchemas();
    } else {
      alert('Failed to save schema');
    }
  } catch (error) {
    console.error('Error saving schema:', error);
    alert(`Error saving schema: ${error.message}`);
  }
}

// Handle save layout button click
async function handleSaveLayout() {
  if (!currentSchema || !currentSchema.id || !currentLayout) {
    alert('No schema or layout selected');
    return;
  }
  
  try {
    const response = await fetch(`/api/layouts/${currentSchema.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ layout: currentLayout })
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Layout saved successfully');
    } else {
      alert('Failed to save layout');
    }
  } catch (error) {
    console.error('Error saving layout:', error);
    alert(`Error saving layout: ${error.message}`);
  }
}

// Handle form submit button click
function handleFormSubmit() {
  if (Object.keys(formData).length === 0) {
    alert('No form data to submit');
    return;
  }
  
  // Display form data
  formDataDisplay.textContent = JSON.stringify(formData, null, 2);
  
  // Switch to data tab
  const dataTabButton = document.querySelector('.tab-button[data-tab="data"]');
  dataTabButton.click();
  
  alert('Form submitted successfully');
}

// Utility function to debounce function calls
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 