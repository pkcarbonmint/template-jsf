/**
 * Main entry point for the JSON Schema Form Playground
 */

import { app, startServer } from './server';

/**
 * Initialize and start the playground server
 */
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

startServer(PORT);

console.log(`JSON Schema Form Playground running at http://localhost:${PORT}`);
console.log(`Open http://localhost:${PORT} in your browser to use the playground`); 