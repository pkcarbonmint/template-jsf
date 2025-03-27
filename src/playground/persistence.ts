import path from "path";
import fs from 'fs/promises';
import { readFileSync, writeFileSync } from "fs";

const SCHEMA_DIR = './schema-data'; // Define the SCHEMA_DIR constant
const LAYOUT_DIR = './layout-data'; // Define the LAYOUT_DIR constant

export async function saveSchemaToDisk(name: string, schema: any, schemaDir = SCHEMA_DIR): Promise<boolean> {
  const filePath = path.join(schemaDir, `${name}.json`);
  try {
    if (!schema.id) {
      return false;
    }
    await fs.writeFile(filePath, JSON.stringify(schema, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving schema:', error);
    return false;
  }
}

export async function loadSchemaFromDisk(name:string, schemaDir = SCHEMA_DIR): Promise<any> {
  const files = await fs.readdir(schemaDir);
  const schemas = await Promise.all(files.map(async file => {
    const filePath = path.join(schemaDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }));
  return schemas;
}

export async function saveSchemaToMemory(name: string, schema: any): Promise<boolean> {
  return true;
}

export async function saveLayoutToDisk(name: string, layout: any, layoutDir = LAYOUT_DIR): Promise<boolean> {
  // Add similar code to saveSchemaToDisk
  const filePath = path.join(layoutDir, `${name}.json`);
  try {
    if (!layout.id) {
      return false;
    }
    console.log('Saving layout to disk:', filePath);
    await fs.writeFile(filePath, JSON.stringify(layout, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving layout:', error);
    return false;
  }
}

export async function loadLayoutsFromDisk(layoutDir = LAYOUT_DIR): Promise<any[]> {
  // Read directory and load each layout file
  const files = await fs.readdir(layoutDir);
  const layouts = await Promise.all(files.map(async file => {
    const filePath = path.join(layoutDir, file);
    // read and parse JSON
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }));
  return layouts;
}

export async function loadSchemasFromDisk(schemaDir = SCHEMA_DIR): Promise<any[]> {
  // Read directory and load each schema file
  const files = await fs.readdir(schemaDir);
  const schemas = await Promise.all(files.map(async file => {
    const filePath = path.join(schemaDir, file);
    // read and parse JSON
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }));
  return schemas;
}
  