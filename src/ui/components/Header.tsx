import { Box, Text } from "ink";
import Gradient from "ink-gradient";

interface HeaderProps {
	title: string;
	subtitle?: string;
}

export const Header = ({ title, subtitle }: HeaderProps) => {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Gradient name="rainbow">
					<Text bold>{"═".repeat(40)}</Text>
				</Gradient>
			</Box>
			<Box justifyContent="center">
				<Gradient name="passion">
					<Text bold> {title} </Text>
				</Gradient>
			</Box>
			{subtitle && (
				<Box justifyContent="center">
					<Text dimColor>{subtitle}</Text>
				</Box>
			)}
			<Box>
				<Gradient name="rainbow">
					<Text bold>{"═".repeat(40)}</Text>
				</Gradient>
			</Box>
		</Box>
	);
};
