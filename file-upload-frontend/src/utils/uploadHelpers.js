export const splitFileIntoChunks = (file, chunkSize = 1024 * 1024) => {
  const chunks = [];
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    chunks.push(new File([chunk], file.name, { type: file.type }));
    start = end;
  }

  return chunks;
};

export const uploadChunk = async (fileId, chunk, chunkNumber, signal) => {
  const formData = new FormData();
  formData.append('chunk', chunk, chunk.name);
  formData.append('file_id', fileId.toString());
  formData.append('chunk_number', chunkNumber.toString());

  try {
    const response = await fetch('http://localhost:8000/api/upload/chunk/', {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Chunk upload error details:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Chunk ${chunkNumber} uploaded successfully:`, data);
    return data;
  } catch (error) {
    console.error(`Error uploading chunk ${chunkNumber}:`, error);
    throw error;
  }
};