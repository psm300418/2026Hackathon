import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";

const demoUserEnvSchema = z.object({
  DEMO_USER_EMAIL: z.string().email(),
  DEMO_USER_PASSWORD: z.string().min(6)
});

const findUserByEmail = async (email: string) => {
  const supabase = createSupabaseAdminClient();
  const targetEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === targetEmail);

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }
};

const main = async () => {
  const { DEMO_USER_EMAIL, DEMO_USER_PASSWORD } = demoUserEnvSchema.parse(process.env);
  const supabase = createSupabaseAdminClient();
  const existingUser = await findUserByEmail(DEMO_USER_EMAIL);

  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: DEMO_USER_PASSWORD,
      user_metadata: {
        accountType: "demo"
      }
    });

    if (error) {
      throw error;
    }

    console.log(`Demo user updated: ${DEMO_USER_EMAIL}`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      accountType: "demo"
    }
  });

  if (error) {
    throw error;
  }

  console.log(`Demo user created: ${DEMO_USER_EMAIL}`);
};

main().catch((error: unknown) => {
  console.error("Demo user setup: failed");
  console.error(error);
  process.exit(1);
});
