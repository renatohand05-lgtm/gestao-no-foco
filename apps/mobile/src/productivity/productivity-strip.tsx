import { useSessionStore } from "@/auth/session-store";
import { Card, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import {
  listCommandsForPermissions,
  resolveAdaptiveProfile,
  shortcutsForProfile,
} from "@/productivity/commands";
import { openProductivityRoute } from "@/productivity/navigate";
import {
  clearRecents,
  loadFavorites,
  loadRecents,
  toggleFavorite,
} from "@/productivity/storage";
import type { FavoriteItem, RecentItem } from "@/productivity/types";
import { usePermissions } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export function ProductivityStrip() {
  const { colors } = useTheme();
  const permissions = usePermissions();
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const userId = useSessionStore((s) => s.snapshot.userId) ?? "";
  const qc = useQueryClient();

  const profile = useMemo(
    () => resolveAdaptiveProfile(permissions),
    [permissions],
  );
  const shortcuts = useMemo(() => {
    const base = shortcutsForProfile(profile);
    return listCommandsForPermissions(permissions, undefined).filter((c) =>
      base.some((b) => b.id === c.id),
    );
  }, [permissions, profile]);

  const prodKey = qk.entity({
    tenantId: tenantId || null,
    branchId,
    module: "productivity-local",
    filters: { userId },
  });

  const localQuery = useQuery({
    queryKey: prodKey,
    enabled: Boolean(userId && tenantId),
    staleTime: 5_000,
    queryFn: async () => {
      const [recents, favorites] = await Promise.all([
        loadRecents(userId, tenantId!, branchId),
        loadFavorites(userId, tenantId!, branchId),
      ]);
      return { recents, favorites };
    },
  });

  const recents: RecentItem[] = localQuery.data?.recents ?? [];
  const favorites: FavoriteItem[] = localQuery.data?.favorites ?? [];

  const invalidateLocal = () => void qc.invalidateQueries({ queryKey: prodKey });

  const runShortcut = async (id: string) => {
    if (id === "search") {
      router.push("/busca");
      return;
    }
    if (id === "scanner") {
      router.push("/scanner");
      return;
    }
    const cmd = shortcuts.find((c) => c.id === id);
    if (cmd?.route) {
      await openProductivityRoute({ route: cmd.route, opensWeb: cmd.opensWeb });
    }
  };

  return (
    <View style={styles.wrap} accessibilityLabel="Área de produtividade">
      <Text variant="subtitle" style={styles.title}>
        Produtividade · {profile}
      </Text>

      <View style={styles.row}>
        <Chip
          label="Busca"
          onPress={() => router.push("/busca")}
          color={colors.primary}
        />
        <Chip
          label="Comandos"
          onPress={() => router.push("/comandos")}
          color={colors.primary}
        />
        <Chip
          label="Scanner"
          onPress={() => router.push("/scanner")}
          color={colors.primary}
        />
      </View>

      <Text variant="caption" muted style={styles.caption}>
        Atalhos do perfil
      </Text>
      <View style={styles.row}>
        {shortcuts.map((s) => (
          <Chip
            key={s.id}
            label={s.label.replace(/^Abrir /, "")}
            onPress={() => void runShortcut(s.id)}
            color={colors.border}
          />
        ))}
      </View>

      <Text variant="caption" muted style={styles.caption}>
        Favoritos
      </Text>
      {favorites.length === 0 ? (
        <Text variant="caption" muted>
          Nenhum favorito ainda. Use ★ na busca.
        </Text>
      ) : (
        favorites.slice(0, 6).map((f) => (
          <Card key={`${f.type}-${f.id}`} style={styles.item}>
            <Pressable
              style={styles.itemRow}
              accessibilityRole="button"
              accessibilityLabel={`Favorito ${f.title}`}
              onPress={() =>
                void openProductivityRoute({
                  route: f.route,
                  opensWeb: f.opensWeb,
                })
              }
              onLongPress={() => {
                if (!userId || !tenantId) return;
                void toggleFavorite(userId, tenantId, branchId, f).then(() =>
                  invalidateLocal(),
                );
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body">{f.title}</Text>
                <Text variant="caption" muted>
                  {f.type}
                </Text>
              </View>
            </Pressable>
          </Card>
        ))
      )}

      <View style={styles.recentHeader}>
        <Text variant="caption" muted>
          Continuar de onde parou
        </Text>
        {recents.length > 0 ? (
          <Pressable
            onPress={() => {
              if (!userId || !tenantId) return;
              void clearRecents(userId, tenantId, branchId).then(() =>
                invalidateLocal(),
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Limpar recentes"
            hitSlop={8}
          >
            <Text variant="caption" style={{ color: colors.primary }}>
              Limpar
            </Text>
          </Pressable>
        ) : null}
      </View>
      {recents.length === 0 ? (
        <Text variant="caption" muted>
          Sem itens recentes neste tenant/filial.
        </Text>
      ) : (
        recents.slice(0, 5).map((r) => (
          <Card key={`${r.type}-${r.id}-${r.at}`} style={styles.item}>
            <Pressable
              style={styles.itemRow}
              accessibilityRole="button"
              accessibilityLabel={`Recente ${r.title}`}
              onPress={() =>
                void openProductivityRoute({
                  route: r.route,
                  opensWeb: r.opensWeb,
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text variant="body">{r.title}</Text>
                <Text variant="caption" muted>
                  {r.subtitle ?? r.type}
                </Text>
              </View>
            </Pressable>
          </Card>
        ))
      )}
    </View>
  );
}

function Chip({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.chip, { borderColor: color }]}
    >
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 16 },
  title: { marginBottom: 4 },
  caption: { marginTop: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    justifyContent: "center",
  },
  item: { padding: 0 },
  itemRow: { padding: 12, minHeight: 48 },
  recentHeader: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
