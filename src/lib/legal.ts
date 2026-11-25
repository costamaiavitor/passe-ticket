/**
 * Identificação de quem opera o site (Decreto 7.962/2013, art. 2º: nome empresarial, CNPJ e endereço
 * precisam aparecer no site). Preencha assim que o CNPJ sair; enquanto estiver vazio, o site mostra
 * "em registro".
 */
export const LEGAL_ENTITY = {
  name: "BooTickets",
  legalName: "", // ex.: "BOOTICKETS TECNOLOGIA LTDA"
  cnpj: "", // ex.: "00.000.000/0001-00"
  address: "", // ex.: "Av. ..., nº ..., Fortaleza/CE, CEP ..."
};

/** Linha "BooTickets — RAZÃO SOCIAL, CNPJ …, endereço" para as páginas legais e o rodapé. */
export function legalEntityLine() {
  const e = LEGAL_ENTITY;
  if (!e.cnpj) return `${e.name} (empresa em registro na Junta Comercial do Ceará), Fortaleza/CE`;
  return `${e.legalName || e.name}, CNPJ ${e.cnpj}${e.address ? `, ${e.address}` : ""}`;
}
