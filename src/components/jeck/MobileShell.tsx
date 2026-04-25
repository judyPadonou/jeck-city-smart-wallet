import { ReactNode } from "react";
import { BottomTabs } from "./BottomTabs";

interface Props {
  children: ReactNode;
  hideTabs?: boolean;
}

export function MobileShell({ children, hideTabs = false }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-24">
        {children}
      </div>
      {!hideTabs && <BottomTabs />}
    </div>
  );
}
