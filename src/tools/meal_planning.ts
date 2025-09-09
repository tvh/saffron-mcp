// Account-related tools
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    MenuPlannerDocument,
    MenuPlannerQuery,
  MenuPlannerQueryVariables,
  MenuSectionsDocument,
  type MenuSectionsQuery,
  type MenuSectionsQueryVariables,
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
  return z.object({
    sectionName: z.enum(sections.map((section) => section.name) as [string, ...string[]]),
  }).transform((input) => ({
    sectionId: sections.find((section) => section.name === input.sectionName)?.id!,
  }));
}

function omit<T, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const { [key]: _, ...rest } = obj;
  return rest;
}

export async function registerMealPlanningTools(server: McpServer, client: SaffronClient) {
  const sections = await getSections(client);

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
}
