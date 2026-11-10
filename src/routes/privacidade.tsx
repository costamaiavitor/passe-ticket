import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — BooTickets" },
      { name: "description", content: "Como o BooTickets coleta, usa e protege seus dados pessoais." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Esta política explica quais dados pessoais o BooTickets coleta, por que coleta e o que você pode fazer com eles, seguindo a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)."
    >
      <LegalSection n={1} title="Quem somos">
        <p>O <strong>BooTickets</strong> é uma plataforma online de venda de ingressos para eventos. Organizadores publicam seus eventos e o público compra ingressos nominais com QR Code.</p>
        <p>Contato do responsável pelos dados: <a className="text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </LegalSection>

      <LegalSection n={2} title="Dados que coletamos">
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail, CPF (quando informado) e senha (guardada de forma criptografada, nunca em texto).</li>
          <li><strong>Login com Google:</strong> nome, e-mail e um identificador da sua conta Google. Não temos acesso à sua senha do Google.</li>
          <li><strong>Compras:</strong> evento, ingressos, valores, nome e CPF de cada titular de ingresso, e a situação do pagamento.</li>
          <li><strong>Uso da portaria:</strong> registro de cada leitura de QR Code (data, hora e resultado), para evitar fraudes.</li>
          <li><strong>Dados técnicos:</strong> endereço IP e registros de acesso, usados para segurança e para limitar tentativas abusivas.</li>
        </ul>
        <p>Os dados do cartão de crédito são digitados diretamente no formulário seguro do Mercado Pago e <strong>não passam pelos nossos servidores</strong>.</p>
      </LegalSection>

      <LegalSection n={3} title="Para que usamos">
        <ul>
          <li>Emitir ingressos nominais e permitir a entrada no evento (conferência do titular e do CPF).</li>
          <li>Processar pagamentos, reembolsos e transferências de ingressos.</li>
          <li>Impedir cambismo e fraudes (limite de ingressos por CPF, QR Code único e registro das entradas).</li>
          <li>Enviar ao organizador a lista de participantes do evento dele, com o CPF parcialmente oculto.</li>
          <li>Cumprir obrigações legais e fiscais.</li>
        </ul>
        <p>As bases legais são a execução do contrato de compra (art. 7º, V da LGPD), o cumprimento de obrigação legal (art. 7º, II) e o legítimo interesse em prevenir fraudes (art. 7º, IX).</p>
      </LegalSection>

      <LegalSection n={4} title="Com quem compartilhamos">
        <ul>
          <li><strong>Mercado Pago:</strong> para processar os pagamentos (Pix e cartão).</li>
          <li><strong>Google:</strong> apenas se você escolher entrar com a sua conta Google.</li>
          <li><strong>Vercel e Neon:</strong> serviços de hospedagem do site e do banco de dados.</li>
          <li><strong>Organizador do evento:</strong> nome do titular, e-mail do comprador e CPF parcialmente oculto dos ingressos do evento dele.</li>
        </ul>
        <p>Não vendemos seus dados. Alguns desses serviços podem armazenar dados fora do Brasil, sempre com as proteções exigidas pela LGPD.</p>
      </LegalSection>

      <LegalSection n={5} title="Por quanto tempo guardamos">
        <p>Guardamos os dados enquanto sua conta existir e, depois disso, pelo tempo exigido por lei (por exemplo, registros de compras para fins fiscais). Registros de acesso são guardados por pelo menos 6 meses, como determina o Marco Civil da Internet.</p>
      </LegalSection>

      <LegalSection n={6} title="Seus direitos">
        <p>Você pode, a qualquer momento, pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão (quando não houver obrigação legal de guardar), portabilidade e informações sobre compartilhamento.</p>
        <p>Para isso, escreva para <a className="text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
      </LegalSection>

      <LegalSection n={7} title="Segurança">
        <p>Usamos conexão criptografada (HTTPS), senhas protegidas por criptografia, QR Codes assinados digitalmente e sessões com expiração. Nenhum sistema é 100% imune, mas avisaremos você e a ANPD em caso de incidente relevante.</p>
      </LegalSection>

      <LegalSection n={8} title="Cookies">
        <p>Usamos apenas um cookie essencial para manter você conectado com segurança. Não usamos cookies de publicidade.</p>
      </LegalSection>

      <LegalSection n={9} title="Mudanças nesta política">
        <p>Se esta política mudar, a data no topo será atualizada. Mudanças importantes serão avisadas no site.</p>
      </LegalSection>
    </LegalPage>
  );
}
