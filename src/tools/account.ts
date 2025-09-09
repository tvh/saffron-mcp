// Account-related tools
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphQlTool } from '../mcp.js';
import { SaffronClient } from '../graphql.js';
import { MeDocument, MeQuery, MeQueryVariables } from '../generated/graphql.js';

export function registerAccountTools(server: McpServer, client: SaffronClient) {
  registerGraphQlTool<MeQuery, MeQueryVariables>(
    server,
    client,
    { name: 'me', description: 'Get your user information', document: MeDocument, inputSchema: {} },
  );
}
