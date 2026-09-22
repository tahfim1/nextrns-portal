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
  files: File[];
  filePreviews: string[];
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
    files: [],
    filePreviews: [],
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
      clientId: tasks.length > 0 ? tasks[tasks.length - 1].clientId : "", 
      proofLink: "",
      files: [],
      filePreviews: [],
      dragover: false,
    }]);
  };

  const removeTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const handleFilesSelect = useCallback(async (index: number, selectedFiles: FileList | File[]) => {
    const currentTask = tasks[index];
    const newFiles = [...currentTask.files];
    const newPreviews = [...currentTask.filePreviews];

    for (let i = 0; i < selectedFiles.length; i++) {
      const selectedFile = selectedFiles[i];
      if (!selectedFile.type.startsWith("image/")) {
        showToast(`Skipped ${selectedFile.name} (Not an image)`, "info");
        continue;
      }

      try {
        let fileToUse = selectedFile;
        
        if (selectedFile.size > 1024 * 1024) {
          showToast(`Compressing ${selectedFile.name}...`, "info");
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          };
          fileToUse = await imageCompression(selectedFile, options);
        } else if (selectedFile.size > 10 * 1024 * 1024) {
          showToast(`File ${selectedFile.name} is too large. Maximum size is 10MB.`, "error");
          continue;
        }

        const previewUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileToUse);
        });

        newFiles.push(fileToUse);
        newPreviews.push(previewUrl);

      } catch (error) {
        console.error("Compression error:", error);
        if (selectedFile.size > 10 * 1024 * 1024) {
          showToast(`File ${selectedFile.name} too large.`, "error");
          continue;
        }
        
        const previewUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });

        newFiles.push(selectedFile);
        newPreviews.push(previewUrl);
      }
    }

    updateTask(index, { files: newFiles, filePreviews: newPreviews });
  }, [tasks, showToast]);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    updateTask(index, { dragover: false });
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(index, e.dataTransfer.files);
    }
  }, [handleFilesSelect]);

  const removeFile = (taskIndex: number, fileIndex: number) => {
    const currentTask = tasks[taskIndex];
    const newFiles = [...currentTask.files];
    const newPreviews = [...currentTask.filePreviews];
    
    newFiles.splice(fileIndex, 1);
    newPreviews.splice(fileIndex, 1);
    
    updateTask(taskIndex, { files: newFiles, filePreviews: newPreviews });
  };

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
      
      // We will create an array of promises, each returning a comma-separated string of uploaded URLs for that task.
      const taskUrlsPromises = tasks.map(async (t) => {
        if (t.files.length === 0) return "";
        
        const fileUrls: string[] = [];
        for (const file of t.files) {
          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed for file ${file.name}`);
          }

          const uploadData = await uploadRes.json();
          fileUrls.push(uploadData.url);
        }
        return fileUrls.join(",");
      });

      const uploadedUrlsArray = await Promise.all(taskUrlsPromises);
      setUploading(false);

      // Prepare payload
      const payload = tasks.map((t, index) => ({
        title: t.title,
        description: t.description,
        clientId: t.clientId,
        proofType: t.files.length > 0 ? "screenshot" : (t.proofLink ? "link" : "screenshot"),
        proofUrl: uploadedUrlsArray[index] || "",
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
        <p className="text-text-secondary">Upload images and document your completed work. You can add multiple tasks at once!</p>
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
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
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
                  placeholder="e.g., Created 3 social media posts for Leo Bar"
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
              
              {/* Image Upload Area */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Upload Proof Images <span className="text-text-muted">(Optional, but recommended)</span>
                </label>
                <div
                  className={`upload-zone p-8 ${task.dragover ? "dragover" : ""}`}
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
                    const pastedFiles: File[] = [];
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf("image") !== -1) {
                        const file = items[i].getAsFile();
                        if (file) pastedFiles.push(file);
                      }
                    }
                    if (pastedFiles.length > 0) {
                      e.preventDefault();
                      handleFilesSelect(index, pastedFiles);
                    }
                  }}
                  tabIndex={0}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <p className="text-text-primary font-medium mb-1 text-lg">Drop your images here</p>
                  <p className="text-text-muted text-sm">or click to browse • Paste (Ctrl+V) anywhere here • Multiple allowed</p>
                </div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[index] = el;
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelect(index, e.target.files);
                  }}
                />

                {/* Grid of uploaded images */}
                {task.filePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {task.filePreviews.map((preview, fileIndex) => (
                      <div key={fileIndex} className="relative group rounded-xl overflow-hidden border border-glass-border aspect-square bg-navy-900/50">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index, fileIndex);
                          }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link Input (Alternative) */}
              <div className="bg-glass/20 p-4 rounded-xl border border-glass-border">
                <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  Alternative: Proof Link <span className="text-text-muted">(if images cannot be uploaded)</span>
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
