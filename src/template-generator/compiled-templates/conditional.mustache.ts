
// Generated from template file: conditional.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateConditionalMustache = `<div class="conditional-container my-6 bg-gray-50 border-l-4 border-blue-400 p-4 rounded-r-md" data-conditional-type="{{type}}">
  {{{schema}}}
</div> `;
export const genConditionalMustache = renderMustache(templateConditionalMustache);
