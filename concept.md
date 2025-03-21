This project is for a javascript component for editing JSON schema based objects. The component works like this:

1. The user provides a JSON schema 
2. A tool generates starter template for editing objects for this schema
3. The user can edit the template and change the layout anyway they want
4. The template is written as html with data attributes to indicate which field it is for
5. As the editing happens, the component detects changes and emits events. These events are emitted when the user is done editing in that field, something like onblur.
6. Each field evaluates the event and sets itself to disabled or hidden based on the event
7. For example if a subschema is not needed all the fields in that schema and its subschemas will be hidden. Example, a conditional field evaluates to false, then that field will be hidden.
8. This component will be extremely lightweight and does not have any dependencies other than fp-ts and jquery.  If an event library is required, we'll pick one that's extremely lightweight.
9. Templates and JSON schema are injected at runtime.
10. Uses tailwind for styling
11. The component is written in typescript
13. Schemas and templates are injected via a an async call to a function, which could potentially load from a remote location
14. The component takes a URL for submitting the data via a simple HTTP POST request
15. The component emits events for changes to the data

What we need to build:

1. We need a few lightweight libraries to implement this:
   1. fp-ts
   2. jquery
   3. tailwind
   4. An event library
2. A tool to generate initial template based on the schema
    1.1 A markup attached to each type
    1.2 A markup for objects
    1.3 A markup for arrays with the ability to add/remove items
    1.4 A markup for conditional fields (if/then/else)
    1.5 A markup for allOf and anyOf
    1.6 A markup for oneOf

2. The runtime component that takes the template, creates a DOM structure in memory and manipulates the show/hide state based on the editing events. 
   2.1 A way to generate an id for each schema node
   2.2 An event structure for changed fields
   2.3 A way to attach each field to its schema node
   2.4 A way to emit events for changes to the data
   2.5 A subscription mechanism


Development guidance:
1. Use functional style coding
2. Use fp-ts for functional programming
3. Use jquery for DOM manipulation
4. Use tailwind for styling
5. Use an event library for event handling
6. Use typescript for type safety
7. Use an async call to load schemas and templates
8. Use a simple HTTP POST request for submitting data
9. Use an event emitter for changes to the data
