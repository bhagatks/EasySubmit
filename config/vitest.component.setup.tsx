import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/onboarding"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "user-1", onboardingStep: 1 } },
    status: "authenticated",
  })),
  signOut: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_: object, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
          const { initial: _i, animate: _a, exit: _e, variants: _v, transition: _t, custom: _c, layout: _l, ...rest } = props;
          return createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { createElement } from "react";
import React from "react";
