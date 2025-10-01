export const updateSchema = {
  title: "Update Element",
  type: "object",
  properties: {
    name: { type: "string", title: "Element Name", minLength: 3 },
  },
  required: ["name"]
};
