import type { MobileOpsWorkOrderDetail } from "@/api/mobile-api";
import { Badge, Button, Card, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

type BadgeTone = "default" | "success" | "warning" | "danger";

function toneForClassificacao(c: string): BadgeTone {
  if (c === "bom") return "success";
  if (c === "critico") return "danger";
  if (c === "atencao") return "warning";
  return "default";
}

export function WorkOrderHeader({
  data,
  offlineMinutes,
}: {
  data: MobileOpsWorkOrderDetail;
  offlineMinutes?: number | null;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.section}>
      <Text variant="title">{data.heading ?? `OS ${data.numero}`}</Text>
      <View style={styles.row}>
        <Badge label={data.status} />
        <Badge label={data.prioridade} />
        {data.canEdit ? <Badge label="editável" tone="success" /> : null}
      </View>
      <Text variant="body">{data.cliente ?? "Cliente —"}</Text>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        {data.veiculo ?? "Veículo —"}
        {data.placa ? ` · ${data.placa}` : ""}
      </Text>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        {data.assigneeLabel ?? "Mecânico"}: {data.mecanico ?? "—"} · Previsão:{" "}
        {data.previsao ?? "—"}
      </Text>
      {offlineMinutes != null ? (
        <Text variant="caption" style={{ color: colors.primary, marginTop: 6 }}>
          Offline · atualizado há {offlineMinutes} min · uploads pendentes
        </Text>
      ) : null}
    </Card>
  );
}

