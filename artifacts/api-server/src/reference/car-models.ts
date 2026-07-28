/**
 * Car MODELS reference (2026) — real, popular models per brand, keyed by brand
 * slug. Bootstraps the model dictionary / autocomplete before user data accrues.
 *
 * Uses the EXISTING `models` table (models → brand via brand_id, slug =
 * slugify("<brandName>-<modelName>") to match the current seed convention).
 * Pure CARS data — no cross-section mixing. Body types drive the existing car
 * body-type filter. Seed upserts by slug, so it enriches models already present
 * and adds the rest — never duplicates, never touches API/business logic.
 *
 * MENA new + used + import market oriented (buy/sell/exchange/new/used). Not
 * exhaustive per brand — a strong, real starter set the self-learning pipeline
 * grows from as sellers publish.
 */

export type BodyType =
  | "sedan"
  | "suv"
  | "hatchback"
  | "coupe"
  | "pickup"
  | "van"
  | "crossover"
  | "minivan"
  | "convertible";

// brand slug → [modelName, bodyType][]
// prettier-ignore
export const CAR_MODELS: Record<string, Array<[string, BodyType]>> = {
  toyota: [
    ["Corolla", "sedan"], ["Camry", "sedan"], ["Yaris", "hatchback"], ["Belta", "sedan"],
    ["Corolla Cross", "crossover"], ["RAV4", "suv"], ["C-HR", "crossover"], ["Raize", "suv"],
    ["Rush", "suv"], ["Fortuner", "suv"], ["Land Cruiser", "suv"], ["Land Cruiser Prado", "suv"],
    ["Highlander", "suv"], ["Hilux", "pickup"], ["Avanza", "minivan"], ["Innova", "minivan"],
    ["Hiace", "van"], ["Coaster", "van"], ["Prius", "hatchback"], ["GR86", "coupe"], ["Supra", "coupe"],
  ],
  lexus: [
    ["ES", "sedan"], ["IS", "sedan"], ["LS", "sedan"], ["UX", "crossover"], ["NX", "suv"],
    ["RX", "suv"], ["GX", "suv"], ["LX", "suv"], ["RC", "coupe"], ["LC", "coupe"],
  ],
  hyundai: [
    ["Accent", "sedan"], ["Elantra", "sedan"], ["Sonata", "sedan"], ["Azera", "sedan"], ["Verna", "sedan"],
    ["i10", "hatchback"], ["i20", "hatchback"], ["i30", "hatchback"], ["Bayon", "crossover"],
    ["Venue", "suv"], ["Creta", "suv"], ["Kona", "crossover"], ["Tucson", "suv"], ["Santa Fe", "suv"],
    ["Palisade", "suv"], ["Staria", "van"], ["H1", "van"], ["Ioniq 5", "crossover"], ["Ioniq 6", "sedan"],
  ],
  kia: [
    ["Pegas", "sedan"], ["Rio", "sedan"], ["Cerato", "sedan"], ["K5", "sedan"], ["Optima", "sedan"], ["Stinger", "sedan"],
    ["Picanto", "hatchback"], ["Soul", "crossover"], ["Sonet", "suv"], ["Seltos", "suv"], ["Sportage", "suv"],
    ["Sorento", "suv"], ["Telluride", "suv"], ["Carnival", "minivan"], ["Carens", "minivan"], ["EV6", "crossover"], ["Niro", "crossover"],
  ],
  nissan: [
    ["Sunny", "sedan"], ["Sentra", "sedan"], ["Sylphy", "sedan"], ["Altima", "sedan"], ["Maxima", "sedan"],
    ["Micra", "hatchback"], ["Kicks", "crossover"], ["Juke", "crossover"], ["Qashqai", "crossover"],
    ["X-Trail", "suv"], ["Terrano", "suv"], ["Murano", "suv"], ["Pathfinder", "suv"], ["Patrol", "suv"], ["Armada", "suv"],
    ["Navara", "pickup"], ["Urvan", "van"],
  ],
  chevrolet: [
    ["Aveo", "sedan"], ["Optra", "sedan"], ["Cruze", "sedan"], ["Malibu", "sedan"], ["Spark", "hatchback"],
    ["Groove", "crossover"], ["Captiva", "suv"], ["Equinox", "suv"], ["Trailblazer", "suv"], ["Blazer", "suv"],
    ["Traverse", "suv"], ["Tahoe", "suv"], ["Suburban", "suv"], ["Camaro", "coupe"], ["Silverado", "pickup"], ["N300", "van"],
  ],
  mitsubishi: [
    ["Attrage", "sedan"], ["Lancer", "sedan"], ["Mirage", "hatchback"], ["Xpander", "minivan"],
    ["ASX", "suv"], ["Eclipse Cross", "suv"], ["Outlander", "suv"], ["Montero Sport", "suv"], ["Pajero", "suv"],
    ["L200", "pickup"], ["Canter", "van"],
  ],
  honda: [
    ["City", "sedan"], ["Civic", "sedan"], ["Accord", "sedan"], ["Jazz", "hatchback"],
    ["HR-V", "crossover"], ["ZR-V", "suv"], ["CR-V", "suv"], ["Pilot", "suv"], ["BR-V", "minivan"], ["Odyssey", "minivan"],
  ],
  mazda: [
    ["Mazda 2", "hatchback"], ["Mazda 3", "sedan"], ["Mazda 6", "sedan"], ["CX-3", "crossover"], ["CX-30", "crossover"],
    ["CX-5", "suv"], ["CX-60", "suv"], ["CX-9", "suv"], ["CX-90", "suv"], ["MX-5", "convertible"], ["BT-50", "pickup"],
  ],
  "mercedes-benz": [
    ["A-Class", "hatchback"], ["C-Class", "sedan"], ["E-Class", "sedan"], ["S-Class", "sedan"], ["CLA", "sedan"], ["CLS", "coupe"],
    ["GLA", "suv"], ["GLB", "suv"], ["GLC", "suv"], ["GLE", "suv"], ["GLS", "suv"], ["G-Class", "suv"],
    ["V-Class", "van"], ["Vito", "van"], ["Sprinter", "van"], ["AMG GT", "coupe"], ["EQS", "sedan"], ["EQE", "sedan"], ["EQB", "suv"],
  ],
  bmw: [
    ["1 Series", "hatchback"], ["2 Series", "coupe"], ["3 Series", "sedan"], ["4 Series", "coupe"], ["5 Series", "sedan"],
    ["7 Series", "sedan"], ["8 Series", "coupe"], ["X1", "suv"], ["X3", "suv"], ["X4", "suv"], ["X5", "suv"], ["X6", "suv"],
    ["X7", "suv"], ["Z4", "convertible"], ["i4", "sedan"], ["iX", "suv"], ["i7", "sedan"], ["M3", "sedan"], ["M4", "coupe"],
  ],
  audi: [
    ["A3", "sedan"], ["A4", "sedan"], ["A6", "sedan"], ["A8", "sedan"], ["Q2", "suv"], ["Q3", "suv"], ["Q5", "suv"],
    ["Q7", "suv"], ["Q8", "suv"], ["A5", "coupe"], ["A7", "coupe"], ["TT", "coupe"], ["e-tron", "suv"], ["Q4 e-tron", "suv"],
  ],
  volkswagen: [
    ["Polo", "hatchback"], ["Golf", "hatchback"], ["Jetta", "sedan"], ["Passat", "sedan"], ["Arteon", "sedan"],
    ["T-Roc", "crossover"], ["T-Cross", "crossover"], ["Tiguan", "suv"], ["Touareg", "suv"], ["Teramont", "suv"],
    ["ID.4", "suv"], ["ID.6", "suv"], ["Caddy", "van"],
  ],
  jeep: [
    ["Renegade", "suv"], ["Compass", "suv"], ["Cherokee", "suv"], ["Grand Cherokee", "suv"], ["Wrangler", "suv"],
    ["Gladiator", "pickup"], ["Wagoneer", "suv"], ["Grand Wagoneer", "suv"],
  ],
  renault: [
    ["Logan", "sedan"], ["Sandero", "hatchback"], ["Megane", "sedan"], ["Fluence", "sedan"], ["Clio", "hatchback"],
    ["Kwid", "hatchback"], ["Duster", "suv"], ["Captur", "crossover"], ["Kadjar", "suv"], ["Koleos", "suv"],
    ["Austral", "suv"], ["Talisman", "sedan"],
  ],
  peugeot: [
    ["208", "hatchback"], ["301", "sedan"], ["308", "hatchback"], ["508", "sedan"], ["2008", "crossover"],
    ["3008", "suv"], ["5008", "suv"], ["Partner", "van"], ["Rifter", "minivan"], ["Landtrek", "pickup"],
  ],
  mg: [
    ["MG3", "hatchback"], ["MG4", "hatchback"], ["MG5", "sedan"], ["MG6", "sedan"], ["MG7", "sedan"], ["GT", "sedan"],
    ["ZS", "suv"], ["HS", "suv"], ["RX5", "suv"], ["RX8", "suv"], ["One", "suv"], ["Marvel R", "suv"],
  ],
  chery: [
    ["Arrizo 5", "sedan"], ["Arrizo 6", "sedan"], ["Arrizo 8", "sedan"], ["Tiggo 2", "suv"], ["Tiggo 3", "suv"],
    ["Tiggo 4", "suv"], ["Tiggo 7", "suv"], ["Tiggo 7 Pro", "suv"], ["Tiggo 8", "suv"], ["Tiggo 8 Pro", "suv"],
  ],
  byd: [
    ["Seagull", "hatchback"], ["Dolphin", "hatchback"], ["Atto 3", "suv"], ["Yuan Plus", "suv"], ["Song", "suv"],
    ["Tang", "suv"], ["Qin", "sedan"], ["Han", "sedan"], ["Seal", "sedan"], ["F3", "sedan"],
  ],
  suzuki: [
    ["Alto", "hatchback"], ["Celerio", "hatchback"], ["Swift", "hatchback"], ["Baleno", "hatchback"], ["S-Presso", "hatchback"],
    ["Dzire", "sedan"], ["Ciaz", "sedan"], ["Fronx", "crossover"], ["Vitara", "suv"], ["Grand Vitara", "suv"],
    ["Jimny", "suv"], ["Ertiga", "minivan"], ["XL7", "suv"],
  ],
  skoda: [
    ["Fabia", "hatchback"], ["Scala", "hatchback"], ["Rapid", "sedan"], ["Octavia", "sedan"], ["Superb", "sedan"],
    ["Kamiq", "crossover"], ["Karoq", "suv"], ["Kodiaq", "suv"], ["Enyaq", "suv"],
  ],
  geely: [
    ["Emgrand", "sedan"], ["Preface", "sedan"], ["Coolray", "suv"], ["Azkarra", "suv"], ["Tugella", "suv"],
    ["Okavango", "suv"], ["Monjaro", "suv"], ["Starray", "suv"], ["GX3 Pro", "suv"],
  ],
  haval: [
    ["Jolion", "suv"], ["H6", "suv"], ["H9", "suv"], ["Dargo", "suv"], ["H2", "suv"], ["F7", "suv"], ["M6", "suv"],
  ],
  ford: [
    ["Figo", "hatchback"], ["Fiesta", "hatchback"], ["Focus", "sedan"], ["Fusion", "sedan"], ["Taurus", "sedan"],
    ["EcoSport", "suv"], ["Territory", "suv"], ["Kuga", "suv"], ["Edge", "suv"], ["Explorer", "suv"], ["Everest", "suv"],
    ["Bronco", "suv"], ["Ranger", "pickup"], ["F-150", "pickup"], ["Mustang", "coupe"], ["Transit", "van"],
  ],
  opel: [
    ["Corsa", "hatchback"], ["Astra", "hatchback"], ["Insignia", "sedan"], ["Crossland", "crossover"],
    ["Mokka", "crossover"], ["Grandland", "suv"], ["Combo", "van"],
  ],
  fiat: [
    ["500", "hatchback"], ["Panda", "hatchback"], ["Punto", "hatchback"], ["Tipo", "sedan"], ["500X", "crossover"],
    ["Doblo", "van"], ["Fiorino", "van"],
  ],
};
