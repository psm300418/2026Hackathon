import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient, createSupabaseAnonClient } from "../config/supabase.js";

const seedTables = ["products", "ingredients", "product_ingredients"] as const;

type SeedTable = (typeof seedTables)[number];

const getCount = async (client: SupabaseClient, table: SeedTable) => {
  const { count, error } = await client.from(table).select("id", {
    count: "exact",
    head: true
  });

  if (error) {
    throw new Error(`${table} select check failed: ${error.message}`);
  }

  return count ?? 0;
};

const assertAnonReadOnly = async (anon: SupabaseClient, admin: SupabaseClient) => {
  const externalId = `t0-1-anon-write-probe-${randomUUID()}`;

  const { data, error } = await anon
    .from("products")
    .insert({
      source: "community",
      external_id: externalId,
      name: "T0-1 anon write probe",
      normalized_name: "t0-1 anon write probe",
      brand: "T0-1",
      verification_status: "community"
    })
    .select("id")
    .maybeSingle();

  if (!error) {
    await admin.from("products").delete().eq("external_id", externalId);
    throw new Error(
      `Anon insert unexpectedly succeeded${data?.id ? ` for product ${data.id}` : ""}.`
    );
  }
};

const assertServiceRoleWrite = async (admin: SupabaseClient) => {
  const externalId = `t0-1-service-write-probe-${randomUUID()}`;

  const { data, error } = await admin
    .from("products")
    .insert({
      source: "community",
      external_id: externalId,
      name: "T0-1 service write probe",
      normalized_name: "t0-1 service write probe",
      brand: "T0-1",
      verification_status: "community"
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Service role insert check failed: ${error.message}`);
  }

  const { error: deleteError } = await admin.from("products").delete().eq("id", data.id);

  if (deleteError) {
    throw new Error(`Service role cleanup failed for ${data.id}: ${deleteError.message}`);
  }
};

const main = async () => {
  const admin = createSupabaseAdminClient();
  const anon = createSupabaseAnonClient();

  for (const table of seedTables) {
    const adminCount = await getCount(admin, table);
    const anonCount = await getCount(anon, table);
    console.log(`${table}: admin select ok (${adminCount}), anon select ok (${anonCount})`);
  }

  await assertAnonReadOnly(anon, admin);
  console.log("Anon insert: blocked as expected");

  await assertServiceRoleWrite(admin);
  console.log("Service role insert/delete: ok");

  console.log("Product seed tables: ready");
};

main().catch((error: unknown) => {
  console.error("Product seed table check: failed");
  console.error(error);
  process.exit(1);
});
