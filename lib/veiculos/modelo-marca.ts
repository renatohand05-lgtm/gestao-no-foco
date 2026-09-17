/**
 * Modelo → marca de veículos comuns no mercado brasileiro.
 * Usado pra preencher a marca automaticamente assim que a pessoa digita
 * o modelo do carro, sem precisar buscar por placa nem digitar de novo.
 *
 * Não é exaustivo — cobre os modelos mais comuns. Se não achar, o campo
 * marca simplesmente fica em branco pra digitação manual (nunca inventa).
 */

const MODELO_MARCA: Record<string, string> = {
  // Fiat
  UNO: "Fiat",
  PALIO: "Fiat",
  SIENA: "Fiat",
  STRADA: "Fiat",
  TORO: "Fiat",
  ARGO: "Fiat",
  CRONOS: "Fiat",
  MOBI: "Fiat",
  FIORINO: "Fiat",
  DOBLO: "Fiat",
  IDEA: "Fiat",
  PUNTO: "Fiat",
  LINEA: "Fiat",
  PULSE: "Fiat",
  FASTBACK: "Fiat",
  DUCATO: "Fiat",
  MAREA: "Fiat",
  BRAVO: "Fiat",
  "500": "Fiat",
  ELBA: "Fiat",
  TEMPRA: "Fiat",
  // Chevrolet
  ONIX: "Chevrolet",
  PRISMA: "Chevrolet",
  CELTA: "Chevrolet",
  CORSA: "Chevrolet",
  CLASSIC: "Chevrolet",
  ASTRA: "Chevrolet",
  VECTRA: "Chevrolet",
  S10: "Chevrolet",
  SPIN: "Chevrolet",
  COBALT: "Chevrolet",
  CRUZE: "Chevrolet",
  TRACKER: "Chevrolet",
  MONTANA: "Chevrolet",
  AGILE: "Chevrolet",
  MERIVA: "Chevrolet",
  ZAFIRA: "Chevrolet",
  CAPTIVA: "Chevrolet",
  EQUINOX: "Chevrolet",
  TRAILBLAZER: "Chevrolet",
  JOY: "Chevrolet",
  CAMARO: "Chevrolet",
  OMEGA: "Chevrolet",
  KADETT: "Chevrolet",
  MONZA: "Chevrolet",
  // Volkswagen
  GOL: "Volkswagen",
  VOYAGE: "Volkswagen",
  FOX: "Volkswagen",
  POLO: "Volkswagen",
  VIRTUS: "Volkswagen",
  SAVEIRO: "Volkswagen",
  UP: "Volkswagen",
  GOLF: "Volkswagen",
  JETTA: "Volkswagen",
  PASSAT: "Volkswagen",
  TIGUAN: "Volkswagen",
  "T-CROSS": "Volkswagen",
  NIVUS: "Volkswagen",
  AMAROK: "Volkswagen",
  KOMBI: "Volkswagen",
  PARATI: "Volkswagen",
  SANTANA: "Volkswagen",
  SPACEFOX: "Volkswagen",
  CROSSFOX: "Volkswagen",
  TAOS: "Volkswagen",
  FUSCA: "Volkswagen",
  // Ford
  KA: "Ford",
  FIESTA: "Ford",
  FOCUS: "Ford",
  ECOSPORT: "Ford",
  RANGER: "Ford",
  FUSION: "Ford",
  EDGE: "Ford",
  TERRITORY: "Ford",
  BRONCO: "Ford",
  MAVERICK: "Ford",
  COURIER: "Ford",
  ESCORT: "Ford",
  CORCEL: "Ford",
  BELINA: "Ford",
  "DEL REY": "Ford",
  PAMPA: "Ford",
  // Hyundai
  HB20S: "Hyundai",
  HB20: "Hyundai",
  CRETA: "Hyundai",
  TUCSON: "Hyundai",
  "SANTA FE": "Hyundai",
  I30: "Hyundai",
  IX35: "Hyundai",
  AZERA: "Hyundai",
  ELANTRA: "Hyundai",
  VELOSTER: "Hyundai",
  KONA: "Hyundai",
  // Toyota
  COROLLA: "Toyota",
  ETIOS: "Toyota",
  HILUX: "Toyota",
  SW4: "Toyota",
  YARIS: "Toyota",
  RAV4: "Toyota",
  CAMRY: "Toyota",
  PRIUS: "Toyota",
  // Honda
  CIVIC: "Honda",
  FIT: "Honda",
  CITY: "Honda",
  "HR-V": "Honda",
  "CR-V": "Honda",
  ACCORD: "Honda",
  "WR-V": "Honda",
  "ZR-V": "Honda",
  // Renault
  SANDERO: "Renault",
  LOGAN: "Renault",
  DUSTER: "Renault",
  KWID: "Renault",
  CAPTUR: "Renault",
  STEPWAY: "Renault",
  CLIO: "Renault",
  SYMBOL: "Renault",
  FLUENCE: "Renault",
  OROCH: "Renault",
  MASTER: "Renault",
  KANGOO: "Renault",
  // Nissan
  MARCH: "Nissan",
  VERSA: "Nissan",
  SENTRA: "Nissan",
  KICKS: "Nissan",
  FRONTIER: "Nissan",
  LIVINA: "Nissan",
  TIIDA: "Nissan",
  // Jeep
  RENEGADE: "Jeep",
  COMPASS: "Jeep",
  COMMANDER: "Jeep",
  WRANGLER: "Jeep",
  // Citroën
  C3: "Citroën",
  C4: "Citroën",
  JUMPY: "Citroën",
  JUMPER: "Citroën",
  XSARA: "Citroën",
  // Peugeot
  "208": "Peugeot",
  "2008": "Peugeot",
  "3008": "Peugeot",
  "206": "Peugeot",
  "207": "Peugeot",
  "306": "Peugeot",
  "307": "Peugeot",
  "408": "Peugeot",
  PARTNER: "Peugeot",
  // Mitsubishi
  L200: "Mitsubishi",
  PAJERO: "Mitsubishi",
  ASX: "Mitsubishi",
  OUTLANDER: "Mitsubishi",
  LANCER: "Mitsubishi",
  // Kia
  SPORTAGE: "Kia",
  CERATO: "Kia",
  PICANTO: "Kia",
  SOUL: "Kia",
  SORENTO: "Kia",
  // BYD
  DOLPHIN: "BYD",
  SONG: "BYD",
  SEAL: "BYD",
  YUAN: "BYD",
  // Chery/Caoa Chery
  TIGGO: "Chery",
  ARRIZO: "Chery",
  // Suzuki
  JIMNY: "Suzuki",
  VITARA: "Suzuki",
  // Mercedes-Benz
  SPRINTER: "Mercedes-Benz",
};

/** Modelos ordenados do mais específico (mais longo) pro mais genérico. */
const MODELOS_ORDENADOS = Object.keys(MODELO_MARCA).sort(
  (a, b) => b.length - a.length,
);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Tenta descobrir a marca a partir do texto digitado no campo modelo.
 * Casa pelo início do texto (ex.: "HB20S 1.0M COMFORT" → Hyundai) usando
 * os nomes mais específicos primeiro. Retorna null se não reconhecer.
 */
export function inferirMarcaPeloModelo(modeloDigitado: string): string | null {
  const normalizado = normalizar(modeloDigitado);
  if (!normalizado) return null;

  for (const modelo of MODELOS_ORDENADOS) {
    const modeloNormalizado = normalizar(modelo);
    if (
      normalizado === modeloNormalizado ||
      normalizado.startsWith(`${modeloNormalizado} `) ||
      normalizado.startsWith(modeloNormalizado.replace("-", ""))
    ) {
      return MODELO_MARCA[modelo];
    }
  }
  return null;
}
