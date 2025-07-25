'use client';

import { useState, useEffect } from 'react';
import UploadButton from '../components/UploadButton';
import ImageCanvas from '../components/ImageCanvas';
import { saveUploadToHistory, getHistory, clearHistory, hashFile, getResultByHash } from '../lib/historyService';

export default function Home() {
  const categoryTextMap = {
    recyclable: 'Recyclable',
    compostable: 'Compostable',
    non_recyclable: 'Non-Recyclable',
  };
  const [selectedImage, setSelectedImage] = useState(null);
  const [boundingBoxes, setBoundingBoxes] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);

  useEffect(() => {
    setHasMounted(true);
    // Fetch upload history on mount
    setUploadHistory(getHistory());
  }, []);

  // Add a function to re-analyze an image from history
  const reanalyzeImage = async (imageUrl, geminiResult) => {
    setIsLoading(true);
    setError(null);
    try {
      // Convert image to base64 for preview/history
      const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const newImageUrl = await toBase64(selectedImage);

      // Send image to Gemini API
      const formData = new FormData();
      formData.append('image', selectedImage);
      const response = await fetch('/api/gemini', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.boundingBoxes) {
        setBoundingBoxes(data.boundingBoxes);
        setAnalysisData(data);
        // Save to local history
        saveUploadToHistory({ imageUrl: newImageUrl, geminiResult: data, timestamp: Date.now() });
        setUploadHistory(getHistory());
      } else {
        setError('No bounding boxes returned from API');
      }
    } catch (err) {
      setError(err.message || 'Failed to re-analyze image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (files) => {
    if (files.length > 0) {
      setSelectedImage(files[0]);
      setBoundingBoxes([]);
      setAnalysisData(null);
      setError(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;
    // Compute hash of the image
    const hash = await hashFile(selectedImage);
    // Check for cached result
    const cached = getResultByHash(hash);
    if (cached) {
      setBoundingBoxes(cached.geminiResult.boundingBoxes || []);
      setAnalysisData(cached.geminiResult);
      setError(null);
      // Do NOT show loading spinner for cached results
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Convert image to base64 for preview/history
      const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const imageUrl = await toBase64(selectedImage);
      // Send image to Gemini API
      const formData = new FormData();
      formData.append('image', selectedImage);
      const response = await fetch('/api/gemini', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.boundingBoxes) {
        setBoundingBoxes(data.boundingBoxes);
        setAnalysisData(data);
        // Save to local history with hash
        saveUploadToHistory({ hash, imageUrl, geminiResult: data, timestamp: Date.now() });
      } else {
        setError('No bounding boxes returned from API');
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setUploadHistory([]);
  };

  if (!hasMounted) return null;

  return (
    <div className="app-container">
      <div className="nav-bar">
        <h1 className="nav-title">WasteSnap - AI Spatial Understanding Demo</h1>
      </div>

      <div className="page-wrapper">
        <div className="text-center mb-8">
          <h2 className="page-title">Gemini AI Spatial Understanding</h2>
          <p className="page-subtitle">
            Upload an image to see how Gemini AI understands spatial relationships, object detection, and waste categorization
          </p>
        </div>

        <div className="space-y-8">
          {/* Side-by-side Upload and History */}
          <div className="upload-section">
            <h2 className="section-title">Upload Image</h2>
            <UploadButton onFileSelect={handleFileSelect} selectedImage={selectedImage} />
            {selectedImage && (
              <div className="image-info">
                <p>
                  Selected: {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                </p>
                <button
                  onClick={analyzeImage}
                  disabled={isLoading}
                  className="analyze-button"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Analyzing with Gemini AI...
                    </>
                  ) : (
                    'Analyze Image with Gemini AI'
                  )}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-box">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="error-title">Error</h3>
                  <div className="error-message">{error}</div>
                </div>
              </div>
            </div>
          )}

          {analysisData && (
            <div className="result-section">
              <h2 className="section-title">Gemini AI Analysis Results</h2>

              {/* Metadata Section */}
              <div className="metadata-section">
                <h3 className="result-title">Analysis Metadata</h3>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Model:</span>
                    <span className="metadata-value">{analysisData.metadata.model}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Processing Time:</span>
                    <span className="metadata-value">{analysisData.metadata.processingTime}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Total Objects:</span>
                    <span className="metadata-value">{analysisData.metadata.totalObjects}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Confidence:</span>
                    <span className="metadata-value">{analysisData.metadata.confidence}</span>
                  </div>
                </div>

                <div className="spatial-understanding">
                  <h4 className="spatial-title">Spatial Understanding Features</h4>
                  <ul className="spatial-features">
                    <li>✓ {analysisData.metadata.spatialUnderstanding.objectRelationships}</li>
                    <li>✓ {analysisData.metadata.spatialUnderstanding.depthPerception}</li>
                    <li>✓ {analysisData.metadata.spatialUnderstanding.contextualUnderstanding}</li>
                  </ul>
                </div>
              </div>

              {/* Image Canvas */}
              <ImageCanvas
                imageFile={selectedImage}
                boundingBoxes={boundingBoxes}
                width={800}
                height={600}
              />

              {/* Waste Analysis */}
              <div className="waste-analysis">
                <h3 className="result-title">Waste Categorization Analysis</h3>
                <div className="waste-stats">
                  <div className="waste-stat recyclable">
                    <span className="waste-label">Recyclable</span>
                    <span className="waste-count">{analysisData.analysis.recyclable}</span>
                  </div>
                  <div className="waste-stat compostable">
                    <span className="waste-label">Compostable</span>
                    <span className="waste-count">{analysisData.analysis.compostable}</span>
                  </div>
                  <div className="waste-stat non-recyclable">
                    <span className="waste-label">Non-Recyclable</span>
                    <span className="waste-count">{analysisData.analysis.non_recyclable}</span>
                  </div>
                </div>

                <div className="recommendations">
                  <h4 className="recommendations-title">Recommendations</h4>
                  <ul className="recommendations-list">
                    {analysisData.analysis.recommendations.map((rec, index) => (
                      <li key={index} className="recommendation-item">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="detailed-results">
                <h3 className="result-title">Detailed Object Detection</h3>
                <div className="results-grid">
                  {boundingBoxes.map((box, index) => (
                    <div key={index} className="result-item-detailed">
                      <div className="result-header">
                        <span className="result-label-detailed">
                          {box.label}
                        </span>
                      </div>
                      <div className="result-details">
                        <span className="result-category">{categoryTextMap[box.category] || box.category}</span>
                        <p className="result-description">{box.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
