import { useState } from "react";
import { Box, useApp } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import { SetupPhase, type SetupResult } from "./components/SetupPhase.tsx";
import { WelcomeScreen } from "./components/WelcomeScreen.tsx";
import { PlanningPhase } from "./components/PlanningPhase.tsx";
import { ExecutionPhase } from "./components/ExecutionPhase.tsx";
import { ProfilingPhase } from "./components/ProfilingPhase.tsx";
import { CompletionScreen } from "./components/CompletionScreen.tsx";
import { loadConfig, type Config } from "../config.js";
import { checkExistingPlan } from "../planner.js";
import { checkInterimResults } from "../executor.js";

export type Phase =
	| "setup"
	| "welcome"
	| "planning"
	| "execution"
	| "profiling"
	| "complete";

export const App = () => {
	const [phase, setPhase] = useState<Phase>("setup");
	const [config, setConfig] = useState<Config | null>(null);
	const [planPath, setPlanPath] = useState<string | undefined>(undefined);
	const [existingPlan, setExistingPlan] = useState<string | undefined>(
		undefined,
	);
	const [existingInterim, setExistingInterim] = useState<string | undefined>(
		undefined,
	);
	const [setupError, setSetupError] = useState<string | null>(null);
	const { exit } = useApp();

	const handleSetupComplete = async (setupResult: SetupResult) => {
		try {
			const newConfig = loadConfig({
				outputBaseDir: setupResult.outputBaseDir,
				apiKey: setupResult.apiKey,
				databaseUrl: setupResult.databaseUrl,
				posthogApiKey: setupResult.posthogApiKey,
				posthogProjectId: setupResult.posthogProjectId,
				contextPath: setupResult.contextPath,
			});
			setConfig(newConfig);

			// Check for existing files
			const existingPlanPath = await checkExistingPlan(newConfig);
			const existingInterimPath = await checkInterimResults(newConfig);

			if (existingPlanPath) setExistingPlan(existingPlanPath);
			if (existingInterimPath) setExistingInterim(existingInterimPath);

			setPhase("welcome");
		} catch (error) {
			setSetupError(error instanceof Error ? error.message : String(error));
		}
	};

	const handleWelcomeComplete = (skipToPhase?: Phase) => {
		if (skipToPhase) {
			if (skipToPhase === "execution" && existingPlan) {
				setPlanPath(existingPlan);
			}
			setPhase(skipToPhase);
		} else {
			setPhase("planning");
		}
	};

	const handlePlanningComplete = (path: string) => {
		setPlanPath(path);
		setPhase("execution");
	};

	const handleExecutionComplete = () => {
		setPhase("profiling");
	};

	const handleProfilingComplete = () => {
		setPhase("complete");
	};

	const handleExit = () => {
		exit();
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Gradient name="rainbow">
					<BigText text="LLM Profiler" font="tiny" />
				</Gradient>
			</Box>

			{phase === "setup" && (
				<SetupPhase
					onComplete={handleSetupComplete}
					onExit={handleExit}
					error={setupError}
				/>
			)}

			{phase === "welcome" && config && (
				<WelcomeScreen
					config={config}
					existingPlan={existingPlan}
					existingInterim={existingInterim}
					onComplete={handleWelcomeComplete}
					onExit={handleExit}
				/>
			)}

			{phase === "planning" && config && (
				<PlanningPhase
					config={config}
					existingPlan={existingPlan}
					onComplete={handlePlanningComplete}
					onExit={handleExit}
				/>
			)}

			{phase === "execution" && config && planPath && (
				<ExecutionPhase config={config} onComplete={handleExecutionComplete} />
			)}

			{phase === "profiling" && config && (
				<ProfilingPhase config={config} onComplete={handleProfilingComplete} />
			)}

			{phase === "complete" && config && (
				<CompletionScreen config={config} onExit={handleExit} />
			)}
		</Box>
	);
};
