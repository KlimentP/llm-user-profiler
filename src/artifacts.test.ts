import { afterEach, describe, expect, test } from "bun:test";
import fs from "fs/promises";
import path from "path";
import { checkInterimResults } from "./executor";
import { checkExistingPlan } from "./planner";
import type { Config } from "./config";
import { updateRunManifest } from "./artifacts";

const tempDirs: string[] = [];

afterEach(async () => {
	for (const dir of tempDirs) {
		await fs.rm(dir, { recursive: true, force: true });
	}
	tempDirs.length = 0;
});

function createConfig(outputDir: string): Config {
	return {
		openRouterApiKey: "test-key",
		model: "test-model",
		outputDir,
	};
}

describe("artifact discovery", () => {
	test("returns most recently modified analysis plan", async () => {
		const outputDir = await fs.mkdtemp(path.join("/tmp", "profiler-plan-"));
		tempDirs.push(outputDir);

		const basePlanPath = path.join(outputDir, "analysis_plan.md");
		const timestampedPlanPath = path.join(
			outputDir,
			"analysis_plan_2026-02-22T10-00-00-000Z.md",
		);
		await fs.writeFile(basePlanPath, "# older", "utf-8");
		await fs.writeFile(timestampedPlanPath, "# newer", "utf-8");

		const now = Date.now();
		await fs.utimes(basePlanPath, now / 1000, (now - 60_000) / 1000);
		await fs.utimes(timestampedPlanPath, now / 1000, now / 1000);

		const foundPlan = await checkExistingPlan(createConfig(outputDir));
		expect(foundPlan).toBe(timestampedPlanPath);
	});

	test("prefers plan path from manifest when available", async () => {
		const outputDir = await fs.mkdtemp(path.join("/tmp", "profiler-plan-manifest-"));
		tempDirs.push(outputDir);

		const manifestPlanPath = path.join(outputDir, "analysis_plan_custom.md");
		await fs.writeFile(manifestPlanPath, "# manifest plan", "utf-8");
		await updateRunManifest(outputDir, { latestPlanPath: manifestPlanPath });

		const foundPlan = await checkExistingPlan(createConfig(outputDir));
		expect(foundPlan).toBe(manifestPlanPath);
	});

	test("returns latest timestamped interim file", async () => {
		const outputDir = await fs.mkdtemp(path.join("/tmp", "profiler-interim-"));
		tempDirs.push(outputDir);

		const interimDir = path.join(outputDir, "interim_results");
		await fs.mkdir(interimDir, { recursive: true });
		const older = path.join(
			interimDir,
			"interim_results_2026-02-22T10-00-00-000Z.json",
		);
		const newer = path.join(
			interimDir,
			"interim_results_2026-02-22T11-00-00-000Z.json",
		);

		await fs.writeFile(older, "[]", "utf-8");
		await fs.writeFile(newer, "[]", "utf-8");

		const foundInterim = await checkInterimResults(createConfig(outputDir));
		expect(foundInterim).toBe(newer);
	});

	test("prefers interim path from manifest when available", async () => {
		const outputDir = await fs.mkdtemp(
			path.join("/tmp", "profiler-interim-manifest-"),
		);
		tempDirs.push(outputDir);

		const interimPath = path.join(
			outputDir,
			"interim_results",
			"interim_results_2026-02-22T12-00-00-000Z.json",
		);
		await fs.mkdir(path.dirname(interimPath), { recursive: true });
		await fs.writeFile(interimPath, "[]", "utf-8");
		await updateRunManifest(outputDir, { latestInterimResultsPath: interimPath });

		const foundInterim = await checkInterimResults(createConfig(outputDir));
		expect(foundInterim).toBe(interimPath);
	});
});
