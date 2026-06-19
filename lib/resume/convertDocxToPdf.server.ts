import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

let wasmModulePromise: Promise<WebAssembly.Module> | null = null;

function getWasmFilePath(): string {
  return path.join(
    process.cwd(),
    "node_modules",
    "docx-to-pdf-wasm",
    "build",
    "docx-to-pdf.wasm",
  );
}

async function getWasmModule(): Promise<WebAssembly.Module> {
  if (!wasmModulePromise) {
    wasmModulePromise = (async () => {
      const wasmBytes = await readFile(getWasmFilePath());
      return WebAssembly.compile(wasmBytes);
    })();
  }

  return wasmModulePromise;
}

/** Convert DOCX bytes to PDF using docx-to-pdf-wasm (server-only). */
export async function convertDocxBufferToPdf(
  docxBuffer: Buffer | Uint8Array,
): Promise<Uint8Array> {
  const { convertToPdf } = await import("docx-to-pdf-wasm");
  const wasmModule = await getWasmModule();
  const docxBytes =
    docxBuffer instanceof Uint8Array ? docxBuffer : new Uint8Array(docxBuffer);

  return convertToPdf(wasmModule, docxBytes);
}
