export const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

export const splitFileIntoChunks = (file) => {
  const chunks = [];
  let start = 0;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }

  return { chunks, totalChunks };
};

export const uploadChunk = async (fileId, chunk, chunkNumber, signal) => {
  const formData = new FormData();
  formData.append('chunk', new Blob([chunk], { type: 'application/octet-stream' }));
  formData.append('chunk_number', chunkNumber.toString());
  formData.append('file_id', fileId.toString());

  try {
    const response = await fetch('http://localhost:8000/api/upload/chunk/', {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new Error(`Upload failed: ${error.message}`);
  }
};

export const getUploadStatus = async (fileId) => {
  try {
    const response = await fetch(`http://localhost:8000/api/upload/status/${fileId}/`);
    if (!response.ok) {
      throw new Error('Failed to get upload status');
    }
    return response.json();
  } catch (error) {
    console.error('Error getting upload status:', error);
    throw error;
  }
};