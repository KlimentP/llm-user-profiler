import { describe, expect, test } from "bun:test";
import {
	applyIncrementalTemplates,
	extractQueriesFromPlan,
	validateReadOnlySqlQuery,
} from "./executor";

describe("extractQueriesFromPlan", () => {
	test("extracts only SQL/HogQL blocks from explicit query sections", () => {
		const plan = `# Analysis Plan

## Example
\`\`\`sql
select 'example only';
\`\`\`

## SQL Queries
### Query 1: Active Users
\`\`\`sql
select id from users;
\`\`\`

## PostHog Queries
### Query 2: Page Views
\`\`\`hogql
select event, count() from events group by event;
\`\`\`
`;

		const queries = extractQueriesFromPlan(plan);
		expect(queries).toHaveLength(2);
		expect(queries[0]?.type).toBe("sql");
		expect(queries[0]?.query).toContain("select id from users");
		expect(queries[1]?.type).toBe("hogql");
	});

	test("ignores sample/example sections in fallback mode", () => {
		const plan = `# Example
\`\`\`sql
select 'skip me';
\`\`\`

## Real Work
\`\`\`sql
select now();
\`\`\`
`;

		const queries = extractQueriesFromPlan(plan);
		expect(queries).toHaveLength(1);
		expect(queries[0]?.query).toContain("select now()");
	});
});

describe("validateReadOnlySqlQuery", () => {
	test("allows select/with queries", () => {
		expect(() => validateReadOnlySqlQuery("select * from users")).not.toThrow();
		expect(() =>
			validateReadOnlySqlQuery("with x as (select 1) select * from x"),
		).not.toThrow();
	});

	test("rejects mutating queries and multiple statements", () => {
		expect(() =>
			validateReadOnlySqlQuery("delete from users where id = 1"),
		).toThrow();
		expect(() =>
			validateReadOnlySqlQuery("select * from users; select * from events"),
		).toThrow();
	});
});

describe("applyIncrementalTemplates", () => {
	test("replaces incremental placeholders with ISO timestamps", () => {
		const query =
			"select * from events where created_at >= {{since_last_run}} and created_at < {{until_now}}";
		const result = applyIncrementalTemplates(
			query,
			"2026-02-22T10:00:00.000Z",
			"2026-02-22T11:00:00.000Z",
		);

		expect(result).toContain("'2026-02-22T10:00:00.000Z'");
		expect(result).toContain("'2026-02-22T11:00:00.000Z'");
	});
});
