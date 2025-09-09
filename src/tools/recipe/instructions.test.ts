import { describe, expect, it } from "@jest/globals";
import { type Instruction, instructionsFromSlate, instructionsSchema } from "./instructions";

describe("Instructions roundtrip tests", () => {
  describe("Basic roundtrip functionality", () => {
    it("should roundtrip a simple paragraph instruction", () => {
      const original: Instruction[] = [{ type: "paragraph", text: "Mix the ingredients together" }];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip a simple header instruction", () => {
      const original: Instruction[] = [{ type: "header", text: "Preparation" }];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip multiple paragraph instructions", () => {
      const original: Instruction[] = [
        { type: "paragraph", text: "Preheat the oven to 350°F" },
        { type: "paragraph", text: "Mix flour and sugar in a bowl" },
        { type: "paragraph", text: "Add eggs one at a time" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip multiple header instructions", () => {
      const original: Instruction[] = [
        { type: "header", text: "Preparation" },
        { type: "header", text: "Cooking" },
        { type: "header", text: "Serving" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });
  });

  describe("Mixed content roundtrip tests", () => {
    it("should roundtrip mixed headers and paragraphs", () => {
      const original: Instruction[] = [
        { type: "header", text: "Preparation" },
        { type: "paragraph", text: "Gather all ingredients" },
        { type: "paragraph", text: "Preheat oven to 350°F" },
        { type: "header", text: "Mixing" },
        { type: "paragraph", text: "Combine dry ingredients" },
        { type: "paragraph", text: "Add wet ingredients gradually" },
        { type: "header", text: "Baking" },
        { type: "paragraph", text: "Pour into prepared pan" },
        { type: "paragraph", text: "Bake for 25-30 minutes" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip complex recipe with alternating types", () => {
      const original: Instruction[] = [
        { type: "header", text: "Step 1: Prep" },
        { type: "paragraph", text: "Wash and chop vegetables" },
        { type: "header", text: "Step 2: Cook" },
        { type: "paragraph", text: "Heat oil in pan" },
        { type: "header", text: "Step 3: Serve" },
        { type: "paragraph", text: "Plate and garnish" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });
  });

  describe("Edge cases and special characters", () => {
    it("should roundtrip empty array", () => {
      const original: Instruction[] = [];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip instructions with special characters", () => {
      const original: Instruction[] = [
        { type: "header", text: "Spécial Chàracters & Symbols!" },
        { type: "paragraph", text: "Add 1/2 cup of sugar (or 125g)" },
        { type: "paragraph", text: "Temperature: 180°C / 350°F" },
        { type: "paragraph", text: 'Mix with "wooden spoon" until smooth' },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip instructions with unicode characters", () => {
      const original: Instruction[] = [
        { type: "header", text: "🍰 Baking Instructions 🧁" },
        { type: "paragraph", text: "Add ingredients: flour ✓, sugar ✓, eggs ✓" },
        { type: "paragraph", text: "Mix until consistency is 👌" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip instructions with newlines and quotes", () => {
      const original: Instruction[] = [
        { type: "header", text: 'Chef\'s "Secret" Recipe' },
        { type: "paragraph", text: 'As my grandmother used to say: "Always taste as you go"' },
        { type: "paragraph", text: "Note: Don't overmix the batter!" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip instructions with very long text", () => {
      const longText =
        "This is a very long instruction that contains a lot of detailed information about the cooking process, including specific temperatures, timing, ingredient measurements, and various techniques that should be followed carefully to ensure the best possible outcome for this particular recipe step.";

      const original: Instruction[] = [
        { type: "header", text: "Detailed Cooking Instructions" },
        { type: "paragraph", text: longText },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });

    it("should roundtrip instructions with empty text", () => {
      const original: Instruction[] = [
        { type: "header", text: "" },
        { type: "paragraph", text: "" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      expect(roundtripped).toEqual(original);
    });
  });

  describe("Slate JSON structure validation", () => {
    it("should produce valid Slate JSON structure", () => {
      const original: Instruction[] = [
        { type: "header", text: "Test Header" },
        { type: "paragraph", text: "Test paragraph" },
      ];

      const slateJsonString = instructionsSchema.parse(original);
      const slateJson = JSON.parse(slateJsonString);

      // Validate the structure matches expected Slate format
      expect(slateJson).toHaveProperty("document");
      expect(slateJson.document).toHaveProperty("nodes");
      expect(Array.isArray(slateJson.document.nodes)).toBe(true);
      expect(slateJson.document.nodes).toHaveLength(2);

      // Check header node structure
      const headerNode = slateJson.document.nodes[0];
      expect(headerNode).toEqual({
        object: "block",
        type: "header-four",
        nodes: [
          {
            object: "text",
            text: "Test Header",
          },
        ],
      });

      // Check paragraph node structure
      const paragraphNode = slateJson.document.nodes[1];
      expect(paragraphNode).toEqual({
        object: "block",
        type: "paragraph",
        nodes: [
          {
            object: "text",
            text: "Test paragraph",
          },
        ],
      });
    });

    it("should handle JSON parsing errors gracefully in instructionsFromSlate", () => {
      const invalidJson = "invalid json string";

      expect(() => {
        instructionsFromSlate(invalidJson);
      }).toThrow();
    });
  });

  describe("Type consistency", () => {
    it("should maintain type consistency through roundtrip", () => {
      const original: Instruction[] = [
        { type: "header", text: "Header 1" },
        { type: "paragraph", text: "Paragraph 1" },
        { type: "header", text: "Header 2" },
        { type: "paragraph", text: "Paragraph 2" },
      ];

      const slateJson = instructionsSchema.parse(original);
      const roundtripped = instructionsFromSlate(slateJson);

      // Check that types are preserved
      expect(roundtripped[0]?.type).toBe("header");
      expect(roundtripped[1]?.type).toBe("paragraph");
      expect(roundtripped[2]?.type).toBe("header");
      expect(roundtripped[3]?.type).toBe("paragraph");

      // Check that text content is preserved
      expect(roundtripped[0]?.text).toBe("Header 1");
      expect(roundtripped[1]?.text).toBe("Paragraph 1");
      expect(roundtripped[2]?.text).toBe("Header 2");
      expect(roundtripped[3]?.text).toBe("Paragraph 2");
    });
  });
});
