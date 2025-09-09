// MCP server setup and utilities

import type { OperationVariables, TypedDocumentNode } from "@apollo/client/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { SaffronClient } from "./graphql.js";

// Helper function to register GraphQL-based MCP tools
export function registerGraphQlTool<
  TData,
  TVariables extends OperationVariables,
  TInput extends { [key in keyof TVariables]: any } = TVariables,
>(
  server: McpServer,
  client: SaffronClient,
  {
    name,
    description,
    document,
    inputSchema,
    transformOutput,
    annotations,
  }: {
    name: string;
    description: string;
    document: TypedDocumentNode<TData, TVariables>;
    inputSchema: {
      [K in keyof TVariables]: z.ZodType<TVariables[K], z.ZodTypeDef, TInput[K]>;
    };
    transformOutput?: (output: TData) => unknown;
    annotations?: ToolAnnotations & {
      title: string;
    };
  }
) {
  let isQuery = true;
  for (const definition of document.definitions) {
    if (definition.kind === "OperationDefinition" && definition.operation === "mutation") {
      isQuery = false;
      break;
    }
  }

  server.registerTool<typeof inputSchema, any>(
    name,
    {
      description,
      inputSchema,
      annotations,
    },
    // @ts-expect-error
    async (variablesRaw, _extra): Promise<CallToolResult> => {
      const variables = variablesRaw as TVariables;
      try {
        const result = isQuery
          ? await client.client.query<TData, TVariables>({
              query: document,
              variables: variables,
              fetchPolicy: "network-only",
            })
          : await client.client.mutate<TData, TVariables>({
              mutation: document,
              variables: variables,
            });

        if (result.errors) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                mimeType: "application/json",
                text: JSON.stringify(result.errors),
              },
            ],
          };
        }

        if (transformOutput) {
          result.data = transformOutput(result.data as TData) as any;
        }

        return {
          isError: false,
          content: [
            {
              type: "text" as const,
              mimeType: "application/json",
              text: JSON.stringify(result.data),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              mimeType: "application/json",
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred",
              }),
            },
          ],
        };
      }
    }
  );
}

// Create and configure MCP server
export function createMcpServer(): McpServer {
  return new McpServer(
    {
      name: "saffron",
      version: "0.0.1",
      description: "MCP server for interacting with Saffron recipe management",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
}
