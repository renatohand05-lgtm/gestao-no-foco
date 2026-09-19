"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import {
  checkWhatsAppStatusAction,
  registerWhatsAppNumberAction,
  sendWhatsAppTestMessageAction,
} from "@/lib/platform/whatsapp-diagnostics-actions";
import type { WhatsAppPhoneStatus } from "@/lib/retention/providers/whatsapp-diagnostics";

export function WhatsAppDiagnosticsPanel() {
  const [status, setStatus] = useState<WhatsAppPhoneStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCheckStatus() {
    setStatusError(null);
    startTransition(async () => {
      const result = await checkWhatsAppStatusAction();
      if (!result.success) {
        setStatusError(result.error);
        setStatus(null);
        return;
      }
      setStatus(result.data);
    });
  }

  function handleRegister() {
    setRegisterError(null);
    setRegisterMsg(null);
    startTransition(async () => {
      const result = await registerWhatsAppNumberAction(pin);
      if (!result.success) {
        setRegisterError(result.error);
        return;
      }
      setRegisterMsg("Número registrado com sucesso. Pode testar o envio agora.");
      setPin("");
    });
  }

  function handleTestSend() {
    setTestError(null);
    setTestMsg(null);
    startTransition(async () => {
      const result = await sendWhatsAppTestMessageAction(testPhone);
      if (!result.success) {
        setTestError(result.error);
        return;
      }
      setTestMsg("Mensagem enviada. Confira o WhatsApp desse número em alguns segundos.");
    });
  }

  return (
    <div className="space-y-8">
      {/* 1) Status */}
      <section className="space-y-3 rounded-xl border border-border/50 p-4">
        <h2 className="font-medium">1. Status do número</h2>
        <p className="text-sm text-muted-foreground">
          Consulta só de leitura — não muda nada, só mostra se o número já
          está verificado na Meta.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleCheckStatus} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Verificar status
        </Button>
        {statusError ? <FeedbackMessage variant="error">{statusError}</FeedbackMessage> : null}
        {status ? (
          <div className="space-y-1 rounded-lg bg-[var(--surface-muted)] p-3 text-sm">
            <p><span className="text-muted-foreground">Número:</span> {status.displayPhoneNumber ?? "—"}</p>
            <p><span className="text-muted-foreground">Nome verificado:</span> {status.verifiedName ?? "—"}</p>
            <p><span className="text-muted-foreground">Status de verificação:</span> {status.codeVerificationStatus ?? "—"}</p>
            <p><span className="text-muted-foreground">Qualidade:</span> {status.qualityRating ?? "—"}</p>
            <p><span className="text-muted-foreground">Nível de throughput:</span> {status.throughputLevel ?? "—"}</p>
          </div>
        ) : null}
      </section>

      {/* 2) Registro */}
      <section className="space-y-3 rounded-xl border border-border/50 p-4">
        <h2 className="font-medium">2. Registrar número (PIN de 2 etapas)</h2>
        <p className="text-sm text-muted-foreground">
          Só precisa fazer isso uma vez. Escolha um PIN de 6 dígitos — pode
          ser qualquer número, é só pra confirmação de segurança da Meta.
          Se o número já estiver registrado, esse passo simplesmente troca
          o PIN, sem quebrar nada.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            PIN (6 dígitos)
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="mt-1 h-10 w-32"
              disabled={pending}
            />
          </label>
          <Button type="button" variant="outline" size="sm" onClick={handleRegister} disabled={pending || pin.length !== 6}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Registrar número
          </Button>
        </div>
        {registerError ? <FeedbackMessage variant="error">{registerError}</FeedbackMessage> : null}
        {registerMsg ? <FeedbackMessage variant="success">{registerMsg}</FeedbackMessage> : null}
      </section>

      {/* 3) Teste real */}
      <section className="space-y-3 rounded-xl border border-border/50 p-4">
        <h2 className="font-medium">3. Enviar mensagem de teste</h2>
        <p className="text-sm text-muted-foreground">
          Importante: a Meta só deixa mandar texto livre pra quem mandou
          mensagem pro seu número de negócio nas últimas 24h. Antes de
          testar, manda um &quot;oi&quot; do seu WhatsApp pessoal pro número
          do negócio — só depois disso clique em enviar aqui.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            Seu número (DDI+DDD+número)
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999998888"
              className="mt-1 h-10 w-48"
              disabled={pending}
            />
          </label>
          <Button type="button" variant="outline" size="sm" onClick={handleTestSend} disabled={pending || !testPhone}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Enviar teste
          </Button>
        </div>
        {testError ? <FeedbackMessage variant="error">{testError}</FeedbackMessage> : null}
        {testMsg ? <FeedbackMessage variant="success">{testMsg}</FeedbackMessage> : null}
      </section>
    </div>
  );
}
