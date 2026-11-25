import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage, LegalSection, legalEntityLine } from "@/components/legal-page";

// Termos do Organizador (contrato entre o BooTickets e quem vende ingressos). Ao mudar o texto, mude a
// versão em backend/src/config.ts (organizerTermsVersion): o site pede o aceite de novo, com prova.
export const Route = createFileRoute("/termos-organizador")({
  head: () => ({
    meta: [
      { title: "Termos do Organizador — BooTickets" },
      { name: "description", content: "Regras para organizadores que vendem ingressos no BooTickets: responsabilidades, licenças, meia-entrada, repasses, cancelamento e reembolso." },
    ],
  }),
  component: OrganizerTerms,
});

const mail = <a className="text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

function OrganizerTerms() {
  return (
    <LegalPage
      title="Termos do Organizador"
      intro="Este é o contrato entre o BooTickets e quem cria eventos e vende ingressos na plataforma (“Organizador”). Ele complementa os Termos de Uso. Ao marcar “Li e aceito” para virar produtor ou publicar um evento, você declara que leu e aceita estas regras, em nome próprio ou da empresa que representa."
    >
      <LegalSection n={1} title="Partes, aceite e capacidade">
        <ul>
          <li>De um lado, <strong>{legalEntityLine()}</strong> (“BooTickets”). Do outro, o Organizador: a pessoa física maior de 18 anos ou a empresa titular da conta.</li>
          <li>Quem aceita em nome de uma empresa declara ter poderes para isso. A empresa e quem aceitou respondem pelas obrigações destes Termos.</li>
          <li>O aceite é eletrônico. Guardamos a versão aceita, a data, a hora, o IP e o navegador. Quando estes Termos mudarem, o site pede um novo aceite antes do próximo evento.</li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="O que o BooTickets oferece">
        <ul>
          <li>Uma plataforma para divulgar o evento, vender e emitir ingressos nominais com QR Code, receber pelo Mercado Pago, controlar a entrada (portaria) e acompanhar as vendas.</li>
          <li>O BooTickets <strong>não é produtor, sócio, patrocinador nem coorganizador</strong> do evento. Estes Termos não criam sociedade, vínculo de emprego, representação nem exclusividade entre as partes.</li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Responsabilidade pelo evento">
        <p>O Organizador é o <strong>fornecedor do evento</strong> perante o público e responde, sozinho, por tudo o que se refere à sua realização, entre outras coisas:</p>
        <ul>
          <li><strong>Licenças:</strong> alvará da Prefeitura, auto de vistoria do Corpo de Bombeiros, autorizações da Polícia, do Juizado da Infância e Juventude e de órgãos ambientais, quando exigidos.</li>
          <li><strong>Direitos autorais:</strong> recolhimento ao ECAD pela música executada (Lei 9.610/1998, art. 68) e autorização de artistas, marcas e imagens divulgadas.</li>
          <li><strong>Segurança e estrutura:</strong> lotação máxima, equipe de segurança, brigada, primeiros socorros, saídas de emergência, banheiros, acessibilidade (Lei 13.146/2015) e seguro, quando exigido.</li>
          <li><strong>Menores e bebidas:</strong> classificação etária correta, controle de idade na entrada e proibição de venda de bebida alcoólica a menores (ECA, arts. 81 e 243).</li>
          <li><strong>Informações verdadeiras:</strong> data, horário, local, atrações, preços, lotes, regras de entrada e classificação etária corretas e atualizadas (CDC, arts. 30, 31 e 37). Atração anunciada é compromisso.</li>
          <li><strong>Tributos:</strong> impostos, notas fiscais e obrigações fiscais sobre a venda dos ingressos e o evento.</li>
          <li><strong>Equipe e terceiros:</strong> atos de funcionários, seguranças, fornecedores, artistas e da equipe da portaria cadastrada por ele.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Meia-entrada e gratuidades">
        <ul>
          <li>O Organizador deve cumprir a <strong>Lei da Meia-Entrada</strong> (Lei 12.933/2013 e Decreto 8.537/2015): oferecer meia-entrada a estudantes, pessoas com deficiência (e acompanhante, quando for o caso) e jovens de baixa renda, reservando pelo menos <strong>40% dos ingressos</strong> de cada evento para esse público, e respeitar o direito das pessoas idosas (Estatuto da Pessoa Idosa).</li>
          <li>No BooTickets, a meia-entrada é cadastrada como um tipo de ingresso (“Meia-entrada”). A quantidade, o preço e a conferência dos documentos na entrada são de responsabilidade do Organizador.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Análise e publicação dos eventos">
        <ul>
          <li>Todo evento passa por análise antes de ser publicado. O BooTickets pode pedir documentos (licenças, contrato do local, identidade) e recusar, pausar as vendas ou retirar do ar eventos com informação falsa, indícios de fraude, conteúdo ilegal, violação de direitos de terceiros, denúncias consistentes ou ordem de autoridade.</li>
          <li>É proibido publicar eventos ilegais, que incentivem crime, discriminação ou violência, ou que usem nome, marca ou imagem de terceiros sem autorização.</li>
          <li>O Organizador autoriza o BooTickets a usar o nome, as imagens e as informações do evento para divulgá-lo no site, no app, em redes sociais e em e-mails.</li>
        </ul>
      </LegalSection>

      <LegalSection n={6} title="Preços, taxa e recebimento">
        <ul>
          <li>O Organizador define o preço de cada ingresso. O comprador paga, além do preço, a taxa de serviço do BooTickets (hoje 11%), que fica com o BooTickets. Dela saem as tarifas do Mercado Pago sobre a venda.</li>
          <li><strong>Com a conta Mercado Pago conectada</strong>, o valor dos ingressos cai direto na conta do Organizador no momento do pagamento, e a taxa vai para o BooTickets (divisão automática do Mercado Pago). Os prazos de liberação do dinheiro são os do Mercado Pago.</li>
          <li><strong>Sem a conta conectada</strong>, o valor dos ingressos é recebido pelo BooTickets e repassado ao Organizador pela chave Pix cadastrada, <strong>depois da realização do evento</strong>, descontados reembolsos, contestações e valores devidos ao BooTickets.</li>
          <li>O Organizador mantém os dados de recebimento corretos e em seu nome (ou da sua empresa). Repasses feitos para os dados informados por ele são considerados quitados.</li>
        </ul>
      </LegalSection>

      <LegalSection n={7} title="Cancelamento, adiamento e reembolsos">
        <ul>
          <li>Se o evento for <strong>cancelado</strong>, o Organizador deve cancelá-lo no painel o quanto antes. Os compradores recebem o <strong>reembolso integral</strong> (ingresso e taxa), estornado automaticamente.</li>
          <li>Se o evento for <strong>adiado</strong> ou tiver <strong>mudança relevante</strong> (data, local, atração principal), o Organizador avisa o BooTickets e os compradores com antecedência, e quem pedir recebe o reembolso integral.</li>
          <li>O Organizador autoriza o BooTickets a fazer, pelo Mercado Pago, os estornos dos ingressos do seu evento: devoluções no prazo de arrependimento (7 dias, antes do evento), cancelamentos, adiamentos, cobranças em duplicidade e decisões de contestação. Para isso, mantém saldo suficiente na conta Mercado Pago conectada.</li>
          <li>Se o reembolso não puder ser feito pela conta do Organizador e o BooTickets o pagar ao comprador, o Organizador deve ressarcir esse valor em até 5 dias úteis depois de avisado.</li>
          <li>Contestações (chargebacks) e fraudes nas vendas do evento seguem as regras do Mercado Pago e podem ser descontadas dos valores do Organizador.</li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Indenização e direito de regresso">
        <ul>
          <li>O Organizador se obriga a <strong>indenizar e manter o BooTickets livre</strong> de qualquer reclamação, processo, condenação, acordo, multa (inclusive do Procon), custas e honorários de advogado causados pelo evento, pelas informações que publicou ou pelo descumprimento destes Termos ou da lei.</li>
          <li>Se o BooTickets for chamado a responder por algo que é responsabilidade do Organizador, poderá cobrar dele tudo o que pagar (direito de regresso, Código Civil, art. 934 e CDC, art. 88) e também compensar esses valores com repasses que ainda tenha a fazer.</li>
          <li>O Organizador deve ajudar na defesa, entregando documentos e informações em até 5 dias úteis depois de pedidos.</li>
        </ul>
      </LegalSection>

      <LegalSection n={9} title="Retenção de valores">
        <p>Quando houver indícios de fraude, denúncia consistente, evento cancelado sem reembolso, risco relevante de contestações ou ordem de autoridade, o BooTickets pode <strong>pausar as vendas e reter repasses</strong> que estejam com ele, no limite do necessário para cobrir reembolsos e riscos, até a situação ser resolvida. O BooTickets avisa o Organizador e informa o motivo.</p>
      </LegalSection>

      <LegalSection n={10} title="Dados dos participantes (LGPD)">
        <ul>
          <li>O Organizador recebe a lista de participantes (nome, e-mail do comprador e CPF parcialmente oculto) e se torna <strong>controlador</strong> desses dados para fins do seu evento.</li>
          <li>Ele só pode usar os dados para realizar o evento, controlar a entrada e cumprir obrigações legais. É proibido vender, ceder ou usar os dados para publicidade sem base legal (LGPD).</li>
          <li>O Organizador protege os dados que receber, avisa o BooTickets em até 48 horas sobre qualquer incidente de segurança com eles e responde por danos causados pelo uso indevido.</li>
          <li>Se o evento captar imagens do público (fotos ou vídeos), o Organizador avisa isso na página do evento e no local.</li>
        </ul>
      </LegalSection>

      <LegalSection n={11} title="Portaria e equipe">
        <p>O Organizador cadastra a sua equipe de portaria e responde pelo uso que ela faz do leitor de QR Code e dos dados dos participantes. A conferência do documento do titular e da meia-entrada na entrada é feita pela equipe do Organizador.</p>
      </LegalSection>

      <LegalSection n={12} title="Limite de responsabilidade do BooTickets">
        <ul>
          <li>O BooTickets responde perante o Organizador pelos danos diretos que causar por falha comprovada da plataforma, até o valor total das taxas de serviço que recebeu nas vendas do evento afetado.</li>
          <li>O BooTickets não responde por lucros cessantes, perda de vendas esperadas, falhas do Mercado Pago, de bancos ou de provedores de internet, nem por atos do próprio Organizador, da sua equipe ou de terceiros.</li>
          <li>Este limite não se aplica a danos causados com dolo, nem aos direitos dos compradores como consumidores.</li>
        </ul>
      </LegalSection>

      <LegalSection n={13} title="Vigência e encerramento">
        <p>Estes Termos valem enquanto o Organizador tiver eventos no BooTickets. Qualquer parte pode encerrar a relação a qualquer momento, mas as obrigações sobre eventos já vendidos (realização, reembolsos, repasses, indenização e dados) continuam até serem cumpridas. O BooTickets pode encerrar imediatamente a conta de quem violar estes Termos.</p>
      </LegalSection>

      <LegalSection n={14} title="Disposições gerais e foro">
        <ul>
          <li>Os <Link to="/termos" className="text-foreground underline">Termos de Uso</Link> e a <Link to="/privacidade" className="text-foreground underline">Política de Privacidade</Link> também se aplicam ao Organizador. Se houver conflito, prevalecem estes Termos do Organizador.</li>
          <li>Se alguma cláusula for considerada inválida, as demais continuam valendo. A tolerância com um descumprimento não significa renúncia ao direito.</li>
          <li>Comunicações são feitas pelo e-mail cadastrado na conta e pelo {mail}.</li>
          <li>Estes Termos seguem as leis brasileiras. Fica eleito o foro da <strong>Comarca de Fortaleza/CE</strong> para resolver questões entre o BooTickets e o Organizador.</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
