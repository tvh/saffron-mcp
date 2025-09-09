#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApolloClient, InMemoryCache, HttpLink, NormalizedCacheObject, from, OperationVariables, TypedDocumentNode } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { Command } from 'commander';
import * as cookie from 'cookie';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import generated GraphQL operations
import {
  CookbooksDocument,
  CookbooksQuery,
  CookbooksQueryVariables,
  CreateRecipeDocument,
  CreateRecipeMutation,
  CreateRecipeMutationVariables,
  GetRecipeByIdDocument,
  GetRecipeByIdQuery,
  GetRecipeByIdQueryVariables,
  LoginDocument,
  MeDocument,
  MeQuery,
  MeQueryVariables,
  RecipeInputSchema,
  RecipesByCookbookAndSectionIdDocument,
  RecipesByCookbookAndSectionIdQuery,
  RecipesByCookbookAndSectionIdQueryVariables,
  UpdateRecipeDocument,
  UpdateRecipeMutation,
  UpdateRecipeMutationVariables,
  ImportRecipeFromWebsiteDocument,
  ImportRecipeFromWebsiteMutation,
  ImportRecipeFromWebsiteMutationVariables,
  SectionsByCookbookIdQuery,
  SectionsByCookbookIdQueryVariables,
  SectionsByCookbookIdDocument,
  ImportRecipeFromTextMutationVariables,
  ImportRecipeFromTextMutation,
  ImportRecipeFromTextDocument,
  RegularIngredient,
} from './generated/graphql.js';
import { instructionsFromSlate, instructionsSchema } from './instructions.js';
import { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

// Token storage utilities
interface TokenData {
  cookies: { [key: string]: string };
  timestamp: number;
}

interface TokenStorage {
  [email: string]: TokenData;
}

const getTokenFilePath = (): string => {
  const homeDir = os.homedir();
  return path.join(homeDir, '.saffron-tokens.json');
};

const loadTokens = (): TokenStorage => {
  try {
    const tokenFilePath = getTokenFilePath();
    if (fs.existsSync(tokenFilePath)) {
      const data = fs.readFileSync(tokenFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return {};
};

const saveTokens = (tokens: TokenStorage): void => {
  try {
    const tokenFilePath = getTokenFilePath();
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
};

const saveTokenForEmail = (email: string, cookies: { [key: string]: string }): void => {
  const tokens = loadTokens();
  tokens[email] = {
    cookies,
    timestamp: Date.now(),
  };
  saveTokens(tokens);
};

const loadTokenForEmail = (email: string): { [key: string]: string } | null => {
  const tokens = loadTokens();
  const tokenData = tokens[email];

  if (tokenData) {
    // Check if token is less than 30 days old
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - tokenData.timestamp < thirtyDaysInMs) {
      return tokenData.cookies;
    } else {
      // Remove expired token
      delete tokens[email];
      saveTokens(tokens);
    }
  }

  return null;
};

class SaffronClient {
  public client: ApolloClient<NormalizedCacheObject>;
  private cookies: { [key: string]: string } = {};
  private currentEmail: string | null = null;

  constructor() {
    // Context link to set headers (including dynamic cookie)
    const authLink = setContext((_, { headers }) => {
      // Build cookie header from stored cookies
      const cookieHeader = Object.keys(this.cookies).length > 0
        ? Object.entries(this.cookies)
          .map(([name, value]) => `${name}=${value}`)
          .join('; ')
        : undefined;

      return {
        headers: {
          ...headers,
          'content-type': 'application/json',
          'x-app-version': '1.4.109',
          'x-platform': 'main-web',
          'Origin': 'https://www.mysaffronapp.com',
          'Referer': 'https://www.mysaffronapp.com/',
          ...(cookieHeader && { 'Cookie': cookieHeader }),
        }
      };
    });

    // Custom HTTP link that can access response headers
    const httpLink = new HttpLink({
      uri: 'https://prod.mysaffronapp.com/graphql',
      fetch: async (uri, options) => {
        const response = await fetch(uri, options);

        // Extract and parse cookies from response headers
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          console.error('Received set-cookie:', setCookieHeader);

          // Parse the set-cookie header using the cookie library
          try {
            // Extract just the name=value part (before the first semicolon)
            const cookiePart = setCookieHeader.split(';')[0];
            if (cookiePart) {
              const parsed = cookie.parse(cookiePart);
              let cookiesUpdated = false;
              Object.entries(parsed).forEach(([name, value]) => {
                if (value) {
                  this.cookies[name] = value;
                  console.error(`Stored cookie: ${name}=${value}`);
                  cookiesUpdated = true;
                }
              });

              // Always save updated cookies to file if we have a current email
              if (cookiesUpdated && this.currentEmail) {
                saveTokenForEmail(this.currentEmail, this.cookies);
                console.error(`Updated saved tokens for ${this.currentEmail}`);
              }
            }
          } catch (error) {
            console.error('Error parsing cookie:', error);
          }
        }

        return response;
      }
    });

    this.client = new ApolloClient({
      link: from([authLink, httpLink]),
      cache: new InMemoryCache(),
    });
  }

  loadTokensForEmail(email: string): boolean {
    const savedTokens = loadTokenForEmail(email);
    if (savedTokens) {
      this.cookies = savedTokens;
      this.currentEmail = email;
      console.error(`Loaded saved tokens for ${email}`);
      return true;
    }
    return false;
  }

  async login(email: string, password: string) {
    this.currentEmail = email;

    const result = await this.client.mutate({
      mutation: LoginDocument,
      variables: { input: { email, password } },
    });

    // Note: Tokens are now automatically saved in the fetch function when set-cookie headers are received

    console.error('Login result:', JSON.stringify(result, null, 2));
    console.error('Cookies after login:', this.cookies);

    return result;
  }

  getCookies(): { [key: string]: string } {
    return this.cookies;
  }

  getCookie(name: string): string | undefined {
    return this.cookies[name];
  }
}

const client = new SaffronClient();

// Create MCP server
const server = new McpServer(
  {
    name: 'saffron',
    version: '0.0.1',
    description: 'MCP server for interacting with Saffron recipe management',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to register GraphQL-based MCP tools
function registerGraphQlTool<TData, TVariables extends OperationVariables, TInput extends { [key in keyof TVariables]: any } = TVariables>(
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
  },
) {
  let isQuery = true;
  for (const definition of document.definitions) {
    if (definition.kind === 'OperationDefinition' && definition.operation === 'mutation') {
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
    (async (variablesRaw, extra): Promise<CallToolResult> => {
      let variables = variablesRaw as TVariables;
      try {
        const result = isQuery
          ? await client.client.query<TData, TVariables>({
            query: document,
            variables: variables,
            fetchPolicy: 'network-only',
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
                type: 'text' as const,
                mimeType: 'application/json',
                text: JSON.stringify(result.errors),
              },
            ],
          }
        }

        if (transformOutput) {
          result.data = transformOutput(result.data as TData) as any;
        }

        return {
          isError: false,
          content: [
            {
              type: 'text' as const,
              mimeType: 'application/json',
              text: JSON.stringify(result.data),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              mimeType: 'application/json',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
              }),
            },
          ],
        };
      }
    })
  );
}

registerGraphQlTool<MeQuery, MeQueryVariables>(
  { name: 'me', description: 'Get your user information', document: MeDocument, inputSchema: {} },
);

registerGraphQlTool<CookbooksQuery, CookbooksQueryVariables>(
  { name: 'cookbooks', description: 'Get your cookbooks', document: CookbooksDocument, inputSchema: {} },
);

registerGraphQlTool<SectionsByCookbookIdQuery, SectionsByCookbookIdQueryVariables>(
  { name: 'sections_by_cookbook_id', description: 'Get sections by cookbook ID. CookbookIds are globally unique and can be found through the cookbooks tool.', document: SectionsByCookbookIdDocument, inputSchema: { cookbookId: z.string().describe('The ID of the cookbook to get sections for. Get this using the cookbooks tool.') } },
);

registerGraphQlTool<RecipesByCookbookAndSectionIdQuery, RecipesByCookbookAndSectionIdQueryVariables>(
  { name: 'recipes_by_cookbook_and_section_id', description: 'Get short summary of recipes by cookbook and section ID. SectionIds are globally unique and can be found through the sections_by_cookbook_id tool.', document: RecipesByCookbookAndSectionIdDocument, inputSchema: { sectionId: z.string().describe('The ID of the section to get recipes for. Get this using the sections_by_cookbook_id tool.') } },
);

registerGraphQlTool<GetRecipeByIdQuery, GetRecipeByIdQueryVariables>(
  {
    name: 'get_recipe_by_id', description: 'Get the full recipe by its ID', document: GetRecipeByIdDocument, inputSchema: { id: z.string() }, transformOutput: (output) => {
      return {
        ...output,
        getRecipeById: output.getRecipeById && {
          ...output.getRecipeById,
          instructions: instructionsFromSlate(output.getRecipeById.instructions),
        },
      };
    }
  },
);

registerGraphQlTool<ImportRecipeFromWebsiteMutation, ImportRecipeFromWebsiteMutationVariables>(
  {
    name: 'import_recipe_from_website', description: 'Import a recipe from a website. Returns the extracted recipe data that can then be used to create a new recipe through the createRecipe tool.', document: ImportRecipeFromWebsiteDocument, inputSchema: { url: z.string() }, transformOutput: (output) => {
      return {
        ...output,
        importRecipeFromWebsite: {
          ...output.importRecipeFromWebsite,
          instructions: instructionsFromSlate(output.importRecipeFromWebsite.instructions),
        },
      };
    }
  },
);

registerGraphQlTool<ImportRecipeFromTextMutation, ImportRecipeFromTextMutationVariables>(
  {
    name: 'import_recipe_from_text', description: 'Import a recipe from text. Returns the extracted recipe data that can then be used to create a new recipe through the createRecipe tool.', document: ImportRecipeFromTextDocument, inputSchema: { text: z.string() }, transformOutput: (output) => {
      return {
        ...output,
        importRecipeFromText: {
          ...output.importRecipeFromText,
          instructions: instructionsFromSlate(output.importRecipeFromText.instructions),
        },
      };
    }
  },
);

const regularIngredientSchema = z.object({
  amount: z.string().optional(),
  unit: z.string().optional(),
  name: z.string(),
  keyword: z.string().optional(),
});

const ingredientsSchema: z.ZodType<string, z.ZodTypeDef, (Omit<RegularIngredient, '__typename'>)[]> = z.array(regularIngredientSchema).transform<string>(
  xs => JSON.stringify(xs.map(x => ({ ...x, __typename: "RegularIngredient" }))));

const recipeInputSchema = z.object({
  ...RecipeInputSchema().shape,
  instructions: instructionsSchema,
  ingredients: ingredientsSchema,
  sectionId: z.string().describe('The section ID of the recipe. Get this using the sections_by_cookbook_id tool.'),
});
type RecipeInput = z.baseObjectInputType<typeof recipeInputSchema.shape>;

registerGraphQlTool<CreateRecipeMutation, CreateRecipeMutationVariables, { recipe: RecipeInput }>(
  {
    name: 'create_recipe', description: 'Create a new recipe', document: CreateRecipeDocument, inputSchema: { recipe: recipeInputSchema }, transformOutput: (output) => {
      return {
        ...output,
        createRecipe: {
          ...output.createRecipe,
          recipe: output.createRecipe.recipe && {
            ...output.createRecipe.recipe,
            instructions: instructionsFromSlate(output.createRecipe.recipe.instructions),
          },
        },
      };
    }
  },
);

registerGraphQlTool<UpdateRecipeMutation, UpdateRecipeMutationVariables, { id: string, recipe: RecipeInput }>(
  {
    name: 'update_recipe', description: 'Update an existing recipe', document: UpdateRecipeDocument, inputSchema: { id: z.string(), recipe: recipeInputSchema }, transformOutput: (output) => {
      return {
        ...output,
        updateRecipe: {
          ...output.updateRecipe,
          recipe: output.updateRecipe.recipe && {
            ...output.updateRecipe.recipe,
            instructions: instructionsFromSlate(output.updateRecipe.recipe.instructions),
          },
        },
      };
    }
  },
);

// Command line interface setup
const program = new Command();

program
  .name('saffron')
  .description('Saffron MCP server for GraphQL operations')
  .version('0.0.1')
  .requiredOption('-u, --email <email>', 'Email for authentication')
  .requiredOption('-p, --password <password>', 'Password for authentication')
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
        fetchPolicy: 'network-only',
      });
      console.error('Authenticated with saved tokens');
      console.error('Me:', JSON.stringify(me, null, 2));
      authenticated = true;
    } catch (error) {
      console.error('Saved tokens are invalid, will need to login with password');
    }
  }

  // If not authenticated with saved tokens, try password login
  if (!authenticated) {
    if (!options.password) {
      console.error('No saved tokens found and no password provided. Please provide a password with -p or --password');
      process.exit(1);
    }

    await client.login(options.email, options.password);
    const me = await client.client.query<MeQuery, MeQueryVariables>({
      query: MeDocument,
      fetchPolicy: 'network-only',
    });
    console.error('Me:', JSON.stringify(me, null, 2));
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Saffron MCP server running on stdio');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down Saffron MCP server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down Saffron MCP server...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});