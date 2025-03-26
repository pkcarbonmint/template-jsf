
// Generated from template file: object-grid.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateObjectGridMustache = `<div id="{{id}}" data-schema-id="{{id}}" class="jsfgrid grid-cols-2 gap-4">
  <h3>{{title}}</h3>
  <p>{{description}}</p>
  {{{properties}}}
  {{{conditionals}}}
</div>
`;
export const genObjectGridMustache = renderMustache(templateObjectGridMustache);
