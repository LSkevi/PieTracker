import React, { useState, useRef } from "react";
import { AuthService } from "../services/auth";

interface OCRResult {
  success: boolean;
  amount?: number;
  date?: string;
  merchant?: string;
  category?: string;
  confidence?: string;
  error?: string;
}

interface ReceiptCaptureProps {
  onDataExtracted: (data: OCRResult) => void;
  // Optional callback to notify parent about processing state so the
  // parent (ExpenseForm) can disable inputs or show a global loader.
  onProcessingChange?: (processing: boolean) => void;
}

const ReceiptCapture: React.FC<ReceiptCaptureProps> = ({
  onDataExtracted,
  onProcessingChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onDataExtracted({
        success: false,
        error: "Please select an image file (PNG, JPG, JPEG, WEBP)",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onDataExtracted({
        success: false,
        error: "Image file too large. Please use an image smaller than 10MB.",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

      // Process with OCR
      setIsProcessing(true);
      setProcessingStatus("Uploading image...");
      if (typeof onProcessingChange === "function") onProcessingChange(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProcessingStatus("AI analyzing receipt...");

      const response = await fetch("http://localhost:8000/ocr/receipt", {
        method: "POST",
        headers: {
          ...AuthService.getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process receipt");
      }

      setProcessingStatus("Extracting data...");
      const result: OCRResult = await response.json();
      onDataExtracted(result);
    } catch (error) {
      console.error("OCR processing error:", error);
      onDataExtracted({
        success: false,
        error: "Failed to process receipt. Please try again.",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
      if (typeof onProcessingChange === "function") onProcessingChange(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (!isProcessing) fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // no-op

  return (
    <div className="receipt-capture">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        style={{ display: "none" }}
        capture="environment"
      />

      {!preview && (
        <div
          className={`receipt-drop-zone ${isDragOver ? "drag-over" : ""} ${
            isProcessing ? "processing" : ""
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!isProcessing ? handleClick : undefined}
        >
          <div className="receipt-drop-content">
            {isProcessing ? (
              <>
                <div className="receipt-spinner"></div>
                <p>Processing receipt...</p>
                <span>{processingStatus || "AI is reading your receipt"}</span>
              </>
            ) : (
              <>
                <div className="receipt-camera-icon">📷</div>
                <h3>Scan Receipt</h3>
                <p>Click to take photo or drag image here</p>
                <span>Supports French & English receipts</span>
              </>
            )}
          </div>
        </div>
      )}

      {preview && !isProcessing && (
        <div className="receipt-preview">
          <div className="receipt-preview-header">
            <h4>Receipt Preview</h4>
            <button
              className="receipt-clear-btn"
              onClick={clearPreview}
              type="button"
            >
              ✕
            </button>
          </div>
          <img src={preview} alt="Receipt preview" className="receipt-image" />
          <button
            className="receipt-reprocess-btn"
            onClick={() => {
              if (fileInputRef.current?.files?.[0]) {
                handleFileSelect(fileInputRef.current.files[0]);
              }
            }}
            type="button"
          >
            Reprocess Receipt
          </button>
        </div>
      )}
    </div>
  );
};

export default ReceiptCapture;
