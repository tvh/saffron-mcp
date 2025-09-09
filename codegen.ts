import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: './schema.graphql',
  documents: [
    'src/**/*.{ts,tsx,js,jsx}',
    'operations/**/*.{graphql,gql}'
  ],
  generates: {
    'src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typed-document-node',
        'typescript-validation-schema'
      ],
      config: {
        strictScalars: true,
        schema: 'zod',
        skipTypename: false,
        enumsAsTypes: true,
        constEnums: true,
        futureProofEnums: true,
        futureProofUnions: true,
        nonOptionalTypename: true,
        documentMode: 'documentNode',
        scalars: {
          DateTime: 'string',
          Upload: 'File'
        },
        scalarSchemas: {
          DateTime: 'z.string().datetime()',
          Upload: 'z.instanceof(File)'
        }
      }
    }
  }
};

export default config;