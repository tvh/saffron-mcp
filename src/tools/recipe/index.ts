// Recipe-related tools
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerGraphQlTool } from '../../mcp.js';
import {
  SaffronClient,
} from '../../graphql.js';
import { instructionsFromSlate, instructionsSchema } from './instructions.js';
import { RecipesByCookbookAndSectionIdDocument, RecipesByCookbookAndSectionIdQuery, RecipesByCookbookAndSectionIdQueryVariables, GetRecipeByIdDocument, GetRecipeByIdQuery, GetRecipeByIdQueryVariables, ImportRecipeFromWebsiteDocument, ImportRecipeFromWebsiteMutation, ImportRecipeFromWebsiteMutationVariables, ImportRecipeFromTextDocument, ImportRecipeFromTextMutation, ImportRecipeFromTextMutationVariables, CreateRecipeMutation, CreateRecipeMutationVariables, CreateRecipeDocument, UpdateRecipeMutation, UpdateRecipeMutationVariables, UpdateRecipeDocument, RecipeInputSchema, RegularIngredient } from '../../generated/graphql.js';

export function registerRecipeTools(server: McpServer, client: SaffronClient) {
  registerGraphQlTool<RecipesByCookbookAndSectionIdQuery, RecipesByCookbookAndSectionIdQueryVariables>(
    server,
    client,
    { name: 'recipes_by_cookbook_and_section_id', description: 'Get short summary of recipes by cookbook and section ID. SectionIds are globally unique and can be found through the sections_by_cookbook_id tool.', document: RecipesByCookbookAndSectionIdDocument, inputSchema: { sectionId: z.string().describe('The ID of the section to get recipes for. Get this using the sections_by_cookbook_id tool.') } },
  );

  registerGraphQlTool<GetRecipeByIdQuery, GetRecipeByIdQueryVariables>(
    server,
    client,
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
    server,
    client,
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
    server,
    client,
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

  // Recipe input schema for create and update operations
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
    server,
    client,
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
    server,
    client,
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
}
