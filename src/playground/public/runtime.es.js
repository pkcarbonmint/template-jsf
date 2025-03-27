function mitt(n) {
  return { all: n = n || /* @__PURE__ */ new Map(), on: function(t, e) {
    var i = n.get(t);
    i ? i.push(e) : n.set(t, [e]);
  }, off: function(t, e) {
    var i = n.get(t);
    i && (e ? i.splice(i.indexOf(e) >>> 0, 1) : n.set(t, []));
  }, emit: function(t, e) {
    var i = n.get(t);
    i && i.slice().map(function(n2) {
      n2(e);
    }), (i = n.get("*")) && i.slice().map(function(n2) {
      n2(t, e);
    });
  } };
}
function setupArrayHandlers(formElement) {
  const arrayContainers = formElement.querySelectorAll(".array-container");
  arrayContainers.forEach((container) => {
    setupArrayContainer(container);
  });
}
function setupArrayContainer(container) {
  const containerId = container.id;
  if (!containerId) return;
  const itemsContainer = container.querySelector(".array-items");
  const itemTemplate = container.querySelector(".array-item-template");
  const addButton = container.querySelector(".add-item");
  if (!itemsContainer || !itemTemplate || !addButton) {
    console.warn("Array container is missing required elements", container);
    return;
  }
  addButton.addEventListener("click", () => {
    addArrayItem(container);
  });
  if (itemsContainer.children.length <= 1) {
    addArrayItem(container);
  }
  itemsContainer.addEventListener("click", (event) => {
    const target = event.target;
    const removeButton = target.closest(".remove-item");
    if (removeButton) {
      const arrayItem = removeButton.closest(".array-item");
      if (arrayItem) {
        removeArrayItem(container, arrayItem);
      }
    }
  });
}
function addArrayItem(container) {
  const itemsContainer = container.querySelector(".array-items");
  const itemTemplate = container.querySelector(".array-item-template");
  if (!itemsContainer || !itemTemplate) {
    console.warn("Cannot add array item, missing container or template");
    throw new Error("Cannot add array item, missing container or template");
  }
  const newItem = itemTemplate.cloneNode(true);
  newItem.classList.remove("array-item-template");
  newItem.classList.remove("hidden");
  const arrayItemElement = newItem.querySelector(".array-item");
  if (!arrayItemElement) {
    console.warn("Invalid array item template structure");
    throw new Error("Invalid array item template structure");
  }
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e4);
  const uniqueId = `${timestamp}-${random}`;
  updateFieldIdentifiers(arrayItemElement, uniqueId);
  itemsContainer.appendChild(newItem);
  const nestedArrays = newItem.querySelectorAll(".array-container");
  nestedArrays.forEach((nestedArray) => {
    setupArrayContainer(nestedArray);
  });
  triggerArrayChangeEvent(container);
  return newItem;
}
function removeArrayItem(container, item) {
  const itemsContainer = container.querySelector(".array-items");
  if (!itemsContainer) {
    console.warn("Cannot remove array item, missing container");
    return;
  }
  const visibleItems = Array.from(itemsContainer.children).filter(
    (child) => !child.classList.contains("array-item-template") && !child.classList.contains("hidden")
  );
  if (visibleItems.length > 1) {
    item.remove();
    triggerArrayChangeEvent(container);
  } else {
    console.info("Cannot remove the last array item");
    const inputs = item.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (input instanceof HTMLInputElement) {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false;
        } else {
          input.value = "";
        }
      } else {
        input.innerText = "";
      }
    });
  }
}
function updateFieldIdentifiers(element, uniqueId) {
  const inputs = element.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    const originalId = input.id;
    const originalName = input.getAttribute("name");
    const schemaId = input.getAttribute("data-schema-id");
    if (originalId) {
      const newId = `${originalId}_${uniqueId}`;
      input.id = newId;
      const labels = element.querySelectorAll(`label[for="${originalId}"]`);
      labels.forEach((label) => {
        label.setAttribute("for", newId);
      });
    }
    if (originalName) {
      input.setAttribute("name", `${originalName}_${uniqueId}`);
    }
    if (schemaId) {
      input.setAttribute("data-schema-id", `${schemaId}_${uniqueId}`);
    }
  });
}
function triggerArrayChangeEvent(container) {
  const event = new CustomEvent("array:change", {
    bubbles: true,
    detail: {
      arrayId: container.id,
      container
    }
  });
  container.dispatchEvent(event);
}
function getArrayItemsData(container) {
  const itemsContainer = container.querySelector(".array-items");
  if (!itemsContainer) return [];
  const visibleItems = Array.from(itemsContainer.children).filter(
    (child) => !child.classList.contains("array-item-template") && !child.classList.contains("hidden")
  );
  return visibleItems.map((item) => {
    const itemData = {};
    const inputs = item.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (input instanceof HTMLInputElement) {
        const name = input.name;
        if (!name) return;
        let value;
        if (input.type === "checkbox") {
          value = input.checked;
        } else if (input.type === "number" || input.type === "range") {
          value = input.valueAsNumber;
        } else {
          value = input.value;
        }
        itemData[name] = value;
      } else {
        const name = input.getAttribute("name");
        if (!name) return;
        itemData[name] = input.value;
      }
    });
    return itemData;
  });
}
class SchemaForm {
  constructor(element, options = {}) {
    this.schema = null;
    this.formElement = null;
    this.emitter = mitt();
    this.formData = {};
    this.schemaPathMap = {};
    this.fieldVisibilityHistory = {};
    if (typeof element === "string") {
      const el = document.querySelector(element);
      if (!el) {
        throw new Error(`Element not found: ${element}`);
      }
      this.element = el;
    } else {
      this.element = element;
    }
    this.options = options;
    this.formData = {};
    this.schemaPathMap = {};
    this.fieldVisibilityHistory = {};
    this.emitter = mitt();
    if (options.debug) {
      this.emitter.on("*", (type, event) => {
        console.log(`[SchemaForm Event] ${type}:`, event);
      });
    }
    this.init().catch((err) => {
      console.error("Failed to initialize form:", err);
    });
  }
  async init() {
    try {
      if (this.options.schemaUrl) {
        this.schema = await this.loadSchema(this.options.schemaUrl);
        if (!this.schema) {
          throw new Error("Failed to load schema");
        }
        this.buildSchemaPathMap();
      }
      if (this.options.templateUrl) {
        await this.loadTemplate(this.options.templateUrl);
      }
      this.setupForm();
      if (this.options.defaultData) {
        this.formData = { ...this.options.defaultData };
        this.updateFormFields();
      } else {
        this.initializeFormDataFromFields();
      }
      this.evaluateAllConditions();
      if (this.schema)
        this.emitter.emit("ready", { schema: this.schema });
      if (this.options.onReady) {
        this.options.onReady(this);
      }
    } catch (error) {
      console.error("Error initializing form:", error);
      this.emitter.emit("error", { message: `Initialization error: ${error}` });
    }
  }
  async loadSchema(schemaUrl) {
    try {
      const response = await fetch(schemaUrl);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }
      const schema = await response.json();
      this.processSchemaConditionals(schema);
      return schema;
    } catch (error) {
      console.error(`Error loading schema: ${error}`);
      this.emitter.emit("error", { message: `Failed to load schema: ${error}` });
      return null;
    }
  }
  processSchemaConditionals(schema) {
    schema.conditionals = schema.conditionals || [];
    const conditionals = schema.conditionals;
    if (schema.if && (schema.then || schema.else)) {
      schema.conditionals.push({
        if: schema.if,
        then: schema.then,
        else: schema.else
      });
    }
    if (schema.allOf) {
      schema.allOf.forEach((subSchema) => {
        if (subSchema.if && (subSchema.then || subSchema.else)) {
          conditionals.push({
            if: subSchema.if,
            then: subSchema.then,
            else: subSchema.else
          });
        }
      });
    }
    if (schema.dependencies) {
      Object.entries(schema.dependencies).forEach(([propName, dependency]) => {
        if (typeof dependency === "object" && !Array.isArray(dependency)) {
          const conditionalSchema = {
            if: {
              properties: {
                [propName]: { type: "string" }
                // Exists and has any value
              },
              required: [propName]
            },
            then: dependency
          };
          conditionals.push(conditionalSchema);
        }
      });
    }
  }
  async loadTemplate(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load template from ${url}: ${response.statusText}`);
      }
      const html = await response.text();
      this.element.innerHTML = html;
    } catch (error) {
      console.error("Error loading template:", error);
      throw error;
    }
  }
  setupForm() {
    this.formElement = this.element.querySelector("form");
    if (!this.formElement) {
      console.warn("No form element found in container");
      return;
    }
    if (!this.formElement.hasAttribute("data-schema-form")) {
      this.formElement.setAttribute("data-schema-form", "true");
    }
    setupArrayHandlers(this.element);
    this.setupInputEvents();
    this.formElement.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submit();
    });
    this.evaluateConditions();
    this.element.addEventListener("array:change", this.handleArrayChange.bind(this));
  }
  setupInputEvents() {
    const inputs = this.element.querySelectorAll(
      "input, select, textarea"
    );
    inputs.forEach((input) => {
      const fieldId = input.getAttribute("data-schema-id") || input.getAttribute("data-schema-path") || input.name;
      if (!fieldId && input.name === "") {
        return;
      }
      const newInput = input.cloneNode(true);
      if (input.parentNode) {
        input.parentNode.replaceChild(newInput, input);
      }
      newInput.addEventListener("change", (event) => {
        this.handleFieldChange(event);
      });
      newInput.addEventListener("input", (event) => {
        this.handleFieldChange(event);
      });
      this.updateFormDataFromField(fieldId, newInput);
    });
    console.log(`Setup events for ${inputs.length} form fields`);
  }
  handleFieldChange(event) {
    const input = event.target;
    if (!input) return;
    const schemaElement = input.closest("[data-schema-id], [data-schema-path]");
    const fieldId = (schemaElement == null ? void 0 : schemaElement.getAttribute("data-schema-id")) || (schemaElement == null ? void 0 : schemaElement.getAttribute("data-schema-path")) || input.name;
    if (!fieldId) return;
    this.updateFormDataFromField(fieldId, input);
    this.evaluateAllConditions();
    this.emitter.emit("change", { field: fieldId, value: input.value, formData: this.getFormData() });
    if (this.options.onChange) {
      this.options.onChange(this.getFormData());
    }
  }
  updateFormDataFromField(fieldId, input) {
    if (!fieldId) return;
    let value;
    if (input.type === "checkbox") {
      value = input.checked;
    } else if (input.type === "number" || input.type === "range") {
      value = parseFloat(input.value);
      if (isNaN(value)) value = null;
    } else {
      value = input.value;
    }
    let actualFieldPath = fieldId;
    if (fieldId.startsWith("field-")) {
      const parts = fieldId.split("-");
      if (parts.length > 1) {
        actualFieldPath = parts.slice(1).join(".");
      }
    }
    if (actualFieldPath.includes(".")) {
      const parts = actualFieldPath.split(".");
      let current = this.formData;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== "object") {
          current[part] = {};
        }
        current = current[part];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      this.formData[actualFieldPath] = value;
    }
    console.log("Updated form data:", this.formData);
  }
  handleSubmit(event) {
    event.preventDefault();
    this.emitter.emit("submit", { formData: { ...this.formData } });
    if (this.options.onSubmit) {
      this.options.onSubmit({ ...this.formData });
    }
    if (this.options.submitUrl) {
      this.submitToServer();
    }
  }
  async submitToServer() {
    if (!this.options.submitUrl) return;
    try {
      const response = await fetch(this.options.submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(this.formData)
      });
      if (!response.ok) {
        throw new Error(`Server submission failed: ${response.statusText}`);
      }
      const result = await response.json();
      console.log("Server response:", result);
    } catch (error) {
      console.error("Error submitting form to server:", error);
      this.emitter.emit("error", { errors: [error] });
    }
  }
  buildSchemaPathMap() {
    if (!this.schema) return;
    this.schemaPathMap = {};
    this.mapSchemaPaths(this.schema, "");
  }
  mapSchemaPaths(schema, path) {
    const id = path || "root";
    this.schemaPathMap[id] = path;
    if (schema.type === "object" && schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        const propPath = path ? `${path}.${key}` : key;
        this.mapSchemaPaths(propSchema, propPath);
      });
    }
    if (schema.type === "array" && schema.items) {
      const itemsPath = path ? `${path}.items` : "items";
      this.mapSchemaPaths(schema.items, itemsPath);
    }
    if (schema.if) {
      const ifPath = path ? `${path}.if` : "if";
      this.mapSchemaPaths(schema.if, ifPath);
    }
    if (schema.then) {
      const thenPath = path ? `${path}.then` : "then";
      this.mapSchemaPaths(schema.then, thenPath);
    }
    if (schema.else) {
      const elsePath = path ? `${path}.else` : "else";
      this.mapSchemaPaths(schema.else, elsePath);
    }
    if (schema.allOf) {
      schema.allOf.forEach((subSchema, index) => {
        const subPath = path ? `${path}.allOf[${index}]` : `allOf[${index}]`;
        this.mapSchemaPaths(subSchema, subPath);
      });
    }
    if (schema.anyOf) {
      schema.anyOf.forEach((subSchema, index) => {
        const subPath = path ? `${path}.anyOf[${index}]` : `anyOf[${index}]`;
        this.mapSchemaPaths(subSchema, subPath);
      });
    }
    if (schema.oneOf) {
      schema.oneOf.forEach((subSchema, index) => {
        const subPath = path ? `${path}.oneOf[${index}]` : `oneOf[${index}]`;
        this.mapSchemaPaths(subSchema, subPath);
      });
    }
  }
  evaluateAllConditions() {
    if (!this.schema) return;
    this.showBasicFields();
    this.hideConditionalFields();
    this.evaluateSchemaConditionals();
    if (this.schema.conditionals) {
      this.schema.conditionals.forEach((conditional, index) => {
        this.evaluateConditional(conditional, index);
      });
    }
  }
  showBasicFields() {
    if (!this.schema || !this.schema.properties) return;
    console.log("Ensuring basic schema properties are visible");
    const topLevelProperties = Object.keys(this.schema.properties);
    topLevelProperties.forEach((propName) => {
      if (propName.startsWith("_") || propName === "additionalInfo" || propName === "personalSection" || propName === "businessSection" || propName === "nonprofitSection") {
        return;
      }
      const field = this.element.querySelector(`[data-schema-path="${propName}"]`);
      if (field) {
        console.log(`Ensuring field is visible: ${propName}`);
        this.showFieldElement(field, "Basic schema property");
      }
    });
  }
  hideConditionalFields() {
    const additionalInfoField = this.element.querySelector('[data-schema-path="additionalInfo"]');
    if (additionalInfoField) {
      this.hideFieldElement(additionalInfoField, "Hidden by default (additionalInfo)");
      console.log("Hiding additionalInfo field by default");
    }
    const conditionalFields = this.element.querySelectorAll('[data-conditional="true"]');
    conditionalFields.forEach((field) => {
      this.hideFieldElement(field, "Marked as conditional");
    });
  }
  evaluateSchemaConditionals() {
    if (!this.schema) return;
    if (this.schema.if && (this.schema.then || this.schema.else)) {
      const ifConditionMet = this.evaluateSchemaCondition(this.schema.if);
      console.log(`If condition evaluated: ${ifConditionMet ? "TRUE" : "FALSE"}`);
      if (ifConditionMet && this.schema.then) {
        this.applySchemaConditional(this.schema.then);
      } else if (!ifConditionMet && this.schema.else) {
        this.applySchemaConditional(this.schema.else);
      }
    }
    if (this.schema.allOf && Array.isArray(this.schema.allOf)) {
      this.schema.allOf.forEach((condition, index) => {
        if (condition.if) {
          const ifConditionMet = this.evaluateSchemaCondition(condition.if);
          console.log(`AllOf[${index}] if condition evaluated: ${ifConditionMet ? "TRUE" : "FALSE"}`);
          if (ifConditionMet && condition.then) {
            this.applySchemaConditional(condition.then);
          } else if (!ifConditionMet && condition.else) {
            this.applySchemaConditional(condition.else);
          }
        }
      });
    }
    if (this.schema.anyOf && Array.isArray(this.schema.anyOf)) {
      const accountType = this.getNestedValue(this.formData, "accountType");
      console.log(`Processing anyOf with accountType: ${accountType}`);
      if (accountType === "business") {
        const businessCondition = this.schema.anyOf.find(
          (condition) => condition.properties && condition.properties.accountType && condition.properties.accountType.const === "business"
        );
        if (businessCondition) {
          console.log("Applying business account anyOf condition");
          this.applySchemaConditional(businessCondition);
          if (businessCondition.properties && businessCondition.properties.businessSection) {
            const businessSectionSchema = businessCondition.properties.businessSection;
            const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
            if (businessSection) {
              this.showFieldElement(businessSection);
              if (businessSectionSchema.required && Array.isArray(businessSectionSchema.required)) {
                businessSectionSchema.required.forEach((fieldName) => {
                  const fieldInput = this.element.querySelector(`[name="field-businessSection-${fieldName}"]`);
                  if (fieldInput) {
                    console.log(`Making business field ${fieldName} required from anyOf`);
                    fieldInput.setAttribute("required", "required");
                  }
                });
              }
            }
            const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
            const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
            if (personalSection) {
              this.hideFieldElement(personalSection);
            }
            if (nonprofitSection) {
              this.hideFieldElement(nonprofitSection);
            }
          }
        }
      } else if (accountType === "personal") {
        const personalCondition = this.schema.anyOf.find(
          (condition) => condition.properties && condition.properties.accountType && condition.properties.accountType.const === "personal"
        );
        if (personalCondition) {
          console.log("Applying personal account anyOf condition");
          this.applySchemaConditional(personalCondition);
          const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
          if (personalSection) {
            this.showFieldElement(personalSection);
          }
          const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
          const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
          if (businessSection) {
            this.hideFieldElement(businessSection);
            const companyNameInput = this.element.querySelector('[name="field-businessSection-companyName"]');
            const taxIdInput = this.element.querySelector('[name="field-businessSection-taxId"]');
            if (companyNameInput) {
              companyNameInput.removeAttribute("required");
            }
            if (taxIdInput) {
              taxIdInput.removeAttribute("required");
            }
          }
          if (nonprofitSection) {
            this.hideFieldElement(nonprofitSection);
          }
        }
      }
    }
  }
  evaluateSchemaCondition(condition) {
    if (condition.properties) {
      return Object.entries(condition.properties).every(([propName, propCondition]) => {
        const fieldValue = this.getNestedValue(this.formData, propName);
        console.log(`Evaluating schema condition for ${propName}:`, { fieldValue, condition: propCondition });
        if (propCondition.minimum !== void 0) {
          return fieldValue >= propCondition.minimum;
        }
        if (propCondition.maximum !== void 0) {
          return fieldValue <= propCondition.maximum;
        }
        if (propCondition.enum) {
          return propCondition.enum.includes(fieldValue);
        }
        if (propCondition.const !== void 0) {
          return fieldValue === propCondition.const;
        }
        return true;
      });
    }
    return false;
  }
  applySchemaConditional(schema) {
    console.log("Applying schema conditional:", schema);
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((fieldName) => {
        console.log(`Making field required by schema conditional: ${fieldName}`);
        const field = this.element.querySelector(`[data-schema-path="${fieldName}"]`);
        if (field) {
          this.showFieldElement(field);
          const inputs = field.querySelectorAll("input, select, textarea");
          inputs.forEach((input) => {
            input.setAttribute("required", "required");
          });
          const markers = field.querySelectorAll(".required-marker");
          markers.forEach((marker) => {
            marker.style.display = "inline";
          });
        }
      });
      if (schema.required.includes("personalSection") || schema.required.includes("businessSection") || schema.required.includes("nonprofitSection")) {
        const allSections = ["personalSection", "businessSection", "nonprofitSection"];
        allSections.forEach((sectionName) => {
          if (!schema.required.includes(sectionName)) {
            const section = this.element.querySelector(`[data-schema-path="${sectionName}"]`);
            if (section) {
              this.hideFieldElement(section);
            }
          }
        });
      }
    }
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        if (propName.startsWith("_")) {
          if (propName === "_submitDisabled" && propSchema.const === true) {
            const submitBtn = this.element.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.setAttribute("disabled", "disabled");
            }
          }
        } else if (propName === "businessSection" || propName === "personalSection" || propName === "nonprofitSection") {
          const section = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (section) {
            this.showFieldElement(section);
            if (propName === "businessSection" && propSchema && propSchema.required) {
              const requiredFields = propSchema.required;
              requiredFields.forEach((fieldName) => {
                const fieldId = `${propName}-${fieldName}`;
                const fieldInput = this.element.querySelector(`[name="field-${fieldId}"]`);
                if (fieldInput) {
                  fieldInput.setAttribute("required", "required");
                  console.log(`Making nested field required: ${fieldId}`);
                }
              });
            }
            const otherSections = ["personalSection", "businessSection", "nonprofitSection"].filter((s) => s !== propName);
            otherSections.forEach((sectionName) => {
              const otherSection = this.element.querySelector(`[data-schema-path="${sectionName}"]`);
              if (otherSection) {
                this.hideFieldElement(otherSection);
              }
            });
          }
        } else if (propName === "accountType" && propSchema.const) {
          const accountType = propSchema.const;
          if (accountType === "business") {
            const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
            if (businessSection) {
              this.showFieldElement(businessSection);
              const companyNameInput = this.element.querySelector('[name="field-businessSection-companyName"]');
              const taxIdInput = this.element.querySelector('[name="field-businessSection-taxId"]');
              if (companyNameInput) {
                companyNameInput.setAttribute("required", "required");
              }
              if (taxIdInput) {
                taxIdInput.setAttribute("required", "required");
              }
            }
            const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
            const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
            if (personalSection) {
              this.hideFieldElement(personalSection);
            }
            if (nonprofitSection) {
              this.hideFieldElement(nonprofitSection);
            }
          } else if (accountType === "personal") {
            const personalSection = this.element.querySelector('[data-schema-path="personalSection"]');
            if (personalSection) {
              this.showFieldElement(personalSection);
            }
            const businessSection = this.element.querySelector('[data-schema-path="businessSection"]');
            const nonprofitSection = this.element.querySelector('[data-schema-path="nonprofitSection"]');
            if (businessSection) {
              this.hideFieldElement(businessSection);
            }
            if (nonprofitSection) {
              this.hideFieldElement(nonprofitSection);
            }
          }
        } else if (propName === "contactPreference" && propSchema.const) {
          const contactPref = propSchema.const;
          if (contactPref === "email") {
            const emailInput = this.element.querySelector('[name="field-email"]');
            if (emailInput) {
              emailInput.setAttribute("required", "required");
              const emailField = this.element.querySelector('[data-schema-path="email"]');
              if (emailField) {
                this.showFieldElement(emailField);
              }
            }
            const phoneInput = this.element.querySelector('[name="field-phone"]');
            if (phoneInput) {
              phoneInput.removeAttribute("required");
            }
            const mailingAddressField = this.element.querySelector('[data-schema-path="mailingAddress"]');
            if (mailingAddressField) {
              this.hideFieldElement(mailingAddressField);
            }
          }
        } else if (propName === "phone" || propName === "email" || propName === "mailingAddress") {
          const field = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (field) {
            this.showFieldElement(field);
          }
        } else {
          if (propSchema && typeof propSchema === "object" && propSchema.required) {
            const requiredFields = propSchema.required;
            requiredFields.forEach((fieldName) => {
              const fullPath = `${propName}-${fieldName}`;
              const field = this.element.querySelector(`[name="field-${fullPath}"]`);
              if (field) {
                field.setAttribute("required", "required");
                console.log(`Making nested field required: ${fullPath}`);
              }
            });
          }
        }
      });
    }
  }
  showFieldElement(element, reason = "Unknown") {
    element.classList.remove("hidden");
    const parentContainer = element.closest("[data-schema-path]");
    if (parentContainer && parentContainer !== element) {
      this.showFieldElement(parentContainer, `Parent of ${element.getAttribute("data-schema-path")}`);
    }
    const path = element.getAttribute("data-schema-path");
    if (path) {
      if (!this.fieldVisibilityHistory[path]) {
        this.fieldVisibilityHistory[path] = [];
      }
      this.fieldVisibilityHistory[path].push({
        action: "show",
        reason,
        timestamp: Date.now()
      });
      this.emitter.emit("fieldShow", { field: path, reason });
    }
  }
  hideFieldElement(element, reason = "Unknown") {
    element.classList.add("hidden");
    const path = element.getAttribute("data-schema-path");
    if (path) {
      if (!this.fieldVisibilityHistory[path]) {
        this.fieldVisibilityHistory[path] = [];
      }
      this.fieldVisibilityHistory[path].push({
        action: "hide",
        reason,
        timestamp: Date.now()
      });
      this.emitter.emit("fieldHide", { field: path, reason });
    }
  }
  handleArrayChange(event) {
    const { arrayId, container } = event.detail;
    if (!arrayId || !container) return;
    const itemsData = getArrayItemsData(container);
    this.formData[arrayId] = itemsData;
    this.evaluateAllConditions();
    console.log(`Array change event for ${arrayId}`, itemsData);
    this.emitter.emit("change", {
      field: arrayId,
      value: itemsData,
      formData: { ...this.formData }
    });
    if (this.options.onChange) {
      this.options.onChange({ ...this.formData });
    }
  }
  /**
   * Public methods
   */
  on(type, handler) {
    this.emitter.on(type, handler);
  }
  off(type, handler) {
    this.emitter.off(type, handler);
  }
  getData() {
    return { ...this.formData };
  }
  setData(data) {
    this.formData = { ...data };
    this.updateFormFields();
    this.evaluateAllConditions();
  }
  updateFormFields() {
    if (!this.formElement) return;
    this.processFormData(this.formData);
  }
  processFormData(data, prefix = "") {
    Object.entries(data).forEach(([key, value]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value) && value !== null) {
        this.processFormData(value, fieldName);
      } else {
        const input = this.formElement.querySelector(`[name="${fieldName}"]`);
        if (!input) return;
        if (input.type === "checkbox") {
          input.checked = !!value;
        } else if (input.type === "radio") {
          const radio = this.formElement.querySelector(`[name="${fieldName}"][value="${value}"]`);
          if (radio) {
            radio.checked = true;
          }
        } else {
          input.value = value;
        }
      }
    });
  }
  validate() {
    if (this.formElement) {
      return this.formElement.checkValidity();
    }
    return true;
  }
  /**
   * Reset the form to its initial state
   */
  reset() {
    this.formData = this.options.defaultData ? { ...this.options.defaultData } : {};
    if (this.formElement) {
      this.formElement.reset();
    }
    this.evaluateAllConditions();
    this.updateFormFields();
    console.log("Form reset", this.formData);
    this.emitter.emit("reset", { formData: { ...this.formData } });
  }
  submit() {
    if (this.formElement) {
      this.formElement.requestSubmit();
    }
  }
  // Add a method to help debugging
  debugEmitter() {
    console.log("Event emitter:", this.emitter);
    const eventTypes = ["ready", "change", "submit", "error", "fieldShow", "fieldHide", "reset"];
    eventTypes.forEach((type) => {
      const listeners = this.emitter.all.get(type);
      console.log(`Event type [${type}] has ${listeners ? listeners.length : 0} listeners`);
    });
  }
  // Method to manually trigger an event (useful for debugging)
  triggerEvent(type, data = {}) {
    console.log(`Manually triggering event: ${type}`, data);
    this.emitter.emit(type, data);
  }
  /**
   * Get the current form data
   */
  getFormData() {
    return { ...this.formData };
  }
  evaluateConditions() {
    if (!this.schema || !this.schema.conditionals || !Array.isArray(this.schema.conditionals)) {
      return;
    }
    for (const condition of this.schema.conditionals) {
      if (condition.if && condition.then) {
        const ifCondition = condition.if;
        const thenAction = condition.then;
        const isConditionMet = this.evaluateIfCondition(ifCondition);
        if (isConditionMet) {
          this.applyThenAction(thenAction);
        } else if (condition.else) {
          this.applyThenAction(condition.else);
        }
      }
    }
  }
  evaluateIfCondition(ifCondition) {
    if (ifCondition.properties) {
      for (const [propName, _propCondition] of Object.entries(ifCondition.properties)) {
        const formValue = this.getFormValue(propName);
        const propCondition = _propCondition;
        if (propCondition.enum && Array.isArray(propCondition.enum)) {
          if (!propCondition.enum.includes(formValue)) {
            return false;
          }
        }
        if ("const" in propCondition && formValue !== propCondition.const) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  getFormValue(path) {
    const parts = path.split(".");
    let value = this.formData;
    for (const part of parts) {
      if (value === void 0 || value === null) {
        return void 0;
      }
      value = value[part];
    }
    return value;
  }
  applyThenAction(thenAction) {
    var _a;
    if (thenAction.required && Array.isArray(thenAction.required)) {
      thenAction.required.forEach((fieldPath) => {
        const element = this.element.querySelector(`[data-schema-path="${fieldPath}"]`);
        if (element) {
          element.classList.remove("hidden");
          const inputs = element.querySelectorAll("input, select, textarea");
          inputs.forEach((input, index, parent) => {
            input.setAttribute("required", "required");
          });
        }
      });
    }
    if (thenAction.required && Array.isArray(thenAction.required) && ((_a = this.schema) == null ? void 0 : _a.properties)) {
      for (const propName of Object.keys(this.schema.properties)) {
        if (!thenAction.required.includes(propName)) {
          const element = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (element) {
            this.hideField(propName, element);
          }
        }
      }
    }
    if (thenAction.properties) {
      for (const [propName, _propAction] of Object.entries(thenAction.properties)) {
        const propAction = _propAction;
        if (propName.startsWith("_")) {
          this.handleSpecialProperty(propName, propAction);
        } else {
          const element = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (element) {
            if (propAction.const === true) {
              element.classList.remove("hidden");
              this.emitter.emit("fieldShow", { field: propName });
            } else if (propAction.const === false) {
              this.hideField(propName, element);
            }
          }
        }
      }
    }
  }
  hideField(fieldId, element, reason = "Unknown") {
    element.classList.add("hidden");
    const inputs = element.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.removeAttribute("required");
    });
    if (!this.fieldVisibilityHistory[fieldId]) {
      this.fieldVisibilityHistory[fieldId] = [];
    }
    this.fieldVisibilityHistory[fieldId].push({
      action: "hide",
      reason,
      timestamp: Date.now()
    });
    this.emitter.emit("fieldHide", { field: fieldId, reason });
  }
  handleSpecialProperty(propName, propAction) {
    var _a;
    if (propName === "_submitDisabled") {
      const submitButton = (_a = this.formElement) == null ? void 0 : _a.querySelector('[type="submit"]');
      if (submitButton && propAction.const === true) {
        submitButton.disabled = true;
      } else if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }
  evaluateConditional(conditional, index) {
    if (!conditional.if || !conditional.then) return;
    const ifConditionMet = this.evaluateCondition(conditional.if);
    console.log(`Conditional ${index} evaluated: ${ifConditionMet ? "TRUE" : "FALSE"}`, conditional);
    if (ifConditionMet) {
      this.applyConditional(conditional.then, `Condition ${index} IF matched`);
    } else if (conditional.else) {
      this.applyConditional(conditional.else, `Condition ${index} ELSE applied`);
    }
  }
  evaluateCondition(condition) {
    if (condition.properties) {
      return Object.entries(condition.properties).every(([propName, propCondition]) => {
        const fieldValue = this.getNestedValue(this.formData, propName);
        console.log(`Evaluating condition for ${propName}:`, {
          fieldValue,
          condition: propCondition,
          formData: this.formData
        });
        if (propCondition.enum) {
          const result = propCondition.enum.includes(fieldValue);
          console.log(`  - Enum check: ${result} (${fieldValue} in [${propCondition.enum}])`);
          return result;
        }
        if (propCondition.const !== void 0) {
          const result = fieldValue === propCondition.const;
          console.log(`  - Const check: ${result} (${fieldValue} === ${propCondition.const})`);
          return result;
        }
        return true;
      });
    }
    return true;
  }
  applyConditional(schema, reason = "Unknown") {
    console.log(`Applying conditional: ${reason}`, schema);
    if (schema.required) {
      schema.required.forEach((fieldName) => {
        console.log(`Making field required: ${fieldName}`);
        const field = this.element.querySelector(`[data-schema-path="${fieldName}"]`);
        if (field) {
          const inputs = field.querySelectorAll("input, select, textarea");
          inputs.forEach((input) => {
            input.setAttribute("required", "required");
          });
          const markers = field.querySelectorAll(".required-marker");
          markers.forEach((marker) => {
            marker.style.display = "inline";
          });
          this.showFieldElement(field, `Required by condition: ${reason}`);
        } else {
          console.log(`Required field not found: ${fieldName}`);
        }
      });
    }
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        if (propName.startsWith("_")) {
          if (propName === "_submitDisabled" && propSchema.const === true) {
            const submitBtn = this.element.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.setAttribute("disabled", "disabled");
            }
          }
        } else {
          const field = this.element.querySelector(`[data-schema-path="${propName}"]`);
          if (field) {
            console.log(`Showing field: ${propName}`);
            this.showFieldElement(field, `Property in schema condition: ${reason}`);
          } else {
            console.log(`Field not found for path: ${propName}`);
          }
        }
      });
    }
  }
  getNestedValue(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === void 0 || current === null) {
        return void 0;
      }
      current = current[part];
    }
    return current;
  }
  // New method to initialize form data from existing fields
  initializeFormDataFromFields() {
    if (!this.formElement) return;
    console.log("Initializing form data from fields");
    const inputs = this.formElement.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      const element = input;
      const schemaElement = element.closest("[data-schema-id], [data-schema-path]");
      const fieldId = (schemaElement == null ? void 0 : schemaElement.getAttribute("data-schema-id")) || (schemaElement == null ? void 0 : schemaElement.getAttribute("data-schema-path")) || element.name;
      if (fieldId) {
        this.updateFormDataFromField(fieldId, element);
      }
    });
    console.log("Initial form data:", this.formData);
    if (this.options.onChange) {
      this.options.onChange(this.getFormData());
    }
  }
  // Public method to get field visibility history
  getFieldVisibilityHistory() {
    return { ...this.fieldVisibilityHistory };
  }
  /**
   * Returns detailed information about all fields including visibility state
   */
  getFieldVisibilityReport() {
    if (!this.element) return {};
    const fields = this.element.querySelectorAll("[data-schema-path]");
    const report = {};
    fields.forEach((field) => {
      const path = field.getAttribute("data-schema-path");
      if (!path) return;
      const isVisible = !field.classList.contains("hidden");
      const inputs = field.querySelectorAll("input, select, textarea");
      const inputDetails = Array.from(inputs).map((input) => ({
        name: input.name,
        type: input.type,
        value: input.value,
        required: input.hasAttribute("required")
      }));
      const history = this.fieldVisibilityHistory[path] || [];
      const lastAction = history.length > 0 ? history[history.length - 1] : void 0;
      report[path] = {
        visible: isVisible,
        lastAction,
        history: history.slice(-5),
        // Get the 5 most recent actions
        inputs: inputDetails.length > 0 ? inputDetails : void 0
      };
    });
    return report;
  }
}
function createSchemaForm(element, options) {
  const form = new SchemaForm(element, options);
  return form;
}
export {
  SchemaForm,
  createSchemaForm,
  getArrayItemsData,
  setupArrayHandlers
};
//# sourceMappingURL=runtime.es.js.map
