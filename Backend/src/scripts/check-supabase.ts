import { createSupabaseAdminClient } from "../config/supabase.js";
import { env } from "../config/env.js";

const main = async () => {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1
  });

  if (error) {
    throw error;
  }

  console.log("Supabase connection: ok");
  console.log(`Storage bucket: ${env.SUPABASE_STORAGE_BUCKET}`);
};

main().catch((error: unknown) => {
  console.error("Supabase connection: failed");
  console.error(error);
  process.exit(1);
});

