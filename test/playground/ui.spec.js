const { expect } = require('chai');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

describe('Playground UI', () => {
  let dom;
  let window;
  let document;
  let mockCodeMirror;
  
  beforeEach(() => {
    // Create mock CodeMirror
    mockCodeMirror = {
      fromTextArea: sinon.stub().returns({
        setValue: sinon.stub(),
        getValue: sinon.stub().returns('{}'),
        on: sinon.stub(),
        refresh: sinon.stub()
      })
    };
    
    // Set up a DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>JSON Schema Form Playground</title>
      </head>
      <body>
        <div class="container">
          <header>
            <div class="header-content">
              <h1>JSON Schema Form Playground</h1>
              <div class="header-actions">
                <button id="new-schema-btn">New Schema</button>
                <button id="save-schema-btn">Save Schema</button>
              </div>
            </div>
          </header>
          
          <div class="content">
            <div class="sidebar">
              <div class="sidebar-section">
                <h2>Schemas</h2>
                <select id="schema-select">
                  <option value="">Select a schema</option>
                </select>
              </div>
            </div>
            
            <div class="main-content">
              <div class="editors">
                <div class="editor-container">
                  <h2>Schema</h2>
                  <textarea id="schema-editor"></textarea>
                </div>
                
                <div class="editor-container">
                  <h2>Layout</h2>
                  <textarea id="layout-editor"></textarea>
                </div>
              </div>
              
              <div class="preview">
                <h2>Preview</h2>
                <div id="template-preview"></div>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          // Mock window.CodeMirror
          window.CodeMirror = null;
        </script>
      </body>
      </html>
    `, {
      url: 'http://localhost/',
      runScripts: 'dangerously'
    });
    
    window = dom.window;
    document = window.document;
    
    // Setup mocks
    window.CodeMirror = mockCodeMirror;
    window.fetch = sinon.stub();
    
    // Load the playground UI code
    const playgroundScript = document.createElement('script');
    playgroundScript.textContent = `
      // This will be replaced with the actual code when testing
      window.playground = {
        init: sinon.spy(),
        loadSchema: sinon.spy(),
        saveSchema: sinon.spy(),
        updateTemplatePreview: sinon.spy()
      };
    `;
    document.body.appendChild(playgroundScript);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('Schema Editor', () => {
    it('should initialize CodeMirror for schema editor', () => {
      // Initialize playground
      window.playground.init();
      
      // Check if CodeMirror was initialized for schema editor
      expect(mockCodeMirror.fromTextArea.called).to.be.true;
      expect(mockCodeMirror.fromTextArea.firstCall.args[0].id).to.equal('schema-editor');
    });
    
    it('should update template preview when schema is edited', () => {
      // Setup CodeMirror change event handler
      const editor = mockCodeMirror.fromTextArea();
      let changeHandler;
      
      editor.on.callsFake((event, handler) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      });
      
      // Initialize playground
      window.playground.init();
      
      // Trigger change event
      if (changeHandler) {
        changeHandler();
      }
      
      // Check if updateTemplatePreview was called
      expect(window.playground.updateTemplatePreview.called).to.be.true;
    });
  });
  
  describe('Layout Editor', () => {
    it('should initialize CodeMirror for layout editor', () => {
      // Initialize playground
      window.playground.init();
      
      // Check if CodeMirror was initialized for layout editor
      expect(mockCodeMirror.fromTextArea.calledTwice).to.be.true;
      expect(mockCodeMirror.fromTextArea.secondCall.args[0].id).to.equal('layout-editor');
    });
    
    it('should update template preview when layout is edited', () => {
      // Setup CodeMirror change event handler
      const editor = mockCodeMirror.fromTextArea();
      let changeHandler;
      
      editor.on.callsFake((event, handler) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      });
      
      // Initialize playground
      window.playground.init();
      
      // Trigger change event
      if (changeHandler) {
        changeHandler();
      }
      
      // Check if updateTemplatePreview was called
      expect(window.playground.updateTemplatePreview.called).to.be.true;
    });
  });
  
  describe('Schema Selection', () => {
    it('should load schema when selected from dropdown', () => {
      // Set up schema select element
      const schemaSelect = document.getElementById('schema-select');
      
      // Add some options
      const option = document.createElement('option');
      option.value = 'test-schema';
      option.textContent = 'Test Schema';
      schemaSelect.appendChild(option);
      
      // Initialize playground
      window.playground.init();
      
      // Simulate selection change
      schemaSelect.value = 'test-schema';
      schemaSelect.dispatchEvent(new window.Event('change'));
      
      // Check if loadSchema was called with correct arguments
      expect(window.playground.loadSchema.called).to.be.true;
      expect(window.playground.loadSchema.firstCall.args[0]).to.equal('test-schema');
    });
  });
  
  describe('New Schema', () => {
    it('should create a new schema template when new schema button is clicked', () => {
      // Set up spy for window.prompt
      window.prompt = sinon.stub().returns('new-test-schema');
      
      // Initialize playground
      window.playground.init();
      
      // Click new schema button
      const newSchemaBtn = document.getElementById('new-schema-btn');
      newSchemaBtn.click();
      
      // Check if prompt was called
      expect(window.prompt.called).to.be.true;
      
      // Setup handlers for new schema code here
      // This would depend on the implementation
    });
  });
  
  describe('Save Schema', () => {
    it('should save the current schema when save button is clicked', () => {
      // Initialize playground
      window.playground.init();
      
      // Click save schema button
      const saveSchemaBtn = document.getElementById('save-schema-btn');
      saveSchemaBtn.click();
      
      // Check if saveSchema was called
      expect(window.playground.saveSchema.called).to.be.true;
    });
  });
  
  describe('Template Preview', () => {
    it('should update the template preview when updateTemplatePreview is called', () => {
      // Mock DOM manipulation
      const templatePreview = document.getElementById('template-preview');
      const originalInnerHTML = templatePreview.innerHTML;
      
      // Mock fetch response for template generation
      window.fetch.resolves({
        ok: true,
        json: async () => ({
          template: '<form><div class="form-field">Test Field</div></form>'
        })
      });
      
      // Initialize playground
      window.playground.init();
      
      // Call updateTemplatePreview
      window.playground.updateTemplatePreview();
      
      // Wait for promises to resolve
      return new Promise(resolve => setTimeout(resolve, 0)).then(() => {
        // Check if template preview was updated
        expect(templatePreview.innerHTML).not.to.equal(originalInnerHTML);
      });
    });
  });
}); 