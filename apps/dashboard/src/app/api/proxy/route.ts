import { getSession } from "@midday/supabase/cached-queries";
import { download } from "@midday/supabase/storage";
import { createClient } from "@midday/supabase/server";
import { isSupabaseConfigured } from "@midday/supabase/config";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const filePath = requestUrl.searchParams.get("filePath");

  const {
    data: { session },
  } = await getSession();

  // If Supabase is configured, we check session. If not, we allow viewing/downloading authenticated via our session cookie
  if (!filePath) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (isSupabaseConfigured() && !session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Ensure filePath starts with 'vault/'
  const finalFilePath = filePath.startsWith("vault/")
    ? filePath
    : `vault/${filePath}`;

  if (!isSupabaseConfigured()) {
    const supabase = await createClient();
    const parts = finalFilePath.split("/");
    const bucket = parts[0]!;
    const objectPath = parts.slice(1).join("/");

    try {
      const { data: blob, error } = await download(supabase, {
        bucket,
        path: objectPath,
      });

      if (error || !blob) {
        return new NextResponse("File not found", { status: 404 });
      }

      return new NextResponse(blob, {
        status: 200,
        headers: {
          "content-type": blob.type || "application/octet-stream",
        },
      });
    } catch (e) {
      return new NextResponse(
        e instanceof Error ? e.message : "Download error",
        { status: 500 },
      );
    }
  }

  // Fetch the object from Supabase Storage
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${finalFilePath}`,
    {
      headers: {
        authorization: `Bearer ${session!.access_token}`,
      },
    },
  );

  // Check if the fetch was successful
  if (!response.ok) {
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
