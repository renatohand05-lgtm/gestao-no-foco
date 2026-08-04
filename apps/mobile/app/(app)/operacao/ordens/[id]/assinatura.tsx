import {
  uploadOpsSignature,
} from "@/api/mobile-api";
import { Button, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { useTenantStore } from "@/tenant/context-store";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

const PAD_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>
html,body{margin:0;height:100%;background:#111;color:#eee;font-family:sans-serif}
#c{touch-action:none;background:#fff;width:100%;height:70vh;border-radius:8px}
.row{display:flex;gap:8px;padding:12px}
button{flex:1;padding:12px;font-size:16px;border-radius:8px;border:0}
</style></head><body>
<canvas id="c"></canvas>
<div class="row">
<button id="clear">Limpar</button>
<button id="ok">Pré-visualizar</button>
</div>
<script>
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
function resize(){const r=canvas.getBoundingClientRect();canvas.width=r.width*devicePixelRatio;canvas.height=r.height*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.lineWidth=2.5;ctx.lineCap='round';ctx.strokeStyle='#111'}
resize();window.addEventListener('resize',resize);
let drawing=false,last=null;
function pos(e){const t=e.touches?e.touches[0]:e;const r=canvas.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top}}
function start(e){drawing=true;last=pos(e);e.preventDefault()}
function move(e){if(!drawing)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()}
function end(){drawing=false}
canvas.addEventListener('touchstart',start,{passive:false});
canvas.addEventListener('touchmove',move,{passive:false});
canvas.addEventListener('touchend',end);
canvas.addEventListener('mousedown',start);
canvas.addEventListener('mousemove',move);
canvas.addEventListener('mouseup',end);
document.getElementById('clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height)};
document.getElementById('ok').onclick=()=>{
  const data=canvas.toDataURL('image/png');
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'preview',data}));
};
</script></body></html>`;

export default function AssinaturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const { colors } = useTheme();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);

  async function confirm() {
    if (!preview || !tenantId || !id) return;
    setBusy(true);
    setError(null);
    const result = await uploadOpsSignature({
      tenantId,
      osId: id,
      base64: preview,
      mimeType: "image/png",
      branchId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaScreen edges={["left", "right", "bottom"]}>
      <View style={[styles.wrap, { backgroundColor: colors.background }]}>
        <Text variant="subtitle" style={styles.title}>
          Assinatura do cliente
        </Text>
        <Text variant="caption" muted>
          Desenhe, pré-visualize e confirme o upload (anexo etapa entrega).
        </Text>
        {preview ? (
          <View style={styles.previewBox}>
            <WebView
              originWhitelist={["*"]}
              source={{
                html: `<img src="${preview}" style="width:100%;background:#fff"/>`,
              }}
              style={{ flex: 1 }}
            />
            <Button title="Confirmar upload" onPress={() => void confirm()} disabled={busy} />
            <Button
              title="Refazer"
              variant="secondary"
              onPress={() => setPreview(null)}
              disabled={busy}
            />
          </View>
        ) : (
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html: PAD_HTML }}
            style={styles.pad}
            onMessage={(ev) => {
              try {
                const msg = JSON.parse(ev.nativeEvent.data) as {
                  type?: string;
                  data?: string;
                };
                if (msg.type === "preview" && msg.data) setPreview(msg.data);
              } catch {
                /* ignore */
              }
            }}
          />
        )}
        {error ? (
          <Text variant="caption" style={{ color: "#b91c1c" }}>
            {error}
          </Text>
        ) : null}
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 10 },
  title: { marginBottom: 4 },
  previewBox: { flex: 1, gap: 10 },
  pad: { flex: 1, marginTop: 8, borderRadius: 12, overflow: "hidden" },
});
