import { useState, useRef, useCallback, useMemo } from 'react';
import type { UploadResponse } from '../../types';
import { uploadCSV } from '../../services/api';
import './CSVUploader.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ROLE_LABELS: Record<string, string> = {
  entity_id: 'SKU',
  location_id: 'LOCATION',
  time_index: 'TIME',
  target: 'TARGET',
  stock_on_hand: 'STOCK',
  lead_time: 'LEAD',
};

interface CSVUploaderProps {
  onUploadSuccess: (response: UploadResponse, files: File[]) => void;
  onUploadError: (error: string) => void;
}

type UploadState = 'default' | 'dragging' | 'uploading' | 'completed' | 'error';

export function CSVUploader({ onUploadSuccess, onUploadError }: CSVUploaderProps) {
  const [state, setState] = useState<UploadState>('default');
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback((message: string) => {
    setState('error');
    setErrorMessage(message);
    onUploadError(message);
  }, [onUploadError]);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.name.endsWith('.csv')) {
        handleError('Invalid file type. Please upload only CSV files.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        handleError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
        return;
      }
    }

    const displayNames = files.map((f) => f.name).join(', ');
    setFileName(displayNames);
    setState('uploading');
    setErrorMessage('');

    const result = await uploadCSV(files);

    if (result) {
      setState('completed');
      setUploadResult(result);
      onUploadSuccess(result, files);
    } else {
      handleError('Backend not connected. Configure VITE_API_URL to connect.');
    }
  }, [handleError, onUploadSuccess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('dragging');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('default');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleReset = useCallback(() => {
    setState('default');
    setUploadResult(null);
    setErrorMessage('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Map column name -> short role label (e.g. "drug_id" -> "SKU"), using the
  // schema roles the backend already auto-detected, so the uploader surfaces
  // *why* a column matters instead of just listing names.
  const roleByColumn = useMemo(() => {
    const map: Record<string, string> = {};
    const roles = uploadResult?.detected_schema?.detected_roles;
    if (!roles) return map;
    for (const [role, column] of Object.entries(roles)) {
      const label = ROLE_LABELS[role];
      if (label && uploadResult?.columns.includes(column)) {
        map[column] = label;
      }
    }
    return map;
  }, [uploadResult]);

  return (
    <div className="csv-uploader">
      <div className="csv-uploader__header">
        <div className="csv-uploader__header-left">
          <div className="csv-uploader__header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h2 className="csv-uploader__title">Upload Dataset</h2>
        </div>
        {state === 'completed' && (
          <button className="csv-uploader__reset" onClick={handleReset}>
            Upload New
          </button>
        )}
      </div>

      {state === 'completed' && uploadResult ? (
        <div className="csv-uploader__result">
          <div className="csv-uploader__result-header">
            <div className="csv-uploader__result-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="csv-uploader__result-info">
              <span className="csv-uploader__result-file mono">{fileName}</span>
              <div className="csv-uploader__result-stats">
                <span className="csv-uploader__stat">
                  <strong>{uploadResult.rows.toLocaleString()}</strong> rows
                </span>
                <span className="csv-uploader__stat-divider">·</span>
                <span className="csv-uploader__stat">
                  <strong>{uploadResult.columns.length}</strong> columns
                </span>
              </div>
            </div>
          </div>

          <div className="csv-uploader__columns-eyebrow">
            <span>Detected Fields</span>
            {Object.keys(roleByColumn).length > 0 && (
              <span className="csv-uploader__columns-eyebrow-hint">
                {Object.keys(roleByColumn).length} auto-mapped
              </span>
            )}
          </div>
          <div className="csv-uploader__columns">
            {uploadResult.columns.map((col, i) => {
              const role = roleByColumn[col];
              return (
                <span
                  key={col}
                  className="csv-uploader__column-tag mono"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  {col}
                  {role && <span className="csv-uploader__column-role-badge">{role}</span>}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={`csv-uploader__dropzone csv-uploader__dropzone--${state}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileChange}
            className="csv-uploader__input"
            aria-hidden="true"
          />

          {state === 'uploading' ? (
            <div className="csv-uploader__loading">
              <div className="csv-uploader__spinner" />
              <span>Processing {fileName}…</span>
            </div>
          ) : state === 'error' ? (
            <div className="csv-uploader__error-content">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="csv-uploader__error-text">{errorMessage}</span>
              <button className="csv-uploader__retry" onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <svg className="csv-uploader__icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="csv-uploader__text">
                <strong>Drop CSV file here</strong> or click to browse
              </p>
              <p className="csv-uploader__hint">CSV files up to 10MB</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
