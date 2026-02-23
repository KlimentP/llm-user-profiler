import fs from "fs/promises";
import path from "path";

const RUN_MANIFEST_FILE = "run_manifest.json";

export interface RunManifest {
	lastUpdatedAt: string;
	latestPlanPath?: string;
	latestInterimResultsPath?: string;
	latestProfilesPath?: string;
	lastExecutionCompletedAt?: string;
	lastExecutionMode?: "full" | "incremental";
}

export function getRunManifestPath(outputDir: string): string {
	return path.join(outputDir, RUN_MANIFEST_FILE);
}

export async function readRunManifest(
	outputDir: string,
): Promise<RunManifest | null> {
	try {
		const manifestPath = getRunManifestPath(outputDir);
		const content = await fs.readFile(manifestPath, "utf-8");
		return JSON.parse(content) as RunManifest;
	} catch {
		return null;
	}
}

export async function updateRunManifest(
	outputDir: string,
	updates: Omit<Partial<RunManifest>, "lastUpdatedAt">,
): Promise<void> {
	const existing = (await readRunManifest(outputDir)) || {
		lastUpdatedAt: new Date(0).toISOString(),
	};
	const next: RunManifest = {
		...existing,
		...updates,
		lastUpdatedAt: new Date().toISOString(),
	};

	const manifestPath = getRunManifestPath(outputDir);
	await fs.writeFile(manifestPath, JSON.stringify(next, null, 2), "utf-8");
}
