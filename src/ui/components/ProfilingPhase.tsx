import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import Gradient from "ink-gradient";
import { InfoBox } from "./InfoBox.tsx";
import { generateProfiles } from "../../profiler.js";
import type { Config } from "../../config.js";

interface ProfilingPhaseProps {
	config: Config;
	onComplete: () => void;
}

export const ProfilingPhase = ({ config, onComplete }: ProfilingPhaseProps) => {
	const [profiling, setProfiling] = useState(true);
	const [error, setError] = useState<string>();

	useEffect(() => {
		generateProfiles(config)
			.then(() => {
				setProfiling(false);
				// Auto-advance after a brief moment
				setTimeout(() => {
					onComplete();
				}, 1500);
			})
			.catch((err) => {
				setError(err.message);
				setProfiling(false);
			});
	}, [config, onComplete]);

	if (error) {
		return (
			<Box flexDirection="column" gap={1}>
				<Box borderStyle="round" borderColor="red" padding={1}>
					<Text color="red">❌ Profiling Error: {error}</Text>
				</Box>
				<Text dimColor>Press Ctrl+C to exit</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Gradient name="vice">
					<Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
				</Gradient>
			</Box>
			<Box>
				<Gradient name="vice">
					<Text bold>🧠 Phase 3: Profiling</Text>
				</Gradient>
			</Box>
			<Box>
				<Gradient name="vice">
					<Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
				</Gradient>
			</Box>

			{profiling ? (
				<Box flexDirection="column" gap={1}>
					<Box>
						<Text color="magenta">
							<Spinner type="bouncingBar" /> Generating user profiles with
							LLM...
						</Text>
					</Box>

					<InfoBox title="AI Processing">
						<Text>🤖 Loading interim results</Text>
						<Text>🧠 Analyzing user behavior patterns</Text>
						<Text>✍️ Generating qualitative insights</Text>
						<Text>📊 Creating structured profiles</Text>
					</InfoBox>

					<Box
						marginTop={1}
						borderStyle="single"
						borderColor="magenta"
						padding={1}
					>
						<Text dimColor>💡 Using {config.model} for profile generation</Text>
					</Box>
				</Box>
			) : (
				<Box flexDirection="column" gap={1}>
					<Box borderStyle="round" borderColor="green" padding={1}>
						<Text color="green">✅ Profiling complete!</Text>
					</Box>

					<InfoBox title="Profiles Generated" color="green">
						<Text>📁 {config.outputDir}/user_profiles.json</Text>
					</InfoBox>

					<Box>
						<Text color="cyan">
							<Spinner type="dots" /> Finalizing...
						</Text>
					</Box>
				</Box>
			)}
		</Box>
	);
};
