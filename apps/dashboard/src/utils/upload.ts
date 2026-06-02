import { stripSpecialCharacters } from "@midday/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";

import { isSupabaseConfigured } from "@midday/supabase/config";
import { uploadFileAction } from "@/actions/upload-file-action";

type ResumableUploadParmas = {
  file: File;
  path: string[];
  bucket: string;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
};

export async function resumableUpload(
  client: SupabaseClient,
  { file, path, bucket, onProgress }: ResumableUploadParmas,
) {
  const filename = stripSpecialCharacters(file.name);

  if (!isSupabaseConfigured()) {
    const formData = new FormData();
    formData.append("file", file);
    await uploadFileAction(formData, bucket, path);

    // Call progress callback to signal completion immediately
    onProgress?.(file.size, file.size);

    return {
      filename,
      file,
    };
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  const fullPath = decodeURIComponent([...path, filename].join("/"));

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${process.env.NEXT_PUBLIC_SUPABASE_ID}.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${session?.access_token}`,
        // optionally set upsert to true to overwrite existing files
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: fullPath,
        contentType: file.type,
        cacheControl: "3600",
      },
      // NOTE: it must be set to 6MB (for now) do not change it
      chunkSize: 6 * 1024 * 1024,
      onError: (error) => {
        reject(error);
      },
      onProgress,
      onSuccess: () => {
        resolve({
          ...upload,
          filename,
        });
      },
    });

    // Check if there are any previous uploads to continue.
    return upload.findPreviousUploads().then((previousUploads) => {
      // Found previous uploads so we select the first one.
      if (previousUploads.length) {
        // @ts-expect-error
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      upload.start();
    });
  });
}
