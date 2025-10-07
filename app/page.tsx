"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type AssignmentResult,
  type MentorAssignment,
  type Student,
  assignStudentsBidirectional,
  generateDemoStudents,
  getMentorStats,
} from "@/lib/utils";
import { downloadTemplate, parseStudentsFromFile, type ParseResult } from "@/lib/excel";

type Mode = "demo" | "upload";
type Step = "setup" | "preview" | "results";

export default function Home() {
  const [mode, setMode] = useState<Mode>("demo");
  const [step, setStep] = useState<Step>("setup");
  const [numMentors, setNumMentors] = useState<number>(6);
  const [students, setStudents] = useState<Student[]>([]);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [demoPage, setDemoPage] = useState<number>(1);
  const [demoPageSize, setDemoPageSize] = useState<number>(10);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const maxLecturers: number | null = students.length > 0 ? students.length : null;

  function clampCwa(value: number) {
    if (!Number.isFinite(value)) return 0;
    const clamped = Math.min(100, Math.max(0, value));
    return Math.round(clamped * 100) / 100;
  }

  useEffect(() => {
    if (mode === "demo") {
      setStudents(generateDemoStudents(36));
      setResult(null);
    } else {
      setStudents([]);
      setResult(null);
    }
    setStep("setup");
    setDemoPage(1);
  }, [mode]);

  const stats = useMemo(() => {
    if (!result) return [] as ReturnType<typeof getMentorStats>;
    return getMentorStats(result.assignments);
  }, [result]);

  function updateStudentCwa(index: number, value: number) {
    setStudents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], cwa: Number.isFinite(value) ? value : 0 };
      return next;
    });
  }

  function run() {
    try {
      const res = assignStudentsBidirectional(students, numMentors);
      setResult(res);
      setStep("results");
    } catch (e) {
      console.error(e);
      alert("Invalid configuration. Please check inputs.");
    }
  }

  async function handleFileChange(file?: File | null) {
    if (!file) return;
    setUploadErrors([]);
    setResult(null);
    try {
      const parsed: ParseResult = await parseStudentsFromFile(file);
      setStudents(parsed.students);
      setUploadErrors(parsed.errors);
      setSelectedFileName(file.name);
      setStep("preview");
    } catch (err) {
      console.error(err);
      setUploadErrors(["Failed to read file. Ensure it is a valid Excel document."]);
    }
  }

  // Keep mentors within [1, maxLecturers] when dataset size changes
  useEffect(() => {
    if (students.length > 0) {
      setNumMentors((prev) => Math.min(students.length, Math.max(1, prev)));
    }
  }, [students.length]);

  return (
    <div className="font-sans min-h-screen p-6 sm:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold">Mentorium Pairing Algorithm</h1>
          <p className="text-sm text-muted-foreground">
            Bidirectional Score-Based Round Robin
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex gap-2 flex-wrap">
            <button
              className={`px-3 py-2 rounded border ${mode === "demo" ? "bg-foreground text-background" : "hover:bg-muted"}`}
              onClick={() => setMode("demo")}
            >
              Demo Mode
            </button>
            <button
              className={`px-3 py-2 rounded border ${mode === "upload" ? "bg-foreground text-background" : "hover:bg-muted"}`}
              onClick={() => setMode("upload")}
            >
              Upload Mode
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm" htmlFor="mentors">Number of mentors</label>
            <input
              id="mentors"
              type="number"
              className="px-2 py-1 border rounded w-full sm:w-24"
              min={1}
              max={maxLecturers ?? undefined}
              value={numMentors}
              onChange={(e) => {
                const next = Number(e.target.value);
                const bounded = students.length > 0
                  ? Math.min(students.length, Math.max(1, next))
                  : Math.max(1, next);
                setNumMentors(bounded);
              }}
            />
          </div>

          <div className="flex justify-end gap-2 flex-wrap">
            {(mode !== "upload" || students.length > 0) && (
              <button
                className="px-4 py-2 rounded bg-[#13c56b] hover:bg-[#10b261] active:bg-[#0da05a] text-white disabled:opacity-50 w-full sm:w-auto"
                onClick={run}
              >
                Run algorithm
              </button>
            )}
            <button
              className="px-3 py-2 rounded border hover:bg-muted w-full sm:w-auto"
              onClick={() => {
                setResult(null);
                if (mode === "demo") setStudents(generateDemoStudents(36));
                if (mode === "upload") setStudents([]);
                setStep("setup");
              }}
            >
              Reset
            </button>
        </div>
        </section>

        {step === "setup" && mode === "demo" && (
          <section className="border rounded p-3 overflow-auto">
            <div className="mb-2 text-sm font-medium flex items-center justify-between">
              <span>Demo dataset ({students.length} students)</span>
              {students.length > 0 && (
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {(() => {
                    const totalPages = Math.ceil(students.length / demoPageSize) || 1;
                    const currentPage = Math.min(Math.max(1, demoPage), totalPages);
                    const canPrev = currentPage > 1;
                    const canNext = currentPage < totalPages;
                    return (
                      <>
                        <button
                          className="h-8 px-2 rounded border text-xs disabled:opacity-50"
                          disabled={!canPrev}
                          onClick={() => setDemoPage((p) => Math.max(1, p - 1))}
                        >
                          <span className="sm:hidden">←</span>
                          <span className="hidden sm:inline">← Prev</span>
                        </button>
                        <span className="text-xs">
                          <span className="sm:hidden">{currentPage}/{totalPages}</span>
                          <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
                        </span>
                        <button
                          className="h-8 px-2 rounded border text-xs disabled:opacity-50"
                          disabled={!canNext}
                          onClick={() => setDemoPage((p) => Math.min(totalPages, p + 1))}
                        >
                          <span className="sm:hidden">→</span>
                          <span className="hidden sm:inline">Next →</span>
                        </button>
                        <label htmlFor="pageSize" className="text-xs text-muted-foreground ml-1 sm:ml-2">Rows</label>
                        <select
                          id="pageSize"
                          className="px-2 py-1 rounded border text-xs"
                          value={demoPageSize}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setDemoPageSize(next);
                            setDemoPage(1);
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Tip: You can edit the CWA values directly in this table and adjust the number of mentors above.</p>
            <div className="-mx-2 sm:mx-0 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="text-left border-b">
                  <th className="py-2 pr-3 w-[120px]">STUDENTID</th>
                  <th className="py-2 pr-3 w-[110px]">INDEXNO</th>
                  <th className="py-2 pr-3">NAME</th>
                  <th className="py-2 pr-3 w-[120px] text-right">CWA</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalPages = Math.ceil(students.length / demoPageSize) || 1;
                  const currentPage = Math.min(Math.max(1, demoPage), totalPages);
                  const start = (currentPage - 1) * demoPageSize;
                  const pageItems = students.slice(start, start + demoPageSize);
                  return pageItems.map((s, idx) => {
                    const globalIndex = start + idx;
                    return (
                      <tr key={s.studentId} className="border-b last:border-0 odd:bg-muted/40">
                        <td className="py-1 pr-3 font-mono whitespace-nowrap">{s.studentId}</td>
                        <td className="py-1 pr-3 font-mono whitespace-nowrap">{s.indexNo}</td>
                        <td className="py-1 pr-3">{s.name}</td>
                        <td className="py-1 pr-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            className="w-16 sm:w-20 px-1.5 py-1 border rounded text-right text-sm"
                            value={s.cwa}
                            onChange={(e) => updateStudentCwa(globalIndex, clampCwa(Number(e.target.value)))}
                          />
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            </div>
          </section>
        )}

        {step === "setup" && mode === "upload" && (
          <section className="border rounded p-5 flex flex-col gap-4">
            <div
              className={`border-2 border-dashed rounded p-6 sm:p-8 text-center transition ${isDragging ? "bg-muted/60" : "hover:bg-muted/40"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileChange(f);
              }}
            >
              <div className="text-sm mb-2">Upload Excel file</div>
              <label className="inline-block px-3 py-2 rounded border cursor-pointer hover:bg-muted">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                Choose file
              </label>
              <div className="mt-2 text-xs text-muted-foreground">.xlsx or .xls</div>
              {selectedFileName && (
                <div className="mt-3 text-xs">
                  <span className="px-2 py-1 rounded border bg-background">{selectedFileName}</span>
                  <button className="ml-2 underline" onClick={() => { setSelectedFileName(null); setStudents([]); setUploadErrors([]); }}>
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              <button className="underline" onClick={() => downloadTemplate(generateDemoStudents(36))}>Download template</button>
            </div>

            {(students.length > 0 || selectedFileName) && (
              <div className="flex items-center justify-center gap-3">
                <div className="text-sm text-muted-foreground">
                  {selectedFileName ? `File ready: ${selectedFileName}` : `${students.length} rows parsed`}
                </div>
                <button
                  className="px-3 py-2 rounded border hover:bg-muted"
                  onClick={() => setStep("preview")}
                >
                  View preview
                </button>
              </div>
            )}

            {uploadErrors.length > 0 && (
              <div className="border rounded p-2 bg-destructive/10">
                <div className="text-sm font-medium mb-1">Validation issues</div>
                <ul className="list-disc pl-5 text-sm">
                  {uploadErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {step === "preview" && mode === "upload" && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Preview</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded border hover:bg-muted" onClick={() => setStep("setup")}>← Back</button>
              </div>
            </div>

            {uploadErrors.length > 0 && (
              <div className="border rounded p-2 bg-destructive/10">
                <div className="text-sm font-medium mb-1">Validation issues</div>
                <ul className="list-disc pl-5 text-sm">
                  {uploadErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-auto">
              <div className="mb-2 text-sm font-medium">{students.length} students</div>
              <div className="-mx-2 sm:mx-0 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3 w-[120px]">STUDENTID</th>
                    <th className="py-2 pr-3 w-[110px]">INDEXNO</th>
                    <th className="py-2 pr-3">NAME</th>
                    <th className="py-2 pr-3 w-[120px] text-right">CWA</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.studentId} className="border-b last:border-0 odd:bg-muted/40">
                      <td className="py-1 pr-3 font-mono whitespace-nowrap">{s.studentId}</td>
                      <td className="py-1 pr-3 font-mono whitespace-nowrap">{s.indexNo}</td>
                      <td className="py-1 pr-3">{s.name}</td>
                      <td className="py-1 pr-3 text-right">{s.cwa.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </section>
        )}

        {step === "results" && result && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Pairing Results</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded border hover:bg-muted" onClick={() => setStep("setup")}>
                  ← Back to setup
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.assignments.map((a: MentorAssignment) => (
                <div key={a.mentorIndex} className="border rounded p-3">
                  <div className="flex items-center justify-between pb-2 border-b mb-2">
                    <div className="font-medium">Mentor {a.mentorIndex + 1}</div>
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const st = stats.find((s) => s.mentorIndex === a.mentorIndex);
                        if (!st) return null;
                        return (
                          <span>
                            {st.count} mentees • avg {st.averageCwa} • hi {st.highestCwa} • lo {st.lowestCwa}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="text-left border-b">
                          <th className="py-1 pr-2 w-[120px]">STUDENTID</th>
                          <th className="py-1 pr-2">NAME</th>
                          <th className="py-1 pr-2 w-[80px] text-right">CWA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.students.map((s) => (
                          <tr key={s.studentId} className="border-b last:border-0 odd:bg-muted/40">
                            <td className="py-1 pr-2 font-mono whitespace-nowrap">{s.studentId}</td>
                            <td className="py-1 pr-2">{s.name}</td>
                            <td className="py-1 pr-2 text-right">{s.cwa.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
