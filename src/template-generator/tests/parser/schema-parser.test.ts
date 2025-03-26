/**
 * Jest tests for JSON Schema Form Template Generator
 */

import { SchemaEnv } from "ajv/dist/compile";
import { parseSchemaStr } from "../../lib/schema-parser";
import { describe, test, expect } from '@jest/globals';
import { SchemaNodeKind } from "@stoplight/json-schema-tree";

export const userSchema = JSON.stringify({
    id: 'user',
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      email: { type: 'string', format: 'email' },
      address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          zip: { type: 'string' }
        },
        required: ['street', 'city', 'zip']
      }
    },
    required: ['name', 'email']
  });

describe("Basic schema parsing", () => {
    test("parsed object should have ids assigned in nodes", () => {
        const schemaNode = parseSchemaStr(userSchema);
        expect(schemaNode.id).toBe('root');
        expect(schemaNode.properties).toHaveProperty('name');
        expect(schemaNode.properties).toHaveProperty('age');
        expect(schemaNode.properties).toHaveProperty('email');
        expect(schemaNode.properties).toHaveProperty('address');
        expect(schemaNode?.properties?.address.properties).toHaveProperty('street');
        expect(schemaNode?.properties?.address.properties).toHaveProperty('city');
        expect(schemaNode?.properties?.address.properties).toHaveProperty('zip');

        // check every node in the schema tree has an ID
        const checkId = (node: any) => {
            expect(node.id).toBeDefined();
            if (node.properties) {
                Object.values(node.properties).forEach((child: any) => checkId(child));
            }
        }
        checkId(schemaNode);
        checkId(schemaNode.properties?.name);
        checkId(schemaNode.properties?.name);
        checkId(schemaNode.properties?.age);
        checkId(schemaNode.properties?.email);
        checkId(schemaNode.properties?.address);
        checkId(schemaNode.properties?.address.properties?.street);
        checkId(schemaNode.properties?.address.properties?.city);
        checkId(schemaNode.properties?.address.properties?.zip);});
})

