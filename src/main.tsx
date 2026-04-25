import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { I18nProvider } from "./lib/i18n.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </I18nProvider>,
);
