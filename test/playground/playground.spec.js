// Playground Test Suite
const { expect } = require('chai');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');
const request = require('supertest');
const express = require('express');

// Importing the app to test
const { app, createPlaygroundApp } = require('../../src/playground/server');

describe('JSON Schema Form Playground', () => {
  describe('Server API', () => {
    it('should serve the playground HTML page', async () => {
      const response = await request(app).get('/');
      expect(response.status).to.equal(200);
      expect(response.text).to.include('JSON Schema Form Template Playground');
    });

    it('should return a list of available schemas', async () => {
      const response = await request(app).get('/api/schemas');
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
      // Should contain at least one schema
      expect(response.body.length).to.be.at.least(1);
      // Each item should have name and path properties
      expect(response.body[0]).to.have.property('name');
      expect(response.body[0]).to.have.property('path');
    });

    it('should return a specific schema by name', async () => {
      // Assuming we have a 'simple-form' schema
      const response = await request(app).get('/api/schemas/simple-form');
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body).to.have.property('schema');
    });
    
    it('should return 404 for non-existent schema', async () => {
      const response = await request(app).get('/api/schemas/non-existent-schema');
      expect(response.status).to.equal(404);
    });

    it('should save a modified schema', async () => {
      const modifiedSchema = {
        schema: {
          title: 'Modified Schema',
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        }
      };
      
      const response = await request(app)
        .post('/api/schemas/test-schema')
        .send(modifiedSchema);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('success', true);
      
      // Verify the schema was saved
      const getResponse = await request(app).get('/api/schemas/test-schema');
      expect(getResponse.status).to.equal(200);
      expect(getResponse.body.schema.title).to.equal('Modified Schema');
    });

    it('should generate a template from a schema', async () => {
      const testSchema = {
        title: 'Test Form',
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' }
        }
      };
      
      const response = await request(app)
        .post('/api/generate-template')
        .send({ schema: testSchema });
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('template');
      expect(response.body.template).to.include('<form');
      expect(response.body.template).to.include('Name');
    });
  });

  describe('UI Functionality', () => {
    let dom;
    let window;
    let document;
    
    beforeEach(() => {
      dom = new JSDOM(`<!DOCTYPE html><html><body>
        <div id="app"></div>
        <script src="/playground.js"></script>
      </body></html>`, {
        url: 'http://localhost/',
        runScripts: 'dangerously'
      });
      
      window = dom.window;
      document = window.document;
      
      // Mocking fetch API
      window.fetch = sinon.stub();
    });
    
    afterEach(() => {
      sinon.restore();
    });

    it('should load the schema list on page load', async () => {
      // Mock fetch response for schema list
      window.fetch.resolves({
        ok: true,
        json: async () => ([
          { name: 'simple-form', path: '/schemas/simple-form.json' },
          { name: 'complex-form', path: '/schemas/complex-form.json' }
        ])
      });
      
      // Simulate DOM content loaded
      window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
      
      // Wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check that fetch was called correctly
      expect(window.fetch.calledWith('/api/schemas')).to.be.true;
      
      // Mock implementation would populate the schema selector
      // This would be tested with real DOM integration
    });

    it('should load a schema when selected', async () => {
      // Mock the fetch responses
      const fakeSchema = {
        schema: {
          title: 'Simple Form',
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        }
      };
      
      window.fetch.resolves({
        ok: true,
        json: async () => fakeSchema
      });
      
      // Create schema selector element
      const select = document.createElement('select');
      select.id = 'schema-select';
      document.body.appendChild(select);
      
      // Create schema editor element
      const editor = document.createElement('div');
      editor.id = 'schema-editor';
      document.body.appendChild(editor);
      
      // Trigger change event
      window.playgroundApp = {
        loadSchema: sinon.spy()
      };
      
      select.value = 'simple-form';
      select.dispatchEvent(new window.Event('change'));
      
      // Verify that loadSchema was called with the right value
      expect(window.playgroundApp.loadSchema.calledWith('simple-form')).to.be.true;
    });
    
    it('should update template preview when schema is edited', async () => {
      // Mock implementation
      window.playgroundApp = {
        updateTemplatePreview: sinon.spy()
      };
      
      // Create schema editor element
      const editor = document.createElement('div');
      editor.id = 'schema-editor';
      document.body.appendChild(editor);
      
      // Simulate editor content change
      editor.textContent = JSON.stringify({
        title: 'Edited Form',
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });
      
      // Trigger input event
      editor.dispatchEvent(new window.Event('input'));
      
      // Add a small delay to allow debounced functions to execute
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify updateTemplatePreview was called
      expect(window.playgroundApp.updateTemplatePreview.called).to.be.true;
    });
    
    it('should save a modified schema', async () => {
      // Mock fetch for save operation
      window.fetch.resolves({
        ok: true,
        json: async () => ({ success: true })
      });
      
      // Create save button
      const saveButton = document.createElement('button');
      saveButton.id = 'save-schema';
      document.body.appendChild(saveButton);
      
      // Create schema editor with content
      const editor = document.createElement('div');
      editor.id = 'schema-editor';
      editor.textContent = JSON.stringify({
        title: 'Saved Form',
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });
      document.body.appendChild(editor);
      
      // Set current schema name
      window.playgroundApp = {
        currentSchema: 'test-schema',
        saveSchema: sinon.spy()
      };
      
      // Trigger save button click
      saveButton.click();
      
      // Verify saveSchema was called
      expect(window.playgroundApp.saveSchema.called).to.be.true;
    });
    
    it('should allow editing layout separately from schema', async () => {
      // Mock implementation
      window.playgroundApp = {
        updateLayout: sinon.spy()
      };
      
      // Create layout editor element
      const layoutEditor = document.createElement('div');
      layoutEditor.id = 'layout-editor';
      document.body.appendChild(layoutEditor);
      
      // Simulate layout editor content change
      layoutEditor.textContent = JSON.stringify({
        form: [
          { key: "name", title: "Custom Name Label" }
        ]
      });
      
      // Trigger input event
      layoutEditor.dispatchEvent(new window.Event('input'));
      
      // Add a small delay to allow debounced functions to execute
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify updateLayout was called
      expect(window.playgroundApp.updateLayout.called).to.be.true;
    });
  });
}); 