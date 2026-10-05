import { NextResponse } from "next/server";
import { readProductVideo } from "@/lib/storage";

/** Public product videos. Supports Range requests so phones can seek and stream. */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  let video;
  try {
    video = await readProductVideo(key);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const size = video.bytes.length;
  const headers: Record<string, string> = {
    "Content-Type": video.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (match && (match[1] || match[2])) {
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new NextResponse(new Uint8Array(video.bytes.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new NextResponse(new Uint8Array(video.bytes), { headers: { ...headers, "Content-Length": String(size) } });
}
