// Cookbook and section-related tools
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import {
  CookbooksDocument,
  type CookbooksQuery,
  type CookbooksQueryVariables,
  SectionsByCookbookIdDocument,
  type SectionsByCookbookIdQuery,
  type SectionsByCookbookIdQueryVariables,
} from "../generated/graphql.js";
import type { SaffronClient } from "../graphql";
import { registerGraphQlTool } from "../mcp";

export function registerCookbookTools(server: McpServer, client: SaffronClient) {
  registerGraphQlTool<CookbooksQuery, CookbooksQueryVariables>(server, client, {
    name: "cookbooks",
    description: "Get your cookbooks",
    document: CookbooksDocument,
    inputSchema: {},
  });

  registerGraphQlTool<SectionsByCookbookIdQuery, SectionsByCookbookIdQueryVariables>(
    server,
    client,
    {
      name: "sections_by_cookbook_id",
      description:
        "Get sections by cookbook ID. CookbookIds are globally unique and can be found through the cookbooks tool.",
      document: SectionsByCookbookIdDocument,
      inputSchema: {
        cookbookId: z
          .string()
          .describe(
            "The ID of the cookbook to get sections for. Get this using the cookbooks tool."
          ),
      },
    }
  );
}
