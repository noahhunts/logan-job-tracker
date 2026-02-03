import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// STRICT dental/3D printing keywords - must be in title or company
const REQUIRED_KEYWORDS = [
  'dental', 'dentist', 'dentistry', 'orthodont', 'prosthodont',
  '3shape', 'sprintray', 'medit', 'trios', 'itero', 'cerec',
  'intraoral', 'dental lab', 'dental tech', 'dental cad', 'dental cam',
  'crown and bridge', 'denture', 'implant planning'
]

// High priority keywords for Logan's specific skills
const HIGH_PRIORITY_KEYWORDS = [
  '3shape', 'sprintray', 'trios', 'medit', 'intraoral scanner',
  'digital workflow', 'dental trainer', 'clinical trainer', 'dental 3d'
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

    const allJobs: JobResult[] = []

    // Fetch from multiple sources with STRICT dental filtering
    const sources = await Promise.all([
      fetchRemoteOK(),
      fetchArbeitnow(),
      fetchHimalayas(),
      fetchJobicy(),
      fetchDentalPost(), // Dental-specific job board
    ])

    sources.forEach(jobs => allJobs.push(...jobs))

    let jobsAdded = 0

    for (const job of allJobs) {
      // Strict URL validation - must be a direct job link
      if (!isValidJobUrl(job.url)) {
        continue
      }

      // Check for duplicates
      const { data: existing } = await supabase
        .from('jobs')
        .select('id')
        .eq('url', job.url)
        .limit(1)

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from('jobs').insert([job])
        if (!error) jobsAdded++
      }
    }

    if (logEntry) {
      await supabase
        .from('scrape_logs')
        .update({ jobs_found: allJobs.length, jobs_added: jobsAdded, status: 'completed' })
        .eq('id', logEntry.id)
    }

    return NextResponse.json({
      success: true,
      jobsFound: allJobs.length,
      jobsAdded,
      message: `Found ${allJobs.length} dental jobs, added ${jobsAdded} new jobs.`
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// Validate URL is a direct job link, not a search page or generic careers page
function isValidJobUrl(url: string | undefined): boolean {
  if (!url || url.length < 30) return false

  const lowerUrl = url.toLowerCase()

  // Reject search/query pages
  if (lowerUrl.includes('?q=') || lowerUrl.includes('?search=') ||
      lowerUrl.includes('/search') || lowerUrl.includes('/q-')) {
    return false
  }

  // Reject generic career pages (must have specific job ID/slug after)
  const genericEndings = [
    '/jobs', '/careers', '/careers/', '/jobs/', '/openings', '/positions',
    '.com', '.org', '.net', '.io', '.ai', '.co'
  ]
  if (genericEndings.some(ending => lowerUrl.endsWith(ending))) {
    return false
  }

  // Must have a job-specific path segment (ID, slug, etc.)
  const jobPatterns = [
    /\/job\/[a-z0-9-]+/i,           // /job/some-job-id
    /\/jobs\/[a-z0-9-]+/i,          // /jobs/some-job-slug
    /\/view\/[a-z0-9-]+/i,          // LinkedIn /view/job-id
    /\/viewjob\?/i,                  // Indeed viewjob?jk=
    /\/position\/[a-z0-9-]+/i,       // /position/id
    /\/opening\/[a-z0-9-]+/i,        // /opening/id
    /\/[a-z]+-[a-z]+-\d+/i,          // slug-with-numbers-123
    /\/\d{5,}/                        // Numeric job ID 5+ digits
  ]

  return jobPatterns.some(pattern => pattern.test(url))
}

// STRICT check - keyword must be in title OR company name
function isDentalJob(title: string, company: string, description: string = ''): boolean {
  const titleLower = title.toLowerCase()
  const companyLower = company.toLowerCase()
  const descLower = description.toLowerCase()

  // Must have dental keyword in TITLE or COMPANY (not just description)
  const inTitleOrCompany = REQUIRED_KEYWORDS.some(kw =>
    titleLower.includes(kw.toLowerCase()) || companyLower.includes(kw.toLowerCase())
  )

  // Or have multiple keywords in description (more lenient for description)
  const keywordsInDesc = REQUIRED_KEYWORDS.filter(kw => descLower.includes(kw.toLowerCase()))
  const strongDescMatch = keywordsInDesc.length >= 2

  return inTitleOrCompany || strongDescMatch
}

function calculatePriority(title: string, company: string, description: string = ''): 'HIGH' | 'MEDIUM' | 'LOW' {
  const text = `${title} ${company} ${description}`.toLowerCase()
  const matches = HIGH_PRIORITY_KEYWORDS.filter(kw => text.includes(kw.toLowerCase()))
  if (matches.length >= 2) return 'HIGH'
  if (matches.length === 1) return 'MEDIUM'

  // Dental CAD/CAM or training roles are at least medium
  if (text.includes('cad') || text.includes('trainer') || text.includes('workflow')) return 'MEDIUM'
  return 'LOW'
}

function generateNotes(title: string, company: string, description: string = ''): string {
  const text = `${title} ${company} ${description}`.toLowerCase()
  const matches = HIGH_PRIORITY_KEYWORDS.filter(kw => text.includes(kw.toLowerCase()))
  if (matches.length > 0) {
    return `Skills match: ${matches.join(', ')}. Auto-discovered.`
  }
  return 'Auto-discovered dental job. Review for fit.'
}

// RemoteOK - search specifically for dental
async function fetchRemoteOK(): Promise<JobResult[]> {
  try {
    const response = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'LoganJobTracker/1.0' }
    })
    if (!response.ok) return []

    const data = await response.json()
    const jobs: JobResult[] = []

    for (const job of data.slice(1)) {
      if (!job.position || !job.company || !job.url) continue

      const desc = job.description || ''
      if (!isDentalJob(job.position, job.company, desc)) continue

      jobs.push({
        title: job.position,
        company: job.company,
        url: job.url,
        location: job.location || 'Remote',
        salary: job.salary_min && job.salary_max ? `$${job.salary_min}-$${job.salary_max}` : 'Not disclosed',
        remote: 'Yes',
        priority: calculatePriority(job.position, job.company, desc),
        notes: generateNotes(job.position, job.company, desc),
        source: 'remoteok.com',
        date_found: new Date().toISOString().split('T')[0],
        status: 'New'
      })
    }
    return jobs
  } catch (e) {
    console.error('RemoteOK error:', e)
    return []
  }
}

