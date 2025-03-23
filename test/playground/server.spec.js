const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs/promises');
const path = require('path');
const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockFs = {
  readdir: sinon.stub(),
  readFile: sinon.stub(),
  writeFile: sinon.stub(),
  mkdir: sinon.stub().resolves()
};

// Override the fs module in the server module
jest.mock('fs/promises', () => mockFs);

// Import the server after mocking dependencies
const { app, initSchemasDirectory } = require('../../src/playground/server');

describe('Playground Server', () => {
  beforeEach(() => {
    // Reset all stubs
    sinon.reset();
    
    // Default mock implementations
    mockFs.readdir.resolves([
      'simple-form.json',
      'complex-form.json'
    ]);
    
    mockFs.readFile.callsFake(async (filePath) => {
      if (filePath.includes('simple-form.json')) {
        return JSON.stringify({
          title: 'Simple Form',
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        });
      }
      
      throw new Error('File not found');
    });
    
    mockFs.writeFile.resolves();
  });
  
  describe('initSchemasDirectory', () => {
    it('should create schemas directory if it does not exist', async () => {
      mockFs.mkdir.resolves();
      
      await initSchemasDirectory();
      
      expect(mockFs.mkdir.called).to.be.true;
    });
    
    it('should not throw if directory already exists', async () => {
      const error = new Error('Directory exists');
      error.code = 'EEXIST';
      mockFs.mkdir.rejects(error);
      
      // Should not throw
      await initSchemasDirectory();
    });
  });
  
  describe('API Routes', () => {
    describe('GET /api/schemas', () => {
      it('should return a list of schema files', async () => {
        const response = await request(app).get('/api/schemas');
        
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('array');
        expect(response.body.length).to.equal(2);
        expect(response.body[0].name).to.equal('simple-form');
      });
      
      it('should handle errors gracefully', async () => {
        mockFs.readdir.rejects(new Error('Failed to read directory'));
        
        const response = await request(app).get('/api/schemas');
        
        expect(response.status).to.equal(500);
        expect(response.body).to.have.property('error');
      });
    });
    
    describe('GET /api/schemas/:name', () => {
      it('should return the requested schema', async () => {
        const response = await request(app).get('/api/schemas/simple-form');
        
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('schema');
        expect(response.body.schema.title).to.equal('Simple Form');
      });
      
      it('should return 404 for non-existent schema', async () => {
        mockFs.readFile.rejects(new Error('File not found'));
        
        const response = await request(app).get('/api/schemas/non-existent');
        
        expect(response.status).to.equal(404);
        expect(response.body).to.have.property('error');
      });
    });
    
    describe('POST /api/schemas/:name', () => {
      it('should save a new or updated schema', async () => {
        const schemaData = {
          schema: {
            title: 'New Schema',
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        };
        
        const response = await request(app)
          .post('/api/schemas/new-schema')
          .send(schemaData);
        
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('success', true);
        
        // Verify writeFile was called with correct arguments
        expect(mockFs.writeFile.called).to.be.true;
        const [filePath, content] = mockFs.writeFile.firstCall.args;
        expect(filePath).to.include('new-schema.json');
        expect(JSON.parse(content)).to.deep.equal(schemaData.schema);
      });
      
      it('should handle write errors', async () => {
        mockFs.writeFile.rejects(new Error('Failed to write file'));
        
        const response = await request(app)
          .post('/api/schemas/new-schema')
          .send({ schema: {} });
        
        expect(response.status).to.equal(500);
        expect(response.body).to.have.property('error');
      });
    });
    
    describe('POST /api/generate-template', () => {
      it('should generate a template from the provided schema', async () => {
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
      
      it('should handle malformed schema', async () => {
        const response = await request(app)
          .post('/api/generate-template')
          .send({ schema: 'not-an-object' });
        
        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('error');
      });
    });
  });
}); 