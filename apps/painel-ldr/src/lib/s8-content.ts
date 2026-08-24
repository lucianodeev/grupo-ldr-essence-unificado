export type SessionDef = {
  number: number;
  title: string;
  prompt: string;
};

export const S8_SESSIONS: SessionDef[] = [
  {
    number: 1,
    title: "Origem, momento atual e objetivo",
    prompt:
      "História, momento atual do negócio ou da carreira e objetivo principal para as 8 sessões.",
  },
  {
    number: 2,
    title: "Perfil comportamental empreendedor",
    prompt: "Perfil, forma de decidir, tolerância a risco, disciplina e rede de apoio.",
  },
  {
    number: 3,
    title: "Problema, oportunidade e público",
    prompt: "Dor que se pretende resolver, tamanho da oportunidade e definição do público.",
  },
  {
    number: 4,
    title: "Solução, proposta de valor e diferenciais",
    prompt: "Solução proposta, promessa central e diferenciais frente às alternativas.",
  },
  {
    number: 5,
    title: "Modelo, preço e viabilidade",
    prompt: "Modelo de receita, formação de preço, custos e ponto de equilíbrio.",
  },
  {
    number: 6,
    title: "Comunicação, vendas e validação",
    prompt: "Canais, discurso comercial, funil de vendas e testes de validação.",
  },
  {
    number: 7,
    title: "Operação e plano de execução",
    prompt: "Rotina operacional, responsáveis, ferramentas e cronograma de execução.",
  },
  {
    number: 8,
    title: "Consolidação e PDE final",
    prompt: "Consolidação do percurso, resultados alcançados e fechamento do PDE.",
  },
];

export type FieldDef = { key: string; label: string; long?: boolean };

export const PROJECT_FIELDS: FieldDef[] = [
  { key: "business_name", label: "Nome do negócio" },
  { key: "idea_pitch", label: "Apresentação da ideia", long: true },
  { key: "problem", label: "Problema", long: true },
  { key: "solution", label: "Solução", long: true },
  { key: "target_audience", label: "Público-alvo", long: true },
  { key: "product_service", label: "Produto / serviço", long: true },
  { key: "value_proposition", label: "Proposta de valor e diferenciais", long: true },
  { key: "channels", label: "Canais", long: true },
  { key: "sales", label: "Vendas", long: true },
  { key: "pricing", label: "Preço", long: true },
  { key: "costs", label: "Custos", long: true },
  { key: "revenues", label: "Receitas", long: true },
  { key: "partners_resources", label: "Parceiros e recursos", long: true },
  { key: "risks_responses", label: "Riscos e respostas", long: true },
  { key: "goals_indicators", label: "Metas e indicadores", long: true },
  { key: "plan_30_60_90", label: "Plano 30 / 60 / 90", long: true },
];

export const PDE_FIELDS: FieldDef[] = [
  { key: "strengths", label: "Pontos fortes", long: true },
  { key: "competencies", label: "Competências a desenvolver", long: true },
  { key: "evolution", label: "Evolução", long: true },
  { key: "recommendations", label: "Recomendações", long: true },
];

export const SESSION_MINUTES = 50;
