"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../layout";
import Link from "next/link";

interface ReportTask {
  id: number;
  title: string;
  description: string | null;
  proofUrl: string | null;
  proofLink: string | null;
  status: string;
  clientName: string;
  submittedAt: string;
}

interface EmployeeReport {
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  tasks: ReportTask[];
}

const BD_TZ = "Asia/Dhaka";

function getBDToday() {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: BD_TZ });
}

function formatBDTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    timeZone: BD_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function DailyReportPage() {
  const { user } = useUser();
  const router = useRouter();
  const [reportDate, setReportDate] = useState(getBDToday());
  const [reportData, setReportData] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Redirect if not Jenifar or Admin
  useEffect(() => {
    if (user && user.username !== "jenifar" && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const fetchReport = useCallback((date: string) => {
    setLoading(true);
    fetch(`/api/report?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setReportData(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user && (user.username === "jenifar" || user.role === "admin")) {
      fetchReport(reportDate);
    }
  }, [reportDate, user, fetchReport]);

  if (!user || (user.username !== "jenifar" && user.role !== "admin")) {
    return null; // Don't render for unauthorized
  }

  const formattedDate = new Date(`${reportDate}T00:00:00+06:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: BD_TZ,
  });

  const handleExportDocx = async () => {
    if (reportData.length === 0) return;
    setExporting(true);
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

      const children = [];
      
      // Title
      children.push(
        new Paragraph({
          text: `Daily Activity Report - ${formattedDate}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 },
        })
      );

      // Iterating over employees
      reportData.forEach((emp) => {
        children.push(
          new Paragraph({
            text: `${emp.user.name} (${emp.tasks.length} tasks)`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );

        emp.tasks.forEach((task, index) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. [${task.clientName}] ${task.title}`, bold: true }),
                new TextRun({ 
                  text: ` ${task.status === "approved" ? "✓" : task.status === "rejected" ? "✗" : "•"}`,
                  color: task.status === "approved" ? "22c55e" : task.status === "rejected" ? "ef4444" : "eab308",
                  bold: true,
                }),
                new TextRun({ text: ` - ${formatBDTime(task.submittedAt)}`, italics: true }),
              ],
              spacing: { before: 120, after: task.description ? 0 : 120 },
            })
          );

          if (task.description) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: task.description, color: "555555" }),
                ],
                indent: { left: 720 }, // Indent description
                spacing: { before: 60, after: 120 },
              })
            );
          }
        });
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `NextRNS_Report_${reportDate}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error) {
      console.error("Failed to export docx:", error);
      alert("Failed to export document. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto fade-in pb-12">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
              <span className="text-amber-500">📝</span> Daily Activity Report
            </h1>
            <p className="text-text-secondary">Summary of all employee tasks (No proofs included)</p>
          </div>
          <div className="flex items-center gap-3 bg-glass/50 p-2 rounded-2xl border border-glass-border">
            <span className="text-sm font-medium text-text-secondary pl-2">Date (BD Time):</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="bg-glass-hover text-text-primary text-sm font-semibold border-none focus:ring-2 focus:ring-amber-500/50 rounded-xl py-2 px-3 outline-none transition-all cursor-pointer"
            />
            <button
              onClick={handleExportDocx}
              disabled={exporting || reportData.length === 0}
              className="ml-2 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Export to Word
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 mb-8 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
        <h2 className="text-xl font-bold text-amber-500 mb-1">{formattedDate}</h2>
        <p className="text-sm text-text-secondary">
          {loading ? "Loading statistics..." : `Found activity from ${reportData.length} employees.`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 shimmer h-48 rounded-2xl" />
          ))}
        </div>
      ) : reportData.length === 0 ? (
        <div className="glass-card p-12 text-center border-dashed border-glass-border">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-glass flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-text-secondary mb-1">No tasks found for this date.</p>
          <p className="text-text-muted text-sm">Select a different date from the picker above.</p>
        </div>
      ) : (
        <div className="space-y-8 stagger-children">
          {reportData.map((emp) => (
            <div key={emp.user.id} className="glass-card overflow-hidden border border-glass-border/50 hover:border-amber-500/30 transition-colors duration-300">
              <div className="bg-glass-hover p-4 border-b border-glass-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
                    style={{ backgroundColor: emp.user.avatar || "#3b82f6" }}
                  >
                    {emp.user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{emp.user.name}</h3>
                    <p className="text-xs text-text-muted">{emp.tasks.length} tasks completed</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-glass/20">
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {emp.tasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-xl bg-glass border border-glass-border hover:bg-glass-hover transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-glass-hover text-text-secondary`}>
                          {task.clientName}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                          task.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          task.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-text-primary mb-1 line-clamp-2" title={task.title}>{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-text-secondary line-clamp-2 mb-3" title={task.description}>
                          {task.description}
                        </p>
                      )}
                      {(task.proofUrl || task.proofLink) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {task.proofUrl && (
                            <a href={task.proofUrl} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-blue-500/20 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              Image
                            </a>
                          )}
                          {task.proofLink && (
                            <a href={task.proofLink} target="_blank" rel="noreferrer" className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-indigo-500/20 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              Link
                            </a>
                          )}
                        </div>
                      )}
                      <div className="mt-auto pt-3 border-t border-glass-border/50 flex items-center justify-between">
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatBDTime(task.submittedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
