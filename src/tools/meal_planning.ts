// Account-related tools
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CreateMenuItemsDocument,
  type CreateMenuItemsMutation,
  type CreateMenuItemsMutationVariables,
  CreateMenuNoteDocument,
  type CreateMenuNoteMutation,
  type CreateMenuNoteMutationVariables,
  DeleteMenuItemsDocument,
  type DeleteMenuItemsMutation,
  type DeleteMenuItemsMutationVariables,
  DeleteMenuNoteDocument,
  type DeleteMenuNoteMutation,
  type DeleteMenuNoteMutationVariables,
  MenuPlannerDocument,
  type MenuPlannerQuery,
  type MenuPlannerQueryVariables,
  MenuSectionsDocument,
  type MenuSectionsQuery,
  type MenuSectionsQueryVariables,
  UpdateMenuItemDocument,
  type UpdateMenuItemMutation,
  type UpdateMenuItemMutationVariables,
  UpdateMenuNoteDocument,
  UpdateMenuNoteInput,
  type UpdateMenuNoteMutation,
  type UpdateMenuNoteMutationVariables,
} from "../generated/graphql.js";
import type { SaffronClient } from "../graphql.js";
import { registerGraphQlTool } from "../mcp.js";

async function getSections(client: SaffronClient) {
  const result = await client.client.query<MenuSectionsQuery, MenuSectionsQueryVariables>({
    query: MenuSectionsDocument,
    variables: {},
  });
  return result.data.menuSections;
}
type MenuSection = MenuSectionsQuery["menuSections"][number];

function makeSectionIdSchema(sections: MenuSection[]) {
  return z
    .object({
      sectionName: z.enum(sections.map((section) => section.name) as [string, ...string[]]),
    })
    .transform((input) => ({
      menuSectionId: sections.find((section) => section.name === input.sectionName)?.id!,
    }));
}

function omit<T, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const { [key]: _, ...rest } = obj;
  return rest;
}

export async function registerMealPlanningTools(server: McpServer, client: SaffronClient) {
  const sections = await getSections(client);
  const sectionIdSchema = makeSectionIdSchema(sections);

  registerGraphQlTool<MenuPlannerQuery, MenuPlannerQueryVariables>(server, client, {
    name: "menu_planner",
    description: "Meal Planning: Get all menu items and menu notes for a given date range",
    document: MenuPlannerDocument,
    inputSchema: {
      startDate: z.string().date(),
      endDate: z.string().date(),
    },
    transformOutput: (output) => {
      return {
        ...output,
        menuPlanner: output.menuPlanner.map((item) => ({
          ...omit(item, "menuSectionId"),
          menuSection: sections.find((section) => section.id === item.menuSectionId)!.name,
        })),
      };
    },
  });

  const menuItemInputSchema = z.intersection(
    sectionIdSchema,
    z.object({
      date: z.string().date(),
      recipeId: z.string(),
    })
  );

  registerGraphQlTool<CreateMenuItemsMutation, CreateMenuItemsMutationVariables, any>(server, client, {
    name: "create_menu_item",
    description: "Meal Planning: Create a new menu item",
    document: CreateMenuItemsDocument,
    inputSchema: {
        // NOTE: We want to only create one menu item at a time.
        // The API suggests we could do multiple at once, but it results in a `not authorized` error.
        menuItems: menuItemInputSchema.transform((input) => [input]) },
  });

  const menuItemUpdateInputSchema = z.intersection(
    sectionIdSchema,
    z.object({
      id: z.string().describe("The ID of the menu item to update"),
      date: z.string().date().describe("The new date of the menu item"),
      scale: z
        .number()
        .optional()
        .describe("How much of the recipe to make (scale of 1.0 is the original recipe)"),
    })
  );

  registerGraphQlTool<UpdateMenuItemMutation, UpdateMenuItemMutationVariables, any>(server, client, {
    name: "update_menu_item",
    description: "Meal Planning: Update a menu item",
    document: UpdateMenuItemDocument,
    inputSchema: { menuItem: menuItemUpdateInputSchema },
  });

  registerGraphQlTool<DeleteMenuItemsMutation, DeleteMenuItemsMutationVariables>(server, client, {
    name: "delete_menu_item",
    description: "Meal Planning: Delete a menu item",
    document: DeleteMenuItemsDocument,
    inputSchema: { 
        // NOTE: We want to only delete one menu item at a time.
        // The API suggests we could do multiple at once, but it results in a `not authorized` error.
        ids: z.string().describe("The ID of the menu item to delete").transform((input) => [input])
    },
  });

  // Menu Notes CRUD operations
  const menuNoteInputSchema = z.intersection(
    sectionIdSchema,
    z.object({
      date: z.string().date(),
      text: z.string().describe("The text content of the note"),
    })
  );

  registerGraphQlTool<CreateMenuNoteMutation, CreateMenuNoteMutationVariables, any>(
    server,
    client,
    {
      name: "create_menu_note",
      description: "Meal Planning: Create a new menu note. A note can be an informal/family recipe, a note to yourself about the meal plan, etc.",
      document: CreateMenuNoteDocument,
      inputSchema: { input: menuNoteInputSchema },
    }
  );

  const menuNoteUpdateInputSchema = z.intersection(
    sectionIdSchema.optional(),
    z.object({
      date: z.string().date().optional().describe("The new date of the menu note"),
      text: z.string().optional().describe("The new text content of the note"),
    })
  );

  registerGraphQlTool<UpdateMenuNoteMutation, UpdateMenuNoteMutationVariables, any>(
    server,
    client,
    {
      name: "update_menu_note",
      description: "Meal Planning: Update a menu note",
      document: UpdateMenuNoteDocument,
      inputSchema: {
        id: z.string(),
        input: menuNoteUpdateInputSchema,
      },
    }
  );

  registerGraphQlTool<DeleteMenuNoteMutation, DeleteMenuNoteMutationVariables>(server, client, {
    name: "delete_menu_note",
    description: "Meal Planning: Delete a menu note",
    document: DeleteMenuNoteDocument,
    inputSchema: { id: z.string().describe("The ID of the menu note to delete") },
  });
}
