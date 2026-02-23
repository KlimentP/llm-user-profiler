import { describe, expect, test } from "bun:test";
import {
	applyProfileValidationAndConfidence,
	extractExpectedProfileFields,
	extractProfileSchemaFromPlan,
} from "./profiler";

describe("extractProfileSchemaFromPlan", () => {
	test("extracts schema JSON from User Profile Structure section", () => {
		const plan = `# Plan

## User Profile Structure
\`\`\`json
{
  "type": "object",
  "properties": {
    "userId": { "type": "string" },
    "engagement": { "type": "string" }
  }
}
\`\`\`
`;

		const schema = extractProfileSchemaFromPlan(plan);
		const fields = extractExpectedProfileFields(schema);
		expect(fields).toEqual(["userId", "engagement"]);
	});
});

describe("applyProfileValidationAndConfidence", () => {
	test("adds confidence and validation metadata", () => {
		const output = {
			profiles: [{ userId: "u1", engagement: "high" }, { userId: "u2" }],
			metadata: { totalUsers: 2 },
		};

		const result = applyProfileValidationAndConfidence(output, [
			"userId",
			"engagement",
		]);
		const profiles = result.profiles as Array<Record<string, unknown>>;
		const metadata = result.metadata as Record<string, unknown>;

		expect(profiles).toHaveLength(2);
		expect((profiles[0]?._confidence as Record<string, unknown>).score).toBe(1);
		expect((profiles[1]?._confidence as Record<string, unknown>).score).toBe(0.5);
		expect(metadata.validation).toBeDefined();
	});

	test("throws for non-object output", () => {
		expect(() =>
			applyProfileValidationAndConfidence(["not-object"], ["userId"]),
		).toThrow();
	});
});
