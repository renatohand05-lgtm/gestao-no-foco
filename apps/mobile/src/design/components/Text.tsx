import { useTheme, themeTokens } from "@/design/theme";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

type Variant = "display" | "title" | "subtitle" | "body" | "caption";

export type TextProps = RNTextProps & {
  variant?: Variant;
  muted?: boolean;
};

export function Text({ variant = "body", muted, style, ...props }: TextProps) {
  const { colors } = useTheme();
  const token = themeTokens.typography[variant];
  return (
    <RNText
      style={[
        {
          color: muted ? colors.textMuted : colors.text,
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
          fontWeight: token.fontWeight,
        },
        style,
      ]}
      {...props}
    />
  );
}
