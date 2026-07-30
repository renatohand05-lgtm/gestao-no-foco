import { createParametricProvider } from "./parametric-core.ts";

export const simplesNacionalProvider = createParametricProvider(
  "simples_nacional",
  "Simples Nacional (parametrizado)",
  {
    componentCode: "SN",
    componentLabel: "Simples Nacional",
  },
);

export const lucroPresumidoProvider = createParametricProvider(
  "lucro_presumido",
  "Lucro Presumido (parametrizado)",
  {
    componentCode: "LP",
    componentLabel: "Lucro Presumido",
    usePresumption: true,
  },
);

export const lucroRealProvider = createParametricProvider(
  "lucro_real",
  "Lucro Real (parametrizado)",
  {
    componentCode: "LR",
    componentLabel: "Lucro Real",
    useCredits: true,
  },
);

export const cbsProvider = createParametricProvider(
  "cbs",
  "CBS — Reforma Tributária (parametrizado)",
  {
    componentCode: "CBS",
    componentLabel: "CBS",
    useCredits: true,
  },
);

export const ibsProvider = createParametricProvider(
  "ibs",
  "IBS — Reforma Tributária (parametrizado)",
  {
    componentCode: "IBS",
    componentLabel: "IBS",
    useCredits: true,
  },
);

export const customRegimeProvider = createParametricProvider(
  "custom",
  "Regime customizado (parametrizado)",
  {
    componentCode: "CUSTOM",
    componentLabel: "Tributo customizado",
  },
);
