import type { Config } from "./config";

const DEFAULT_HOST = "https://eu.i.posthog.com";

export async function executePostHogQuery(
	config: Config,
	query: string,
): Promise<any[]> {
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

	const data = await response.json();
	// PostHog returns results in a specific format (columns + results array of arrays) generally for SQL-like queries
	// but HogQL query response might vary. The docs say response has `results` and `columns` or similar.
	// Let's assume standard HogQL response structure.

	if (data.results && Array.isArray(data.results)) {
		// If columns provided, map to objects?
		// SQL output usually is array of arrays.
		// For profiling, objects are better.
		if (data.columns && Array.isArray(data.columns)) {
			return data.results.map((row: any[]) => {
				const obj: Record<string, any> = {};
				data.columns.forEach((col: string, i: number) => {
					obj[col] = row[i];
				});
				return obj;
			});
		}
		return data.results;
	}

	return [data];
}
