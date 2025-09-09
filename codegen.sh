#!/bin/bash
set -e

echo "Getting schema..."
npx get-graphql-schema https://prod.mysaffronapp.com/graphql > schema.graphql

echo "Extracting operations..."
mkdir -p operations
JS_FILE="https://www.mysaffronapp.com$(curl https://www.mysaffronapp.com/login | rg -o '<script src="/cra/static/js/main.[^"]+">' | rg -o '/cra/.*[.]chunk[.]js')"
echo "JS File: $JS_FILE"
curl "$JS_FILE.map" | \
  jq -r '.sourcesContent[] | select(. | test("sourceMappingURL=apolloComponents.js.map"))' | \
  rg -o --pcre2 --multiline --no-filename '(?<=client_1.gql `\n    )[^`]+' | \
  grep -v '${' > "operations/extracted.graphql"

echo "Generating types..."
npx graphql-codegen --config codegen.ts

echo "Done!"