import type { SupabaseClient } from "@supabase/supabase-js";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isSupabaseConfigured } from "../config";

export const EMPTY_FOLDER_PLACEHOLDER_FILE_NAME = ".emptyFolderPlaceholder";

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;

  const endpoint =
    process.env.MINIO_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    process.env.NEXT_PUBLIC_MINIO_ENDPOINT ||
    process.env.NEXT_PUBLIC_MINIO_URL ||
    process.env.MINIO_PUBLIC_URL;
  const accessKeyId =
    process.env.MINIO_ACCESS_KEY ||
    process.env.S3_ACCESS_KEY_ID ||
    process.env.NEXT_PUBLIC_MINIO_ACCESS_KEY ||
    process.env.MINIO_ROOT_USER;
  const secretAccessKey =
    process.env.MINIO_SECRET_KEY ||
    process.env.S3_SECRET_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_MINIO_SECRET_KEY ||
    process.env.MINIO_ROOT_PASSWORD;
  const region =
    process.env.MINIO_REGION || process.env.S3_REGION || "us-east-1";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "MinIO/S3 is not configured. Please set MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY.",
    );
  }

  s3Client = new S3Client({
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region,
    forcePathStyle: true, // Necessary for MinIO
  });

  return s3Client;
}

type UploadParams = {
  file: File;
  path: string[];
  bucket: string;
};

export async function upload(
  client: SupabaseClient,
  { file, path, bucket }: UploadParams,
) {
  if (!isSupabaseConfigured()) {
    const s3 = getS3Client();
    const key = path.join("/");

    let body: any;
    if (typeof (globalThis as any).window === "undefined") {
      // Server-side: convert file to Buffer
      body = Buffer.from(await file.arrayBuffer());
    } else {
      // Client-side: use file directly
      body = file;
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type,
        CacheControl: "max-age=3600",
      }),
    );

    const publicUrlBase =
      process.env.MINIO_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL ||
      process.env.MINIO_ENDPOINT ||
      process.env.NEXT_PUBLIC_MINIO_ENDPOINT;

    return `${publicUrlBase}/${bucket}/${key}`;
  }

  // Supabase fallback:
  const storage = client.storage.from(bucket);

  const result = await storage.upload(path.join("/"), file, {
    upsert: true,
    cacheControl: "3600",
  });

  if (!result.error) {
    return storage.getPublicUrl(path.join("/")).data.publicUrl;
  }

  throw result.error;
}

type RemoveParams = {
  path: string[];
  bucket: string;
};

export async function remove(
  client: SupabaseClient,
  { bucket, path }: RemoveParams,
) {
  if (!isSupabaseConfigured()) {
    const s3 = getS3Client();
    const key = decodeURIComponent(path.join("/"));

    const result = await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    return { data: result, error: null };
  }

  // Supabase fallback:
  return client.storage
    .from(bucket)
    .remove([decodeURIComponent(path.join("/"))]);
}

type DownloadParams = {
  path: string;
  bucket: string;
};

export async function download(
  client: SupabaseClient,
  { bucket, path }: DownloadParams,
) {
  if (!isSupabaseConfigured()) {
    const s3 = getS3Client();

    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
    );

    if (!response.Body) {
      throw new Error("Empty response body from MinIO/S3");
    }

    const bytes = await response.Body.transformToByteArray();
    const blob = new Blob([bytes as any], { type: response.ContentType });

    return { data: blob, error: null };
  }

  // Supabase fallback:
  return client.storage.from(bucket).download(path);
}

type SignedUrlParams = {
  path: string;
  bucket: string;
  expireIn: number;
  options?: {
    download?: boolean;
  };
};

export async function signedUrl(
  client: SupabaseClient,
  { bucket, path, expireIn, options }: SignedUrlParams,
) {
  if (!isSupabaseConfigured()) {
    const s3 = getS3Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: path,
      ResponseContentDisposition: options?.download ? "attachment" : undefined,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: expireIn });

    return { data: { signedUrl: url }, error: null };
  }

  // Supabase fallback:
  return client.storage.from(bucket).createSignedUrl(path, expireIn, options);
}
