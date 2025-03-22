// Setup Jest global environment
require('regenerator-runtime/runtime');

// Add TextEncoder/TextDecoder for jsdom
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock objects/functions not available in Jest's jsdom environment 
if (typeof window !== 'undefined') {
  // Mock localStorage
  if (!global.localStorage) {
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
  }

  // Mock window objects that might be undefined
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock console methods to reduce test output noise
  if (process.env.JEST_HIDE_CONSOLE_LOGS) {
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  }
}

// Extend Jest with custom matchers if needed
expect.extend({
  toBeValidHtml(received) {
    // A simple HTML validation matcher
    const isValid = 
      typeof received === 'string' && 
      received.includes('<') && 
      received.includes('>');

    return {
      message: () => `expected ${received} to be valid HTML`,
      pass: isValid,
    };
  },
});

// Global test timeout
jest.setTimeout(30000); // 30 seconds 