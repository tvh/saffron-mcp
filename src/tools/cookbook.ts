// Cookbook and section-related tools
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { registerGraphQlTool } from '../mcp';
import {
  SaffronClient,
} from '../graphql';
import { CookbooksDocument, CookbooksQuery, CookbooksQueryVariables, SectionsByCookbookIdDocument, SectionsByCookbookIdQuery, SectionsByCookbookIdQueryVariables } from '../generated/graphql.js';

export function registerCookbookTools(server: McpServer, client: SaffronClient) {
  registerGraphQlTool<CookbooksQuery, CookbooksQueryVariables>(
    server,
    client,
    { name: 'cookbooks', description: 'Get your cookbooks', document: CookbooksDocument, inputSchema: {} },
  );

  registerGraphQlTool<SectionsByCookbookIdQuery, SectionsByCookbookIdQueryVariables>(
    server,
    client,
    { name: 'sections_by_cookbook_id', description: 'Get sections by cookbook ID. CookbookIds are globally unique and can be found through the cookbooks tool.', document: SectionsByCookbookIdDocument, inputSchema: { cookbookId: z.string().describe('The ID of the cookbook to get sections for. Get this using the cookbooks tool.') } },
  );
}
