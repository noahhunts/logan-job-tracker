import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Keywords to search for dental/3D printing jobs
const DENTAL_KEYWORDS = [
  'dental', '3d printing', 'cad', 'cam', '3shape', 'intraoral', 'scanner',
  'digital workflow', 'dental lab', 'prosthodontic', 'orthodontic'
]

// Keywords that indicate high priority for Logan's skillset
const HIGH_PRIORITY_KEYWORDS = [
  '3shape', 'sprintray', 'trios', 'medit', 'intraoral scanner', 'dental 3d',
  'digital workflow', 'dental trainer', 'clinical trainer'
]

type JobResult = {
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
  status: string
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: logEntry } = await supabase
      .from('scrape_logs')
      .insert([{ source: 'automated_cron', status: 'running' }])
      .select()
      .single()

    // Fetch jobs from multiple free sources
    const allJobs: JobResult[] = []

    // 1. RemoteOK API (free, no auth required)
    const remoteOkJobs = await fetchRemoteOK()
    allJobs.push(...remoteOkJobs)

    // 2. Arbeitnow API (free remote jobs)
    const arbeitnowJobs = await fetchArbeitnow()
    allJobs.push(...arbeitnowJobs)

    // 3. Himalayas API (remote jobs)
    const himalayasJobs = await fetchHimalayas()
    allJobs.push(...himalayasJobs)

    // 4. Jobicy RSS/API (remote jobs)
    const jobicyJobs = await fetchJobicy()
    allJobs.push(...jobicyJobs)

    let jobsAdded = 0

    for (const job of allJobs) {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('jobs')
        .select('id')
        .or(`url.eq.${job.url},and(title.ilike.%${job.title.substring(0, 30)}%,company.ilike.%${job.company}%)`)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('jobs').insert([job])
        jobsAdded++
      }
    }

    if (logEntry) {
      await supabase
        .from('scrape_logs')
        .update({
          jobs_found: allJobs.length,
          jobs_added: jobsAdded,
          status: 'completed'
        })
        .eq('id', logEntry.id)
    }

    return NextResponse.json({
      success: true,
      jobsFound: allJobs.length,
      jobsAdded,
      sources: {
        remoteOk: remoteOkJobs.length,
        arbeitnow: arbeitnowJobs.length,
        himalayas: himalayasJobs.length,
        jobicy: jobicyJobs.length
      },
      message: `Scrape completed. Found ${allJobs.length} dental/3D printing jobs, added ${jobsAdded} new jobs.`
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json({ success: false, error: 'Scrape failed', details: String(error) }, { status: 500 })
  }
}

function isDentalOrRelevant(title: string, description: string = '', tags: string[] = []): boolean {
  const searchText = `${title} ${description} ${tags.join(' ')}`.toLowerCase()
  return DENTAL_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()))
}

function calculatePriority(title: string, description: string = '', tags: string[] = []): 'HIGH' | 'MEDIUM' | 'LOW' {
  const searchText = `${title} ${description} ${tags.join(' ')}`.toLowerCase()
  const matchCount = HIGH_PRIORITY_KEYWORDS.filter(kw => searchText.includes(kw.toLowerCase())).length
  if (matchCount >= 2) return 'HIGH'
  if (matchCount === 1) return 'MEDIUM'
  return 'LOW'
}

function generateNotes(title: string, description: string = '', tags: string[] = []): string {
  const searchText = `${title} ${description} ${tags.join(' ')}`.toLowerCase()
  const matches = HIGH_PRIORITY_KEYWORDS.filter(kw => searchText.includes(kw.toLowerCase()))
  if (matches.length > 0) {
    return `Matches Logan's skills: ${matches.join(', ')}. Auto-discovered.`
  }
  return 'Auto-discovered from job search. Review for fit.'
}

// RemoteOK API - Free, no auth
async function fetchRemoteOK(): Promise<JobResult[]> {
  try {
    const response = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'LoganJobTracker/1.0' }
    })
    if (!response.ok) return []

    const data = await response.json()
    const jobs: JobResult[] = []

    for (const job of data.slice(1, 100)) { // First item is metadata
      if (!job.position || !job.company) continue

      const tags = job.tags || []
      const description = job.description || ''

      // Filter for dental/medical/3D printing related jobs
      if (isDentalOrRelevant(job.position, description, tags) ||
          tags.some((t: string) => ['3d', 'cad', 'medical', 'healthcare', 'design'].includes(t.toLowerCase()))) {
        jobs.push({
          title: job.position,
          company: job.company,
          url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
          location: job.location || 'Remote',
          salary: job.salary_min && job.salary_max ? `$${job.salary_min}-$${job.salary_max}` : 'Not disclosed',
          remote: 'Yes',
          priority: calculatePriority(job.position, description, tags),
          notes: generateNotes(job.position, description, tags),
          source: 'remoteok.com',
          date_found: new Date().toISOString().split('T')[0],
          status: 'New'
        })
      }
    }
    return jobs
  } catch (e) {
    console.error('RemoteOK fetch error:', e)
    return []
  }
}

