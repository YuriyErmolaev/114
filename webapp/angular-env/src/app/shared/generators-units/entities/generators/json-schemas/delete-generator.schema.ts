export const deleteSchema = {
  title: "Delete Generator",
  type: "object",
  properties: {
    name: { type: "string", title: "Generator Name" }
  },
  required: ["name"]
};
