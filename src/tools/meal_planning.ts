// Account-related tools
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CreateMenuItemsDocument,
  type CreateMenuItemsMutation,
  type CreateMenuItemsMutationVariables,
  DeleteMenuItemsDocument,
  type DeleteMenuItemsMutation,
  type DeleteMenuItemsMutationVariables,
  MenuPlannerDocument,
  type MenuPlannerQuery,
  type MenuPlannerQueryVariables,
  MenuSectionsDocument,
  type MenuSectionsQuery,
  type MenuSectionsQueryVariables,
  UpdateMenuItemDocument,
  type UpdateMenuItemMutation,
  type UpdateMenuItemMutationVariables,
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
    description: "Get all menu items and menu notes for a given date range",
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

  registerGraphQlTool<CreateMenuItemsMutation, CreateMenuItemsMutationVariables, any>(
    server,
    client,
    {
      name: "create_menu_items",
      description: "Create a new menu item",
      document: CreateMenuItemsDocument,
      inputSchema: { menuItems: z.array(menuItemInputSchema) },
    }
  );

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

  registerGraphQlTool<UpdateMenuItemMutation, UpdateMenuItemMutationVariables, any>(
    server,
    client,
    {
      name: "update_menu_item",
      description: "Update a menu item",
      document: UpdateMenuItemDocument,
      inputSchema: { menuItem: menuItemUpdateInputSchema },
    }
  );

  registerGraphQlTool<DeleteMenuItemsMutation, DeleteMenuItemsMutationVariables>(server, client, {
    name: "delete_menu_item",
    description: "Delete a menu item",
    document: DeleteMenuItemsDocument,
    inputSchema: { ids: z.array(z.string()).describe("The IDs of the menu items to delete") },
  });
}
