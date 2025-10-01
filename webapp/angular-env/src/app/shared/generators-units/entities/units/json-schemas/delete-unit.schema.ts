export const deleteSchema = {
  title: "Delete equipment unit",
  type: "object",
  properties: {
    name: { type: "string", title: "Equipment unit name" }
  },
  required: ["name"]
};
