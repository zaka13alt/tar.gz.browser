
export async function decompressTarGz(tarGzData) {
  
  const arrayBuffer = tarGzData instanceof File ? await tarGzData.arrayBuffer() : tarGzData;

  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(arrayBuffer));
      controller.close();
    },
  }).pipeThrough(new DecompressionStream("gzip"));

  const decompressedBuffer = await new Response(stream).arrayBuffer();

  
  const files = [];
  let offset = 0;

  while (offset < decompressedBuffer.byteLength - 512) {
    
    const headerBuffer = decompressedBuffer.slice(offset, offset + 512);
    const headerView = new Uint8Array(headerBuffer);

    
    if (headerView[0] === 0 && headerView[1] === 0) {
      break;
    }

    // Extract filename (bytes 0 to 99)
    const nameBytes = headerView.subarray(0, 100);
    const name = new TextDecoder("utf-8").decode(nameBytes).replace(/\0+$/, "").trim();

    if (!name) {
      offset += 512;
      continue;
    }

    
    const sizeBytes = headerView.subarray(124, 136);
    const sizeStr = new TextDecoder("utf-8").decode(sizeBytes).replace(/\0+$/, "").trim();
    const size = parseInt(sizeStr, 8);

    
    const typeFlag = String.fromCharCode(headerView[156]);
    let type = "file";
    if (typeFlag === "5" || name.endsWith("/")) {
      type = "directory";
    }

    offset += 512; 

   
    let fileData = new Uint8Array(0);
    let textContent = "";
    
    if (type === "file" && size > 0) {
      fileData = new Uint8Array(decompressedBuffer.slice(offset, offset + size));
      textContent = new TextDecoder("utf-8").decode(fileData);
    }

   
    files.push({ name, type, size, data: fileData, text: textContent });

    
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}
