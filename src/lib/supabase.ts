import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (lazy initialization)
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin should only be used on the server')
  }
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type Job = {
  id: number
  title: string
  company: string
  url: string
  location: string
  salary: string
  remote: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  notes: string
  source: string
  date_found: string
  resume_created: boolean
  submitted: boolean
  date_submitted: string | null
  heard_back: boolean
  date_heard_back: string | null
  status: string
  created_at: string
  updated_at: string
}

export type Resume = {
  id: number
  name: string
  target_role: string
  file_url: string | null
  file_name: string | null
  notes: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: Job
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>
      }
      resumes: {
        Row: Resume
        Insert: Omit<Resume, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Resume, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
