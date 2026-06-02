"use server";

import { upload } from "@midday/supabase/storage";
import { createClient } from "@midday/supabase/server";

export async function uploadFileAction(
  formData: FormData,
  bucket: string,
  path: string[],
): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided");
  }

  const supabase = await createClient();
  return upload(supabase, { file, bucket, path });
}
