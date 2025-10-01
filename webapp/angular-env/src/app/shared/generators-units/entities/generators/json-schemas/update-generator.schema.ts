export const updateSchema = {
  title: "Update Generator",
  type: "object",
  properties: {
    name: { type: "string", title: "Generator Name", minLength: 3 },
    codeArchive: { type: "string", format: "binary", title: "Code Archive" },
    description: { type: "string", title: "Description" }
  },
  required: ["name"]
};
