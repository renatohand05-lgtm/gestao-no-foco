import { TAB_ICON_SIZE } from "@/design/tab-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: "home", inactive: "home-outline" },
  inteligencia: { active: "analytics", inactive: "analytics-outline" },
  crm: { active: "people", inactive: "people-outline" },
  estoque: { active: "cube", inactive: "cube-outline" },
  operacao: { active: "construct", inactive: "construct-outline" },
  financeiro: { active: "wallet", inactive: "wallet-outline" },
  profile: { active: "person-circle", inactive: "person-circle-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

export function TabBarIcon(props: {
  routeName: string;
  color: ColorValue;
  focused: boolean;
  size?: number;
}) {
  const set = ICONS[props.routeName] ?? {
    active: "ellipse" as IconName,
    inactive: "ellipse-outline" as IconName,
  };
  const name = props.focused ? set.active : set.inactive;
  return (
    <Ionicons
      name={name}
      size={props.size ?? TAB_ICON_SIZE}
      color={props.color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
