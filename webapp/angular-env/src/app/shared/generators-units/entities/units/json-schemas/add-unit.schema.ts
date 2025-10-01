export const addSchema = {
  title: "Add equipment unit",
  type: "object",
  properties: {
    name: { type: "string", title: "Equipment unit name", minLength: 3 },
    description_md: { type: "textarea", title: "Description md", 'ui:widget': 'media-uploader' },
    // unitFile: { type: "file", title: "Code Archive" },
  },
  required: ["name", "description_md"],
};
