import React, { useState, useEffect, useRef } from 'react';
import ModelViewer from './ModelViewer';
import { splitFileIntoChunks, uploadChunk } from '../utils/uploadHelpers';
import { handleUploadError } from '../utils/errorHandlers';

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

const FileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileId, setFileId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [modelUrl, setModelUrl] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const abortController = useRef(null);
  const chunksRef = useRef([]);

  const initializeUpload = async (file) => {
    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      const response = await fetch('http://localhost:8000/api/upload/init/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          filesize: file.size,
          total_chunks: totalChunks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Server error details:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload initialized successfully:', data);
      return data.file_id;
    } catch (error) {
      console.error('Error initializing upload:', error);
      throw error;
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size limit (e.g., 4GB)
    const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB
    if (file.size > MAX_FILE_SIZE) {
      setUploadStatus('error');
      setErrorMessage('File size exceeds the maximum limit of 4GB.');
      return;
    }

    // Reset states
    setUploadStatus('uploading');
    setUploadProgress(0);
    setModelUrl(null);
    setErrorMessage('');
    setCurrentFile(file);
    abortController.current = new AbortController();

    try {
      const { chunks, totalChunks } = splitFileIntoChunks(file);
      chunksRef.current = chunks;

      // Initialize upload
      const response = await fetch('http://localhost:8000/api/upload/init/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          filesize: file.size,
          total_chunks: totalChunks,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFileId(data.file_id);

      // Upload chunks
      for (let i = 0; i < chunks.length; i++) {
        if (abortController.current.signal.aborted) break;

        const chunkResponse = await uploadChunk(
          data.file_id,
          chunks[i],
          i,
          abortController.current.signal
        );

        const progress = ((i + 1) / chunks.length) * 100;
        setUploadProgress(progress);

        if (chunkResponse?.upload_status === 'completed' && chunkResponse?.file_path) {
          setUploadStatus('completed');
          const baseUrl = 'http://localhost:8000';
          const filePath = chunkResponse.file_path.startsWith('/') 
            ? chunkResponse.file_path 
            : `/${chunkResponse.file_path}`;
          setModelUrl(`${baseUrl}/media${filePath}`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setUploadStatus('paused');
      } else {
        setUploadStatus('error');
        setErrorMessage(handleUploadError(error));
      }
    }
  };

  const handlePause = () => {
    abortController.current?.abort();
    setUploadStatus('paused');
  };

  const handleResume = async () => {
    if (!currentFile || !fileId) return;
  
    // Create new abort controller for the resumed upload
    abortController.current = new AbortController();
    
    try {
      // First, get the current upload status
      const statusResponse = await fetch(`http://localhost:8000/api/upload/status/${fileId}/`);
      if (!statusResponse.ok) throw new Error('Failed to get upload status');
      
      const statusData = await statusResponse.json();
      
      // Calculate the last successful chunk more accurately
      const lastSuccessfulChunk = statusData.chunks_received || 0;
      
      setUploadStatus('uploading');
      setUploadProgress((lastSuccessfulChunk / chunksRef.current.length) * 100);
  
      // Resume upload from the last successful chunk
      for (let i = lastSuccessfulChunk; i < chunksRef.current.length; i++) {
        if (abortController.current.signal.aborted) {
          setUploadStatus('paused');
          break;
        }
  
        try {
          const chunkResponse = await uploadChunk(
            fileId,
            chunksRef.current[i],
            i,
            abortController.current.signal
          );
  
          // Update progress
          const progress = ((i + 1) / chunksRef.current.length) * 100;
          setUploadProgress(progress);
  
          // Check if upload is complete
          if (chunkResponse?.upload_status === 'completed' && chunkResponse?.file_path) {
            setUploadStatus('completed');
            const baseUrl = 'http://localhost:8000';
            const filePath = chunkResponse.file_path.startsWith('/') 
              ? chunkResponse.file_path 
              : `/${chunkResponse.file_path}`;
            setModelUrl(`${baseUrl}/media${filePath}`);
            break;
          }
  
          // Add delay between chunks
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          if (error.name === 'AbortError') {
            setUploadStatus('paused');
            return;
          }
          // Log the actual error response
          if (error.response) {
            const errorData = await error.response.text();
            console.error('Chunk upload error:', errorData);
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Resume error:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Failed to resume upload');
    }
  };

  useEffect(() => {
    return () => {
      abortController.current?.abort();
    };
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="file"
          accept=".obj"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none mb-4"
        />
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-gray-600">
            Progress: {uploadProgress.toFixed(2)}%
          </span>
          
          {uploadStatus === 'uploading' && (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              Pause
            </button>
          )}
          
          {uploadStatus === 'paused' && (
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Resume
            </button>
          )}
        </div>

        {uploadStatus === 'error' && (
          <div className="text-red-500 mb-4">
            {errorMessage || 'An error occurred during upload. Please try again.'}
          </div>
        )}

        {uploadStatus === 'completed' && (
          <div className="text-green-500 mb-4">
            Upload completed successfully!
          </div>
        )}
      </div>

      {modelUrl && uploadStatus === 'completed' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="text-sm text-gray-600 mb-2">Model URL: {modelUrl}</div>
          <ModelViewer 
            url={modelUrl} 
            onError={(error) => {
              console.error('Model loading error:', error);
              setUploadStatus('error');
              setErrorMessage('Failed to load model. Please try again.');
            }} 
          />
        </div>
      )}
    </div>
  );
};
export default FileUpload;