import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import Gradient from "ink-gradient";
import { InfoBox } from "./InfoBox.tsx";
import { executePlan } from "../../executor.js";
import type { Config } from "../../config.js";

interface ExecutionPhaseProps {
	config: Config;
	onComplete: () => void;
}

export const ExecutionPhase = ({ config, onComplete }: ExecutionPhaseProps) => {
	const [executing, setExecuting] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		executePlan(config)
			.then(() => {
				setExecuting(false);
				// Auto-advance after a brief moment
				setTimeout(() => {
					onComplete();
				}, 1500);
			})
			.catch((err) => {
				setError(err.message);
				setExecuting(false);
			});
	}, [config, onComplete]);

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
							<Spinner type="arc" /> Executing SQL queries...
						</Text>
					</Box>

					<InfoBox title="Processing">
						<Text>📊 Parsing analysis plan</Text>
						<Text>🗄️ Connecting to database</Text>
						<Text>🔍 Running SQL queries</Text>
						<Text>💾 Saving interim results</Text>
					</InfoBox>

					<Box
						marginTop={1}
						borderStyle="single"
						borderColor="blue"
						padding={1}
					>
						<Text dimColor>
							💡 Tip: Results will be saved to interim_results.json
						</Text>
					</Box>
				</Box>
			) : (
				<Box flexDirection="column" gap={1}>
					<Box borderStyle="round" borderColor="green" padding={1}>
						<Text color="green">✅ Execution complete!</Text>
					</Box>

					<InfoBox title="Results Saved" color="green">
						<Text>📁 {config.outputDir}/interim_results.json</Text>
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
