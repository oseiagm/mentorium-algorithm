import type { Student } from "@/lib/utils"

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


