import {
  Bot,
  Box,
  Brain,
  Cloud,
  Cpu,
  Gem,
  Plug,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderIconRef } from "@/src/lib/config/app.config";

const ICON_MAP: Record<ProviderIconRef, LucideIcon> = {
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  gem: Gem,
  zap: Zap,
  brain: Brain,
  route: Route,
  box: Box,
  server: Server,
  bot: Bot,
  cpu: Cpu,
  users: Users,
  cloud: Cloud,
  plug: Plug,
};

export type ProviderIconProps = {
  icon: ProviderIconRef;
  className?: string;
};

export function ProviderIcon({ icon, className }: ProviderIconProps) {
  const Icon = ICON_MAP[icon];
  return <Icon className={cn("h-4 w-4 shrink-0", className)} aria-hidden="true" />;
}
