import * as XLSX from 'xlsx'
import { supabase } from './api'

export interface StudentExcelRow {
  NIM: string
  Name: string
  Email: string
  WhatsApp: string
  Program: string
  Year: number
  FeeProfile: string
}

/**
 * Validates and parses the uploaded Excel file.
 * Returns array of validated records and any duplicate/invalid rows.
 */
export async function parseStudentExcel(file: File): Promise<{ valid: StudentExcelRow[], errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json: any[] = XLSX.utils.sheet_to_json(worksheet)
        
        const valid: StudentExcelRow[] = []
        const errors: string[] = []

        // Extract NIMs for duplication check
        const nims = json.map(r => String(r.NIM).trim())
        
        // Query DB for existing NIMs
        const { data: existingStudents, error } = await supabase
          .from('students')
          .select('nim')
          .in('nim', nims)
          
        if (error) throw error
        const existingNims = new Set(existingStudents?.map(s => s.nim) || [])
        
        // Local duplicate check
        const processedNims = new Set<string>()

        json.forEach((row, idx) => {
          const nim = String(row.NIM || '').trim()
          const rowNum = idx + 2 // +1 for 0-index, +1 for header
          
          if (!nim) {
            errors.push(`Row ${rowNum}: Missing NIM`)
            return
          }
          if (processedNims.has(nim)) {
            errors.push(`Row ${rowNum}: Duplicate NIM in Excel file (${nim})`)
            return
          }
          if (existingNims.has(nim)) {
            errors.push(`Row ${rowNum}: NIM already exists in database (${nim})`)
            return
          }

          processedNims.add(nim)
          valid.push({
            NIM: nim,
            Name: String(row.Name || '').trim(),
            Email: String(row.Email || '').trim(),
            WhatsApp: String(row.WhatsApp || '').trim(),
            Program: String(row.Program || '').trim(),
            Year: Number(row.Year),
            FeeProfile: String(row.FeeProfile || '').trim()
          })
        })

        resolve({ valid, errors })
      } catch (err) {
        reject(err)
      }
    }
    
    reader.onerror = (err) => reject(err)
    reader.readAsBinaryString(file)
  })
}

/**
 * Generates and downloads the Excel template for importing students.
 */
export function downloadExcelTemplate() {
  const ws = XLSX.utils.json_to_sheet([
    {
      NIM: '2301001',
      Name: 'Fulan bin Fulan',
      Email: 'fulan@stiqzad.ac.id',
      WhatsApp: '081234567890',
      Program: 'S1 Ilmu Al-Quran dan Tafsir',
      Year: 2023,
      FeeProfile: 'a718d721-a3f8-45be-a827-04664c3c39f0' // Placeholder UUID for fee profile, we can change to Name later if needed
    }
  ])

  // Adjust column widths
  ws['!cols'] = [
    { wch: 15 }, // NIM
    { wch: 30 }, // Name
    { wch: 25 }, // Email
    { wch: 15 }, // WhatsApp
    { wch: 30 }, // Program
    { wch: 10 }, // Year
    { wch: 40 }, // FeeProfile
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Mahasiswa')
  
  XLSX.writeFile(wb, 'Template_Import_Mahasiswa.xlsx')
}
