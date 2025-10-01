export const updateSchema = {
  title: "Update equipment unit",
  type: "object",
  properties: {
    name: { type: "string", title: "Equipment unit name", minLength: 3 },
    // unitFile: { type: "string", format: "binary", title: "Unit File" },
    description_md: { type: "textarea", title: "Description md" },
  },
  required: ["name"]
};
