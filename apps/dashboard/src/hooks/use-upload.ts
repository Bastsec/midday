import { createClient } from "@midday/supabase/client";
import { upload } from "@midday/supabase/storage";
import { isSupabaseConfigured } from "@midday/supabase/config";
import { uploadFileAction } from "@/actions/upload-file-action";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";

interface UploadParams {
  file: File;
  path: string[];
  bucket: string;
}

interface UploadResult {
  url: string;
  path: string[];
}

export function useUpload() {
  const supabase: SupabaseClient = createClient();
  const [isLoading, setLoading] = useState<boolean>(false);

  const uploadFile = async ({
    file,
    path,
    bucket,
  }: UploadParams): Promise<UploadResult> => {
    setLoading(true);

    try {
      let url: string;

      if (!isSupabaseConfigured()) {
        const formData = new FormData();
        formData.append("file", file);
        url = await uploadFileAction(formData, bucket, path);
      } else {
        url = await upload(supabase, {
          path,
          file,
          bucket,
        });
      }

      return {
        url,
        path,
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadFile,
    isLoading,
  };
}
