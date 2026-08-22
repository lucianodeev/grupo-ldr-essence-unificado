// Whitelist client-safe dos serviços que o cliente pode contratar sozinho.
// Nenhum preço é definido aqui: valores e links vêm sempre do catálogo do banco.
// `originalCents` é apenas o valor de referência (sem desconto) usado para
// exibir o preço riscado nos pacotes com 5% de desconto.

export type ContractGroup = "psicanalise" | "mentoria";

export type ContractOption = {
  catalogKey: string;
  group: ContractGroup;
  /** Região exibida no seletor de moeda (apenas Psicanálise). */
  region: "eu" | "br" | null;
  /** Valor original em centavos, quando o item tem desconto. */
  originalCents: number | null;
};

export const CONTRACT_OPTIONS: ContractOption[] = [
  { catalogKey: "psicanalise_clinica_eu", group: "psicanalise", region: "eu", originalCents: null },
  {
    catalogKey: "psicanalise_pacote_4_eu",
    group: "psicanalise",
    region: "eu",
    originalCents: 12000,
  },
  {
    catalogKey: "psicanalise_pacote_8_eu",
    group: "psicanalise",
    region: "eu",
    originalCents: 24000,
  },
  { catalogKey: "psicanalise_clinica_br", group: "psicanalise", region: "br", originalCents: null },
  {
    catalogKey: "psicanalise_pacote_4_br",
    group: "psicanalise",
    region: "br",
    originalCents: 72000,
  },
  {
    catalogKey: "psicanalise_pacote_8_br",
    group: "psicanalise",
    region: "br",
    originalCents: 144000,
  },
  { catalogKey: "mentoria_sessao", group: "mentoria", region: null, originalCents: null },
  { catalogKey: "mentoria_4", group: "mentoria", region: null, originalCents: null },
  { catalogKey: "mentoria_8", group: "mentoria", region: null, originalCents: null },
];

export const CONTRACT_KEYS = CONTRACT_OPTIONS.map((o) => o.catalogKey);

export function contractOption(catalogKey: string): ContractOption | undefined {
  return CONTRACT_OPTIONS.find((o) => o.catalogKey === catalogKey);
}

/** Item pronto para exibição na Área do Cliente (sem dado sensível). */
export type ContractItem = {
  catalogKey: string;
  name: string;
  group: ContractGroup;
  region: "eu" | "br" | null;
  currency: string;
  amountCents: number;
  originalCents: number | null;
  sessions: number;
  paymentUrl: string | null;
};
