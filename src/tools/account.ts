// Account-related tools
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MeDocument, type MeQuery, type MeQueryVariables } from "../generated/graphql.js";
import type { SaffronClient } from "../graphql.js";
import { registerGraphQlTool } from "../mcp.js";

export function registerAccountTools(server: McpServer, client: SaffronClient) {
  registerGraphQlTool<MeQuery, MeQueryVariables>(server, client, {
    name: "me",
    description: "Get your user information (name, email, subscription status, etc.)",
    document: MeDocument,
    inputSchema: {},
  });
}
