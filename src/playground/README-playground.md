This subdirectory contains a playground application, written in typescript and using the template generator in this project. It generates a few schemas with varying complexity -- some of them should use allOf, anyOf, if etc. conditionals. Then it generates a layout specification for each of the schemas for demonstrating the tooling in this project. The playground uses these as base data.

The playground will be interactive in nature, and allows editing of schema and the layout specification. It will also render the layout using the runtime, and allows editing of the forms.

The playground will be built using TDD approach, and using jest as the test tool.

It will have a small server that will serve the static files, and a small client that will be used to render the forms.

The whole playground should not use any new testing frameworks, but rely on jest.  The playground code should be written in typescript.  

The playground code will be in src/playground directory.

## Development Plan

1. Setup and Initialization
   - Create src/playground directory structure.
   - Initialize TypeScript, Jest, and necessary dependencies.
   - Set up a basic Express server to serve static files.
2. Test-Driven Development (TDD) Approach
   - Write test cases for schema generation and integration with existing layout and template tools.
   - Ensure tests cover allOf, anyOf, if, etc., conditionals.
   - Validate schema and layout interactions using the existing tools.
3. Schema Generation
   - Implement schema generation with varying complexity.
   - Use the existing tools to generate layout specifications and HTML templates.

   These are input schemas to illustrate the capabilities of this project. Specifically that we can generate complex layouts in the form of layout specifications and then render actual html layouts. The playground allows us to show case these features.
4. Frontend Development
   - Build an interactive UI for editing schemas.
   - Integrate the existing runtime to render forms dynamically.
   - Allow editing of forms and real-time updates.
5. Server and Client Integration
   - Serve static files via the Express server.
   - Ensure seamless communication between the client and server.
6. Testing and Validation
   - Run Jest tests to validate functionality.
   - Ensure all edge cases are covered.
7. Documentation and Finalization
   - Document the playground setup and usage.
   - Finalize the README and ensure clarity.