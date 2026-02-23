import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import Gradient from "ink-gradient";
import { InfoBox } from "./InfoBox.tsx";
import { executePlan } from "../../executor.js";
import type { Config } from "../../config.js";
import type { ExecutionMode } from "../../executor.js";

interface ExecutionPhaseProps {
	config: Config;
	planPath: string;
	executionMode: ExecutionMode;
	onComplete: (resultsPath: string) => void;
}

export const ExecutionPhase = ({
	config,
	planPath,
	executionMode,
	onComplete,
}: ExecutionPhaseProps) => {
	const [executing, setExecuting] = useState(true);
	const [completedResultsPath, setCompletedResultsPath] = useState<
		string | undefined
	>(undefined);
	const [error, setError] = useState<string>();

	useEffect(() => {
		executePlan(config, planPath, { mode: executionMode })
			.then((resultsPath) => {
				setCompletedResultsPath(resultsPath);
				setExecuting(false);
				// Auto-advance after a brief moment
				setTimeout(() => {
					onComplete(resultsPath);
				}, 1500);
			})
			.catch((err) => {
				setError(err.message);
				setExecuting(false);
			});
	}, [config, planPath, executionMode, onComplete]);

	if (error) {
		return (
			<Box flexDirection="column" gap={1}>
				<Box borderStyle="round" borderColor="red" padding={1}>
					<Text color="red">❌ Execution Error: {error}</Text>
				</Box>
				<Text dimColor>Press Ctrl+C to exit</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Gradient name="fruit">
					<Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
				</Gradient>
			</Box>
			<Box>
				<Gradient name="fruit">
					<Text bold>⚙️ Phase 2: Execution</Text>
				</Gradient>
			</Box>
			<Box>
				<Gradient name="fruit">
					<Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
				</Gradient>
			</Box>

				{executing ? (
					<Box flexDirection="column" gap={1}>
					<Box>
						<Text color="cyan">
							<Spinner type="arc" /> Executing {executionMode} plan queries...
						</Text>
					</Box>

					<InfoBox title="Processing">
						<Text>📊 Parsing analysis plan</Text>
						<Text>🗄️ Connecting to database</Text>
						<Text>🔍 Running SQL/HogQL queries</Text>
						<Text>💾 Saving interim results</Text>
					</InfoBox>

					<Box
						marginTop={1}
						borderStyle="single"
						borderColor="blue"
						padding={1}
					>
						<Text dimColor>
							💡 Tip: Results are saved in the {config.outputDir}
							/interim_results folder
						</Text>
					</Box>
					</Box>
				) : (
					<Box flexDirection="column" gap={1}>
					<Box borderStyle="round" borderColor="green" padding={1}>
						<Text color="green">✅ Execution complete!</Text>
					</Box>

					<InfoBox title="Results Saved" color="green">
						<Text>
							📁{" "}
							{completedResultsPath ||
								`${config.outputDir}/interim_results/interim_results_<timestamp>.json`}
						</Text>
					</InfoBox>

					<Box>
						<Text color="cyan">
							<Spinner type="dots" /> Moving to profiling phase...
						</Text>
					</Box>
					</Box>
				)}
		</Box>
	);
};
