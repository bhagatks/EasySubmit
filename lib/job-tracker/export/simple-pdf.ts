/** Minimal PDF writer — text lines only, Helvetica, US Letter. */

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLines(text: string, maxChars = 92): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

export function buildTextPdf(lines: string[], title = "Document"): Uint8Array {
  const wrapped = lines.flatMap((line) => (line ? wrapLines(line) : [""]));
  const contentLines: string[] = ["BT", "/F1 11 Tf", "72 720 Td"];
  let first = true;

  for (const line of wrapped) {
    const safe = escapePdfText(line || " ");
    if (first) {
      contentLines.push(`(${safe}) Tj`);
      first = false;
    } else {
      contentLines.push("0 -14 Td", `(${safe}) Tj`);
    }
  }

  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const streamLength = new TextEncoder().encode(stream).length;

  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj`,
    `4 0 obj<< /Length ${streamLength} >>stream\n${stream}\nendstream endobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj`;
    pdf += objects[i].replace(/^\d+ 0 obj/, "");
    pdf += "\n";
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${escapePdfText(title)}) >> >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function buildTextPdfFromString(text: string, title = "Document"): Uint8Array {
  return buildTextPdf(text.split("\n"), title);
}
