import type { ReactNode } from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";

interface InfoBoxProps {
	title: string;
	children: ReactNode;
	color?: string;
}

export const InfoBox = ({ title, children, color = "cyan" }: InfoBoxProps) => {
	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={color}
			padding={1}
		>
			<Box marginBottom={1}>
				<Gradient name="cristal">
					<Text bold>✨ {title}</Text>
				</Gradient>
			</Box>
			<Box flexDirection="column" gap={0}>
				{children}
			</Box>
		</Box>
	);
};
