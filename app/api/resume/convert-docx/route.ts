import { NextResponse } from "next/server";
import { convertDocxBufferToPdf } from "@/lib/resume/convertDocxToPdf.server";

export const runtime = "nodejs";

const MAX_DOCX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing DOCX file." }, { status: 400 });
    }

    if (
      file.type !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      !/\.docx$/i.test(file.name)
    ) {
      return NextResponse.json(
        { error: "Only .docx files are supported for conversion." },
        { status: 400 },
      );
    }

    if (file.size > MAX_DOCX_BYTES) {
      return NextResponse.json(
        { error: "DOCX file is too large (max 10 MB)." },
        { status: 413 },
      );
    }

    const docxBuffer = Buffer.from(await file.arrayBuffer());
    const pdfBytes = await convertDocxBufferToPdf(docxBuffer);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${file.name.replace(/\.docx$/i, ".pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to convert DOCX to PDF";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
