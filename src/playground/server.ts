import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import { getAllSchemas, getSchemaById, getSchemaTable, listSchemas } from './schemaManager';
import { generateLayout, generateTemplateWithLayout, getLayoutBySchemaId, saveLayout } from './layoutManager';
import { LayoutConfig } from './layoutSpecs';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/api/schemas', (req, res) => {
  res.json(getSchemaTable());
  // res.json(listSchemas());
});

app.get('/api/schemas/:id', (req, res) => {
  const schema = getSchemaById(req.params.id);
  if (!schema) {
    res.status(404).json({ error: 'Schema not found' });
    return;
  }
  
  res.json({ schema });
});

app.post('/api/schemas/:id', (req, res) => {
  try {
    const { schema } = req.body;
    if (!schema) {
      res.status(400).json({ error: 'Schema is required' });
      return;
    }
    
    // In a real implementation, this would save to a file
    // For demo purposes, just log it
    console.log(`Saving schema ${req.params.id}:`, schema);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving schema:', error);
    res.status(500).json({ error: 'Failed to save schema' });
  }
});

app.get('/api/layouts/:schemaId', (req, res) => {
  // return res.json({ layout: getLayoutBySchemaId(req.params.schemaId) });
  //
  const layout = getLayoutBySchemaId(req.params.schemaId);
  if (!layout) {
    res.status(404).json({ error: 'Layout not found' });
    return;
  }
  
  res.json({ layout });
});

app.post('/api/layouts/:schemaId', (req, res) => {
  try {
    const { layout } = req.body;
    if (!layout) {
      res.status(400).json({ error: 'Layout is required' });
      return;
    }
    
    const success = saveLayout(req.params.schemaId, layout);
    
    if (!success) {
      res.status(500).json({ error: 'Failed to save layout' });
      return;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving layout:', error);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

app.post('/api/generate-layout', (req, res) => {
  try {
    const { schema } = req.body;
    if (!schema) {
      res.status(400).json({ error: 'Schema is required' });
      return;
    }
    
    const layout = generateLayout(schema);
    
    res.json({ layout });
  } catch (error) {
    console.error('Error generating layout:', error);
    res.status(500).json({ error: 'Failed to generate layout' });
  }
});

app.post('/api/generate-template', async (req, res) => {
  try {
    const { schema, layout } = req.body;
    if (!schema) {
      res.status(400).json({ error: 'Schema is required' });
      return;
    }
    
    if (!layout) {
      res.status(400).json({ error: 'Layout is required' });
      return;
    }
    
    const template = await generateTemplateWithLayout(schema, layout);
    
    res.json({ template });
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Serve the SPA for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export the app for testing
export { app };

// Start the server
export function startServer(port = 3000): void {
  app.listen(port, () => {
    console.log(`Playground server running at http://localhost:${port}`);
    console.log(`API available at http://localhost:${port}/api/schemas`);
  });
}

// When run directly
if (require.main === module) {
  startServer();
} 