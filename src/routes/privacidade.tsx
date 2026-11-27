import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage, LegalSection, legalEntityLine } from "@/components/legal-page";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — BooTickets" },
      { name: "description", content: "Como o BooTickets coleta, usa, guarda e protege seus dados pessoais, conforme a LGPD." },
    ],
  }),
  component: Privacy,
});

const mail = <a className="text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
const th = "border-b px-2 py-2 text-left font-medium text-foreground";
const td = "border-b px-2 py-2 align-top";

function Privacy() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Esta política explica quais dados pessoais o BooTickets usa, para quê, com quem compartilha, por quanto tempo guarda e como você exerce os seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) e o Marco Civil da Internet (Lei 12.965/2014)."
    >
      <LegalSection n={1} title="Quem cuida dos seus dados">
        <ul>
          <li><strong>Controlador:</strong> {legalEntityLine()} (“BooTickets”), responsável pelo site bootickets.com.br e pelo app BooTickets.</li>
          <li><strong>Canal do encarregado de dados (LGPD, art. 41):</strong> {mail}. Use este canal para qualquer assunto sobre os seus dados.</li>
          <li>O <strong>organizador de cada evento</strong> também é controlador dos dados dos participantes que recebe do BooTickets, e responde pelo uso que faz deles.</li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="Dados que usamos">
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail, CPF e senha (guardada só como código criptografado, nunca em texto).</li>
          <li><strong>Login com Google:</strong> nome, e-mail e um identificador da conta Google. Não temos acesso à sua senha do Google.</li>
          <li><strong>Compras:</strong> evento, ingressos, valores, forma de pagamento, nome e CPF de cada titular, situação do pagamento, devoluções e transferências.</li>
          <li><strong>Prova do aceite:</strong> versão dos Termos aceita, data, hora, endereço IP e navegador no momento da compra (e, para organizadores, no aceite dos Termos do Organizador).</li>
          <li><strong>Registros de acesso:</strong> data, hora e IP de cadastros, logins e ações importantes na conta.</li>
          <li><strong>Portaria:</strong> registro de cada leitura de QR Code (data, hora, resultado e quem leu).</li>
          <li><strong>Organizadores:</strong> dados de recebimento (chave Pix e nome do titular) e a conexão com a conta Mercado Pago.</li>
          <li><strong>App:</strong> se você permitir notificações, um código do seu celular para enviá-las. Para funcionar sem internet, o app guarda no próprio celular os seus ingressos (sem o CPF), apagados quando você sai da conta.</li>
        </ul>
        <p>Os dados do cartão são digitados no ambiente do Mercado Pago e <strong>não passam pelos nossos servidores</strong>. Não usamos dados sensíveis (saúde, biometria, religião etc.).</p>
      </LegalSection>

      <LegalSection n={3} title="Para que usamos e com qual base legal">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela (role para o lado se precisar)">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead><tr><th className={th}>Finalidade</th><th className={th}>Base legal (LGPD)</th></tr></thead>
            <tbody>
              <tr><td className={td}>Criar a conta, vender e emitir ingressos nominais, processar pagamentos, devoluções e transferências</td><td className={td}>Execução de contrato (art. 7º, V)</td></tr>
              <tr><td className={td}>Conferir o titular na entrada e enviar ao organizador a lista de participantes do evento dele</td><td className={td}>Execução de contrato (art. 7º, V)</td></tr>
              <tr><td className={td}>Avisos sobre pedidos, ingressos e conta (e-mail e notificações do app)</td><td className={td}>Execução de contrato (art. 7º, V)</td></tr>
              <tr><td className={td}>Guardar registros de acesso por 6 meses e registros de compras para fins fiscais e de defesa do consumidor</td><td className={td}>Obrigação legal (art. 7º, II): Marco Civil, art. 15; CDC; legislação tributária</td></tr>
              <tr><td className={td}>Prevenir fraudes, cambismo e contestações indevidas (limite por CPF, QR assinado, registros de entrada)</td><td className={td}>Legítimo interesse e proteção do crédito (art. 7º, IX e X)</td></tr>
              <tr><td className={td}>Guardar provas para nos defender em reclamações e processos</td><td className={td}>Exercício regular de direitos (art. 7º, VI)</td></tr>
              <tr><td className={td}>Dados de titular menor de idade, informados pelo responsável</td><td className={td}>Consentimento do responsável e melhor interesse do menor (art. 14)</td></tr>
            </tbody>
          </table>
        </div>
        <p>Não vendemos seus dados e não os usamos para publicidade de terceiros. Se um dia quisermos mandar novidades por e-mail, vamos pedir sua autorização, que você pode retirar quando quiser.</p>
      </LegalSection>

      <LegalSection n={4} title="Com quem compartilhamos">
        <ul>
          <li><strong>Organizador do evento:</strong> nome do titular, e-mail do comprador e CPF parcialmente oculto dos ingressos do evento dele, para controlar a entrada.</li>
          <li><strong>Mercado Pago:</strong> dados necessários para processar pagamentos, estornos e prevenir fraudes.</li>
          <li><strong>Provedores de tecnologia</strong> que tratam dados só por nossa conta e sob contrato: Vercel (hospedagem), Neon (banco de dados), Google (login com Google, e-mail e notificações no Android), Apple (notificações no iPhone) e, se você escolher “Adicionar à Carteira”, Apple Wallet ou Google Wallet (evento, titular, lote e QR Code).</li>
          <li><strong>Autoridades:</strong> quando houver ordem judicial ou obrigação legal, e para defender direitos do BooTickets.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Dados guardados fora do Brasil">
        <p>Alguns provedores (como Vercel, Neon e Google) guardam dados em servidores fora do Brasil, principalmente nos Estados Unidos. Essa transferência é necessária para prestar o serviço e é feita com provedores que adotam cláusulas contratuais e padrões de segurança compatíveis com a LGPD (art. 33).</p>
      </LegalSection>

      <LegalSection n={6} title="Por quanto tempo guardamos">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela (role para o lado se precisar)">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead><tr><th className={th}>Dado</th><th className={th}>Prazo</th></tr></thead>
            <tbody>
              <tr><td className={td}>Dados da conta</td><td className={td}>Enquanto a conta existir. Ao excluir a conta, nome, e-mail, CPF e acesso são apagados.</td></tr>
              <tr><td className={td}>Pedidos, pagamentos, provas de aceite e registros da portaria</td><td className={td}>5 anos após a compra (CDC, art. 27, e legislação tributária). Depois de excluída a conta, ficam sem ligação com você.</td></tr>
              <tr><td className={td}>Registros de acesso (IP, data e hora)</td><td className={td}>Mínimo de 6 meses (Marco Civil, art. 15), apagados depois de cerca de 13 meses, salvo ordem judicial.</td></tr>
              <tr><td className={td}>Código de notificação do celular</td><td className={td}>Até você sair da conta, desativar as notificações ou desinstalar o app.</td></tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection n={7} title="Seus direitos">
        <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos, errados ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
          <li>portabilidade dos dados para outro fornecedor;</li>
          <li>informação sobre com quem compartilhamos;</li>
          <li>revogação de consentimento, quando o tratamento depender dele;</li>
          <li>revisão de decisões tomadas só por meios automatizados.</li>
        </ul>
        <p>Peça pelo {mail}. Para proteger você, podemos confirmar sua identidade antes. Respondemos em até <strong>15 dias</strong>. Alguns dados não podem ser apagados enquanto a lei exigir que sejam guardados (seção 6). Você também pode excluir sua conta pelo site, em <Link to="/conta" className="text-foreground underline">Minha conta</Link>, e reclamar à Autoridade Nacional de Proteção de Dados (ANPD, gov.br/anpd).</p>
      </LegalSection>

      <LegalSection n={8} title="Segurança">
        <p>Usamos conexão criptografada (HTTPS), senhas com criptografia forte, QR Codes assinados digitalmente, sessões que expiram, limite de tentativas de login e acesso restrito aos dados. Nenhum sistema é 100% imune. Se houver um incidente de segurança que possa trazer risco ou dano relevante, avisaremos você e a ANPD (LGPD, art. 48).</p>
      </LegalSection>

      <LegalSection n={9} title="Cookies e armazenamento no aparelho">
        <p>Usamos apenas um cookie essencial, que mantém você conectado com segurança. O navegador e o app também guardam preferências e, no app, os ingressos para uso sem internet. Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.</p>
      </LegalSection>

      <LegalSection n={10} title="Crianças e adolescentes">
        <p>O BooTickets não é destinado a menores de 18 anos, que não podem criar conta nem comprar. Quando um responsável informa um menor como titular de ingresso, usamos o nome e o CPF dele só para emitir o ingresso e permitir a entrada, no melhor interesse do menor.</p>
      </LegalSection>

      <LegalSection n={11} title="Mudanças nesta política">
        <p>Se esta política mudar, a data no topo será atualizada e mudanças importantes serão avisadas no site ou por e-mail. Ela faz parte dos <Link to="/termos" className="text-foreground underline">Termos de Uso</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