// Arbeitnow - search with dental keywords
async function fetchArbeitnow(): Promise<JobResult[]> {
  try {
    const searches = ['dental', 'dentist', '3d+printing+medical', 'orthodont']
    const jobs: JobResult[] = []

    for (const search of searches) {
      const response = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${search}`)
      if (!response.ok) continue

      const data = await response.json()
      for (const job of (data.data || [])) {
        if (!job.title || !job.company_name || !job.url) continue
        if (!isDentalJob(job.title, job.company_name, job.description || '')) continue

        jobs.push({
          title: job.title,
          company: job.company_name,
          url: job.url,
          location: job.location || 'Remote',
          salary: 'Not disclosed',
          remote: job.remote ? 'Yes' : 'Check listing',
          priority: calculatePriority(job.title, job.company_name, job.description || ''),
          notes: generateNotes(job.title, job.company_name, job.description || ''),
          source: 'arbeitnow.com',
          date_found: new Date().toISOString().split('T')[0],
          status: 'New'
        })
      }
    }
    return jobs
  } catch (e) {
    console.error('Arbeitnow error:', e)
    return []
  }
}

// Himalayas - filter for dental
async function fetchHimalayas(): Promise<JobResult[]> {
  try {
    // Search multiple pages with dental-related queries
    const jobs: JobResult[] = []

    for (const query of ['dental', 'dentist', 'orthodontist']) {
      const response = await fetch(`https://himalayas.app/jobs/api?limit=50&q=${query}`)
      if (!response.ok) continue

      const data = await response.json()
      for (const job of (data.jobs || [])) {
        if (!job.title || !job.companyName || !job.applicationLink) continue
        if (!isDentalJob(job.title, job.companyName, job.description || '')) continue

        jobs.push({
          title: job.title,
          company: job.companyName,
          url: job.applicationLink,
          location: job.locationRestrictions?.join(', ') || 'Remote',
          salary: job.minSalary && job.maxSalary ? `$${job.minSalary}-$${job.maxSalary}` : 'Not disclosed',
          remote: 'Yes',
          priority: calculatePriority(job.title, job.companyName, job.description || ''),
          notes: generateNotes(job.title, job.companyName, job.description || ''),
          source: 'himalayas.app',
          date_found: new Date().toISOString().split('T')[0],
          status: 'New'
        })
      }
    }
    return jobs
  } catch (e) {
    console.error('Himalayas error:', e)
    return []
  }
}

// Jobicy - medical/health category
async function fetchJobicy(): Promise<JobResult[]> {
  try {
    const response = await fetch('https://jobicy.com/api/v2/remote-jobs?count=100&industry=medical-health')
    if (!response.ok) return []

    const data = await response.json()
    const jobs: JobResult[] = []

    for (const job of (data.jobs || [])) {
      if (!job.jobTitle || !job.companyName || !job.url) continue
      if (!isDentalJob(job.jobTitle, job.companyName, job.jobDescription || '')) continue

      jobs.push({
        title: job.jobTitle,
        company: job.companyName,
        url: job.url,
        location: job.jobGeo || 'Remote',
        salary: job.annualSalaryMin && job.annualSalaryMax
          ? `$${job.annualSalaryMin}-$${job.annualSalaryMax}` : 'Not disclosed',
        remote: 'Yes',
        priority: calculatePriority(job.jobTitle, job.companyName, job.jobDescription || ''),
        notes: generateNotes(job.jobTitle, job.companyName, job.jobDescription || ''),
        source: 'jobicy.com',
        date_found: new Date().toISOString().split('T')[0],
        status: 'New'
      })
    }
    return jobs
  } catch (e) {
    console.error('Jobicy error:', e)
    return []
  }
}

// DentalPost RSS feed - dental-specific job board
async function fetchDentalPost(): Promise<JobResult[]> {
  try {
    // DentalPost doesn't have a public API, but we can try their job listings page
    // This is a placeholder - in production, you'd need to set up proper scraping
    // or use a service like ScrapingBee/Browserless

    // For now, we'll rely on the other sources with strict filtering
    return []
  } catch (e) {
    console.error('DentalPost error:', e)
    return []
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
