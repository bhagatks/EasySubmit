import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Dedupe session reads within a single RSC request (layout + page + actions). */
export const getCachedServerSession = cache(() => getServerSession(authOptions));
