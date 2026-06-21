import { beforeEach } from "vitest";
import { resetPoolCooldownForTests } from "@/src/lib/ai/engine/pool-cooldown";

beforeEach(() => {
  resetPoolCooldownForTests();
});
