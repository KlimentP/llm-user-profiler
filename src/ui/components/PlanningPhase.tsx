import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import SelectInput from "ink-select-input";
import Gradient from "ink-gradient";
import { InfoBox } from "./InfoBox.tsx";
import { generatePlan } from "../../planner.js";
import type { Config } from "../../config.js";

interface PlanningPhaseProps {
	config: Config;
	existingPlan?: string;
	onComplete: (planPath: string) => void;
	onExit: () => void;
}

type PlanningState = "choosing" | "generating" | "reviewing" | "done";

export const PlanningPhase = ({
	config,
	existingPlan,
	onComplete,
	onExit,
}: PlanningPhaseProps) => {
	const [state, setState] = useState<PlanningState>(
		existingPlan ? "choosing" : "generating",
	);
	const [planPath, setPlanPath] = useState<string | undefined>(existingPlan);
	const [error, setError] = useState<string>();

	const [targetFilename, setTargetFilename] = useState<string | undefined>(
		undefined,
	);

	useEffect(() => {
		if (state === "generating") {
			generatePlan(config, targetFilename)
				.then((path) => {
					setPlanPath(path);
					setState("reviewing");
				})
				.catch((err) => {
					setError(err.message);
				});
		}
	}, [state, config, targetFilename]);

	const handleChoice = (item: { value: string }) => {
		if (item.value === "use-existing") {
			setState("reviewing");
		} else if (item.value === "overwrite") {
			setTargetFilename(undefined); // Default to analysis_plan.md
			setState("generating");
		} else if (item.value === "generate-new-version") {
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			setTargetFilename(`analysis_plan_${timestamp}.md`);
			setState("generating");
		}
	};

	const handleReview = (item: { value: string }) => {
		if (item.value === "proceed" && planPath) {
			onComplete(planPath);
		} else if (item.value === "exit") {
			onExit();
		}
	};

	if (error) {
		return (
			<Box borderStyle="round" borderColor="red" padding={1}>
				<Text color="red">❌ Error: {error}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Gradient name="morning">
					<Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
				</Gradient>
			</Box>
			<Box>
				<Gradient name="morning">
					<Text bold>📋 Phase 1: Planning</Text>
				</Gradient>
			</Box>
			<Box>
				<Gradient name="morning">
					<Text bold>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>
				</Gradient>
			</Box>

			{state === "choosing" && (
				<Box flexDirection="column" gap={1}>
					<InfoBox title="Existing Plan Found" color="yellow">
						<Text>{existingPlan}</Text>
					</InfoBox>

					<Box marginTop={1}>
						<Text bold>Choose an option:</Text>
					</Box>

					<SelectInput
						items={[
							{ label: "✅ Use Existing Plan", value: "use-existing" },
							{ label: "⚠️  Overwrite Existing Plan", value: "overwrite" },
							{
								label: "➕ Generate New Ver. (Timestamped)",
								value: "generate-new-version",
							},
						]}
						onSelect={handleChoice}
					/>
				</Box>
			)}

			{state === "generating" && (
				<Box flexDirection="column" gap={1}>
					<Box>
						<Text color="cyan">
							<Spinner type="dots" /> Generating analysis plan...
						</Text>
					</Box>
					<InfoBox title="What's happening?">
						<Text>🔍 Introspecting database schema</Text>
						<Text>🧠 Using LLM to generate analysis strategy</Text>
						<Text>📝 Creating SQL queries and profile structure</Text>
						{targetFilename && (
							<Text color="yellow">💾 Saving to: {targetFilename}</Text>
						)}
					</InfoBox>
				</Box>
			)}

			{state === "reviewing" && planPath && (
				<Box flexDirection="column" gap={1}>
					<Box borderStyle="round" borderColor="green" padding={1}>
						<Text color="green">✅ Plan ready: {planPath}</Text>
					</Box>

					<InfoBox title="Next Steps">
						<Text>1. Review the analysis plan in your editor</Text>
						<Text>2. Modify SQL queries if needed</Text>
						<Text>3. Proceed to execution when ready</Text>
					</InfoBox>

					<Box marginTop={1}>
						<Text bold>Ready to proceed?</Text>
					</Box>

					<SelectInput
						items={[
							{ label: "✅ Proceed to Execution", value: "proceed" },
							{ label: "⏸️  Exit (modify plan first)", value: "exit" },
						]}
						onSelect={handleReview}
					/>
				</Box>
			)}
		</Box>
	);
};
