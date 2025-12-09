import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import Gradient from "ink-gradient";
import { InfoBox } from "./InfoBox.tsx";

type SetupStep =
	| "outputDir"
	| "apiKey"
	| "databaseUrl"
	| "posthogApiKey"
	| "posthogProjectId"
	| "contextPath"
	| "complete";

interface SetupPhaseProps {
	onComplete: (config: SetupResult) => void;
	onExit: () => void;
	error?: string | null;
}

export interface SetupResult {
	outputBaseDir: string;
	apiKey?: string;
	databaseUrl?: string;
	posthogApiKey?: string;
	posthogProjectId?: string;
	contextPath?: string;
}

export const SetupPhase = ({
	onComplete,
	onExit,
	error: externalError,
}: SetupPhaseProps) => {
	const [step, setStep] = useState<SetupStep>("outputDir");
	const [outputDir, setOutputDir] = useState(process.cwd());
	const [apiKey, setApiKey] = useState("");
	const [databaseUrl, setDatabaseUrl] = useState("");
	const [posthogApiKey, setPosthogApiKey] = useState("");
	const [posthogProjectId, setPosthogProjectId] = useState("");
	const [contextPath, setContextPath] = useState("");
	const [internalError, setInternalError] = useState<string | null>(null);

	const error = externalError || internalError;

	useInput((_input, key) => {
		if (key.escape) {
			onExit();
		}
	});

	const handleOutputDirSubmit = () => {
		if (!outputDir.trim()) {
			setInternalError("Output directory is required");
			return;
		}
		setInternalError(null);
		setStep("apiKey");
	};

	const handleApiKeySubmit = () => {
		setInternalError(null);
		setStep("databaseUrl");
	};

	const handleDatabaseUrlSubmit = () => {
		setInternalError(null);
		setStep("posthogApiKey");
	};

	const handlePosthogApiKeySubmit = () => {
		setInternalError(null);
		setStep("posthogProjectId");
	};

	const handlePosthogProjectIdSubmit = () => {
		setInternalError(null);
		setStep("contextPath");
	};

	const handleContextPathSubmit = () => {
		setInternalError(null);
		onComplete({
			outputBaseDir: outputDir.trim(),
			apiKey: apiKey.trim() || undefined,
			databaseUrl: databaseUrl.trim() || undefined,
			posthogApiKey: posthogApiKey.trim() || undefined,
			posthogProjectId: posthogProjectId.trim() || undefined,
			contextPath: contextPath.trim() || undefined,
		});
	};

	const renderStepIndicator = () => {
		const steps = [
			{ key: "outputDir", num: 1, label: "Output Dir" },
			{ key: "apiKey", num: 2, label: "API Key" },
			{ key: "databaseUrl", num: 3, label: "Database" },
			{ key: "posthogApiKey", num: 4, label: "PostHog API" },
			{ key: "posthogProjectId", num: 5, label: "PostHog Project" },
			{ key: "contextPath", num: 6, label: "Context" },
		];
		const currentIdx = steps.findIndex((s) => s.key === step);

		return (
			<Box gap={2} marginBottom={1}>
				{steps.map((s, idx) => (
					<Text
						key={s.key}
						color={
							idx === currentIdx ? "cyan" : idx < currentIdx ? "green" : "gray"
						}
						bold={idx === currentIdx}
					>
						{idx < currentIdx ? "✓" : idx === currentIdx ? "→" : "○"} {s.num}.{" "}
						{s.label}
					</Text>
				))}
			</Box>
		);
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Gradient name="pastel">
				<Text bold>Setup Configuration</Text>
			</Gradient>

			{renderStepIndicator()}

			{error && (
				<Box borderStyle="round" borderColor="red" paddingX={1}>
					<Text color="red">❌ {error}</Text>
				</Box>
			)}

			{step === "outputDir" && (
				<InfoBox title="Step 1: Output Directory">
					<Text color="gray">
						Enter the project path where the llm-user-profiler/ folder will be
						created.
					</Text>
					<Text color="gray" dimColor>
						Press Enter to use the current directory.
					</Text>
					<Box marginTop={1}>
						<Text color="cyan">Path: </Text>
						<TextInput
							value={outputDir}
							onChange={setOutputDir}
							onSubmit={handleOutputDirSubmit}
						/>
					</Box>
				</InfoBox>
			)}

			{step === "apiKey" && (
				<InfoBox title="Step 2: OPENROUTER_API_KEY">
					<Text color="gray">Enter your OpenRouter API key.</Text>
					<Text color="yellow" dimColor>
						Leave empty if it's in a .env file at: {outputDir}
					</Text>
					<Box marginTop={1}>
						<Text color="cyan">API Key: </Text>
						<TextInput
							value={apiKey}
							onChange={setApiKey}
							onSubmit={handleApiKeySubmit}
							mask="*"
						/>
					</Box>
				</InfoBox>
			)}

			{step === "databaseUrl" && (
				<InfoBox title="Step 3: DATABASE_URL">
					<Text color="gray">Enter your PostgreSQL connection string.</Text>
					<Text color="yellow" dimColor>
						Leave empty if it's in a .env file at: {outputDir}
					</Text>
					<Box marginTop={1}>
						<Text color="cyan">DATABASE_URL: </Text>
						<TextInput
							value={databaseUrl}
							onChange={setDatabaseUrl}
							onSubmit={handleDatabaseUrlSubmit}
						/>
					</Box>
				</InfoBox>
			)}

			{step === "posthogApiKey" && (
				<InfoBox title="Step 4: POSTHOG_API_KEY (Optional)">
					<Text color="gray">Enter your PostHog Personal API Key.</Text>
					<Text color="yellow" dimColor>
						Leave empty if it's in a .env file at: {outputDir}
					</Text>
					<Box marginTop={1}>
						<Text color="cyan">API Key: </Text>
						<TextInput
							value={posthogApiKey}
							onChange={setPosthogApiKey}
							onSubmit={handlePosthogApiKeySubmit}
							mask="*"
						/>
					</Box>
				</InfoBox>
			)}

			{step === "posthogProjectId" && (
				<InfoBox title="Step 4b: POSTHOG_PROJECT_ID (Optional)">
					<Text color="gray">Enter your PostHog Project ID.</Text>
					<Text color="yellow" dimColor>
						Required if using PostHog. Leave empty if in .env.
					</Text>
					<Box marginTop={1}>
						<Text color="cyan">Project ID: </Text>
						<TextInput
							value={posthogProjectId}
							onChange={setPosthogProjectId}
							onSubmit={handlePosthogProjectIdSubmit}
						/>
					</Box>
				</InfoBox>
			)}

			{step === "contextPath" && (
				<InfoBox title="Step 5: Context File (Optional)">
					<Text color="gray">Enter the path to a markdown context file.</Text>
					<Text color="yellow" dimColor>
						Leave empty for no context.
					</Text>
					<Box marginTop={1}>
						<Text color="cyan">Path: </Text>
						<TextInput
							value={contextPath}
							onChange={setContextPath}
							onSubmit={handleContextPathSubmit}
						/>
					</Box>
				</InfoBox>
			)}

			<Box marginTop={1}>
				<Text dimColor>Press ESC to exit • Press Enter to continue</Text>
			</Box>
		</Box>
	);
};
