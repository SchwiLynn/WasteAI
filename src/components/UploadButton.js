'use client';

import { useState, useRef } from 'react';

const UploadButton = ({ onFileSelect, selectedImage, accept = "image/*", multiple = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (files) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length > 0) {
      onFileSelect(selectedFiles);
    }
  };

  const handleInputChange = (e) => {
    handleFileSelect(e.target.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-wrapper">
      {/* Drop Area */}
      <div
        className={`upload-dropzone ${dragActive ? 'upload-dropzone-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden-input"
        />

        {selectedImage ? (
          <div className="image-preview-container">
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Preview"
              className="image-preview"
            />
          </div>
        ) : (
          <div className="upload-placeholder-content">
            <svg
              className="upload-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <p className="upload-placeholder">Drag and drop an image here</p>
            <p className="upload-hint">or click to browse files</p>
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="upload-controls">
        <button
          type="button"
          onClick={handleButtonClick}
          className="upload-button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Choose Image
        </button>
        <p className="upload-hint">PNG, JPG, GIF up to 10MB</p>
      </div>
    </div>
  );
};

export default UploadButton;
