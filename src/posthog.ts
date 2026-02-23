import type { Config } from "./config";

const DEFAULT_HOST = "https://eu.i.posthog.com";

export async function executePostHogQuery(
	config: Config,
	query: string,
): Promise<unknown[]> {
	if (!config.posthogApiKey || !config.posthogProjectId) {
		throw new Error(
			"PostHog API Key and Project ID are required for PostHog queries.",
		);
	}

	const host = process.env.POSTHOG_HOST || DEFAULT_HOST;
	const url = `${host}/api/projects/${config.posthogProjectId}/query/`;

	const body = {
		kind: "HogQLQuery",
		query: query,
	};

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.posthogApiKey}`,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`PostHog API Error (${response.status}): ${text}`);
	}

	const data = (await response.json()) as {
		results?: unknown;
		columns?: unknown;
		[key: string]: unknown;
	};
	// PostHog returns results in a specific format (columns + results array of arrays) generally for SQL-like queries
	// but HogQL query response might vary. The docs say response has `results` and `columns` or similar.
	// Let's assume standard HogQL response structure.

	if (Array.isArray(data.results)) {
		// If columns provided, map to objects?
		// SQL output usually is array of arrays.
		// For profiling, objects are better.
		const columns = data.columns;
		if (Array.isArray(columns)) {
			return data.results.map((row) => {
				const rowValues = Array.isArray(row) ? row : [row];
				const obj: Record<string, unknown> = {};
				columns.forEach((col: unknown, i: number) => {
					obj[String(col)] = rowValues[i];
				});
				return obj;
			});
		}
		return data.results;
	}

	return [data];
}
