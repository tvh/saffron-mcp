import * as SlateLegacy from 'slate-legacy';
import { z } from 'zod';

export const instructionStepSchema = z.object({
  type: z.enum(['header', 'paragraph']),
  text: z.string(),
});

export const instructionsSchema = z.array(instructionStepSchema).transform((steps): SlateLegacy.ValueJSON => {
  const nodes = steps.map<SlateLegacy.NodeJSON>((step) => {
    if (step.type === 'header') {
      return {
        object: 'block',
        type: 'header-four',
        nodes: [{
          object: 'text',
          text: step.text,
        }],
      };
    } else {
      return {
        object: 'block',
        type: 'paragraph',
        nodes: [{
          object: 'text',
          text: step.text,
        }],
      };
    }
  });
  return {
    document: {
      nodes,
    },
  };
}).transform((value): string => {
  return JSON.stringify(value);
}).describe('The instructions for the recipe');

export type Instruction = z.infer<typeof instructionStepSchema>;

export function instructionsFromSlate(slateJsonString: string): Instruction[] {
  const value = JSON.parse(slateJsonString) as SlateLegacy.ValueJSON;
  const document = value.document!;
  const nodes = document.nodes! as SlateLegacy.BlockJSON[];
  return nodes.map((node) => {
    if (node.type === 'header-four') {
      return {
        type: 'header',
        text: (node.nodes![0]! as SlateLegacy.TextJSON).text!,
      };
    } else {
      return {
        type: 'paragraph',
        text: (node.nodes![0]! as SlateLegacy.TextJSON).text!,
      };
    }
  });
}