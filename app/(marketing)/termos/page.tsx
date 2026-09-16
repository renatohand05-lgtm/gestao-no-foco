import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso | Gestão no Foco",
  description:
    "Regras de uso da plataforma Gestão no Foco — contas, assinatura, responsabilidades e cancelamento.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/75">
        {children}
      </div>
    </section>
  );
}

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold,#C9A84C)]">
          Gestão no Foco
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Termos de Uso
        </h1>
        <p className="text-sm text-white/60">
          Última atualização: setembro de 2026.
        </p>
      </header>

      <Section title="1. Aceitação dos termos">
        <p>
          Estes Termos de Uso regem o acesso e uso da plataforma Gestão no
          Foco (site, aplicativo móvel e integrações associadas), operada por
          Renato Aquino Franco. Ao criar uma conta ou usar a plataforma, você
          concorda com estes termos e com a nossa{" "}
          <a
            href="/privacidade"
            className="text-[var(--brand-gold,#C9A84C)] underline underline-offset-2"
          >
            Política de Privacidade
          </a>
          . Se você não concordar, não utilize a plataforma.
        </p>
      </Section>

      <Section title="2. O que é o Gestão no Foco">
        <p>
          Uma plataforma de gestão (ERP) voltada a pequenos negócios —
          oficinas mecânicas, lava-rápidos e restaurantes — com módulos de
          clientes, estoque, ordens de serviço, financeiro, CRM e relatórios,
          acessível pelo site e por aplicativo móvel (iOS e Android).
        </p>
      </Section>

      <Section title="3. Cadastro e responsabilidade pela conta">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Você precisa ter 18 anos ou mais para criar uma conta;</li>
          <li>
            As informações fornecidas no cadastro devem ser verdadeiras e
            mantidas atualizadas;
          </li>
          <li>
            Você é responsável por manter sua senha em sigilo e por toda
            atividade realizada na sua conta;
          </li>
          <li>
            Avise-nos imediatamente em caso de uso não autorizado da sua
            conta.
          </li>
        </ul>
      </Section>

      <Section title="4. Planos, cobrança e cancelamento">
        <p>
          Alguns recursos exigem uma assinatura paga, cobrada de forma
          recorrente através do nosso parceiro de pagamentos (Asaas). Os
          valores e condições de cada plano são exibidos antes da
          contratação.
        </p>
        <p>
          Você pode cancelar sua assinatura a qualquer momento pela própria
          plataforma; o cancelamento interrompe cobranças futuras, mas não
          gera reembolso de períodos já pagos, salvo quando exigido por lei.
        </p>
      </Section>

      <Section title="5. Seus dados e o que você registra no sistema">
        <p>
          Os dados operacionais que você insere (clientes, veículos, vendas,
          lançamentos financeiros, etc.) pertencem a você e à sua empresa. Nós
          os tratamos apenas para operar a plataforma, conforme descrito na
          nossa Política de Privacidade — nunca os vendemos a terceiros.
        </p>
      </Section>

      <Section title="6. Uso aceitável">
        <p>Ao usar a plataforma, você concorda em não:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Usar o sistema para fins ilegais ou para armazenar/processar
            dados que você não tem direito de tratar;
          </li>
          <li>
            Tentar acessar contas, empresas ou dados de terceiros sem
            autorização;
          </li>
          <li>
            Interferir no funcionamento da plataforma, tentar burlar
            limites técnicos ou de segurança, ou realizar engenharia reversa
            do sistema;
          </li>
          <li>
            Revender ou sublicenciar o acesso à plataforma sem autorização
            por escrito.
          </li>
        </ul>
      </Section>

      <Section title="7. Disponibilidade do serviço">
        <p>
          Trabalhamos para manter a plataforma disponível e estável, mas não
          garantimos operação ininterrupta — manutenções, atualizações e
          fatores fora do nosso controle podem gerar indisponibilidade
          temporária. Avisos de manutenções relevantes são comunicados
          quando possível.
        </p>
      </Section>

      <Section title="8. Limitação de responsabilidade">
        <p>
          A plataforma é fornecida &quot;como está&quot;. Na máxima extensão
          permitida por lei, não nos responsabilizamos por perdas indiretas,
          lucros cessantes ou danos decorrentes de uso indevido da
          plataforma, indisponibilidade de terceiros integrados (como
          provedores de pagamento ou WhatsApp) ou de dados incorretos
          inseridos pelo próprio usuário.
        </p>
      </Section>

      <Section title="9. Encerramento de conta">
        <p>
          Você pode encerrar sua conta a qualquer momento — pelo site, em
          Configurações, ou pelo aplicativo móvel, em Configurações →
          Excluir minha conta. O encerramento apaga seu login e seu acesso
          às empresas das quais você é membro; se você for o único
          proprietário de alguma empresa, será necessário promover outra
          pessoa a proprietário (ou excluir a empresa) antes de encerrar a
          conta.
        </p>
        <p>
          Podemos suspender ou encerrar contas que violem estes termos, após
          tentativa razoável de contato, quando aplicável.
        </p>
      </Section>

      <Section title="10. Alterações a estes termos">
        <p>
          Podemos atualizar estes termos periodicamente. Mudanças relevantes
          serão comunicadas dentro da plataforma ou por e-mail. O uso
          continuado da plataforma após uma atualização representa aceitação
          dos novos termos.
        </p>
      </Section>

      <Section title="11. Lei aplicável">
        <p>
          Estes termos são regidos pelas leis brasileiras. Eventuais
          disputas serão submetidas ao foro do domicílio do usuário, salvo
          disposição legal em contrário.
        </p>
      </Section>

      <Section title="12. Contato">
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{" "}
          <a
            href="mailto:contato@gestaonofoco.com.br"
            className="text-[var(--brand-gold,#C9A84C)] underline underline-offset-2"
          >
            contato@gestaonofoco.com.br
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
