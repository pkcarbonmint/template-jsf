# JSON Schema Form Playground - Test Suite

This directory contains the test suite for the JSON Schema Form Playground functionality. The tests are organized using a Test-Driven Development (TDD) approach, meaning the tests were written before the actual implementation.

## Test Structure

The test suite is divided into several test files, each focused on a specific aspect of the playground:

1. **playground.spec.js** - Main test file covering both server API and UI functionality
2. **server.spec.js** - Tests for the Express server that powers the playground
3. **ui.spec.js** - Tests for the client-side UI components and interactions
4. **generator.spec.js** - Tests for the template generation functionality

Additionally, there's a **config.js** file containing configuration and sample data for the tests.

## Test Coverage

The tests cover the following key features:

### Server-side Features
- API endpoints for retrieving schemas
- API endpoints for saving modified schemas
- Template generation from JSON schemas
- Error handling for various scenarios

### Client-side Features
- Schema editing with CodeMirror
- Layout editing with CodeMirror
- Live template preview updates
- Loading and saving schemas
- UI interactions (tabs, wizards, array tables, etc.)

## Running the Tests

To run the tests, use the following command from the project root:

```bash
npm test
```

To run a specific test file:

```bash
npx mocha test/playground/server.spec.js
```

## TDD Approach

The development follows these TDD steps:

1. **Write Tests First**: All tests are written before implementing the actual functionality
2. **Run Tests (They Should Fail)**: Initially, all tests will fail because the implementation doesn't exist
3. **Implement the Features**: Develop the features to satisfy the tests
4. **Run Tests Again (They Should Pass)**: Ensure the implementation meets the requirements
5. **Refactor if Needed**: Improve code quality while keeping tests passing

## Test Dependencies

The tests use the following libraries:
- **Mocha**: Test runner
- **Chai**: Assertion library
- **Sinon**: Mocking/stubbing library
- **JSDOM**: For simulating browser environment
- **SuperTest**: For HTTP testing

## Next Steps

After ensuring all tests pass, the playground implementation will be ready for use. Future enhancements should also follow the TDD approach by adding new tests before implementing new features. 