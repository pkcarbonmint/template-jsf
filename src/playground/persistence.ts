import path from "path";
import fs from 'fs/promises';
const SCHEMA_DIR = './schema-data'; // Define the SCHEMA_DIR constant

export async function saveSchemaToDisk(name: string, schema: any): Promise<boolean> {
  const filePath = path.join(SCHEMA_DIR, `${name}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(schema, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving schema:', error);
    return false;
  }
}

export async function loadSchemaFromDisk(name:string) {
  const files = await fs.readdir(SCHEMA_DIR);
  const schemas = await Promise.all(files.map(async file => {
    const filePath = path.join(SCHEMA_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }));
  return schemas;
}

export async function saveSchemaToMemory(name: string, schema: any): Promise<boolean> {
  return true;
}

export async function saveLayoutToDisk(name: string, layout: any): Promise<boolean> {
  return true;
}

export async function loadLayoutsFromDisk() {
  return []; // TODO
}
export async function loadSchemasFromDisk() {
    return []; // TODO
  }
  