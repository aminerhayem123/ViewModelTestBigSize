export const handleUploadError = (error) => {
  if (error.name === 'AbortError') {
    return 'Upload was paused';
  }
  
  try {
    const errorMessage = JSON.parse(error.message);
    return errorMessage.error || 'An unexpected error occurred';
  } catch (e) {
    return error.message || 'An unexpected error occurred';
  }
};