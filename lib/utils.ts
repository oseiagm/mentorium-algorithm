import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Domain types
export type Student = {
  studentId: string
  indexNo: string
  name: string
  cwa: number
}

export type MentorAssignment = {
  mentorIndex: number
  students: Student[]
}

export type AssignmentResult = {
  assignments: MentorAssignment[]
  passes: Array<"forward" | "backward">
}

// Algorithm: Bidirectional Score-Based Round Robin
export function assignStudentsBidirectional(
  students: Student[],
  numMentors: number
): AssignmentResult {
  if (!Number.isInteger(numMentors) || numMentors <= 0) {
    throw new Error("numMentors must be a positive integer")
  }
  const cleaned = students
    .filter((s) => Number.isFinite(s.cwa))
    .map((s) => ({ ...s, cwa: Number(s.cwa) }))
  const sorted = [...cleaned].sort((a, b) => b.cwa - a.cwa)

  const assignments: MentorAssignment[] = Array.from({ length: numMentors }, (_, i) => ({
    mentorIndex: i,
    students: [],
  }))

  const passes: Array<"forward" | "backward"> = []
  let direction: "forward" | "backward" = "forward"
  let i = 0
  while (i < sorted.length) {
    passes.push(direction)
    if (direction === "forward") {
      for (let m = 0; m < numMentors && i < sorted.length; m++) {
        assignments[m].students.push(sorted[i++])
      }
      direction = "backward"
    } else {
      for (let m = numMentors - 1; m >= 0 && i < sorted.length; m--) {
        assignments[m].students.push(sorted[i++])
      }
      direction = "forward"
    }
  }

  return { assignments, passes }
}

// Stats per mentor
export function getMentorStats(assignments: MentorAssignment[]) {
  return assignments.map((a) => {
    const count = a.students.length
    const avg = count
      ? a.students.reduce((sum, s) => sum + s.cwa, 0) / count
      : 0
    const highest = count ? Math.max(...a.students.map((s) => s.cwa)) : 0
    const lowest = count ? Math.min(...a.students.map((s) => s.cwa)) : 0
    return {
      mentorIndex: a.mentorIndex,
      count,
      averageCwa: Number(avg.toFixed(2)),
      highestCwa: highest,
      lowestCwa: lowest,
    }
  })
}

// Demo data generator
// Curated Ghanaian first names (common and realistic)
const femaleFirstNames = [
  "Ama","Akosua","Esi","Abena","Afua","Adwoa","Akua","Yaa","Araba","Afriyie","Serwaa","Abigail","Beatrice","Comfort","Dorcas","Evelyn"
]
const maleFirstNames = [
  "Kofi","Yaw","Kwame","Kojo","Kwesi","Kwaku","Kwabena","Paa","Ebo","Nii","Daniel","Francis","Michael","Samuel","Emmanuel","Peter"
]
const ghLastNames = [
  "Mensah","Owusu","Boateng","Acheampong","Adjei","Osei","Asante","Appiah","Addo","Ankrah",
  "Nkrumah","Arthur","Annor","Forson","Amoah","Opoku","Agyei","Frimpong","Obeng","Amponsah"
]

// Middle name pools (split by gender to avoid mismatches like "Kwaku" for girls)
const maleMiddleNames = [
  "Kwaku","Kwabena","Yaw","Kofi","Kojo","Kwesi","Kweku","Mensah","Nana","Yawson"
]
const femaleMiddleNames = [
  "Akua","Adwoa","Afua","Abena","Esi","Yaa","Serwaa","Efua","Mansa","Ama","Araba"
]

function pickMiddleDifferent(firstName: string, seed: number, pool: string[]): string | null {
  const len = pool.length
  for (let i = 0; i < len; i++) {
    const idx = (seed + i) % len
    const candidate = pool[idx]
    if (candidate.toLowerCase() !== firstName.toLowerCase()) {
      return candidate
    }
  }
  return null
}

function randomMaleName(seed: number) {
  const ln = ghLastNames[seed % ghLastNames.length]
  const fn = maleFirstNames[seed % maleFirstNames.length]
  const hasMiddle = (seed % 3) === 0 // roughly 1/3 will have a middle name
  const pick = hasMiddle ? pickMiddleDifferent(fn, seed, maleMiddleNames) : null
  const mn = pick ? ` ${pick}` : ""
  return `${ln}, ${fn}${mn}`
}

function randomFemaleName(seed: number) {
  const ln = ghLastNames[seed % ghLastNames.length]
  const fn = femaleFirstNames[seed % femaleFirstNames.length]
  const hasMiddle = (seed % 2) === 0 // roughly 1/2 will have a middle name
  const pick = hasMiddle ? pickMiddleDifferent(fn, seed + 5, femaleMiddleNames) : null
  const mn = pick ? ` ${pick}` : ""
  return `${ln}, ${fn}${mn} (Miss)`
}

// Note: randomName kept previously is unused; removed to satisfy lint rules.

export function generateDemoStudents(count = 36): Student[] {
  const students: Student[] = []
  const numFemales = Math.floor(count / 2)
  const numMales = count - numFemales

  const pool: { name: string; seed: number }[] = []
  for (let i = 0; i < numFemales; i++) {
    pool.push({ name: randomFemaleName(i), seed: i })
  }
  for (let i = 0; i < numMales; i++) {
    const s = i + 1000 // offset seeds to vary
    pool.push({ name: randomMaleName(s), seed: s })
  }

  // Shuffle to avoid strict alternation while keeping balanced counts
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  for (let i = 0; i < count; i++) {
    const studentId = String(10000000 + i)
    const indexNo = String(2000000 + i)
    const name = pool[i % pool.length].name
    const cwa = Number((50 + Math.random() * 50).toFixed(2))
    students.push({ studentId, indexNo, name, cwa })
  }
  return students
}

// Excel helpers will be added later using xlsx
