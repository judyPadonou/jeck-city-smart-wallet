// Modular data layer — easy to swap with Supabase later.
// Replace these functions with real queries when connecting backend.

export type ContextMood = "rain" | "sun" | "night" | "rush";

export interface CityContext {
  mood: ContextMood;
  weatherLabel: string;
  timeLabel: string;
  locationLabel: string;
  temperature: number;
}

export interface Offer {
  id: string;
  merchant: string;
  category: string;
  title: string;
  description: string;
  discount: number; // percent
  distance: number; // meters
  validUntil: string;
  emoji: string;
  contextTags: string[];
  mood: ContextMood;
  price: number; // EUR after discount
  originalPrice: number;
}

export interface WalletItem {
  id: string;
  offerId: string;
  offer: Offer;
  acceptedAt: string;
  code: string;
  status: "active" | "used" | "expired";
}

const moods: ContextMood[] = ["rain", "sun", "night", "rush"];

export function detectContext(): CityContext {
  // Simulated context detection.
  // Swap with weather API + geolocation + time logic later.
  const hour = new Date().getHours();
  const seed = Math.floor(Date.now() / 60000) % moods.length;
  const mood = hour >= 21 || hour < 6 ? "night" : moods[seed];

  const map: Record<ContextMood, Omit<CityContext, "mood">> = {
    rain: {
      weatherLabel: "Pluie détectée",
      timeLabel: "Cocooning",
      locationLabel: "Quartier Latin",
      temperature: 14,
    },
    sun: {
      weatherLabel: "Plein soleil",
      timeLabel: "Heure dorée",
      locationLabel: "Canal Saint-Martin",
      temperature: 24,
    },
    night: {
      weatherLabel: "Nuit douce",
      timeLabel: "After-work",
      locationLabel: "Bastille",
      temperature: 18,
    },
    rush: {
      weatherLabel: "Heure creuse café",
      timeLabel: "15h00",
      locationLabel: "République",
      temperature: 20,
    },
  };

  return { mood, ...map[mood] };
}

export const mockOffers: Offer[] = [
  {
    id: "of_001",
    merchant: "Café Lumière",
    category: "Café",
    title: "Cappuccino + cookie offert",
    description: "Profitez de notre heure creuse : commande un cappuccino, on vous offre un cookie maison tout chaud.",
    discount: 25,
    distance: 180,
    validUntil: "Aujourd'hui 17h00",
    emoji: "☕️",
    contextTags: ["Pluie détectée", "Heure creuse", "À 180m"],
    mood: "rain",
    price: 3.5,
    originalPrice: 4.6,
  },
  {
    id: "of_002",
    merchant: "Bistrot Marcel",
    category: "Restaurant",
    title: "-30% sur le menu du jour",
    description: "Notre chef a préparé trop de risotto aux champignons. Profitez-en : -30% jusqu'à 14h.",
    discount: 30,
    distance: 420,
    validUntil: "Aujourd'hui 14h00",
    emoji: "🍝",
    contextTags: ["Écouler stock", "Midi", "À 420m"],
    mood: "rush",
    price: 12.6,
    originalPrice: 18,
  },
  {
    id: "of_003",
    merchant: "Glacier Bertillon",
    category: "Glacier",
    title: "2 boules pour le prix d'1",
    description: "Plein soleil ? On adore. Doublez vos boules sur tous les parfums fruités.",
    discount: 50,
    distance: 95,
    validUntil: "Aujourd'hui 20h00",
    emoji: "🍦",
    contextTags: ["Soleil", "Très proche", "À 95m"],
    mood: "sun",
    price: 4.5,
    originalPrice: 9,
  },
  {
    id: "of_004",
    merchant: "Le Comptoir Général",
    category: "Bar",
    title: "Happy hour étendu : -20%",
    description: "After-work prolongé jusqu'à 21h. Cocktails signature à prix réduit.",
    discount: 20,
    distance: 650,
    validUntil: "Ce soir 21h00",
    emoji: "🍸",
    contextTags: ["After-work", "Soir", "À 650m"],
    mood: "night",
    price: 8,
    originalPrice: 10,
  },
  {
    id: "of_005",
    merchant: "Boulangerie Utopie",
    category: "Boulangerie",
    title: "-40% fin de journée",
    description: "Tout doit partir avant 19h30 : pains spéciaux et viennoiseries du jour.",
    discount: 40,
    distance: 230,
    validUntil: "19h30",
    emoji: "🥐",
    contextTags: ["Anti-gaspi", "Fin de journée", "À 230m"],
    mood: "rush",
    price: 3,
    originalPrice: 5,
  },
];

export function getOfferById(id: string): Offer | undefined {
  return mockOffers.find((o) => o.id === id);
}

export function pickMagicOffer(context: CityContext): Offer {
  const matching = mockOffers.filter((o) => o.mood === context.mood);
  return matching[0] ?? mockOffers[0];
}

// Wallet — local storage layer (to swap with Supabase tables)
const WALLET_KEY = "jeck_wallet";

export function getWallet(): WalletItem[] {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToWallet(offer: Offer): WalletItem {
  const item: WalletItem = {
    id: `w_${Date.now()}`,
    offerId: offer.id,
    offer,
    acceptedAt: new Date().toISOString(),
    code: `JECK-${offer.id.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    status: "active",
  };
  const wallet = getWallet();
  const updated = [item, ...wallet];
  localStorage.setItem(WALLET_KEY, JSON.stringify(updated));
  return item;
}

// Merchant analytics — mock
export function getMerchantStats() {
  return {
    generated: 1284,
    accepted: 412,
    revenue: 6840,
    conversionRate: 32,
    transactions: [
      { day: "Lun", value: 420 },
      { day: "Mar", value: 580 },
      { day: "Mer", value: 720 },
      { day: "Jeu", value: 690 },
      { day: "Ven", value: 940 },
      { day: "Sam", value: 1180 },
      { day: "Dim", value: 870 },
    ],
    funnel: [
      { name: "Générées", value: 1284 },
      { name: "Vues", value: 920 },
      { name: "Acceptées", value: 412 },
      { name: "Utilisées", value: 358 },
    ],
  };
}
