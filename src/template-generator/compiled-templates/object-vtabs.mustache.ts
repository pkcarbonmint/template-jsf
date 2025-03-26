
// Generated from template file: object-vtabs.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateObjectVtabsMustache = `<div id="{{id}}" data-schema-id="{{id}}" class="vtabs-container">
  <h3 class="vtabs-title">{{title}}</h3>
  <p class="vtabs-description">{{description}}</p>
  <div class="vtabs">
    <nav class="vtabs-nav">
      {{#properties}}
        <a href="#{{id}}-{{name}}" class="vtabs-nav-item">{{title}}</a>
      {{/properties}}
    </nav>
    <div class="vtabs-content">
      {{#properties}}
        <section id="{{id}}-{{name}}" class="vtab-content">
          {{{content}}}
        </section>
      {{/properties}}
    </div>
  </div>
  {{{conditionals}}}
</div>
`;
export const genObjectVtabsMustache = renderMustache(templateObjectVtabsMustache);
