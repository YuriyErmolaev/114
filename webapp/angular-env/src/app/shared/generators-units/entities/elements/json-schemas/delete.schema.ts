export const deleteSchema = {
  title: "Delete Element",
  type: "object",
  properties: {
    name: { type: "string", title: "Element Name" }
  },
  required: ["name"]
};
