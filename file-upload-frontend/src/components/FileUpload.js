import React, { useState, useRef, useEffect } from 'react';
import ModelViewer from './ModelViewer';
import { splitFileIntoChunks, uploadChunk } from '../utils/uploadHelpers';
import { handleUploadError } from '../utils/errorHandlers';

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
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      
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
  
    setUploadStatus('uploading');
    setUploadProgress(0);
    setModelUrl(null);
    setErrorMessage('');
    setCurrentFile(file);
    abortController.current = new AbortController();
  
    try {
      const newFileId = await initializeUpload(file);
      setFileId(newFileId);
      chunksRef.current = splitFileIntoChunks(file);
      
      for (let i = 0; i < chunksRef.current.length; i++) {
        if (uploadStatus === 'paused') break;
  
        const response = await uploadChunk(
          newFileId,
          chunksRef.current[i],
          i,
          abortController.current.signal
        );
  
        const progress = ((i + 1) / chunksRef.current.length) * 100;
        setUploadProgress(progress);
  
        if (response?.upload_status === 'completed' && response?.file_path) {
          setUploadStatus('completed');
          const baseUrl = 'http://localhost:8000';
          const filePath = response.file_path.startsWith('/') 
            ? response.file_path 
            : `/${response.file_path}`;
          const fullUrl = `${baseUrl}/media${filePath}`;
          setModelUrl(fullUrl);
          break;
        }
  
        // Add a delay between chunk uploads (e.g., 500ms)
        await new Promise((resolve) => setTimeout(resolve, 500));
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

    setUploadStatus('uploading');
    abortController.current = new AbortController();

    try {
      const response = await fetch(`http://localhost:8000/api/upload/status/${fileId}/`);
      if (!response.ok) throw new Error('Failed to get upload status');
      
      const data = await response.json();
      const lastChunkIndex = Math.floor((data.progress / 100) * chunksRef.current.length);
      
      for (let i = lastChunkIndex; i < chunksRef.current.length; i++) {
        if (uploadStatus === 'paused') break;

        const response = await uploadChunk(
          fileId,
          chunksRef.current[i],
          i,
          abortController.current.signal
        );

        const progress = ((i + 1) / chunksRef.current.length) * 100;
        setUploadProgress(progress);

        if (response?.upload_status === 'completed' && response?.file_path) {
          setUploadStatus('completed');
          const baseUrl = 'http://localhost:8000';
          const filePath = response.file_path.startsWith('/') 
            ? response.file_path 
            : `/${response.file_path}`;
          const fullUrl = `${baseUrl}/media${filePath}`;
          setModelUrl(fullUrl);
          break;
        }
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(handleUploadError(error));
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