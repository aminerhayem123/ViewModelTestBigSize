import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUpload, FaPause, FaPlay, FaCheck, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import ModelViewer from './ModelViewer';
import { splitFileIntoChunks, uploadChunk } from '../utils/uploadHelpers';
import { handleUploadError } from '../utils/errorHandlers';

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB

const FileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileId, setFileId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [modelUrl, setModelUrl] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const abortController = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

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
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.file_id;
    } catch (error) {
      throw error;
    }
  };

  const handleFile = async (file) => {
    if (!file) return;

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
      const { chunks, totalChunks } = splitFileIntoChunks(file, CHUNK_SIZE);
      chunksRef.current = chunks;

      const fileId = await initializeUpload(file);
      setFileId(fileId);

      for (let i = 0; i < chunks.length; i++) {
        if (abortController.current.signal.aborted) break;

        const chunkResponse = await uploadChunk(
          fileId,
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

        await new Promise(resolve => setTimeout(resolve, 100));
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    await handleFile(file);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    await handleFile(file);
  };

  const handlePause = () => {
    abortController.current?.abort();
    setUploadStatus('paused');
  };

  const handleResume = async () => {
    if (!currentFile || !fileId) return;
    
    abortController.current = new AbortController();
    
    try {
      const statusResponse = await fetch(`http://localhost:8000/api/upload/status/${fileId}/`);
      if (!statusResponse.ok) throw new Error('Failed to get upload status');
      
      const statusData = await statusResponse.json();
      const lastSuccessfulChunk = statusData.chunks_received || 0;
      
      setUploadStatus('uploading');
      setUploadProgress((lastSuccessfulChunk / chunksRef.current.length) * 100);
  
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
  
          const progress = ((i + 1) / chunksRef.current.length) * 100;
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
  
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          if (error.name === 'AbortError') {
            setUploadStatus('paused');
            return;
          }
          throw error;
        }
      }
    } catch (error) {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-8"
    >
      <div className="space-y-8">
        {/* File Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".obj"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <motion.div
              animate={{ scale: isDragging ? 1.1 : 1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-500 mb-4"
            >
              <FaUpload className="w-8 h-8" />
            </motion.div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your 3D model here
            </h3>
            <p className="text-sm text-gray-500">
              or click to browse (OBJ format, max 4GB)
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        <AnimatePresence mode="wait">
          {uploadStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Progress Bar */}
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      {uploadStatus === 'completed'
                        ? 'Completed'
                        : uploadStatus === 'paused'
                        ? 'Paused'
                        : 'Uploading'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {uploadProgress.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  />
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center space-x-4">
                {uploadStatus === 'uploading' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePause}
                    className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600 transition-colors"
                  >
                    <FaPause className="mr-2" />
                    Pause
                  </motion.button>
                )}

                {uploadStatus === 'paused' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleResume}
                    className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-colors"
                  >
                    <FaPlay className="mr-2" />
                    Resume
                  </motion.button>
                )}
              </div>

              {/* Status Messages */}
              <AnimatePresence mode="wait">
                {uploadStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center space-x-2 text-red-500 bg-red-50 p-4 rounded-lg"
                  >
                    <FaExclamationTriangle />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {uploadStatus === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-center space-x-2 text-green-500 bg-green-50 p-4 rounded-lg"
                  >
                    <FaCheck />
                    <span>Upload completed successfully!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Model Viewer */}
        {modelUrl && uploadStatus === 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border rounded-xl overflow-hidden shadow-lg bg-white"
          >
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            </div>
            <div className="aspect-video relative">
              <ModelViewer
                url={modelUrl}
                onError={(error) => {
                  console.error('Model loading error:', error);
                  setUploadStatus('error');
                  setErrorMessage('Failed to load model. Please try again.');
                }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default FileUpload;