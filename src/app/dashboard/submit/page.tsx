"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../layout";
import imageCompression from "browser-image-compression";

interface ClientOption {
  id: number;
  name: string;
}

interface TaskEntry {
  id: string;
  title: string;
  description: string;
  clientId: string;
  proofLink: string;
  file: File | null;
  filePreview: string | null;
  dragover: boolean;
}

export default function SubmitTaskPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Create a ref array to hold references to file inputs
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [tasks, setTasks] = useState<TaskEntry[]>([{
    id: Date.now().toString(),
    title: "",
    description: "",
    clientId: "",
    proofLink: "",
    file: null,
    filePreview: null,
    dragover: false,
  }]);
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(console.error);
  }, []);

  const updateTask = (index: number, updates: Partial<TaskEntry>) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], ...updates };
    setTasks(newTasks);
  };

  const addTask = () => {
    setTasks([...tasks, {
      id: Date.now().toString(),
      title: "",
      description: "",
      clientId: tasks.length > 0 ? tasks[tasks.length - 1].clientId : "", // inherit previous client for convenience
      proofLink: "",
      file: null,
      filePreview: null,
      dragover: false,
    }]);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const handleFileSelect = useCallback(async (index: number, selectedFile: File) => {
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

      const reader = new FileReader();
      reader.onload = () => {
        updateTask(index, { file: fileToUse, filePreview: reader.result as string });
      };
      reader.readAsDataURL(fileToUse);
    } catch (error) {
      console.error("Compression error:", error);
      showToast("Error processing image. Trying original...", "error");
      
      // Fallback to original
      if (selectedFile.size > 4.5 * 1024 * 1024) {
        showToast("File too large. Maximum size is 4.5MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        updateTask(index, { file: selectedFile, filePreview: reader.result as string });
      };
      reader.readAsDataURL(selectedFile);
    }
  }, [tasks, showToast]);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    updateTask(index, { dragover: false });
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFileSelect(index, droppedFile);
    } else {
      showToast("Please drop an image file", "error");
    }
  }, [handleFileSelect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const invalidTasks = tasks.some(t => !t.title || !t.clientId);
    if (invalidTasks) {
      showToast("Please fill in title and client for all tasks", "error");
      return;
    }

    setSubmitting(true);

    try {
      setUploading(true);
      
      // Upload all files concurrently
      const uploadPromises = tasks.map(async (t) => {
        if (!t.file) return null;
        
        const formData = new FormData();
        formData.append("file", t.file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Upload failed for one or more files");
        }

        const uploadData = await uploadRes.json();
        return uploadData.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setUploading(false);

      // Prepare payload
      const payload = tasks.map((t, index) => ({
        title: t.title,
        description: t.description,
        clientId: t.clientId,
        proofType: t.file ? "screenshot" : (t.proofLink ? "link" : "screenshot"),
        proofUrl: uploadedUrls[index] || "",
        proofLink: t.proofLink,
      }));

      // Create tasks
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit tasks");
      }

      setSuccess(true);
      showToast(`${tasks.length} Task${tasks.length > 1 ? 's' : ''} submitted successfully! 🎉`, "success");

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
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center slide-up">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Tasks Submitted!</h2>
          <p className="text-text-secondary">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto fade-in pb-20">
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
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">Submit New Tasks</h1>
        <p className="text-text-secondary">Document your completed work with proof. You can add multiple tasks at once!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {tasks.map((task, index) => (
          <div key={task.id} className="glass-card p-6 relative slide-up border border-glass-border">
            {tasks.length > 1 && (
              <button
                type="button"
                onClick={() => removeTask(index)}
                className="absolute top-4 right-4 text-text-muted hover:text-red-400 transition-colors bg-navy-900/50 p-2 rounded-full"
                title="Remove task"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Task Details</h2>
            </div>

            <div className="space-y-6">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Client <span className="text-red-400">*</span>
                </label>
                <select
                  value={task.clientId}
                  onChange={(e) => updateTask(index, { clientId: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(index, { title: e.target.value })}
                  className="input-glass"
                  placeholder="e.g., Created social media post for Leo Bar"
                  required
                  maxLength={300}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Description <span className="text-text-muted">(optional)</span>
                </label>
                <textarea
                  value={task.description}
                  onChange={(e) => updateTask(index, { description: e.target.value })}
                  className="input-glass resize-none"
                  placeholder="Add more details about the task..."
                  rows={2}
                />
              </div>

              {/* Screenshot Input */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Upload Screenshot <span className="text-text-muted">(optional)</span>
                </label>
                <div
                  className={`upload-zone ${task.dragover ? "dragover" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); updateTask(index, { dragover: true }); }}
                  onDragLeave={() => updateTask(index, { dragover: false })}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => {
                    if (fileInputRefs.current[index]) {
                      fileInputRefs.current[index]!.click();
                    }
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf("image") !== -1) {
                        const pastedFile = items[i].getAsFile();
                        if (pastedFile) {
                          handleFileSelect(index, pastedFile);
                          e.preventDefault();
                          break;
                        }
                      }
                    }
                  }}
                  tabIndex={0} // Make focusable to receive paste events directly
                >
                  {task.filePreview ? (
                    <div className="relative">
                      <img
                        src={task.filePreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTask(index, { file: null, filePreview: null });
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        ✕
                      </button>
                      <p className="text-xs text-text-muted mt-3">{task.file?.name} ({((task.file?.size || 0) / 1024 / 1024).toFixed(2)} MB)</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                      <p className="text-text-primary font-medium mb-1">Drop your screenshot here</p>
                      <p className="text-text-muted text-sm">or click to browse • Click here then Paste (Ctrl+V) • Max 4.5MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[index] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(index, f);
                  }}
                />
              </div>

              {/* Link Input */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Proof Link <span className="text-text-muted">(optional)</span>
                </label>
                <input
                  type="url"
                  value={task.proofLink}
                  onChange={(e) => updateTask(index, { proofLink: e.target.value })}
                  className="input-glass"
                  placeholder="https://example.com/my-work"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={addTask}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Another Task
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="btn-primary w-full py-4 text-lg rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              {uploading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading screenshots...
                </>
              ) : submitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting {tasks.length} task{tasks.length > 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Submit All Tasks
                </>
              )}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
