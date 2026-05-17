// ABOUT: Drizzle D1 client factory — call getDb(env.DB) inside request handlers.

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
