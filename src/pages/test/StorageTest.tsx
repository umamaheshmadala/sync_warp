// src/pages/test/StorageTest.tsx
import { useState } from 'react';
import {
  uploadMessageAttachment,
  getAttachmentSignedUrl,
  deleteAttachment,
  validateFile,
  UploadResult
} from '../../services/messageStorageService';

/**
 * Test page to verify STORY 8.1.3 implementation
 * Tests upload, signed URL generation, and delete operations
 * 
 * Usage:
 * 1. Navigate to /test/storage in your app
 * 2. Log in as a test user
 * 3. Try uploading an image/video
 * 4. Check browser console for CORS errors
 * 5. Test signed URL generation and expiry
 */
export default function StorageTest() {
  const [file, setFile] = useState<File | null>(null);
  const [conversationId] = useState('00000000-0000-0000-0000-000000000001'); // Test conversation ID
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    addLog(`Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB, ${selectedFile.type})`);

    // Validate immediately
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      addLog(`❌ Validation failed: ${validation.error}`);
    } else {
      addLog(`✅ File validation passed`);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      addLog('❌ No file selected');
      return;
    }

    setLoading(true);
    addLog(`📤 Starting upload...`);

    try {
      const result = await uploadMessageAttachment(file, conversationId);
      setUploadResult(result);

      if (result.error) {
        addLog(`❌ Upload failed: ${result.error}`);
        addLog('💡 If you see CORS errors in console, you may need a proxy (see docs)');
      } else {
        addLog(`✅ Upload successful!`);
        addLog(`   Path: ${result.path}`);
        addLog(`   Full path: ${result.fullPath}`);
      }
    } catch (err) {
      addLog(`❌ Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSignedUrl = async () => {
    if (!uploadResult || !uploadResult.path) {
      addLog('❌ Upload a file first');
      return;
    }

    setLoading(true);
    addLog(`🔗 Generating signed URL...`);

    try {
      const result = await getAttachmentSignedUrl(uploadResult.path);

      if (result.error) {
        addLog(`❌ Signed URL generation failed: ${result.error}`);
      } else {
        setSignedUrl(result.signedUrl);
        addLog(`✅ Signed URL generated (expires in 1 hour)`);
        addLog(`   URL: ${result.signedUrl.substring(0, 100)}...`);
      }
    } catch (err) {
      addLog(`❌ Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!uploadResult || !uploadResult.path) {
      addLog('❌ Upload a file first');
      return;
    }

    if (!confirm('Delete this attachment?')) return;

    setLoading(true);
    addLog(`🗑️ Deleting attachment...`);

    try {
      const result = await deleteAttachment(uploadResult.path);

      if (result.error) {
        addLog(`❌ Delete failed: ${result.error}`);
      } else {
        addLog(`✅ Deleted successfully`);
        setUploadResult(null);
        setSignedUrl('');
      }
    } catch (err) {
      addLog(`❌ Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLog = () => setLog([]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-2">Storage Test (STORY 8.1.3)</h1>
          <p className="text-gray-600 mb-6">
            Test message attachments upload, signed URLs, and CORS behavior
          </p>

          {/* File selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Image or Video (&lt;25MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-500">
                {file.name} - {(file.size / 1024 / 1024).toFixed(2)}MB
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>

            <button
              onClick={handleGenerateSignedUrl}
              disabled={!uploadResult || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Generate Signed URL
            </button>

            <button
              onClick={handleDelete}
              disabled={!uploadResult || loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>

          {/* Signed URL preview */}
          {signedUrl && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold mb-2">Preview (via signed URL):</h3>
              {file?.type.startsWith('image/') ? (
                <img src={signedUrl} alt="Preview" className="max-w-full h-auto rounded" />
              ) : (
                <video src={signedUrl} controls className="max-w-full h-auto rounded" />
              )}
            </div>
          )}

          {/* Log console */}
          <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm h-64 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold">Console Log</span>
              <button
                onClick={clearLog}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Clear
              </button>
            </div>
            {log.length === 0 ? (
              <p className="text-gray-500">Waiting for actions...</p>
            ) : (
              log.map((entry, i) => <div key={i}>{entry}</div>)
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-md text-sm">
            <h3 className="font-semibold mb-2">📋 What to check:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Open browser DevTools → Network tab</li>
              <li>Try uploading an image - watch for CORS errors in console</li>
              <li>If you see "No 'Access-Control-Allow-Origin'" error, implement proxy (see docs)</li>
              <li>Test signed URL generation and verify image/video loads</li>
              <li>Test with 26MB+ file to verify size limit enforcement</li>
              <li>Test with .zip or .exe to verify MIME type restriction</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
