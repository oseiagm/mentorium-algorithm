import type { Student, AssignmentResult } from "@/lib/utils"

// Type declaration for jsPDF with autoTable extension
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: {
      startY?: number;
      head?: string[][];
      body?: string[][];
      theme?: string;
      headStyles?: { fillColor?: number[] };
      styles?: { fontSize?: number };
      columnStyles?: Record<number, { cellWidth?: number; halign?: string }>;
    }) => void;
    lastAutoTable: { finalY: number };
  }
}

// Dynamic import helpers to keep initial bundle small
async function getXlsx() {
  const xlsx = await import("xlsx")
  return xlsx
}

export type ParseResult = {
  students: Student[]
  errors: string[]
}

const REQUIRED_HEADERS = ["STUDENTID", "INDEXNO", "NAME", "CWA"] as const

export async function parseStudentsFromFile(file: File): Promise<ParseResult> {
  const xlsx = await getXlsx()
  const data = await file.arrayBuffer()
  const workbook = xlsx.read(data)
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { students: [], errors: ["No sheets found in file"] }
  const sheet = workbook.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  const errors: string[] = []
  if (rows.length === 0) {
    return { students: [], errors: ["Sheet is empty"] }
  }

  // Validate required headers by checking the first row keys
  const first = rows[0] as Record<string, unknown>
  for (const h of REQUIRED_HEADERS) {
    if (!(h in first)) {
      errors.push(`Missing required column: ${h}`)
    }
  }

  const students: Student[] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Record<string, unknown>
    const rowNum = i + 2 // header assumed at row 1
    const studentId = String(r["STUDENTID"]).trim()
    const indexNo = String(r["INDEXNO"]).trim()
    const name = String(r["NAME"]).trim()
    const cwaRaw = r["CWA"]
    const cwa = Number.parseFloat(String(cwaRaw))

    if (!/^\d{8}$/.test(studentId)) {
      errors.push(`Row ${rowNum}: STUDENTID must be 8 digits`)
    }
    if (!/^\d{7}$/.test(indexNo)) {
      errors.push(`Row ${rowNum}: INDEXNO must be 7 digits`)
    }
    if (!name) {
      errors.push(`Row ${rowNum}: NAME is required`)
    }
    if (!Number.isFinite(cwa) || cwa < 0 || cwa > 100) {
      errors.push(`Row ${rowNum}: CWA must be a number between 0 and 100`)
    }

    students.push({ studentId, indexNo, name, cwa: Number(cwa.toFixed(2)) })
  }

  return { students, errors }
}

export async function downloadTemplate(students?: Student[]) {
  const xlsx = await getXlsx()
  const data = (students ?? []).map((s) => ({
    STUDENTID: s.studentId,
    INDEXNO: s.indexNo,
    NAME: s.name,
    CWA: s.cwa,
  }))
  const headerOnly = data.length === 0
  const ws = xlsx.utils.json_to_sheet(headerOnly ? [{ STUDENTID: "", INDEXNO: "", NAME: "", CWA: "" }] : data)
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, "Students")
  const out = xlsx.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "mentorium-template.xlsx"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Export functions for pairing results
