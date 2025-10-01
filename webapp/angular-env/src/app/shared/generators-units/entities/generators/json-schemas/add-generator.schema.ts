export const addSchema = {
  title: "Add Generator",
  type: "object",
  properties: {
    name: { type: "string", title: "Generator Name", minLength: 3 },
    codeArchive: { type: "file", title: "Code Archive" },
    description: { type: "string", title: "Description" },
    unit_id: { type: "select", title: "Unit" },
    element_id: { type: "select", title: "Element" },
    json_schema: {
      type: "textarea",
      title: "JSON Schema",
      default: JSON.stringify({
        title: "Settings",
        type: "object",
        properties: {
          operating_mode: {
            type: "string",
            enum: ["Normal Operation", "Fault Operation"],
            default: "Normal Operation"
          },
          sampling_rate: {
            type: "number",
            minimum: 1,
            default: 1000
          },
          duration: {
            type: "number",
            minimum: 1,
            default: 60
          }
        }
      }, null, 2)
    },
    json_settings: {
      type: "textarea",
      title: "JSON Settings",
      default: JSON.stringify({
        "operating_mode": "Normal Operation",
        "sampling_rate": 1000,
        "duration": 60
      }, null, 2)
    },
  },
  required: ["name", "codeArchive"]
};
