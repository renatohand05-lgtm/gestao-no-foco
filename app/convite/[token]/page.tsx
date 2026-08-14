import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInviteButton } from "@/app/convite/[token]/accept-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { getCurrentProfile } from "@/lib/auth/session";
import { getInvitationByToken } from "@/lib/equipe/invitations-service";
import {
  invitationStatusLabel,
  membershipRoleLabel,
} from "@/lib/equipe/labels";

export const metadata = { title: "Aceitar convite" };

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function AceitarConvitePage({ params }: PageProps) {
  const { token } = await params;
  const profile = await getCurrentProfile();

  if (!profile?.id) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/convite/${token}`)}`);
  }

  let preview: Awaited<ReturnType<typeof getInvitationByToken>> = null;
  let loadError: string | null = null;
  try {
    preview = await getInvitationByToken(token);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar o convite.";
  }

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
        <FeedbackMessage variant="error">{loadError}</FeedbackMessage>
      </main>
    );
  }

  if (!preview) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>
              Este link não corresponde a um convite válido. Peça um novo convite
              ao administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link href="/" />}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { invitation, tenantName } = preview;
  const emailMatch =
    (profile.email ?? "").trim().toLowerCase() ===
    invitation.email.trim().toLowerCase();
  // Expiração por relógio é revalidada na server action de aceite.
  const expired = invitation.status === "expired";
  const canAccept =
    invitation.status === "pending" && !expired && emailMatch;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
      <Card data-invite-accept="">
        <CardHeader>
          <CardTitle>Convite para {tenantName}</CardTitle>
          <CardDescription>
            Você foi convidado a participar desta empresa no Gestão no Foco.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">E-mail convidado</dt>
              <dd className="font-medium">{invitation.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Função</dt>
              <dd className="font-medium">
                {membershipRoleLabel(invitation.membershipRole)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {expired && invitation.status === "pending"
                  ? "Expirado"
                  : invitationStatusLabel(invitation.status)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Validade</dt>
              <dd className="font-medium">
                {new Date(invitation.expiresAt).toLocaleString("pt-BR")}
              </dd>
            </div>
            {invitation.message ? (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Mensagem</p>
                <p className="mt-1 text-foreground">{invitation.message}</p>
              </div>
            ) : null}
          </dl>

          {!emailMatch ? (
            <FeedbackMessage variant="error">
              Você está autenticado como {profile.email}. Este convite é para{" "}
              {invitation.email}. Saia e entre com a conta correta.
            </FeedbackMessage>
          ) : null}

          {expired || invitation.status === "expired" ? (
            <FeedbackMessage variant="warning">
              Este convite expirou. Peça um novo link ao administrador.
            </FeedbackMessage>
          ) : invitation.status === "cancelled" ? (
            <FeedbackMessage variant="warning">
              Este convite foi revogado e não pode mais ser aceito.
            </FeedbackMessage>
          ) : invitation.status === "accepted" ? (
            <FeedbackMessage variant="warning">
              Este convite já foi utilizado.
            </FeedbackMessage>
          ) : invitation.status !== "pending" ? (
            <FeedbackMessage variant="warning">
              Este convite não pode ser aceito no estado atual.
            </FeedbackMessage>
          ) : null}

          {canAccept ? <AcceptInviteButton token={token} /> : null}
        </CardContent>
      </Card>
    </main>
  );
}
