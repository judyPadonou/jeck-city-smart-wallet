import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Lang = "fr" | "en" | "de";

const STORAGE_KEY = "jeck_lang";

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  fr: {
    "lang.label": "Langue",
    "lang.fr": "Français",
    "lang.en": "Anglais",
    "lang.de": "Allemand",
    "common.see": "Voir",
    "common.seeAll": "Voir tout",
    "common.back": "Retour",
    "common.validUntil": "Valable",

    "home.greeting": "Bonjour Mia 👋",
    "home.searchPlaceholder": "Cherche un café, un resto, une offre…",
    "home.nearby": "Près de vous",
    "home.aiSelected": "Sélectionnées par l'IA",
    "home.offers": "offres",
    "home.generated": "✨ Générées en temps réel selon votre contexte",
    "home.pro": "Pro",

    "magic.tag": "Offre magique",

    "offer.aiTag": "Offre IA",
    "offer.distance": "Distance",
    "offer.valid": "Valable",
    "offer.type": "Type",
    "offer.why": "Pourquoi cette offre ?",
    "offer.how": "Comment ça marche",
    "offer.step1": "Acceptez l'offre — un QR code est généré.",
    "offer.step2": "Présentez-le au comptoir du marchand.",
    "offer.step3": "Profitez ! Le paiement est sécurisé via Payone.",
    "offer.acceptCta": "Accepter l'offre",
    "offer.added": "Ajouté au portefeuille",
    "offer.notFound": "Cette offre n'existe pas ou a expiré.",
    "offer.backHome": "Retour à l'accueil",

    "wallet.subtitle": "Votre coffre",
    "wallet.title": "Mon Portefeuille",
    "wallet.history": "Historique",
    "wallet.active": "Active",
    "wallet.empty.title": "Votre portefeuille est vide",
    "wallet.empty.desc": "Acceptez une offre magique pour la voir apparaître ici avec son QR code.",
    "wallet.empty.cta": "Découvrir des offres",
    "wallet.savings": "Économie",

    "map.subtitle": "Autour de moi",
    "map.title": "Carte des offres",
    "map.places": "Lieux",

    "profile.subtitle": "Compte",
    "profile.title": "Profil",
    "profile.member": "Membre JECK depuis 2024",
    "profile.saved": "Économisé",
    "profile.usedOffers": "Offres utilisées",
    "profile.merchantQ": "Vous êtes commerçant ?",
    "profile.merchantDesc": "Accéder au dashboard JECK Pro",
    "profile.preferences": "Préférences",
    "profile.aiPersonalization": "Personnalisation IA",
    "profile.activated": "Activée",
    "profile.notifications": "Notifications",
    "profile.geoNotif": "Géolocalisées",
    "profile.favorites": "Catégories favorites",
    "profile.favoritesValue": "Café, Resto",
    "profile.privacy": "Confidentialité",
    "profile.logout": "Se déconnecter",
    "profile.languageHint": "Choisissez la langue de l'application",

    "auth.signinTitle": "Connexion",
    "auth.signinSubtitle": "Retrouvez vos offres locales en temps réel.",
    "auth.signupTitle": "Créer un compte",
    "auth.signupSubtitle": "Rejoignez JECK et débloquez vos offres magiques.",
    "auth.name": "Nom",
    "auth.password": "Mot de passe",
    "auth.signin": "Se connecter",
    "auth.signup": "Créer mon compte",
    "auth.noAccount": "Pas de compte ? Créer un compte",
    "auth.haveAccount": "Déjà un compte ? Se connecter",
    "auth.welcome": "Bienvenue sur JECK 👋",
    "auth.proWelcome": "Bienvenue sur JECK Pro 🚀",
    "auth.error": "Erreur",
    "auth.invalid": "Entrée invalide",
    "auth.proSpace": "Espace Pro",
    "auth.proSpaceDesc": "Connexion réservée aux commerçants",
    "auth.proDashboard": "Dashboard Pro",
    "auth.proSigninTitle": "Connexion Pro",
    "auth.proSigninSubtitle": "Accédez à votre dashboard et créez vos offres.",
    "auth.proSignupTitle": "Inscrire mon commerce",
    "auth.proSignupSubtitle": "Créez votre compte JECK Pro en 1 minute.",
    "auth.businessName": "Nom du commerce",
    "auth.businessCategory": "Catégorie",
    "auth.proSignup": "Créer mon compte Pro",
    "auth.proNoAccount": "Pas encore inscrit ? Créer mon compte Pro",
  },
  en: {
    "lang.label": "Language",
    "lang.fr": "French",
    "lang.en": "English",
    "lang.de": "German",
    "common.see": "View",
    "common.seeAll": "See all",
    "common.back": "Back",
    "common.validUntil": "Valid",

    "home.greeting": "Hi Mia 👋",
    "home.searchPlaceholder": "Search a café, a restaurant, an offer…",
    "home.nearby": "Near you",
    "home.aiSelected": "AI-curated",
    "home.offers": "offers",
    "home.generated": "✨ Generated in real time from your context",
    "home.pro": "Pro",

    "magic.tag": "Magic offer",

    "offer.aiTag": "AI offer",
    "offer.distance": "Distance",
    "offer.valid": "Valid",
    "offer.type": "Type",
    "offer.why": "Why this offer?",
    "offer.how": "How it works",
    "offer.step1": "Accept the offer — a QR code is generated.",
    "offer.step2": "Show it at the merchant counter.",
    "offer.step3": "Enjoy! Payment is secured via Payone.",
    "offer.acceptCta": "Accept offer",
    "offer.added": "Added to wallet",
    "offer.notFound": "This offer doesn't exist or has expired.",
    "offer.backHome": "Back to home",

    "wallet.subtitle": "Your vault",
    "wallet.title": "My Wallet",
    "wallet.history": "History",
    "wallet.active": "Active",
    "wallet.empty.title": "Your wallet is empty",
    "wallet.empty.desc": "Accept a magic offer to see it here with its QR code.",
    "wallet.empty.cta": "Discover offers",
    "wallet.savings": "Savings",

    "map.subtitle": "Around me",
    "map.title": "Offers map",
    "map.places": "Places",

    "profile.subtitle": "Account",
    "profile.title": "Profile",
    "profile.member": "JECK member since 2024",
    "profile.saved": "Saved",
    "profile.usedOffers": "Used offers",
    "profile.merchantQ": "Are you a merchant?",
    "profile.merchantDesc": "Access the JECK Pro dashboard",
    "profile.preferences": "Preferences",
    "profile.aiPersonalization": "AI Personalization",
    "profile.activated": "Enabled",
    "profile.notifications": "Notifications",
    "profile.geoNotif": "Location-based",
    "profile.favorites": "Favorite categories",
    "profile.favoritesValue": "Café, Restaurant",
    "profile.privacy": "Privacy",
    "profile.logout": "Sign out",
    "profile.languageHint": "Choose the app language",

    "auth.signinTitle": "Sign in",
    "auth.signinSubtitle": "Find your local offers in real time.",
    "auth.signupTitle": "Create account",
    "auth.signupSubtitle": "Join JECK and unlock your magic offers.",
    "auth.name": "Name",
    "auth.password": "Password",
    "auth.signin": "Sign in",
    "auth.signup": "Create my account",
    "auth.noAccount": "No account? Create one",
    "auth.haveAccount": "Already have an account? Sign in",
    "auth.welcome": "Welcome to JECK 👋",
    "auth.proWelcome": "Welcome to JECK Pro 🚀",
    "auth.error": "Error",
    "auth.invalid": "Invalid input",
    "auth.proSpace": "Pro space",
    "auth.proSpaceDesc": "Reserved for merchants",
    "auth.proDashboard": "Pro Dashboard",
    "auth.proSigninTitle": "Pro sign in",
    "auth.proSigninSubtitle": "Access your dashboard and create offers.",
    "auth.proSignupTitle": "Register my business",
    "auth.proSignupSubtitle": "Create your JECK Pro account in 1 minute.",
    "auth.businessName": "Business name",
    "auth.businessCategory": "Category",
    "auth.proSignup": "Create my Pro account",
    "auth.proNoAccount": "Not registered yet? Create a Pro account",
  },
  de: {
    "lang.label": "Sprache",
    "lang.fr": "Französisch",
    "lang.en": "Englisch",
    "lang.de": "Deutsch",
    "common.see": "Ansehen",
    "common.seeAll": "Alle ansehen",
    "common.back": "Zurück",
    "common.validUntil": "Gültig",

    "home.greeting": "Hallo Mia 👋",
    "home.searchPlaceholder": "Suche ein Café, ein Restaurant, ein Angebot…",
    "home.nearby": "In deiner Nähe",
    "home.aiSelected": "Von der KI ausgewählt",
    "home.offers": "Angebote",
    "home.generated": "✨ In Echtzeit anhand deines Kontexts erstellt",
    "home.pro": "Pro",

    "magic.tag": "Magisches Angebot",

    "offer.aiTag": "KI-Angebot",
    "offer.distance": "Entfernung",
    "offer.valid": "Gültig",
    "offer.type": "Typ",
    "offer.why": "Warum dieses Angebot?",
    "offer.how": "So funktioniert's",
    "offer.step1": "Akzeptiere das Angebot — ein QR-Code wird erstellt.",
    "offer.step2": "Zeige ihn an der Theke des Händlers.",
    "offer.step3": "Genieße! Die Zahlung erfolgt sicher über Payone.",
    "offer.acceptCta": "Angebot annehmen",
    "offer.added": "Zur Brieftasche hinzugefügt",
    "offer.notFound": "Dieses Angebot existiert nicht oder ist abgelaufen.",
    "offer.backHome": "Zurück zur Startseite",

    "wallet.subtitle": "Dein Tresor",
    "wallet.title": "Meine Brieftasche",
    "wallet.history": "Verlauf",
    "wallet.active": "Aktiv",
    "wallet.empty.title": "Deine Brieftasche ist leer",
    "wallet.empty.desc": "Nimm ein magisches Angebot an, um es hier mit QR-Code zu sehen.",
    "wallet.empty.cta": "Angebote entdecken",
    "wallet.savings": "Ersparnis",

    "map.subtitle": "Um mich herum",
    "map.title": "Angebotskarte",
    "map.places": "Orte",

    "profile.subtitle": "Konto",
    "profile.title": "Profil",
    "profile.member": "JECK-Mitglied seit 2024",
    "profile.saved": "Gespart",
    "profile.usedOffers": "Genutzte Angebote",
    "profile.merchantQ": "Bist du Händler?",
    "profile.merchantDesc": "Zum JECK Pro Dashboard",
    "profile.preferences": "Einstellungen",
    "profile.aiPersonalization": "KI-Personalisierung",
    "profile.activated": "Aktiviert",
    "profile.notifications": "Benachrichtigungen",
    "profile.geoNotif": "Standortbasiert",
    "profile.favorites": "Lieblingskategorien",
    "profile.favoritesValue": "Café, Restaurant",
    "profile.privacy": "Datenschutz",
    "profile.logout": "Abmelden",
    "profile.languageHint": "Wähle die Sprache der App",

    "auth.signinTitle": "Anmelden",
    "auth.signinSubtitle": "Finde deine lokalen Angebote in Echtzeit.",
    "auth.signupTitle": "Konto erstellen",
    "auth.signupSubtitle": "Tritt JECK bei und entdecke magische Angebote.",
    "auth.name": "Name",
    "auth.password": "Passwort",
    "auth.signin": "Anmelden",
    "auth.signup": "Konto erstellen",
    "auth.noAccount": "Kein Konto? Erstellen",
    "auth.haveAccount": "Schon ein Konto? Anmelden",
    "auth.welcome": "Willkommen bei JECK 👋",
    "auth.proWelcome": "Willkommen bei JECK Pro 🚀",
    "auth.error": "Fehler",
    "auth.invalid": "Ungültige Eingabe",
    "auth.proSpace": "Pro-Bereich",
    "auth.proSpaceDesc": "Nur für Händler",
    "auth.proDashboard": "Pro-Dashboard",
    "auth.proSigninTitle": "Pro-Anmeldung",
    "auth.proSigninSubtitle": "Zum Dashboard und Angebote erstellen.",
    "auth.proSignupTitle": "Mein Geschäft registrieren",
    "auth.proSignupSubtitle": "Erstelle dein JECK Pro-Konto in 1 Minute.",
    "auth.businessName": "Geschäftsname",
    "auth.businessCategory": "Kategorie",
    "auth.proSignup": "Pro-Konto erstellen",
    "auth.proNoAccount": "Noch nicht registriert? Pro-Konto erstellen",
  },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "fr";
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    return stored && ["fr", "en", "de"].includes(stored) ? stored : "fr";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const t = (key: string) => dictionaries[lang][key] ?? dictionaries.fr[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
