export const addSchema = {
  title: "Add Element",
  type: "object",
  properties: {
    name: { type: "string", title: "Element Name", minLength: 3 },
  },
  required: ["name"],
};
