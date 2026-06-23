"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";

export default function ResumeUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-zinc-300 bg-white hover:border-zinc-400"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-zinc-500">
          {file ? (
            <div className="text-zinc-900">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : isDragActive ? (
            <p>Drop your resume PDF here...</p>
          ) : (
            <div>
              <p className="font-medium">Drag & drop your resume PDF here</p>
              <p className="mt-1 text-sm">or click to browse</p>
            </div>
          )}
        </div>
      </div>

      {file && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? "Uploading & Parsing..." : "Upload & Parse Resume"}
        </Button>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">
            Parsed Resume Data
          </h3>
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-zinc-100 p-4 text-sm">
            {JSON.stringify(result.parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
