The table generator tool generates table templates for generating list/table type of views for objects. It takes the following as inputs:

- a JSON schema for the objects being shown 
- optionally a table schema that
  - includes column definitions with column header, field name, optionally width
  - an optional filtering "schema"
  - actions "schema" to specify what actions can be taken on each row

It generates a table based on this input, with:
  - sorting
  - filtering
  - pagination

The template is meant to be customizable by human develpers.

A run time engine takes the template, a URL for getting data, a URL
for template for creating new objects, a URL for posting to create a
new object, a URL for deleting an object.