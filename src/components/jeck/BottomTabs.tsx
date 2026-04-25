import { NavLink, useLocation } from "react-router-dom";
import { Home, Map, Wallet, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/map", label: "Carte", icon: Map },
  { to: "/wallet", label: "Portefeuille", icon: Wallet },
  { to: "/profile", label: "Profil", icon: User },
];

export function BottomTabs() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
      <ul className="mx-auto max-w-md grid grid-cols-4 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {tabs.map((tab) => {
          const active = location.pathname === tab.to;
          const Icon = tab.icon;
          return (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute -top-2 h-1 w-8 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 transition-colors ${active ? "text-primary" : ""}`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className={active ? "text-primary" : ""}>{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