// Arbeitnow API - Free remote jobs
async function fetchArbeitnow(): Promise<JobResult[]> {
  try {
    const searches = ['dental', '3d+printing', 'cad+designer', 'medical+device']
    const jobs: JobResult[] = []

    for (const search of searches) {
      const response = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${search}`)
      if (!response.ok) continue

      const data = await response.json()

      for (const job of (data.data || []).slice(0, 20)) {
        if (!job.title || !job.company_name) continue

        if (isDentalOrRelevant(job.title, job.description || '', job.tags || [])) {
          jobs.push({
            title: job.title,
            company: job.company_name,
            url: job.url || '',
            location: job.location || 'Remote',
            salary: 'Not disclosed',
            remote: job.remote ? 'Yes' : 'Check listing',
            priority: calculatePriority(job.title, job.description || '', job.tags || []),
            notes: generateNotes(job.title, job.description || '', job.tags || []),
            source: 'arbeitnow.com',
            date_found: new Date().toISOString().split('T')[0],
            status: 'New'
          })
        }
      }
    }
    return jobs
  } catch (e) {
    console.error('Arbeitnow fetch error:', e)
    return []
  }
}

// Himalayas API - Remote jobs
async function fetchHimalayas(): Promise<JobResult[]> {
  try {
    const response = await fetch('https://himalayas.app/jobs/api?limit=100')
    if (!response.ok) return []

    const data = await response.json()
    const jobs: JobResult[] = []

    for (const job of (data.jobs || [])) {
      if (!job.title || !job.companyName) continue

      const categories = job.categories || []
      const description = job.description || ''

      if (isDentalOrRelevant(job.title, description, categories) ||
          categories.some((c: string) => ['Healthcare', 'Medical', 'Design', 'Engineering'].includes(c))) {
        jobs.push({
          title: job.title,
          company: job.companyName,
          url: job.applicationLink || `https://himalayas.app/jobs/${job.slug}`,
          location: job.locationRestrictions?.join(', ') || 'Remote Worldwide',
          salary: job.minSalary && job.maxSalary ? `$${job.minSalary}-$${job.maxSalary}` : 'Not disclosed',
          remote: 'Yes',
          priority: calculatePriority(job.title, description, categories),
          notes: generateNotes(job.title, description, categories),
          source: 'himalayas.app',
          date_found: new Date().toISOString().split('T')[0],
          status: 'New'
        })
      }
    }
    return jobs
  } catch (e) {
    console.error('Himalayas fetch error:', e)
    return []
  }
}

// Jobicy API - Remote jobs focused
async function fetchJobicy(): Promise<JobResult[]> {
  try {
    const response = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50&industry=medical-health')
    if (!response.ok) return []

    const data = await response.json()
    const jobs: JobResult[] = []

    for (const job of (data.jobs || [])) {
      if (!job.jobTitle || !job.companyName) continue

      if (isDentalOrRelevant(job.jobTitle, job.jobDescription || '', [])) {
        jobs.push({
          title: job.jobTitle,
          company: job.companyName,
          url: job.url || '',
          location: job.jobGeo || 'Remote',
          salary: job.annualSalaryMin && job.annualSalaryMax
            ? `$${job.annualSalaryMin}-$${job.annualSalaryMax}`
            : 'Not disclosed',
          remote: 'Yes',
          priority: calculatePriority(job.jobTitle, job.jobDescription || '', []),
          notes: generateNotes(job.jobTitle, job.jobDescription || '', []),
          source: 'jobicy.com',
          date_found: new Date().toISOString().split('T')[0],
          status: 'New'
        })
      }
    }
    return jobs
  } catch (e) {
    console.error('Jobicy fetch error:', e)
    return []
  }
}

// Manual trigger endpoint
export async function POST(request: NextRequest) {
  return GET(request)
}
