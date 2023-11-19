export async function compress(data: Uint8Array) {
  const blob = new Blob([data]);
  const chunks: Uint8Array[] = [];

  await blob
    .stream()
    .pipeThrough(new CompressionStream("gzip"))
    .pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
    );

  const result = new Blob(chunks);
  const buffer = await result.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function decompress(data: Uint8Array, mimeType?: string) {
  const blob = new Blob([data]);
  const chunks: Uint8Array[] = [];

  await blob
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
    );

  return new Blob(chunks, { type: mimeType });
}
