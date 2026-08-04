import {
  fetchMobileSearch,
  type MobileSearchHit,
} from "@/api/mobile-api";
import { useSessionStore } from "@/auth/session-store";
import {
  Button,
  Card,
  ErrorState,
  Input,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { openProductivityRoute } from "@/productivity/navigate";
import {
  interpretScanPayload,
  SCANNER_BARCODE_TYPES,
} from "@/productivity/scanner";
import { useHasAnyPermission } from "@/permissions/gate";
import { useTenantStore } from "@/tenant/context-store";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const SCAN_PERMS = [
  "produtos.visualizar",
  "estoque.visualizar",
  "os.visualizar",
] as const;

export default function ScannerScreen() {
  const { colors } = useTheme();
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const userId = useSessionStore((s) => s.snapshot.userId) ?? "";
  const canScan = useHasAnyPermission(SCAN_PERMS);
  const network = useNetworkStatus();
  const online = isOnline(network);
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const [manual, setManual] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [hits, setHits] = useState<MobileSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  useEffect(() => {
    return () => {
      setActive(false);
    };
  }, []);

  const resolveCode = useCallback(
    async (raw: string) => {
      const interpreted = interpretScanPayload(raw);
      if (interpreted.kind === "invalid") {
        setError(interpreted.reason);
        locked.current = false;
        return;
      }
      if (interpreted.kind === "deep-link") {
        setPendingCode(raw);
        setHits([
          {
            id: interpreted.route,
            type: "comando",
            title: "Abrir rota interna",
            subtitle: interpreted.route,
            status: null,
            route: interpreted.route,
            opensWeb: false,
            permission: null,
            updatedAt: null,
          },
        ]);
        setActive(false);
        return;
      }
      if (!online) {
        setError("Resolução remota indisponível offline. Use entrada manual na busca com cache.");
        locked.current = false;
        return;
      }
      if (!tenantId) {
        setError("Selecione uma empresa.");
        locked.current = false;
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const result = await fetchMobileSearch({
          tenantId,
          q: interpreted.q,
          branchId,
          limit: 10,
        });
        if (!result.ok) {
          setError(result.error.message);
          locked.current = false;
          return;
        }
        setPendingCode(interpreted.q);
        setHits(result.data.items);
        setActive(false);
        if (!result.data.items.length) {
          setError("Nenhum resultado para o código lido.");
        }
      } finally {
        setBusy(false);
        locked.current = false;
      }
    },
    [branchId, online, tenantId],
  );

  const onBarcode = (result: BarcodeScanningResult) => {
    if (!active || locked.current || busy) return;
    locked.current = true;
    // não logar o código — apenas estado UI
    void resolveCode(result.data);
  };

  const confirmOpen = async (hit: MobileSearchHit) => {
    Alert.alert("Abrir item?", hit.title, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Abrir",
        onPress: () => {
          void openProductivityRoute({
            route: hit.route,
            opensWeb: hit.opensWeb,
            recent: tenantId
              ? {
                  userId,
                  tenantId,
                  branchId,
                  id: hit.id,
                  type:
                    hit.type === "ordem_servico" ||
                    hit.type === "cliente" ||
                    hit.type === "produto" ||
                    hit.type === "veiculo"
                      ? hit.type
                      : "comando",
                  title: hit.title,
                  subtitle: hit.subtitle,
                }
              : undefined,
          });
        },
      },
    ]);
  };

  if (!canScan) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Acesso negado"
          message="Sem permissão para usar o scanner neste tenant."
          action={<Button title="Voltar" onPress={() => router.back()} />}
        />
      </SafeAreaScreen>
    );
  }

  if (!permission) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <Text variant="body" style={styles.pad}>
          Verificando permissão da câmera…
        </Text>
      </SafeAreaScreen>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Câmera necessária"
          message="A permissão é solicitada apenas para leitura de QR e código de barras. Nenhuma imagem é gravada."
          action={
            <View style={{ gap: 8 }}>
              <Button title="Permitir câmera" onPress={() => void requestPermission()} />
              <Button title="Só entrada manual" variant="secondary" onPress={() => setActive(false)} />
            </View>
          }
        />
        <View style={styles.pad}>
          <Input
            value={manual}
            onChangeText={setManual}
            placeholder="Placa, código de produto ou OS"
            accessibilityLabel="Entrada manual do código"
          />
          <Button
            title="Buscar código"
            onPress={() => void resolveCode(manual)}
            disabled={!manual.trim()}
          />
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={styles.pad}>
        <Text variant="subtitle" accessibilityRole="header">
          Scanner
        </Text>
        <Text variant="caption" muted>
          QR e código de barras. Confirme antes de abrir. Sem upload automático.
        </Text>
      </View>

      {active ? (
        <View
          style={styles.cameraWrap}
          accessibilityLabel="Pré-visualização da câmera para scanner"
        >
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            active={active}
            barcodeScannerSettings={{
              barcodeTypes: [...SCANNER_BARCODE_TYPES],
            }}
            onBarcodeScanned={onBarcode}
          />
          <View style={styles.overlay} pointerEvents="none">
            <Text variant="caption" style={{ color: "#fff" }}>
              Enquadre o código
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.pad}>
          <Text variant="caption" muted>
            Câmera pausada{pendingCode ? " · leitura pronta para confirmação" : ""}
          </Text>
          <Button
            title="Reativar câmera"
            variant="secondary"
            onPress={() => {
              setHits([]);
              setPendingCode(null);
              setError(null);
              setActive(true);
            }}
          />
        </View>
      )}

      <View style={styles.pad}>
        <Text variant="caption" muted>
          Ou digite placa / código interno
        </Text>
        <Input
          value={manual}
          onChangeText={setManual}
          placeholder="Ex.: ABC1D23 ou SKU"
          accessibilityLabel="Código manual"
        />
        <Button
          title={busy ? "Buscando…" : "Resolver código"}
          onPress={() => void resolveCode(manual)}
          disabled={busy || !manual.trim()}
        />
        {error ? (
          <Text variant="caption" style={{ color: colors.danger ?? "#c00" }}>
            {error}
          </Text>
        ) : null}
      </View>

      {hits.map((hit) => (
        <Card key={`${hit.type}-${hit.id}`} style={styles.hit}>
          <Pressable
            onPress={() => void confirmOpen(hit)}
            accessibilityRole="button"
            accessibilityLabel={`Confirmar abertura de ${hit.title}`}
            style={{ padding: 12, minHeight: 48 }}
          >
            <Text variant="body">{hit.title}</Text>
            {hit.subtitle ? (
              <Text variant="caption" muted>
                {hit.subtitle}
              </Text>
            ) : null}
            <Text variant="caption" style={{ color: colors.primary }}>
              Toque para confirmar abertura
            </Text>
          </Pressable>
        </Card>
      ))}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 8 },
  cameraWrap: {
    height: 280,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  hit: { marginHorizontal: 16, marginBottom: 8, padding: 0 },
});
