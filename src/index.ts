#!/usr/bin/env npx tsx

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { Command } from "commander";
import { MeDocument, type MeQuery, type MeQueryVariables } from "./generated/graphql";
// Import from split files
import { SaffronClient } from "./graphql";
import { createMcpServer } from "./mcp";
import { registerAccountTools } from "./tools/account";
import { registerCookbookTools } from "./tools/cookbook";
import { registerRecipeTools } from "./tools/recipe";

const client = new SaffronClient();

// Create MCP server
const server = createMcpServer();

// Register all tools
registerAccountTools(server, client);
registerCookbookTools(server, client);
registerRecipeTools(server, client);

// Command line interface setup
const program = new Command();

program
  .name("saffron")
  .description("Saffron MCP server for GraphQL operations")
  .version("0.0.1")
  .requiredOption("-u, --email <email>", "Email for authentication")
  .requiredOption("-p, --password <password>", "Password for authentication")
  .parse();

interface CliOptions {
  email: string;
  password: string;
}

// Start the server
async function main() {
  const options = program.opts<CliOptions>();

  // Try to load saved tokens first
  let authenticated = false;
  if (client.loadTokensForEmail(options.email)) {
    try {
      // Test if the saved tokens are still valid
      const me = await client.client.query<MeQuery, MeQueryVariables>({
        query: MeDocument,
        fetchPolicy: "network-only",
      });
      console.error("Authenticated with saved tokens");
      console.error("Me:", JSON.stringify(me, null, 2));
      authenticated = true;
    } catch (_error) {
      console.error("Saved tokens are invalid, will need to login with password");
    }
  }

  // If not authenticated with saved tokens, try password login
  if (!authenticated) {
    if (!options.password) {
      console.error(
        "No saved tokens found and no password provided. Please provide a password with -p or --password"
      );
      process.exit(1);
    }

    await client.login(options.email, options.password);
    const me = await client.client.query<MeQuery, MeQueryVariables>({
      query: MeDocument,
      fetchPolicy: "network-only",
    });
    console.error("Me:", JSON.stringify(me, null, 2));
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Saffron MCP server running on stdio");
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.error("Shutting down Saffron MCP server...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("Shutting down Saffron MCP server...");
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
