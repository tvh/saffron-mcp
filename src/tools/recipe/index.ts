// Recipe-related tools
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CreateRecipeDocument,
  type CreateRecipeMutation,
  type CreateRecipeMutationVariables,
  GetRecipeByIdDocument,
  type GetRecipeByIdQuery,
  type GetRecipeByIdQueryVariables,
  ImportRecipeFromTextDocument,
  type ImportRecipeFromTextMutation,
  type ImportRecipeFromTextMutationVariables,
  ImportRecipeFromWebsiteDocument,
  type ImportRecipeFromWebsiteMutation,
  type ImportRecipeFromWebsiteMutationVariables,
  RecipeInputSchema,
  RecipesByCookbookAndSectionIdDocument,
  type RecipesByCookbookAndSectionIdQuery,
  type RecipesByCookbookAndSectionIdQueryVariables,
  type RegularIngredient,
  UpdateRecipeDocument,
  type UpdateRecipeMutation,
  type UpdateRecipeMutationVariables,
} from "../../generated/graphql.js";
import type { SaffronClient } from "../../graphql.js";
import { registerGraphQlTool } from "../../mcp.js";
import { type Instruction, instructionsFromSlate, instructionsSchema } from "./instructions.js";

function formatRecipe<T extends { instructions: string }>(
  recipe: T
): Omit<T, "instructions"> & { instructions: Instruction[] } {
  return {
    ...recipe,
    instructions: instructionsFromSlate(recipe.instructions),
  };
}

export function registerRecipeTools(server: McpServer, client: SaffronClient) {
  registerGraphQlTool<
    RecipesByCookbookAndSectionIdQuery,
    RecipesByCookbookAndSectionIdQueryVariables
  >(server, client, {
    name: "recipes_by_cookbook_and_section_id",
    description:
      "Get short summary of recipes by cookbook and section ID. SectionIds are globally unique and can be found through the sections_by_cookbook_id tool.",
    document: RecipesByCookbookAndSectionIdDocument,
    inputSchema: {
      sectionId: z
        .string()
        .describe(
          "The ID of the section to get recipes for. Get this using the sections_by_cookbook_id tool."
        ),
    },
  });

  registerGraphQlTool<GetRecipeByIdQuery, GetRecipeByIdQueryVariables>(server, client, {
    name: "get_recipe_by_id",
    description: "Get the full recipe by its ID",
    document: GetRecipeByIdDocument,
    inputSchema: { id: z.string() },
    transformOutput: (output) => {
      return {
        ...output,
        getRecipeById: output.getRecipeById && formatRecipe(output.getRecipeById),
      };
    },
  });

  registerGraphQlTool<ImportRecipeFromWebsiteMutation, ImportRecipeFromWebsiteMutationVariables>(
    server,
    client,
    {
      name: "import_recipe_from_website",
      description:
        "Import a recipe from a website. Returns the extracted recipe data that can then be used to create a new recipe through the createRecipe tool.",
      document: ImportRecipeFromWebsiteDocument,
      inputSchema: { url: z.string() },
      transformOutput: (output) => {
        return {
          ...output,
          importRecipeFromWebsite: formatRecipe(output.importRecipeFromWebsite),
        };
      },
    }
  );

  // Recipe input schema for create and update operations
  const regularIngredientSchema = z.object({
    amount: z.string().optional(),
    unit: z.string().optional(),
    name: z.string(),
    keyword: z.string().optional(),
  });

  const ingredientsSchema: z.ZodType<
    string,
    z.ZodTypeDef,
    Omit<RegularIngredient, "__typename">[]
  > = z
    .array(regularIngredientSchema)
    .transform<string>((xs) =>
      JSON.stringify(xs.map((x) => ({ ...x, __typename: "RegularIngredient" })))
    );

  const recipeInputSchema = z.object({
    ...RecipeInputSchema().shape,
    instructions: instructionsSchema,
    ingredients: ingredientsSchema,
    sectionId: z
      .string()
      .describe("The section ID of the recipe. Get this using the sections_by_cookbook_id tool."),
  });
  type RecipeInput = z.baseObjectInputType<typeof recipeInputSchema.shape>;

  registerGraphQlTool<CreateRecipeMutation, CreateRecipeMutationVariables, { recipe: RecipeInput }>(
    server,
    client,
    {
      name: "create_recipe",
      description: "Create a new recipe",
      document: CreateRecipeDocument,
      inputSchema: { recipe: recipeInputSchema },
      transformOutput: (output) => {
        return {
          ...output,
          createRecipe: {
            ...output.createRecipe,
            recipe: output.createRecipe.recipe && formatRecipe(output.createRecipe.recipe),
          },
        };
      },
    }
  );

  registerGraphQlTool<
    UpdateRecipeMutation,
    UpdateRecipeMutationVariables,
    { id: string; recipe: RecipeInput }
  >(server, client, {
    name: "update_recipe",
    description: "Update an existing recipe",
    document: UpdateRecipeDocument,
    inputSchema: { id: z.string(), recipe: recipeInputSchema },
    transformOutput: (output) => {
      return {
        ...output,
        updateRecipe: {
          ...output.updateRecipe,
          recipe: output.updateRecipe.recipe && formatRecipe(output.updateRecipe.recipe),
        },
      };
    },
  });
}
