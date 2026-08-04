import {
  deleteOpsAnexo,
  fetchOpsAnexoSignedUrl,
  fetchOpsWorkOrderDetail,
  patchOpsChecklistItem,
  uploadOpsAnexo,
  type MobileOpsWorkOrderDetail,
} from "@/api/mobile-api";
import { webHref } from "@/dashboard/web-links";
import {
  Button,
  Card,
  ErrorState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import {
  AttachmentsSection,
  ChecklistSection,
  FieldTimelineSection,
  GallerySection,
  SignatureSection,
  WorkOrderHeader,
} from "@/operacao/field-sections";
import {
  enqueuePendingUpload,
  listPendingUploads,
  loadWorkOrderSnapshot,
  minutesSince,
  saveWorkOrderSnapshot,
} from "@/operacao/field-offline";
import {
  OPS_VIEW_PERMS,
  OpsSkeleton,
  opsErrorMessage,
  throwOpsApiError,
} from "@/operacao/sections";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

async function readUriAsBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",")
        ? (result.split(",")[1] ?? "")
        : result;
      if (!base64) {
        reject(new Error("Base64 vazio"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(blob);
  });
}

export default function OperacaoOrdemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(OPS_VIEW_PERMS);
  const { colors } = useTheme();
  const qc = useQueryClient();

  const [offlineSnap, setOfflineSnap] = useState<{
    savedAt: number;
    data: MobileOpsWorkOrderDetail;
  } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busyChecklist, setBusyChecklist] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !id) return;
    void loadWorkOrderSnapshot(tenantId, id).then(setOfflineSnap);
    void listPendingUploads(tenantId).then((p) => setPendingCount(p.length));
  }, [tenantId, id]);

  const queryKey = qk.entity({
    tenantId: tenantId || null,
    branchId,
    module: "ops-work-order",
    filters: { id },
  });

  const query = useQuery({
    queryKey,
    enabled: Boolean(tenantId && id) && online && canView,
    staleTime: 45_000,
    queryFn: async () => {
      const result = await fetchOpsWorkOrderDetail({ tenantId, id, branchId });
      if (!result.ok) throwOpsApiError(result);
      await saveWorkOrderSnapshot(tenantId, id, result.data);
      return result.data;
    },
  });

  const data = query.data ?? offlineSnap?.data ?? null;
  const offlineMinutes =
    !online && data && offlineSnap?.savedAt
      ? minutesSince(offlineSnap.savedAt)
      : null;

  const invalidate = () => void qc.invalidateQueries({ queryKey });

  const uploadMutation = useMutation({
    mutationFn: async (input: {
      uri: string;
      mimeType: string;
      fileName: string;
      etapa: string;
      tipo?: string;
      legenda?: string;
    }) => {
      if (!tenantId || !id) throw new Error("Contexto ausente");
      if (!online) {
        await enqueuePendingUpload(tenantId, {
          id: `${Date.now()}`,
          osId: id,
          kind: "photo",
          etapa: input.etapa,
          fileName: input.fileName,
          mimeType: input.mimeType,
          createdAt: Date.now(),
        });
        const pending = await listPendingUploads(tenantId);
        setPendingCount(pending.length);
        throw new Error("OFFLINE_QUEUED");
      }
      const base64 = await readUriAsBase64(input.uri);
      const result = await uploadOpsAnexo({
        tenantId,
        osId: id,
        base64,
        mimeType: input.mimeType,
        fileName: input.fileName,
        etapa: input.etapa,
        tipo: input.tipo,
        legenda: input.legenda,
        branchId,
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => invalidate(),
  });

  async function pickAndUpload(etapa: string, tipo = "foto") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && !lib.granted) {
      Alert.alert("Permissão", "Autorize câmera ou galeria para anexar fotos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.55,
      exif: false,
      allowsEditing: false,
    }).catch(async () =>
      ImagePicker.launchImageLibraryAsync({
        quality: 0.55,
        exif: false,
        mediaTypes: ["images"],
      }),
    );
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      await uploadMutation.mutateAsync({
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `foto-${etapa}.jpg`,
        etapa,
        tipo,
        legenda: tipo === "foto" ? `Campo · ${etapa}` : undefined,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "OFFLINE_QUEUED") {
        Alert.alert(
          "Offline",
          "Upload ficou pendente até reconectar (metadado local; arquivo não armazenado sem controle).",
        );
        return;
      }
      Alert.alert(
        "Falha no upload",
        err instanceof Error ? err.message : "Não foi possível enviar.",
      );
    }
  }

  async function onClassify(itemId: string, classificacao: string) {
    if (!tenantId || !id || !online) {
      Alert.alert("Offline", "Checklist exige conexão para persistir.");
      return;
    }
    setBusyChecklist(itemId);
    const result = await patchOpsChecklistItem({
      tenantId,
      osId: id,
      checklistId: itemId,
      classificacao,
      branchId,
    });
    setBusyChecklist(null);
    if (!result.ok) {
      Alert.alert("Checklist", result.error.message);
      return;
    }
    invalidate();
  }

  async function onOpenAnexo(anexoId: string) {
    if (!tenantId || !id) return;
    if (!online) {
      Alert.alert("Offline", "Visualização ampliada exige conexão (URL assinada).");
      return;
    }
    const result = await fetchOpsAnexoSignedUrl({
      tenantId,
      osId: id,
      anexoId,
      branchId,
    });
    if (!result.ok) {
      Alert.alert("Anexo", result.error.message);
      return;
    }
    setPreviewUrl(result.data.signedUrl);
  }

  async function onDeleteAnexo(anexoId: string) {
    if (!tenantId || !id || !online) return;
    Alert.alert("Excluir anexo", "Confirma exclusão (soft-delete)?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void (async () => {
            const result = await deleteOpsAnexo({
              tenantId,
              osId: id,
              anexoId,
              branchId,
            });
            if (!result.ok) Alert.alert("Anexo", result.error.message);
            else invalidate();
          })();
        },
      },
    ]);
  }

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão." />
      </SafeAreaScreen>
    );
  }

  if (online && query.isLoading && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <OpsSkeleton />
      </SafeAreaScreen>
    );
  }

  if (online && query.isError && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={opsErrorMessage(query.error, "Não foi possível carregar a ordem.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      </SafeAreaScreen>
    );
  }

  if (!data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title={online ? "Não encontrado" : "Sem snapshot offline"}
          message={
            online
              ? "Ordem indisponível."
              : "Conecte-se para carregar a OS pela primeira vez."
          }
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}
        refreshControl={
          online ? (
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
            />
          ) : undefined
        }
      >
        <WorkOrderHeader data={data} offlineMinutes={offlineMinutes} />
        {pendingCount > 0 ? (
          <Text variant="caption" style={{ color: colors.primary }}>
            Uploads pendentes: {pendingCount}
          </Text>
        ) : null}

        <Card>
          <Text variant="subtitle">Ações rápidas</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <Button
              title="Galeria"
              variant="secondary"
              onPress={() => {
                Alert.alert("Galeria", "Role até a seção Fotos/Anexos nesta tela.");
              }}
            />
            <Button
              title="Assinatura"
              variant="secondary"
              onPress={() => router.push(`/operacao/ordens/${id}/assinatura` as never)}
            />
            <Button
              title="Abrir no portal"
              variant="ghost"
              onPress={() => {
                if (tenantSlug) void Linking.openURL(webHref(`/${tenantSlug}/ordens/${id}`));
              }}
            />
            <Button title="Busca" variant="ghost" onPress={() => router.push("/busca")} />
            <Button title="Scanner" variant="ghost" onPress={() => router.push("/scanner")} />
          </View>
        </Card>

        <Card>
          {data.fields.map((f) => (
            <View key={f.label} style={{ marginBottom: 8 }}>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                {f.label}
              </Text>
              <Text variant="body">{f.value}</Text>
            </View>
          ))}
        </Card>

        {data.services.length > 0 ? (
          <Card>
            <Text variant="subtitle">Serviços</Text>
            {data.services.map((s) => (
              <View key={s.id} style={{ marginTop: 8 }}>
                <Text variant="body">{s.label}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  qtd {s.qty}
                  {s.valor ? ` · ${s.valor}` : ""}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {data.parts.length > 0 ? (
          <Card>
            <Text variant="subtitle">Peças</Text>
            {data.parts.map((p) => (
              <View key={p.id} style={{ marginTop: 8 }}>
                <Text variant="body">{p.label}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  qtd {p.qty}
                  {p.valor ? ` · ${p.valor}` : ""}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {data.observations ? (
          <Card>
            <Text variant="subtitle">Observações</Text>
            <Text variant="body" style={{ marginTop: 6 }}>
              {data.observations}
            </Text>
          </Card>
        ) : null}

        <ChecklistSection
          data={data}
          busyId={busyChecklist}
          onClassify={data.canEdit ? onClassify : undefined}
        />
        <GallerySection
          data={data}
          onOpen={(anexoId) => void onOpenAnexo(anexoId)}
          onDelete={data.canEdit ? (anexoId) => void onDeleteAnexo(anexoId) : undefined}
          onAdd={data.canEdit ? (etapa) => void pickAndUpload(etapa) : undefined}
        />
        <SignatureSection
          data={data}
          onCapture={
            data.canEdit
              ? () => router.push(`/(app)/operacao/ordens/${id}/assinatura`)
              : undefined
          }
        />
        <AttachmentsSection
          data={data}
          onOpen={(anexoId) => void onOpenAnexo(anexoId)}
          onAddDoc={
            data.canEdit
              ? () => void pickAndUpload("outro", "documento")
              : undefined
          }
        />
        <FieldTimelineSection data={data} />

        <Button
          title="Continuar no portal"
          onPress={() => void Linking.openURL(webHref(data.webHref))}
        />
      </ScrollView>

      <Modal visible={Boolean(previewUrl)} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "#000000cc",
            justifyContent: "center",
            padding: 16,
          }}
          onPress={() => setPreviewUrl(null)}
        >
          {previewUrl ? (
            <Image
              source={{ uri: previewUrl }}
              style={{ width: "100%", height: "70%" }}
              contentFit="contain"
            />
          ) : null}
          <Button title="Fechar" onPress={() => setPreviewUrl(null)} />
          {previewUrl ? (
            <Button
              title="Abrir externo"
              variant="secondary"
              onPress={() => void Linking.openURL(previewUrl)}
            />
          ) : null}
        </Pressable>
      </Modal>
    </SafeAreaScreen>
  );
}
