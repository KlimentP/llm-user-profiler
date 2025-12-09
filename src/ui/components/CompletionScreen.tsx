import { useEffect } from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import { InfoBox } from "./InfoBox.tsx";
import type { Config } from "../../config.js";

interface CompletionScreenProps {
	config: Config;
	onExit: () => void;
}

export const CompletionScreen = ({ config, onExit }: CompletionScreenProps) => {
	useEffect(() => {
		// Auto-exit after 5 seconds
		const timer = setTimeout(() => {
			onExit();
		}, 5000);

		return () => clearTimeout(timer);
	}, [onExit]);

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Gradient name="rainbow">
					<BigText text="SUCCESS!" font="tiny" />
				</Gradient>
			</Box>

			<Box>
				<Gradient name="passion">
					<Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
				</Gradient>
			</Box>

			<InfoBox title="All Phases Complete! 🎉" color="green">
				<Text color="green">✅ Planning phase completed</Text>
				<Text color="green">✅ Execution phase completed</Text>
				<Text color="green">✅ Profiling phase completed</Text>
			</InfoBox>

			<Box borderStyle="double" borderColor="cyan" padding={1}>
				<Box flexDirection="column">
					<Text bold color="cyan">
						📊 Generated Files:
					</Text>
					<Text> 📋 {config.outputDir}/analysis_plan.md</Text>
					<Text> 💾 {config.outputDir}/interim_results.json</Text>
					<Text> 👥 {config.outputDir}/user_profiles.json</Text>
				</Box>
			</Box>

			<Box marginTop={1} borderStyle="round" borderColor="yellow" padding={1}>
				<Text color="yellow">
					💡 Check your output directory for the complete user profiles!
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Exiting in 5 seconds... (or press Ctrl+C)</Text>
			</Box>
		</Box>
	);
};
