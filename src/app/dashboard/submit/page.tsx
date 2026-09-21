"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../layout";
import imageCompression from "browser-image-compression";

interface ClientOption {
  id: number;
  name: string;
}

export default function SubmitTaskPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [proofType, setProofType] = useState<"screenshot" | "link">("screenshot");
  const [proofUrl, setProofUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(console.error);
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    try {
      let fileToUse = selectedFile;
      
      // Compress if larger than 1MB
      if (selectedFile.size > 1024 * 1024) {
        showToast("Compressing image...", "info");
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        fileToUse = await imageCompression(selectedFile, options);
      } else if (selectedFile.size > 4.5 * 1024 * 1024) {
        showToast("File too large. Maximum size is 4.5MB.", "error");
        return;
      }

      setFile(fileToUse);
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(fileToUse);
    } catch (error) {
      console.error("Compression error:", error);
      showToast("Error processing image. Trying original...", "error");
      
      // Fallback to original
      if (selectedFile.size > 4.5 * 1024 * 1024) {
        showToast("File too large. Maximum size is 4.5MB.", "error");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFileSelect(droppedFile);
    } else {
      showToast("Please drop an image file", "error");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientId) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setSubmitting(true);
    let finalProofUrl = proofUrl;

    try {
      // Upload file first if screenshot
      if (proofType === "screenshot" && file) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload failed");
        }

        const uploadData = await uploadRes.json();
        finalProofUrl = uploadData.url;
        setUploading(false);
      }

      if (!finalProofUrl) {
        showToast("Please provide proof (screenshot or link)", "error");
        setSubmitting(false);
        return;
      }

      // Create task
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          clientId,
          proofType,
          proofUrl: finalProofUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit task");
      }

      setSuccess(true);
      showToast("Task submitted successfully! 🎉", "success");

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      showToast(errorMessage, "error");
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center slide-up">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Task Submitted!</h2>
          <p className="text-text-secondary">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">Submit New Task</h1>
        <p className="text-text-secondary">Document your completed work with proof</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div className="glass-card p-6">
          <label htmlFor="client" className="block text-sm font-medium text-text-secondary mb-2">
            Client <span className="text-red-400">*</span>
          </label>
          <select
            id="client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input-glass appearance-none cursor-pointer"
            required
          >
            <option value="" className="bg-navy-900">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-navy-900">{c.name}</option>
            ))}
          </select>
        </div>

        {/* Task Title */}
        <div className="glass-card p-6">
          <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-2">
            Task Title <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-glass"
            placeholder="e.g., Created social media post for Leo Bar"
            required
            maxLength={300}
          />
        </div>

        {/* Description */}
        <div className="glass-card p-6">
          <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-2">
            Description <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-glass resize-none"
            placeholder="Add more details about the task..."
            rows={3}
          />
        </div>

        {/* Proof Type Toggle */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Proof Type <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setProofType("screenshot"); setProofUrl(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                proofType === "screenshot"
                  ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-white border border-violet-500/30"
                  : "bg-glass text-text-secondary border border-glass-border hover:border-glass-border"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              Screenshot
            </button>
            <button
              type="button"
              onClick={() => { setProofType("link"); setFile(null); setFilePreview(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                proofType === "link"
                  ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white border border-blue-500/30"
                  : "bg-glass text-text-secondary border border-glass-border hover:border-glass-border"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              Link
            </button>
          </div>
        </div>

        {/* Proof Input */}
        <div className="glass-card p-6">
          {proofType === "screenshot" ? (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Upload Screenshot <span className="text-red-400">*</span>
              </label>
              <div
                className={`upload-zone ${dragover ? "dragover" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {filePreview ? (
                  <div className="relative">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setFilePreview(null);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      ✕
                    </button>
                    <p className="text-xs text-text-muted mt-3">{file?.name} ({((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-text-primary font-medium mb-1">Drop your screenshot here</p>
                    <p className="text-text-muted text-sm">or click to browse • Max 4.5MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>
          ) : (
            <div>
              <label htmlFor="proofLink" className="block text-sm font-medium text-text-secondary mb-2">
                Proof Link <span className="text-red-400">*</span>
              </label>
              <input
                id="proofLink"
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="input-glass"
                placeholder="https://example.com/my-work"
                required={proofType === "link"}
              />
              <p className="text-xs text-text-muted mt-2">Paste a URL to your published work, post, or deliverable</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || uploading || !title || !clientId || (proofType === "screenshot" && !file) || (proofType === "link" && !proofUrl)}
          className="btn-primary w-full py-4 text-base rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="flex items-center justify-center gap-2">
            {uploading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading screenshot...
              </>
            ) : submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Submit Task
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
