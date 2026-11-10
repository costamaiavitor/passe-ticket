import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — BooTickets" },
      { name: "description", content: "Regras de uso do BooTickets para compradores e organizadores de eventos." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="Ao criar uma conta, comprar ingressos ou publicar eventos no BooTickets, você concorda com estes termos. Leia com atenção."
    >
      <LegalSection n={1} title="O que é o BooTickets">
        <p>O BooTickets é uma plataforma que conecta <strong>organizadores de eventos</strong> e <strong>compradores de ingressos</strong>. O BooTickets intermedeia a venda e emite os ingressos; <strong>quem realiza o evento é o organizador</strong>, que é responsável pela sua realização, conteúdo, segurança e pelas informações divulgadas.</p>
      </LegalSection>

      <LegalSection n={2} title="Sua conta">
        <ul>
          <li>Você deve informar dados verdadeiros e manter sua senha em sigilo.</li>
          <li>É preciso ter 18 anos ou mais, ou estar autorizado por um responsável legal, para comprar ingressos.</li>
          <li>Podemos suspender contas usadas para fraude, cambismo ou que violem estes termos.</li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Compra de ingressos">
        <ul>
          <li>O preço de cada ingresso é definido pelo organizador. O BooTickets cobra uma <strong>taxa de serviço de 10%</strong>, mostrada antes do pagamento.</li>
          <li>Os ingressos são <strong>nominais</strong>: cada um tem um titular com CPF, que deve apresentar documento com foto na entrada.</li>
          <li>Há limite de ingressos por CPF em cada evento, definido pelo organizador.</li>
          <li>Pedidos não pagos dentro do prazo exibido no checkout são cancelados e os ingressos voltam à venda.</li>
          <li>No cartão, o parcelamento pode ter juros do Mercado Pago, sempre informados antes da confirmação.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="QR Code e entrada">
        <ul>
          <li>Cada ingresso tem um QR Code único que só vale para uma entrada. Depois de lido na portaria, ele deixa de valer.</li>
          <li>Não compartilhe o QR Code: quem chegar primeiro com ele entra no seu lugar.</li>
          <li>Ao transferir um ingresso, o QR Code antigo é cancelado e um novo é gerado para o novo titular.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Cancelamento e reembolso">
        <ul>
          <li>Pelo Código de Defesa do Consumidor (art. 49), compras pela internet podem ser canceladas em até <strong>7 dias</strong> após a compra, desde que o pedido seja feito antes do evento acontecer, conforme a política do evento.</li>
          <li>Se o evento for <strong>cancelado ou adiado</strong>, o comprador tem direito ao reembolso integral, que é de responsabilidade do organizador e será processado pelo mesmo meio de pagamento.</li>
          <li>Ingressos já utilizados na portaria não são reembolsáveis.</li>
          <li>Pedidos de cancelamento: <a className="text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
        </ul>
      </LegalSection>

      <LegalSection n={6} title="Regras para organizadores">
        <ul>
          <li>O organizador garante que tem direito de realizar o evento, com as licenças e alvarás exigidos.</li>
          <li>As informações do evento (data, local, atrações, classificação etária, preços) devem ser verdadeiras.</li>
          <li>O organizador é responsável por reembolsar compradores em caso de cancelamento ou mudança relevante do evento.</li>
          <li>O valor das vendas, descontada a taxa de serviço e as tarifas de pagamento, é repassado ao organizador.</li>
          <li>É proibido publicar eventos ilegais, enganosos ou que violem direitos de terceiros.</li>
        </ul>
      </LegalSection>

      <LegalSection n={7} title="Proibido">
        <ul>
          <li>Revender ingressos por preço acima do original (cambismo).</li>
          <li>Falsificar, copiar ou adulterar QR Codes.</li>
          <li>Tentar burlar limites de compra, sistemas de pagamento ou a segurança do site.</li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Responsabilidade">
        <p>O BooTickets se esforça para manter o site no ar e seguro, mas não se responsabiliza pela realização, qualidade ou segurança do evento, que cabem ao organizador. Nada nestes termos limita os direitos garantidos pelo Código de Defesa do Consumidor.</p>
      </LegalSection>

      <LegalSection n={9} title="Privacidade">
        <p>O uso dos seus dados está descrito na nossa <Link to="/privacidade" className="text-foreground underline">Política de Privacidade</Link>.</p>
      </LegalSection>

      <LegalSection n={10} title="Mudanças e foro">
        <p>Estes termos podem ser atualizados; a data no topo indica a última versão. Fica eleito o foro do domicílio do consumidor para resolver qualquer questão.</p>
      </LegalSection>
    </LegalPage>
  );
}