export async function exportResultsToExcel(result: AssignmentResult, filename?: string) {
  const xlsx = await getXlsx()
  
  // Create workbook
  const wb = xlsx.utils.book_new()
  
  // Create summary sheet
  const summaryData = result.assignments.map((assignment) => ({
    "Mentor": `Mentor ${assignment.mentorIndex + 1}`,
    "Number of Students": assignment.students.length,
    "Average CWA": assignment.students.length > 0 
      ? (assignment.students.reduce((sum, s) => sum + s.cwa, 0) / assignment.students.length).toFixed(2)
      : "0.00",
    "Highest CWA": assignment.students.length > 0 
      ? Math.max(...assignment.students.map(s => s.cwa)).toFixed(2)
      : "0.00",
    "Lowest CWA": assignment.students.length > 0 
      ? Math.min(...assignment.students.map(s => s.cwa)).toFixed(2)
      : "0.00"
  }))
  
  const summaryWs = xlsx.utils.json_to_sheet(summaryData)
  xlsx.utils.book_append_sheet(wb, summaryWs, "Summary")
  
  // Create detailed sheet with all assignments
  const detailedData: Array<{
    Mentor: string;
    "Student ID": string;
    "Index No": string;
    Name: string;
    CWA: number;
  }> = []
  result.assignments.forEach((assignment) => {
    assignment.students.forEach((student) => {
      detailedData.push({
        "Mentor": `Mentor ${assignment.mentorIndex + 1}`,
        "Student ID": student.studentId,
        "Index No": student.indexNo,
        "Name": student.name,
        "CWA": student.cwa
      })
    })
  })
  
  const detailedWs = xlsx.utils.json_to_sheet(detailedData)
  xlsx.utils.book_append_sheet(wb, detailedWs, "Detailed Assignments")
  
  // Create individual mentor sheets
  result.assignments.forEach((assignment) => {
    const mentorData = assignment.students.map(student => ({
      "Student ID": student.studentId,
      "Index No": student.indexNo,
      "Name": student.name,
      "CWA": student.cwa
    }))
    
    const mentorWs = xlsx.utils.json_to_sheet(mentorData)
    xlsx.utils.book_append_sheet(wb, mentorWs, `Mentor ${assignment.mentorIndex + 1}`)
  })
  
  // Generate and download file
  const out = xlsx.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename || `mentorium-results-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportResultsToPDF(result: AssignmentResult, filename?: string) {
  try {
    // Import jsPDF and autoTable
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    
    // Create new PDF document
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(20)
    doc.text("Mentorium Pairing Results", 14, 22)
    
    // Add generation date
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
    
    let yPosition = 40
    
    // Add summary table
    doc.setFontSize(14)
    doc.text("Summary", 14, yPosition)
    yPosition += 10
    
    const summaryData = result.assignments.map((assignment) => [
      `Mentor ${assignment.mentorIndex + 1}`,
      assignment.students.length.toString(),
      assignment.students.length > 0 
        ? (assignment.students.reduce((sum, s) => sum + s.cwa, 0) / assignment.students.length).toFixed(2)
        : "0.00",
      assignment.students.length > 0 
        ? Math.max(...assignment.students.map(s => s.cwa)).toFixed(2)
        : "0.00",
      assignment.students.length > 0 
        ? Math.min(...assignment.students.map(s => s.cwa)).toFixed(2)
        : "0.00"
    ])
    
    // Add summary table using autoTable
    autoTable(doc, {
      startY: yPosition,
      head: [["Mentor", "Students", "Avg CWA", "Highest CWA", "Lowest CWA"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [19, 197, 107] },
      styles: { fontSize: 10 }
    })
    
    yPosition = doc.lastAutoTable.finalY + 20
    
    // Add detailed assignments for each mentor
    result.assignments.forEach((assignment) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setFontSize(12)
      doc.text(`Mentor ${assignment.mentorIndex + 1} - ${assignment.students.length} students`, 14, yPosition)
      yPosition += 10
      
      if (assignment.students.length > 0) {
        const mentorData = assignment.students.map(student => [
          student.studentId,
          student.indexNo,
          student.name,
          student.cwa.toFixed(2)
        ])
        
        autoTable(doc, {
          startY: yPosition,
          head: [["Student ID", "Index No", "Name", "CWA"]],
          body: mentorData,
          theme: "grid",
          headStyles: { fillColor: [19, 197, 107] },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 60 },
            3: { cellWidth: 20, halign: 'right' }
          }
        })
        
        yPosition = doc.lastAutoTable.finalY + 15
      } else {
        doc.setFontSize(10)
        doc.text("No students assigned", 14, yPosition)
        yPosition += 15
      }
    })
    
    // Generate and download file
    const pdfBlob = doc.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename || `mentorium-results-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    
    console.log("PDF generated successfully")
  } catch (error) {
    console.error("PDF export error:", error)
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


