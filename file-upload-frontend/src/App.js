// src/App.js
import React from 'react';
import FileUpload from './components/FileUpload';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            3D Model File Upload
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Upload your 3D model
              </h2>
              <p className="text-gray-600 mt-1">
                Supported formats: .obj
              </p>
            </div>
            <FileUpload />
          </div>
        </div>
      </main>
      
      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 text-center text-gray-600">
          <p>Upload large 3D files with chunk management and preview</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
