import { defineConfig } from 'drizzle-kit';

// Drizzle Kit generates SQL migrations into ./migrations from the schema in
// ./shared/db/schema. Migrations are applied to D1 via Wrangler, not Drizzle Kit,
// so no runtime credentials are needed here.
export default defineConfig({
  dialect: 'sqlite',
  schema: './shared/db/schema/index.ts',
  out: './migrations',
  verbose: true,
  strict: true,
});
