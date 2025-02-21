export const handleUploadError = (error) => {
    if (error.response) {
      return `Server error: ${error.response.status} - ${error.response.statusText}`;
    }
    if (error.request) {
      return 'No response from server. Please check your connection.';
    }
    return error.message || 'An unknown error occurred';
  };