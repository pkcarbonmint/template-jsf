
// Generated from template file: object-tabs.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateObjectTabsMustache = `<div id="{{id}}" data-schema-id="{{id}}" class="jsf-tabs-container">
  <h3>{{title}}</h3>
  <p>{{description}}</p>
  <div class="tabs">
    <nav class="tabs-nav">
      {{#properties}}
        <a href="#{{id}}-{{name}}" class="tabs-nav-item">{{title}}</a>
      {{/properties}}
    </nav>
    {{#properties}}
      <section id="{{id}}-{{name}}" class="tab-content">
        {{{content}}}
      </section>
    {{/properties}}
  </div>
  {{{conditionals}}}
</div>
`;
export const genObjectTabsMustache = renderMustache(templateObjectTabsMustache);
