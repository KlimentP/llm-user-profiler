import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import SelectInput from "ink-select-input";
import { InfoBox } from "./InfoBox.tsx";
import type { Config } from "../../config.js";
import type { Phase } from "../App.tsx";

interface WelcomeScreenProps {
	config: Config;
	existingPlan?: string;
	existingInterim?: string;
	onComplete: (skipToPhase?: Phase) => void;
	onExit: () => void;
}

export const WelcomeScreen = ({
	config,
	existingPlan,
	existingInterim,
	onComplete,
	onExit,
}: WelcomeScreenProps) => {
	const items = [];

	if (existingInterim) {
		items.push({
			label: "⚡ Resume from Profiling Phase",
			value: "resume-profiling",
		});
	}

	if (existingPlan) {
		items.push({
			label: "📋 Use Existing Plan",
			value: "use-plan",
		});
	}

	items.push(
		{
			label: "🚀 Start Fresh",
			value: "start",
		},
		{
			label: "❌ Exit",
			value: "exit",
		},
	);

	const handleSelect = (item: { value: string }) => {
		switch (item.value) {
			case "resume-profiling":
				onComplete("profiling");
				break;
			case "use-plan":
				onComplete("execution");
				break;
			case "start":
				onComplete();
				break;
			case "exit":
				onExit();
				break;
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<InfoBox title="Configuration">
				<Text>
					<Text color="cyan">Model:</Text> {config.model}
				</Text>
				<Text>
					<Text color="cyan">Output:</Text> {config.outputDir}
				</Text>
			</InfoBox>

			{existingPlan && (
				<Box borderStyle="round" borderColor="yellow" padding={1}>
					<Text>
						<Text color="yellow">📋 Found existing plan:</Text> {existingPlan}
					</Text>
				</Box>
			)}

			{existingInterim && (
				<Box borderStyle="round" borderColor="green" padding={1}>
					<Text>
						<Text color="green">💾 Found interim results:</Text>{" "}
						{existingInterim}
					</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Gradient name="pastel">
					<Text bold>What would you like to do?</Text>
				</Gradient>
			</Box>

			<SelectInput items={items} onSelect={handleSelect} />
		</Box>
	);
};