export function ChecklistSection({
  data,
  onClassify,
  busyId,
}: {
  data: MobileOpsWorkOrderDetail;
  onClassify?: (itemId: string, classificacao: string) => void;
  busyId?: string | null;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Checklist operacional</Text>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        {data.checklistSummary.done}/{data.checklistSummary.total} concluídos ·{" "}
        {data.checklistSummary.pending} pendentes
      </Text>
      {data.checklist.length === 0 ? (
        <Text variant="caption" muted>
          Nenhum item de checklist nesta OS.
        </Text>
      ) : (
        data.checklist.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.row}>
              <Badge
                label={item.classificacao}
                tone={toneForClassificacao(item.classificacao)}
              />
              {item.done ? <Badge label="ok" tone="success" /> : <Badge label="pendente" />}
            </View>
            <Text variant="body">{item.label}</Text>
            {item.observacao ? (
              <Text variant="caption" muted>
                {item.observacao}
              </Text>
            ) : null}
            {item.registradoEm ? (
              <Text variant="caption" muted>
                {item.registradoEm.slice(0, 16).replace("T", " ")}
                {item.responsavelId ? ` · resp. ${item.responsavelId.slice(0, 8)}` : ""}
              </Text>
            ) : null}
            {data.canEdit && onClassify ? (
              <View style={styles.row}>
                {(["bom", "atencao", "critico", "nao_verificado"] as const).map((c) => (
                  <Pressable
                    key={c}
                    disabled={busyId === item.id}
                    onPress={() => onClassify(item.id, c)}
                    style={[styles.chip, { borderColor: colors.border }]}
                  >
                    <Text variant="caption">{c}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
    </Card>
  );
}

const GALLERY_GROUPS: { key: string; label: string }[] = [
  { key: "antes", label: "Antes" },
  { key: "durante", label: "Durante" },
  { key: "depois", label: "Depois" },
  { key: "documentos", label: "Documentos" },
  { key: "outras", label: "Outras evidências" },
];

export function GallerySection({
  data,
  onOpen,
  onDelete,
  onAdd,
}: {
  data: MobileOpsWorkOrderDetail;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: (etapa: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Galeria</Text>
      {GALLERY_GROUPS.map((g) => {
        const items = data.photos.filter((p) => p.group === g.key);
        const docs =
          g.key === "documentos"
            ? data.attachments.filter((a) => a.group === "documentos")
            : [];
        return (
          <View key={g.key} style={styles.group}>
            <View style={styles.rowBetween}>
              <Text variant="body">
                {g.label} ({items.length + docs.length})
              </Text>
              {data.canEdit && onAdd && g.key !== "documentos" ? (
                <Pressable onPress={() => onAdd(g.key === "antes" ? "entrada" : g.key === "depois" ? "conclusao" : "execucao")}>
                  <Text variant="caption" style={{ color: colors.primary }}>
                    + foto
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.thumbs}>
              {items.map((p) => (
                <Pressable key={p.id} onPress={() => onOpen(p.id)} style={styles.thumbWrap}>
                  {p.thumbUrl ? (
                    <Image source={{ uri: p.thumbUrl }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: colors.border }]} />
                  )}
                  <Text variant="caption" numberOfLines={1}>
                    {p.label}
                  </Text>
                  <Text variant="caption" muted>
                    {p.createdAt.slice(0, 10)}
                  </Text>
                  {data.canEdit && onDelete ? (
                    <Pressable onPress={() => onDelete(p.id)}>
                      <Text variant="caption" style={{ color: "#b91c1c" }}>
                        excluir
                      </Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
              {docs.map((d) => (
                <Pressable key={d.id} onPress={() => onOpen(d.id)} style={styles.thumbWrap}>
                  <Text variant="body">PDF/Doc</Text>
                  <Text variant="caption" numberOfLines={2}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export function SignatureSection({
  data,
  onCapture,
}: {
  data: MobileOpsWorkOrderDetail;
  onCapture?: () => void;
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Assinatura digital</Text>
      <Text variant="caption" muted>
        Evidência de aceite (não certificado jurídico). Reutiliza anexo etapa entrega.
      </Text>
      {data.aceiteEntregaEm ? (
        <Text variant="caption" muted>
          Aceite registrado em {data.aceiteEntregaEm.slice(0, 16).replace("T", " ")}
        </Text>
      ) : null}
      {data.signatures.map((s) => (
        <View key={s.id} style={styles.listItem}>
          {s.thumbUrl ? (
            <Image source={{ uri: s.thumbUrl }} style={styles.signature} contentFit="contain" />
          ) : null}
          <Text variant="body">{s.label}</Text>
          <Text variant="caption" muted>
            {s.createdAt.slice(0, 16).replace("T", " ")}
          </Text>
        </View>
      ))}
      {data.canEdit && onCapture ? (
        <Button title="Capturar assinatura" onPress={onCapture} />
      ) : null}
    </Card>
  );
}

export function AttachmentsSection({
  data,
  onOpen,
  onAddDoc,
}: {
  data: MobileOpsWorkOrderDetail;
  onOpen: (id: string) => void;
  onAddDoc?: () => void;
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Anexos</Text>
      {data.canEdit && onAddDoc ? (
        <Button title="Adicionar documento/imagem" onPress={onAddDoc} variant="secondary" />
      ) : null}
      {data.attachments.map((a) => (
        <Pressable key={a.id} onPress={() => onOpen(a.id)} style={styles.listItem}>
          <Badge label={a.tipo} />
          <Text variant="body">{a.label}</Text>
          <Text variant="caption" muted>
            {a.etapa} · {a.createdAt.slice(0, 16).replace("T", " ")}
            {a.isPdf ? " · PDF" : a.isImage ? " · imagem" : ""}
          </Text>
        </Pressable>
      ))}
    </Card>
  );
}

export function FieldTimelineSection({
  data,
}: {
  data: MobileOpsWorkOrderDetail;
}) {
  return (
    <Card style={styles.section}>
      <Text variant="subtitle">Histórico da execução</Text>
      {data.timeline.length === 0 ? (
        <Text variant="caption" muted>
          Sem eventos registrados.
        </Text>
      ) : (
        data.timeline.map((t) => (
          <View key={t.id} style={styles.listItem}>
            <Badge label={t.kind} />
            <Text variant="body">{t.titulo}</Text>
            <Text variant="caption" muted>
              {t.at.slice(0, 16).replace("T", " ")}
              {t.detalhe ? ` · ${t.detalhe}` : ""}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  listItem: { gap: 4, marginTop: 10, paddingTop: 8 },
  group: { marginTop: 8, gap: 6 },
  thumbs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { width: "30%", gap: 2 },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: 8 },
  signature: { width: "100%", height: 120, borderRadius: 8 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
