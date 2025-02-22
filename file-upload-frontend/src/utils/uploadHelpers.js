export const splitFileIntoChunks = (file, chunkSize = 1024 * 1024) => {
  const chunks = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }
  
  return chunks;
};

export const uploadChunk = async (fileId, chunk, chunkNumber, signal) => {
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('chunk_number', chunkNumber);
  formData.append('file_id', fileId);

  const response = await fetch('http://localhost:8000/api/upload/chunk/', {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};