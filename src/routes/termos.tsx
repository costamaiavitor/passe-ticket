import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage, LegalSection, legalEntityLine } from "@/components/legal-page";

// Termos de Uso do comprador e de quem tem conta. Ao mudar o texto, mude também a data em legal-page.tsx
// e a versão em backend/src/config.ts (termsVersion): cada compra guarda a versão aceita.
export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — BooTickets" },
      { name: "description", content: "Regras de uso do BooTickets: compra de ingressos, taxa de serviço, devolução, transferência, meia-entrada e responsabilidades." },
    ],
  }),
  component: Terms,
});

const mail = <a className="text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

function Terms() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="Estes Termos são o contrato entre você e o BooTickets. Eles valem para quem cria conta, compra, recebe ou usa ingressos no site e no app. Leia com atenção: ao criar uma conta ou finalizar uma compra, você declara que leu, entendeu e aceita estes Termos e a Política de Privacidade."
    >
      <LegalSection n={1} title="Quem somos e como você aceita">
        <ul>
          <li>O site bootickets.com.br e o app BooTickets são operados por <strong>{legalEntityLine()}</strong> (“BooTickets”). Contato: {mail}.</li>
          <li>O aceite é eletrônico: ao marcar a caixa “Li e aceito” e confirmar, você concorda com a versão destes Termos publicada naquele momento. Guardamos a versão aceita, a data, a hora, o endereço IP e o navegador usados, como comprovante (Lei 14.063/2020 e Código Civil, art. 107).</li>
          <li>A compra é regida pela versão dos Termos aceita na hora da compra. Mudanças posteriores não alteram compras já feitas.</li>
          <li>Você recebe a confirmação de cada compra por e-mail, com o resumo do pedido. Estes Termos ficam sempre disponíveis neste endereço para consulta, impressão e download.</li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="O que o BooTickets faz (e o que não faz)">
        <ul>
          <li>O BooTickets é uma <strong>plataforma de intermediação</strong>: divulga eventos de terceiros, vende e emite os ingressos, processa pagamentos pelo Mercado Pago e oferece a conferência na entrada.</li>
          <li><strong>Quem realiza o evento é o organizador</strong> (pessoa ou empresa identificada na página do evento). É ele quem define atrações, data, local, preços, lotes, regras de entrada e classificação etária, e quem responde pela realização, pela estrutura, pela segurança, pelas licenças e pelo que acontece no evento.</li>
          <li>O BooTickets responde pelo serviço que presta: o funcionamento da plataforma, a emissão correta dos ingressos, o processamento dos pagamentos e dos reembolsos e o atendimento. Nada nestes Termos afasta os direitos que o Código de Defesa do Consumidor garante a você.</li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Sua conta">
        <ul>
          <li>Para comprar é preciso ter <strong>18 anos ou mais</strong>. Menores podem ser <em>titulares</em> de ingresso, desde que a compra seja feita por um responsável legal (ver seção 6).</li>
          <li>Os dados informados (nome, e-mail e CPF) devem ser verdadeiros e seus. Cada CPF só pode ter uma conta.</li>
          <li>A conta é pessoal. Você é responsável por guardar a senha e por tudo o que for feito com ela. Se suspeitar de uso indevido, troque a senha e fale com a gente.</li>
          <li>Você pode pedir a exclusão da sua conta quando quiser. Compras pagas continuam guardadas, sem os seus dados pessoais, pelo prazo que a lei exige (ver Política de Privacidade).</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Preço, taxa de serviço e pagamento">
        <ul>
          <li>O <strong>preço do ingresso</strong> é definido pelo organizador. Sobre ele, o BooTickets cobra uma <strong>taxa de serviço de 11%</strong>, que remunera a intermediação, a emissão do ingresso, o sistema antifraude, a conferência na entrada e o atendimento. O preço, a taxa e o total aparecem separados <strong>antes</strong> do pagamento.</li>
          <li>O pagamento é feito pelo Mercado Pago (Pix ou cartão). Os dados do cartão são digitados no ambiente do Mercado Pago e não passam pelo BooTickets. No cartão, os juros do parcelamento são do Mercado Pago e aparecem antes da confirmação.</li>
          <li>Ao iniciar a compra, os ingressos ficam reservados pelo tempo mostrado na tela. Sem pagamento nesse prazo, o pedido é cancelado e os ingressos voltam à venda.</li>
          <li>O ingresso só é emitido depois que o Mercado Pago confirma o pagamento. Pagamentos em análise antifraude podem levar mais tempo ou ser recusados pelo Mercado Pago.</li>
          <li>Cada evento pode ter limite de ingressos por CPF, definido pelo organizador para combater o cambismo.</li>
          <li>Em caso de erro evidente de preço (por exemplo, um ingresso anunciado por R$ 1,00 por falha de digitação), o BooTickets pode cancelar o pedido e devolver integralmente o valor pago, avisando você.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Ingresso nominal, QR Code e entrada">
        <ul>
          <li>Cada ingresso é <strong>nominal</strong>: tem um titular com nome e CPF. Na entrada, o titular apresenta documento oficial com foto e o mesmo CPF.</li>
          <li>Cada ingresso tem um <strong>QR Code único, assinado digitalmente</strong>, que vale para <strong>uma única entrada</strong>. Depois de lido na portaria, deixa de valer.</li>
          <li><strong>Não divulgue o QR Code</strong> (prints em redes sociais, grupos etc.): quem apresentar primeiro um QR válido entra. O BooTickets não responde pela entrada de outra pessoa com um QR Code que você compartilhou.</li>
          <li>As regras de entrada (horários, revista, objetos proibidos, idade mínima, código de vestimenta, saída e reentrada) são do organizador e são informadas na página do evento. O organizador pode recusar a entrada de quem descumprir essas regras ou a lei.</li>
        </ul>
      </LegalSection>

      <LegalSection n={6} title="Meia-entrada, idade e dados dos titulares">
        <ul>
          <li><strong>Meia-entrada</strong> (Lei 12.933/2013 e Estatuto da Pessoa Idosa): quem compra ingresso de meia-entrada precisa apresentar, na entrada, o documento que comprova o direito (carteira estudantil válida, documento da pessoa idosa, comprovante de deficiência ou ID Jovem). Sem a comprovação, o organizador pode cobrar a diferença para o valor inteiro ou recusar a entrada. Nesse caso, a falta de comprovação não dá direito a reembolso.</li>
          <li>A <strong>classificação etária</strong> do evento é definida pelo organizador e aparece na página do evento. Menores de idade só entram nos casos permitidos pela lei e pela classificação, e o organizador pode exigir a presença ou autorização dos pais ou responsáveis.</li>
          <li>Ao informar o nome e o CPF de outra pessoa como titular, você declara que os dados são verdadeiros e que tem autorização dela para isso. Se o titular for menor de idade, você declara ser o pai, a mãe ou o responsável legal, ou ter a autorização deles (LGPD, art. 14).</li>
        </ul>
      </LegalSection>

      <LegalSection n={7} title="Transferência de ingresso">
        <ul>
          <li>Se o evento permitir, você pode transferir o ingresso para outra pessoa pelo CPF dela. A transferência só se completa quando ela aceita.</li>
          <li>Ao aceitar, o QR Code antigo é cancelado e um novo é gerado para o novo titular. O número de transferências e o prazo são definidos pelo organizador.</li>
          <li>Ingresso transferido não pode ser devolvido por quem o transferiu.</li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Devolução, cancelamento e adiamento">
        <ul id="devolucao">
          <li><strong>Direito de arrependimento (CDC, art. 49):</strong> você pode devolver a compra em até <strong>7 (sete) dias corridos</strong> contados da confirmação do pagamento, desde que o evento <strong>ainda não tenha começado</strong>. A devolução é feita pelo próprio site, em “Meus ingressos” → “Devolver ingressos”, e vale para o pedido inteiro.</li>
          <li><strong>Valor devolvido:</strong> o valor total pago, <strong>incluindo a taxa de serviço</strong>, estornado pelo mesmo meio de pagamento. No Pix, volta para a conta de origem. No cartão, o estorno pode levar até 2 faturas para aparecer, conforme o banco.</li>
          <li>Ao devolver, todos os ingressos do pedido são cancelados na hora e podem voltar à venda. A devolução não pode ser desfeita.</li>
          <li><strong>Não podem ser devolvidos pelo arrependimento:</strong> ingressos já usados na entrada, pedidos com ingresso transferido (ou com transferência em aberto), cortesias e compras fora do prazo acima. Fora do prazo, desistência, mudança de planos ou impossibilidade de comparecer não dão direito a reembolso. Se o evento permitir, você pode transferir o ingresso.</li>
          <li><strong>Evento cancelado:</strong> o reembolso é <strong>integral e automático</strong> (ingresso e taxa de serviço), pelo mesmo meio de pagamento, sem que você precise pedir.</li>
          <li><strong>Evento adiado ou com mudança relevante</strong> (data, local ou atração principal anunciada): você pode escolher entre manter o ingresso para a nova data ou receber o reembolso integral. O pedido pode ser feito pelo e-mail {mail} em até 30 dias depois do aviso da mudança.</li>
          <li>Se o estorno não puder ser feito na hora, os ingressos continuam válidos até a devolução ser concluída, e a nossa equipe entra em contato.</li>
        </ul>
      </LegalSection>

      <LegalSection n={9} title="O que é proibido">
        <ul>
          <li>Revender ingressos por preço acima do original (cambismo) ou anunciar ingressos do BooTickets em outros sites.</li>
          <li>Falsificar, copiar, adulterar ou vender cópias de QR Codes.</li>
          <li>Usar dados de outras pessoas sem autorização, cartões de terceiros ou contas falsas.</li>
          <li>Usar robôs, scripts ou qualquer automação para comprar, reservar ou consultar ingressos, ou tentar burlar limites de compra, filas, pagamentos ou a segurança do site.</li>
          <li>Copiar o conteúdo do site, fazer engenharia reversa ou sobrecarregar os sistemas.</li>
        </ul>
        <p>Quem fizer isso pode ter os pedidos e ingressos cancelados e a conta suspensa, além de responder pelos danos causados, sem prejuízo das medidas legais cabíveis.</p>
      </LegalSection>

      <LegalSection n={10} title="Contestação de compra (chargeback) e fraude">
        <ul>
          <li>Se você não reconhecer uma compra, fale primeiro com a gente: resolvemos mais rápido do que o banco.</li>
          <li>Se uma compra for contestada no cartão ou no Pix (MED), os ingressos do pedido podem ser cancelados enquanto a contestação estiver aberta.</li>
          <li>Contestar de má-fé uma compra que foi feita por você ou com a sua autorização, ou depois de usar o ingresso, é proibido. Nesses casos, o BooTickets pode apresentar ao banco e às autoridades as provas da compra (aceite destes Termos, dados do pedido, registros de acesso e registro da entrada na portaria), suspender a conta e cobrar os valores devidos.</li>
        </ul>
      </LegalSection>

      <LegalSection n={11} title="Responsabilidades">
        <ul>
          <li><strong>Do organizador:</strong> a realização do evento e tudo o que acontece nele, como atrações, estrutura, segurança, alvarás, alimentação, bebidas, objetos perdidos, horários, acessibilidade e informações divulgadas. As reclamações sobre o evento devem ser feitas ao organizador. O BooTickets ajuda a encaminhar e garante o reembolso nos casos destes Termos.</li>
          <li><strong>Do BooTickets:</strong> o serviço de intermediação descrito na seção 2. Trabalhamos para que o site e o app fiquem no ar e seguros, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros (internet, Mercado Pago, provedores de hospedagem). O QR Code fica salvo em “Meus ingressos” e, no app, abre mesmo sem internet.</li>
          <li>Nenhuma das partes responde por <strong>caso fortuito ou força maior</strong> (Código Civil, art. 393), como desastres naturais, ordens de autoridades ou eventos climáticos extremos. Nesses casos, se o evento não acontecer, vale o reembolso da seção 8.</li>
          <li>Você é responsável pelo uso da sua conta, pela guarda do QR Code e pela veracidade dos dados informados.</li>
        </ul>
      </LegalSection>

      <LegalSection n={12} title="Conteúdo do site e denúncias">
        <ul>
          <li>Textos, fotos e informações dos eventos são publicados pelos organizadores, que respondem por eles. Os eventos passam por uma análise antes de ir ao ar, mas o BooTickets não garante a exatidão do que o organizador informa.</li>
          <li>Se você encontrar um evento falso, ilegal, enganoso ou que use conteúdo de terceiros sem autorização, denuncie pelo e-mail {mail}. Analisamos as denúncias e podemos suspender a venda ou remover o evento.</li>
          <li>A marca, o nome, o visual e o software do BooTickets são protegidos (Leis 9.279/1996 e 9.610/1998) e não podem ser usados sem autorização.</li>
        </ul>
      </LegalSection>

      <LegalSection n={13} title="Comunicações">
        <p>Avisos sobre seus pedidos, ingressos e conta são enviados para o e-mail cadastrado e, no app, por notificação. Mantenha o seu e-mail atualizado e confira também a caixa de spam. Essas comunicações valem como aviso para todos os efeitos.</p>
      </LegalSection>

      <LegalSection n={14} title="Privacidade">
        <p>O uso dos seus dados pessoais está descrito na <Link to="/privacidade" className="text-foreground underline">Política de Privacidade</Link>, que faz parte destes Termos.</p>
      </LegalSection>

      <LegalSection n={15} title="Suspensão e encerramento">
        <p>O BooTickets pode suspender ou encerrar contas, pedidos ou ingressos em caso de fraude, indícios fortes de fraude, cambismo, violação destes Termos ou ordem de autoridade. Quando a lei permitir, avisamos o motivo e damos a oportunidade de explicação. Valores pagos por ingressos cancelados sem culpa sua são devolvidos integralmente.</p>
      </LegalSection>

      <LegalSection n={16} title="Atendimento">
        <ul>
          <li>Dúvidas, pedidos e reclamações: {mail}. Respondemos em até <strong>5 dias úteis</strong>.</li>
          <li>Antes de ir à Justiça, o caminho mais rápido costuma ser falar com a gente. Você também pode usar a plataforma pública consumidor.gov.br ou o Procon. Nenhuma dessas opções é obrigatória.</li>
        </ul>
      </LegalSection>

      <LegalSection n={17} title="Mudanças nestes Termos">
        <p>Podemos atualizar estes Termos para refletir mudanças na lei ou no serviço. A data no topo mostra a versão em vigor. Mudanças importantes são avisadas no site ou por e-mail. Cada compra continua regida pela versão aceita no momento em que foi feita.</p>
      </LegalSection>

      <LegalSection n={18} title="Lei aplicável e foro">
        <p>Estes Termos seguem as leis brasileiras, em especial o Código de Defesa do Consumidor, o Marco Civil da Internet e a Lei Geral de Proteção de Dados. Se alguma cláusula for considerada inválida, as demais continuam valendo. Para resolver qualquer questão, fica eleito o <strong>foro do domicílio do consumidor</strong>.</p>
      </LegalSection>
    </LegalPage>
  );
}
