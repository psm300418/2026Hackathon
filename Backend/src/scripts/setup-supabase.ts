import { createSupabaseAdminClient } from "../config/supabase.js";
import { env } from "../config/env.js";

const main = async () => {
  const supabase = createSupabaseAdminClient();
  const bucketName = env.SUPABASE_STORAGE_BUCKET;

  const { data: existingBucket, error: getBucketError } =
    await supabase.storage.getBucket(bucketName);

  if (existingBucket) {
    console.log(`Storage bucket already exists: ${bucketName}`);
    return;
  }

  const bucketMissing =
    getBucketError &&
    ("statusCode" in getBucketError
      ? getBucketError.statusCode === "404"
      : false);

  if (getBucketError && !bucketMissing) {
    throw getBucketError;
  }

  const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
  });

  if (createBucketError) {
    throw createBucketError;
  }

  console.log(`Storage bucket created: ${bucketName}`);
};

main().catch((error: unknown) => {
  console.error("Supabase setup: failed");
  console.error(error);
  process.exit(1);
});
