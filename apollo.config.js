module.exports = {
  client: {
    name: "saffron-client",
    tagName: "gql",
    includes: ["src/**/*.{ts,tsx,js,jsx,graphql,gql}", "operations/**/*.{graphql,gql}"],
    service: {
      name: "saffron-graphql",
      localSchemaFile: "./schema.graphql",
    },
  },
};
