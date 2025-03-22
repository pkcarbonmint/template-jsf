const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

/**
 * Test environment utilities for form runtime tests
 */
class TestEnvironment {
  constructor() {
    this.dom = null;
    this.window = null;
    this.document = null;
    
    // Define paths relative to project root
    this.projectRoot = process.cwd();
    this.schemasDir = path.join(this.projectRoot, 'tests', 'schemas');
    this.generatedDir = path.join(this.projectRoot, 'tests', 'generated');
    
    // Create directories if they don't exist
    this._ensureDirectoriesExist();
  }
  
  /**
   * Ensure required directories exist
   */
  _ensureDirectoriesExist() {
    if (!fs.existsSync(this.schemasDir)) {
      fs.mkdirSync(this.schemasDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.generatedDir)) {
      fs.mkdirSync(this.generatedDir, { recursive: true });
    }
  }

  /**
   * Set up a DOM environment with the provided HTML
   * @param {string} html The HTML content to load
   * @returns {Object} The DOM window and document
   */
  setupDOM(html) {
    this.dom = new JSDOM(html, {
      url: 'http://localhost/',
      contentType: 'text/html',
      includeNodeLocations: true,
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true
    });

    this.window = this.dom.window;
    this.document = this.window.document;
    
    // Add global references that may be needed by the runtime
    global.window = this.window;
    global.document = this.document;
    global.navigator = this.window.navigator;
    global.HTMLElement = this.window.HTMLElement;
    
    return {
      window: this.window,
      document: this.document
    };
  }

  /**
   * Load a schema file from the test schemas directory
   * @param {string} schemaFileName Name of the schema file
   * @returns {Object} The schema object
   */
  loadTestSchema(schemaFileName) {
    const schemaPath = path.join(this.schemasDir, schemaFileName);
    
    try {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      return JSON.parse(schemaContent);
    } catch (error) {
      throw new Error(`Failed to load schema ${schemaFileName}: ${error.message}`);
    }
  }

  /**
   * Load a generated template file
   * @param {string} templateFileName Name of the template file
   * @returns {string} The template HTML content
   */
  loadTemplate(templateFileName) {
    const templatePath = path.join(this.generatedDir, templateFileName);
    
    try {
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load template ${templateFileName}: ${error.message}`);
    }
  }

  /**
   * Clean up the DOM environment
   */
  cleanup() {
    if (this.window) {
      this.window.close();
    }
    
    this.dom = null;
    this.window = null;
    this.document = null;
    
    // Remove global references
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.HTMLElement;
  }
}

module.exports = new TestEnvironment(); 