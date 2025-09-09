# Saffron MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides AI assistants with access to [Saffron](https://www.mysaffronapp.com) recipe management functionality.

## Features

This MCP server enables AI assistants to:

- **Recipe Management**: Create, read, update recipes with full ingredient and instruction support
- **Recipe Import**: Import recipes from websites or text using Saffron's built-in parsing
- **Cookbook Organization**: Browse cookbooks, sections, and organize recipes
- **User Account**: Access user information and account details
- **Structured Data**: Handle complex recipe data including ingredients, instructions, timing, and metadata

## Available Tools

### User & Account
- `me` - Get your user information

### Cookbook Management
- `cookbooks` - Get your cookbooks
- `sections_by_cookbook_id` - Get sections by cookbook ID
- `recipes_by_cookbook_and_section_id` - Get recipe summaries by section

### Recipe Operations
- `get_recipe_by_id` - Get full recipe details by ID
- `create_recipe` - Create a new recipe
- `update_recipe` - Update an existing recipe

### Recipe Import
- `import_recipe_from_website` - Import recipe from a URL
- `import_recipe_from_text` - Import recipe from text

## Disclaimer

This project is not affiliated with or endorsed by Saffron. It provides client functionality that interacts with Saffron's publicly accessible API. Users are responsible for complying with Saffron's Terms of Service and applicable laws. Please use responsibly and respect rate limits.

## License

MIT License - see [LICENSE](LICENSE) file for details.
