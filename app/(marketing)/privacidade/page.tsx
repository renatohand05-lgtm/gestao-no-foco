import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Gestão no Foco",
  description:
    "Como o Gestão no Foco coleta, usa e protege os dados de quem usa a plataforma.",
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

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-gold,#C9A84C)]">
          Gestão no Foco
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="text-sm text-white/60">
          Última atualização: setembro de 2026.
        </p>
      </header>

      <Section title="1. Quem somos">
        <p>
          O Gestão no Foco é uma plataforma de gestão para pequenos negócios
          (oficinas mecânicas, lava-rápidos e restaurantes), operada por
          Renato Aquino Franco. Esta política explica quais dados coletamos,
          por que coletamos, como usamos e quais direitos você tem sobre
          eles, em conformidade com a Lei Geral de Proteção de Dados
          (LGPD — Lei nº 13.709/2018).
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <p>
          <strong className="text-white">Dados de conta:</strong> nome,
          e-mail, telefone e senha (armazenada de forma criptografada, nunca
          em texto simples).
        </p>
        <p>
          <strong className="text-white">Dados da empresa:</strong> nome,
          CNPJ/CPF, endereço e segmento de atuação, informados no cadastro.
        </p>
        <p>
          <strong className="text-white">
            Dados operacionais e financeiros:
          </strong>{" "}
          registros que você mesmo insere no sistema para gerir seu negócio —
          clientes, veículos, ordens de serviço, vendas, lançamentos
          financeiros, contas a pagar e receber. Esses dados pertencem a você
          e à sua empresa; nós os processamos apenas para operar a
          plataforma.
        </p>
        <p>
          <strong className="text-white">Dados de pagamento:</strong> ao
          assinar um plano pago, os dados do cartão são processados
          diretamente pela Asaas (nosso parceiro de pagamentos) — o Gestão no
          Foco não armazena números completos de cartão de crédito.
        </p>
        <p>
          <strong className="text-white">
            Conversas com suporte e com o assistente de IA:
          </strong>{" "}
          o conteúdo das mensagens trocadas com nosso suporte ou com o
          assistente de inteligência artificial dentro do sistema, para que
          possamos responder e manter o histórico da conversa.
        </p>
        <p>
          <strong className="text-white">Dados de uso:</strong> informações
          técnicas básicas de acesso (endereço IP, tipo de dispositivo,
          páginas acessadas), usadas para segurança e melhoria do produto.
        </p>
      </Section>

      <Section title="3. Para que usamos seus dados">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Viabilizar o funcionamento da plataforma e das funcionalidades contratadas;</li>
          <li>Processar pagamentos e gerenciar sua assinatura;</li>
          <li>Prestar suporte e responder dúvidas;</li>
          <li>Enviar comunicações operacionais essenciais (confirmações, avisos de cobrança, alertas do sistema);</li>
          <li>Cumprir obrigações legais e fiscais;</li>
          <li>Prevenir fraude e proteger a segurança da plataforma.</li>
        </ul>
        <p>
          Não vendemos seus dados, nem os de sua empresa ou de seus clientes,
          a terceiros para fins de publicidade.
        </p>
      </Section>

      <Section title="4. Com quem compartilhamos dados">
        <p>
          Usamos os seguintes prestadores de serviço (subprocessadores) para
          operar a plataforma — cada um trata dados apenas na medida
          necessária para prestar seu serviço específico:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-white">Supabase</strong> — banco de
            dados e autenticação;
          </li>
          <li>
            <strong className="text-white">Vercel</strong> — hospedagem da
            aplicação web;
          </li>
          <li>
            <strong className="text-white">Asaas</strong> — processamento de
            pagamentos e cobranças;
          </li>
          <li>
            <strong className="text-white">Resend</strong> — envio de
            e-mails transacionais;
          </li>
          <li>
            <strong className="text-white">Meta (WhatsApp Business
            API)</strong>{" "}
            — envio de mensagens, quando essa integração está ativa na sua
            empresa;
          </li>
          <li>
            <strong className="text-white">Anthropic (Claude)</strong> —
            processamento das perguntas feitas ao assistente de inteligência
            artificial dentro do sistema.
          </li>
        </ul>
        <p>
          Também podemos compartilhar dados quando exigido por lei, ordem
          judicial ou autoridade competente.
        </p>
      </Section>

      <Section title="5. Por quanto tempo guardamos seus dados">
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Se você
          encerrar sua conta, mantemos os dados pelo prazo exigido por
          obrigações legais e fiscais (geralmente até 5 anos para registros
          financeiros, conforme legislação brasileira), após o qual são
          eliminados ou anonimizados.
        </p>
      </Section>

      <Section title="6. Seus direitos (LGPD)">
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Confirmação de que tratamos seus dados;</li>
          <li>Acesso aos dados que temos sobre você;</li>
          <li>Correção de dados incompletos ou desatualizados;</li>
          <li>Exclusão de dados desnecessários ou tratados de forma indevida;</li>
          <li>Portabilidade dos dados a outro fornecedor;</li>
          <li>Informação sobre com quem compartilhamos seus dados.</li>
        </ul>
        <p>Para exercer qualquer um desses direitos, entre em contato pelo e-mail abaixo.</p>
      </Section>

      <Section title="7. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus
          dados, incluindo controle de acesso por empresa (cada cliente só
          acessa os dados da própria empresa), criptografia de senhas e
          conexões seguras (HTTPS) em toda a plataforma.
        </p>
      </Section>

      <Section title="8. Crianças e adolescentes">
        <p>
          O Gestão no Foco é destinado a uso profissional por maiores de 18
          anos. Não coletamos intencionalmente dados de menores de idade.
        </p>
      </Section>

      <Section title="9. Alterações a esta política">
        <p>
          Podemos atualizar esta política periodicamente. Mudanças
          relevantes serão comunicadas dentro da plataforma ou por e-mail.
        </p>
      </Section>

      <Section title="10. Contato">
        <p>
          Dúvidas sobre esta política ou sobre o tratamento dos seus dados
          podem ser enviadas para{" "}
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
