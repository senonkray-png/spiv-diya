"use client";

import type { ReactNode } from "react";
import { MarketplaceMobileBottomNav, MarketplaceUnreadProvider } from "@/components/layout/MarketplaceHeaderQuickNav";

export function MarketplaceShell({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  return (
    <MarketplaceUnreadProvider isAuthenticated={isAuthenticated}>
      {children}
      <MarketplaceMobileBottomNav isAuthenticated={isAuthenticated} />
    </MarketplaceUnreadProvider>
  );
}
