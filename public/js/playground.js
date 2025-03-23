/**
 * JSON Schema Form Playground
 * Client-side JavaScript for interacting with the playground UI
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize CodeMirror editors
  const schemaEditor = CodeMirror.fromTextArea(
    document.getElementById('schema-editor'),
    {
      mode: { name: 'javascript', json: true },
      theme: 'monokai',
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      tabSize: 2,
      gutters: ['CodeMirror-lint-markers'],
      lint: { json: true }
    }
  );

  const layoutEditor = CodeMirror.fromTextArea(
    document.getElementById('layout-editor'),
    {
      mode: { name: 'javascript', json: true },
      theme: 'monokai',
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      tabSize: 2,
      gutters: ['CodeMirror-lint-markers'],
      lint: { json: true }
    }
  );

  // DOM elements
  const schemaSelect = document.getElementById('schema-select');
  const templatePreview = document.getElementById('template-preview');
  const saveSchemaBtn = document.getElementById('save-schema-btn');
  const newSchemaBtn = document.getElementById('new-schema-btn');
  const refreshPreviewBtn = document.getElementById('refresh-preview-btn');
  const formatSchemaBtn = document.getElementById('format-schema-btn');
  const formatLayoutBtn = document.getElementById('format-layout-btn');
  
  // State variables
  let currentSchema = '';
  let schemas = [];
  let previewUpdateTimeout = null;

  // Initialize the playground
  loadSchemaList();
  setupEventListeners();

  /**
   * Set up event listeners for UI elements
   */
  function setupEventListeners() {
    // Schema selection
    schemaSelect.addEventListener('change', () => {
      const selectedSchema = schemaSelect.value;
      if (selectedSchema) {
        loadSchema(selectedSchema);
      } else {
        clearEditors();
      }
    });
    
    // Save schema
    saveSchemaBtn.addEventListener('click', saveSchema);
    
    // New schema
    newSchemaBtn.addEventListener('click', createNewSchema);
    
    // Refresh preview
    refreshPreviewBtn.addEventListener('click', updateTemplatePreview);
    
    // Format buttons
    formatSchemaBtn.addEventListener('click', () => formatEditor(schemaEditor));
    formatLayoutBtn.addEventListener('click', () => formatEditor(layoutEditor));

    // Set up change events for both editors
    schemaEditor.on('change', debouncePreviewUpdate);
    layoutEditor.on('change', debouncePreviewUpdate);
  }
  
  /**
   * Load the list of available schemas
   */
  async function loadSchemaList() {
    try {
      const response = await fetch('/api/schemas');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      schemas = await response.json();
      
      // Clear existing options
      while (schemaSelect.options.length > 1) {
        schemaSelect.remove(1);
      }
      
      // Add schema options
      schemas.forEach(schema => {
        const option = document.createElement('option');
        option.value = schema.name;
        option.textContent = schema.displayName || schema.name;
        schemaSelect.appendChild(option);
      });
      
      // Load first schema if available
      if (schemas.length > 0) {
        schemaSelect.value = schemas[0].name;
        loadSchema(schemas[0].name);
      }
    } catch (error) {
      console.error('Error loading schema list:', error);
      showNotification('error', 'Failed to load schema list. Please try refreshing the page.');
    }
  }
  
  /**
   * Load a specific schema by name
   */
  async function loadSchema(name) {
    try {
      const response = await fetch(`/api/schemas/${name}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set current schema
      currentSchema = name;
      
      // Update editors
      if (data.schema) {
        schemaEditor.setValue(JSON.stringify(data.schema, null, 2));
      } else {
        schemaEditor.setValue('{\n  "type": "object",\n  "properties": {}\n}');
      }
      
      if (data.layout) {
        layoutEditor.setValue(JSON.stringify(data.layout, null, 2));
      } else {
        layoutEditor.setValue('{\n  "form": []\n}');
      }
      
      // Update preview
      updateTemplatePreview();
    } catch (error) {
      console.error(`Error loading schema ${name}:`, error);
      showNotification('error', `Failed to load schema "${name}".`);
    }
  }
  
  /**
   * Save the current schema
   */
  async function saveSchema() {
    if (!currentSchema) {
      showNotification('error', 'No schema selected. Please select or create a schema first.');
      return;
    }
    
    try {
      // Parse schema and layout to validate JSON
      let schema;
      let layout;
      
      try {
        schema = JSON.parse(schemaEditor.getValue() || '{}');
        
        const layoutValue = layoutEditor.getValue();
        if (layoutValue && layoutValue.trim() !== '') {
          layout = JSON.parse(layoutValue);
        }
      } catch (error) {
        showNotification('error', 'Invalid JSON in schema or layout. Please check for syntax errors.');
        return;
      }
      
      // Send to API
      const response = await fetch(`/api/schemas/${currentSchema}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schema, layout })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Show success message
      showNotification('success', `Schema "${currentSchema}" saved successfully.`);
      
      // Refresh schema list
      loadSchemaList();
    } catch (error) {
      console.error('Error saving schema:', error);
      showNotification('error', 'Failed to save schema.');
    }
  }
  
  /**
   * Create a new schema
   */
  async function createNewSchema() {
    // Prompt for name
    const name = prompt('Enter a name for the new schema:');
    
    if (!name) {
      return; // User canceled
    }
    
    try {
      // Create new schema
      const response = await fetch('/api/schemas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Refresh schema list
      await loadSchemaList();
      
      // Select the new schema
      schemaSelect.value = name;
      loadSchema(name);
      
      // Show success message
      showNotification('success', `New schema "${name}" created successfully.`);
    } catch (error) {
      console.error('Error creating new schema:', error);
      showNotification('error', 'Failed to create new schema.');
    }
  }
  
  /**
   * Update the template preview
   */
  async function updateTemplatePreview() {
    try {
      // Parse schema and layout
      let schema;
      let layout;
      
      try {
        schema = JSON.parse(schemaEditor.getValue() || '{}');
        
        const layoutValue = layoutEditor.getValue();
        if (layoutValue && layoutValue.trim() !== '') {
          layout = JSON.parse(layoutValue);
        }
      } catch (error) {
        console.error('Invalid JSON:', error);
        templatePreview.innerHTML = `<div class="error-message">Invalid JSON: ${error}</div>`;
        return;
      }
      
      // Show loading state
      templatePreview.innerHTML = '<div class="loading">Generating template...</div>';
      
      // Generate template
      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schema, layout })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update preview
      templatePreview.innerHTML = result.template;
      
      // Initialize any scripts that might be in the template
      const scripts = templatePreview.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        templatePreview.appendChild(newScript);
        script.remove();
      });
    } catch (error) {
      console.error('Error updating template preview:', error);
      templatePreview.innerHTML = `<div class="error-message">Error generating template: ${error}</div>`;
    }
  }
  
  /**
   * Debounce preview updates to avoid too many requests during typing
   */
  function debouncePreviewUpdate() {
    if (previewUpdateTimeout) {
      window.clearTimeout(previewUpdateTimeout);
    }
    
    previewUpdateTimeout = window.setTimeout(() => {
      updateTemplatePreview();
      previewUpdateTimeout = null;
    }, 500); // 500ms debounce
  }
  
  /**
   * Format JSON in an editor
   */
  function formatEditor(editor) {
    try {
      const value = editor.getValue();
      const formatted = JSON.stringify(JSON.parse(value), null, 2);
      editor.setValue(formatted);
    } catch (error) {
      console.error('Error formatting JSON:', error);
      showNotification('error', 'Invalid JSON. Unable to format.');
    }
  }
  
  /**
   * Clear both editors
   */
  function clearEditors() {
    schemaEditor.setValue('');
    layoutEditor.setValue('');
    
    templatePreview.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>Select a schema to preview</h3>
        <p>Edit the schema or layout and see the changes in real-time.</p>
      </div>
    `;
    
    currentSchema = '';
  }
  
  /**
   * Show a notification message
   */
  function showNotification(type, message) {
    // For simplicity, we'll just use alert for now
    // In a real app, you'd use a toast or notification system
    if (type === 'error') {
      alert(`Error: ${message}`);
    } else {
      alert(message);
    }
  }
}); 