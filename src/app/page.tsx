'use client'

import { useEffect, useState } from 'react'
import { supabase, Job, Resume } from '@/lib/supabase'

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'jobs' | 'resumes' | 'analytics'>('jobs')
  const [filters, setFilters] = useState({ priority: 'all', status: 'all', remote: 'all', search: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)
  const [generateResumeFor, setGenerateResumeFor] = useState<Job | null>(null)

  useEffect(() => {
    fetchJobs()
    fetchResumes()
  }, [])

  const fetchJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('priority', { ascending: true }).order('date_found', { ascending: false })
    if (data) setJobs(data)
    setLoading(false)
  }

  const fetchResumes = async () => {
    const { data } = await supabase.from('resumes').select('*').order('created_at', { ascending: false })
    if (data) setResumes(data)
  }

  const updateJob = async (id: number, updates: Partial<Job>) => {
    const { error } = await supabase.from('jobs').update(updates).eq('id', id)
    if (!error) setJobs(jobs.map(j => j.id === id ? { ...j, ...updates } : j))
  }

  const deleteJob = async (id: number) => {
    if (!confirm('Delete this job?')) return
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (!error) setJobs(jobs.filter(j => j.id !== id))
  }

  const addJob = async (job: Partial<Job>) => {
    const { data } = await supabase.from('jobs').insert([job]).select()
    if (data) { setJobs([data[0], ...jobs]); setShowAddModal(false) }
  }

  const addResume = async (resume: Partial<Resume>) => {
    const { data } = await supabase.from('resumes').insert([resume]).select()
    if (data) { setResumes([data[0], ...resumes]); setShowResumeModal(false) }
  }

  const deleteResume = async (id: number) => {
    if (!confirm('Delete this resume?')) return
    const { error } = await supabase.from('resumes').delete().eq('id', id)
    if (!error) setResumes(resumes.filter(r => r.id !== id))
  }

  const filteredJobs = jobs.filter(job => {
    if (filters.priority !== 'all' && job.priority !== filters.priority) return false
    if (filters.status === 'submitted' && !job.submitted) return false
    if (filters.status === 'heard-back' && !job.heard_back) return false
    if (filters.status === 'new' && (job.submitted || job.heard_back)) return false
    if (filters.remote === 'yes' && job.remote !== 'Yes') return false
    if (filters.remote === 'hybrid' && job.remote !== 'Hybrid') return false
    if (filters.search && !job.title.toLowerCase().includes(filters.search.toLowerCase()) && !job.company.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: jobs.length,
    highPriority: jobs.filter(j => j.priority === 'HIGH').length,
    submitted: jobs.filter(j => j.submitted).length,
    heardBack: jobs.filter(j => j.heard_back).length,
    resumesReady: jobs.filter(j => j.resume_created).length,
    needResume: jobs.filter(j => !j.resume_created && j.priority === 'HIGH').length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-2xl text-white font-light animate-pulse">Loading your job tracker...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Logan&apos;s Job Tracker</h1>
              <p className="text-blue-300 text-lg">Dental 3D Printing & Digital Workflow Specialist</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-white">{stats.total}</div>
              <div className="text-blue-300">Total Opportunities</div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon="🎯" label="High Priority" value={stats.highPriority} color="from-red-500 to-pink-500" />
            <StatCard icon="📄" label="Need Resume" value={stats.needResume} color="from-amber-500 to-orange-500" />
            <StatCard icon="✅" label="Resumes Ready" value={stats.resumesReady} color="from-emerald-500 to-green-500" />
            <StatCard icon="📨" label="Submitted" value={stats.submitted} color="from-blue-500 to-cyan-500" />
            <StatCard icon="💬" label="Heard Back" value={stats.heardBack} color="from-purple-500 to-violet-500" />
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {(['jobs', 'resumes', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-xl font-semibold text-sm uppercase tracking-wide transition-all ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-lg shadow-white/20'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {tab === 'jobs' ? `Jobs (${filteredJobs.length})` : tab === 'resumes' ? `Resumes (${resumes.length})` : 'Analytics'}
            </button>
          ))}
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <>
            {/* Filters */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
              <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} className="px-4 py-2.5 bg-white/20 text-white rounded-xl border-0 focus:ring-2 focus:ring-white/50">
                <option value="all" className="text-slate-900">All Priorities</option>
                <option value="HIGH" className="text-slate-900">🔴 High</option>
                <option value="MEDIUM" className="text-slate-900">🟡 Medium</option>
                <option value="LOW" className="text-slate-900">⚪ Low</option>
              </select>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2.5 bg-white/20 text-white rounded-xl border-0 focus:ring-2 focus:ring-white/50">
                <option value="all" className="text-slate-900">All Status</option>
                <option value="new" className="text-slate-900">New</option>
                <option value="submitted" className="text-slate-900">Submitted</option>
                <option value="heard-back" className="text-slate-900">Heard Back</option>
              </select>
              <select value={filters.remote} onChange={e => setFilters({ ...filters, remote: e.target.value })} className="px-4 py-2.5 bg-white/20 text-white rounded-xl border-0 focus:ring-2 focus:ring-white/50">
                <option value="all" className="text-slate-900">All Locations</option>
                <option value="yes" className="text-slate-900">🏠 Remote</option>
                <option value="hybrid" className="text-slate-900">🔄 Hybrid</option>
              </select>
              <input
                type="text"
                placeholder="Search jobs or companies..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 min-w-[200px] px-4 py-2.5 bg-white/20 text-white placeholder-white/60 rounded-xl border-0 focus:ring-2 focus:ring-white/50"
              />
              <button onClick={() => setShowAddModal(true)} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all">
                + Add Job
              </button>
            </div>

            {/* Job Cards */}
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onUpdate={updateJob}
                  onDelete={deleteJob}
                  onGenerateResume={() => setGenerateResumeFor(job)}
                />
              ))}
              {filteredJobs.length === 0 && (
                <div className="text-center py-16 text-white/60">
                  <div className="text-6xl mb-4">🔍</div>
                  <div className="text-xl">No jobs match your filters</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Resumes Tab */}
        {activeTab === 'resumes' && (
          <>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-6 flex justify-between items-center">
              <div className="text-white">
                <span className="text-2xl font-bold">{resumes.length}</span>
                <span className="ml-2 text-white/70">tailored resumes ready</span>
              </div>
              <button onClick={() => setShowResumeModal(true)} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all">
                + Add Resume
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.map(resume => (
                <ResumeCard key={resume.id} resume={resume} onDelete={deleteResume} />
              ))}
              {resumes.length === 0 && (
                <div className="col-span-full text-center py-16 text-white/60">
                  <div className="text-6xl mb-4">📄</div>
                  <div className="text-xl">No resumes yet. Create one from a job listing!</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && <AnalyticsView jobs={jobs} />}

        {/* Modals */}
        {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onAdd={addJob} />}
        {showResumeModal && <AddResumeModal onClose={() => setShowResumeModal(false)} onAdd={addResume} />}
        {generateResumeFor && (
          <GenerateResumeModal
            job={generateResumeFor}
            onClose={() => setGenerateResumeFor(null)}
            onGenerated={(resume) => {
              addResume(resume)
              updateJob(generateResumeFor.id, { resume_created: true })
              setGenerateResumeFor(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 shadow-lg`}>
      <div className="flex items-center justify-between">
        <span className="text-3xl">{icon}</span>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <div className="text-white/90 text-sm mt-2 font-medium">{label}</div>
    </div>
  )
}

function JobCard({ job, onUpdate, onDelete, onGenerateResume }: { job: Job; onUpdate: (id: number, u: Partial<Job>) => void; onDelete: (id: number) => void; onGenerateResume: () => void }) {
  const priorityStyles: Record<string, { border: string; badge: string; badgeText: string }> = {
    HIGH: { border: 'border-l-red-500', badge: 'bg-red-500/20 text-red-300', badgeText: '🔴 HIGH' },
    MEDIUM: { border: 'border-l-amber-500', badge: 'bg-amber-500/20 text-amber-300', badgeText: '🟡 MEDIUM' },
    LOW: { border: 'border-l-slate-500', badge: 'bg-slate-500/20 text-slate-300', badgeText: '⚪ LOW' }
  }
  const style = priorityStyles[job.priority]

  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-l-4 ${style.border} hover:bg-white/15 transition-all`}>
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{job.title}</h3>
          <p className="text-blue-300 font-semibold text-lg">{job.company}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${style.badge}`}>{style.badgeText}</span>
          {job.remote === 'Yes' && <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300">🏠 REMOTE</span>}
          {job.remote === 'Hybrid' && <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300">🔄 HYBRID</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-white/70 mb-4">
        {job.location && <span>📍 {job.location}</span>}
        {job.salary && job.salary !== 'Not disclosed' && <span className="text-emerald-400 font-semibold">💰 {job.salary}</span>}
        <span>📅 Added {job.date_found}</span>
        {job.submitted && job.date_submitted && <span className="text-green-400">✅ Submitted {job.date_submitted}</span>}
      </div>

      {job.notes && (
        <div className="bg-black/20 rounded-xl p-4 text-sm text-white/80 mb-4 border border-white/10">
          💡 {job.notes}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-white/10">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all">
          View Job →
        </a>

        {job.resume_created ? (
          <span className="px-4 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold">✓ Resume Ready</span>
        ) : (
          <button onClick={onGenerateResume} className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all">
            📝 Generate Resume
          </button>
        )}

        <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all">
          <input
            type="checkbox"
            checked={job.submitted}
            onChange={e => onUpdate(job.id, { submitted: e.target.checked, date_submitted: e.target.checked ? new Date().toISOString().split('T')[0] : null })}
            className="w-5 h-5 rounded accent-emerald-500"
          />
          <span className="text-sm text-white font-medium">Submitted</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all">
          <input
            type="checkbox"
            checked={job.heard_back}
            onChange={e => onUpdate(job.id, { heard_back: e.target.checked, date_heard_back: e.target.checked ? new Date().toISOString().split('T')[0] : null })}
            className="w-5 h-5 rounded accent-purple-500"
          />
          <span className="text-sm text-white font-medium">Heard Back</span>
        </label>

        <button onClick={() => onDelete(job.id)} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium hover:bg-red-500/20 px-3 py-2 rounded-xl transition-all">
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}

function ResumeCard({ resume, onDelete }: { resume: Resume; onDelete: (id: number) => void }) {
  const downloadResume = () => {
    // Generate a simple text-based resume for download
    const content = `
LOGAN RIGGS - TAILORED RESUME
=============================
Target: ${resume.target_role || 'General'}
Version: ${resume.name}

PROFESSIONAL SUMMARY
--------------------
Experienced Dental Digital Workflow Specialist with 10+ years in dental technology,
specializing in 3Shape TRIOS, SprintRay 3D printing, and Medit intraoral scanners.
Proven track record in training dental professionals and implementing digital solutions.

CORE COMPETENCIES
-----------------
• 3Shape TRIOS Intraoral Scanning
• SprintRay 3D Printing Systems
• Medit Scanner Operations
• Digital Workflow Implementation
• Clinical Training & Education
• CAD/CAM Design

${resume.notes ? `NOTES\n------\n${resume.notes}` : ''}

Created: ${new Date(resume.created_at).toLocaleDateString()}
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resume.name.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all border border-white/10">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-2xl">
          📄
        </div>
        <button onClick={() => onDelete(resume.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-all">
          🗑️
        </button>
      </div>

      <h3 className="text-lg font-bold text-white mb-2">{resume.name}</h3>
      {resume.target_role && (
        <p className="text-blue-300 text-sm mb-3">🎯 {resume.target_role}</p>
      )}
      {resume.notes && (
        <p className="text-white/60 text-sm mb-4 line-clamp-2">{resume.notes}</p>
      )}

      <div className="text-xs text-white/40 mb-4">
        Created {new Date(resume.created_at).toLocaleDateString()}
      </div>

      <div className="flex gap-2">
        <button
          onClick={downloadResume}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          ⬇️ Download
        </button>
        <button
          onClick={downloadResume}
          className="px-4 py-2.5 bg-white/20 text-white rounded-xl text-sm font-bold hover:bg-white/30 transition-all"
        >
          👁️ View
        </button>
      </div>
    </div>
  )
}

function AnalyticsView({ jobs }: { jobs: Job[] }) {
  const stats = {
    total: jobs.length,
    submitted: jobs.filter(j => j.submitted).length,
    heardBack: jobs.filter(j => j.heard_back).length,
    remote: jobs.filter(j => j.remote === 'Yes').length,
    hybrid: jobs.filter(j => j.remote === 'Hybrid').length,
  }

  const companies = Object.entries(jobs.reduce((acc, j) => {
    acc[j.company] = (acc[j.company] || 0) + 1
    return acc
  }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const responseRate = stats.submitted > 0 ? Math.round((stats.heardBack / stats.submitted) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Pipeline Funnel */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6">📊 Application Pipeline</h3>
        <div className="space-y-4">
          <div className="relative">
            <div className="flex justify-between text-white mb-2">
              <span>Total Jobs</span>
              <span className="font-bold">{stats.total}</span>
            </div>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="relative">
            <div className="flex justify-between text-white mb-2">
              <span>Submitted</span>
              <span className="font-bold">{stats.submitted}</span>
            </div>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full" style={{ width: `${(stats.submitted / stats.total) * 100}%` }}></div>
            </div>
          </div>
          <div className="relative">
            <div className="flex justify-between text-white mb-2">
              <span>Heard Back</span>
              <span className="font-bold">{stats.heardBack}</span>
            </div>
            <div className="h-4 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" style={{ width: `${(stats.heardBack / stats.total) * 100}%` }}></div>
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-white/10 rounded-xl">
          <div className="text-3xl font-bold text-white">{responseRate}%</div>
          <div className="text-white/60 text-sm">Response Rate</div>
        </div>
      </div>

      {/* Top Companies */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6">🏢 Top Companies</h3>
        <div className="space-y-3">
          {companies.map(([company, count], i) => (
            <div key={company} className="flex items-center gap-3">
              <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="flex-1 text-white truncate">{company}</span>
              <span className="text-white/60 font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location Breakdown */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6">🌍 Work Type</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-emerald-500/20 rounded-xl">
            <span className="text-white font-medium">🏠 Remote</span>
            <span className="text-2xl font-bold text-emerald-400">{stats.remote}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-500/20 rounded-xl">
            <span className="text-white font-medium">🔄 Hybrid</span>
            <span className="text-2xl font-bold text-blue-400">{stats.hybrid}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-amber-500/20 rounded-xl">
            <span className="text-white font-medium">🏢 On-site</span>
            <span className="text-2xl font-bold text-amber-400">{jobs.length - stats.remote - stats.hybrid}</span>
          </div>
        </div>
      </div>

      {/* Salary Data */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 md:col-span-2 lg:col-span-3">
        <h3 className="text-xl font-bold text-white mb-6">💰 Salary Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.filter(j => j.salary && j.salary !== 'Not disclosed').slice(0, 9).map(j => (
            <div key={j.id} className="p-4 bg-white/10 rounded-xl">
              <div className="font-medium text-white">{j.company}</div>
              <div className="text-sm text-white/60 mb-2">{j.title}</div>
              <div className="text-emerald-400 font-bold">{j.salary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AddJobModal({ onClose, onAdd }: { onClose: () => void; onAdd: (j: Partial<Job>) => void }) {
  const [form, setForm] = useState<{ title: string; company: string; url: string; location: string; salary: string; remote: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; notes: string; source: string; date_found: string; status: string }>({
    title: '', company: '', url: '', location: '', salary: '', remote: 'Yes', priority: 'MEDIUM', notes: '', source: 'Manual', date_found: new Date().toISOString().split('T')[0], status: 'New'
  })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add New Job</h2>
          <button onClick={onClose} className="text-3xl text-white/50 hover:text-white">&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd(form) }} className="space-y-4">
          <div>
            <label className="block text-white/80 font-medium mb-2">Job Title *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" placeholder="e.g. Digital Workflow Specialist" />
          </div>
          <div>
            <label className="block text-white/80 font-medium mb-2">Company *</label>
            <input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" placeholder="e.g. Aspen Dental" />
          </div>
          <div>
            <label className="block text-white/80 font-medium mb-2">Job URL</label>
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 font-medium mb-2">Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" placeholder="e.g. Remote" />
            </div>
            <div>
              <label className="block text-white/80 font-medium mb-2">Salary</label>
              <input value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" placeholder="e.g. $60K-$80K" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 font-medium mb-2">Work Type</label>
              <select value={form.remote} onChange={e => setForm({ ...form, remote: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0">
                <option value="Yes" className="bg-slate-800">Remote</option>
                <option value="Hybrid" className="bg-slate-800">Hybrid</option>
                <option value="No" className="bg-slate-800">On-site</option>
              </select>
            </div>
            <div>
              <label className="block text-white/80 font-medium mb-2">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as 'HIGH'|'MEDIUM'|'LOW' })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0">
                <option value="HIGH" className="bg-slate-800">🔴 High</option>
                <option value="MEDIUM" className="bg-slate-800">🟡 Medium</option>
                <option value="LOW" className="bg-slate-800">⚪ Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-white/80 font-medium mb-2">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" rows={3} placeholder="Why is this a good fit?" />
          </div>
          <button type="submit" className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all">
            Add Job
          </button>
        </form>
      </div>
    </div>
  )
}

function AddResumeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: Partial<Resume>) => void }) {
  const [form, setForm] = useState({ name: '', target_role: '', notes: '' })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add Resume</h2>
          <button onClick={onClose} className="text-3xl text-white/50 hover:text-white">&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd(form) }} className="space-y-4">
          <div>
            <label className="block text-white/80 font-medium mb-2">Resume Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" placeholder="e.g. Aspen Digital Workflow Resume" />
          </div>
          <div>
            <label className="block text-white/80 font-medium mb-2">Target Role</label>
            <input value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" placeholder="e.g. Digital Workflow Agent" />
          </div>
          <div>
            <label className="block text-white/80 font-medium mb-2">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0" rows={3} placeholder="Key points emphasized in this version..." />
          </div>
          <button type="submit" className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all">
            Add Resume
          </button>
        </form>
      </div>
    </div>
  )
}

function GenerateResumeModal({ job, onClose, onGenerated }: { job: Job; onClose: () => void; onGenerated: (r: Partial<Resume>) => void }) {
  const [generating, setGenerating] = useState(false)
  const [resumeName, setResumeName] = useState(`${job.company} - ${job.title}`)
  const [emphasis, setEmphasis] = useState('')

  const generateAndDownload = () => {
    setGenerating(true)

    // Generate tailored resume content
    const resumeContent = `
================================================================================
                              LOGAN RIGGS
          Dental Digital Workflow Specialist & 3D Printing Expert
================================================================================

📧 logan.riggs@email.com | 📱 (555) 123-4567 | 🌐 linkedin.com/in/loganriggs

================================================================================
                          PROFESSIONAL SUMMARY
================================================================================

Results-driven Dental Digital Workflow Specialist with 10+ years of experience
in dental technology, 3D printing, and digital scanning systems. Expert in
3Shape TRIOS, SprintRay 3D printers, and Medit intraoral scanners. Proven
track record in training dental professionals and implementing efficient
digital workflows that increase practice productivity.

${emphasis ? `\n🎯 TAILORED FOR: ${job.title} at ${job.company}\n   ${emphasis}\n` : ''}

================================================================================
                            CORE COMPETENCIES
================================================================================

• 3Shape TRIOS Intraoral Scanning        • SprintRay Pro/Pro S 3D Printing
• Medit i700/i600 Scanner Operations     • Digital Workflow Implementation
• CAD/CAM Design & Manufacturing         • Clinical Training & Education
• Practice Integration Consulting        • Technical Troubleshooting
• Crown & Bridge Digital Design          • Implant Planning & Guides

================================================================================
                         PROFESSIONAL EXPERIENCE
================================================================================

DIGITAL WORKFLOW SPECIALIST | [Previous Company]
[City, State] | [Date Range]

• Trained 200+ dental professionals on 3Shape TRIOS scanning techniques,
  achieving 95% user proficiency within first month of training
• Implemented SprintRay 3D printing workflows that reduced lab turnaround
  time by 60% and increased in-house production capabilities
• Developed training curriculum for digital dentistry adoption, resulting
  in 40% increase in digital case acceptance
• Collaborated with dental teams to optimize scan-to-print workflows,
  reducing chair time by average of 15 minutes per patient
• Provided technical support for Medit scanner integration across
  multi-location dental group

DENTAL TECHNOLOGY TRAINER | [Previous Company]
[City, State] | [Date Range]

• Led hands-on training sessions for dental assistants and hygienists
  on intraoral scanning best practices
• Created video tutorials and documentation for 3D printing workflows
• Achieved 98% customer satisfaction rating in post-training surveys
• Troubleshot complex scanning and printing issues, maintaining 99%
  equipment uptime across supported practices

================================================================================
                              TECHNICAL SKILLS
================================================================================

SCANNING SYSTEMS:        3Shape TRIOS 3/4, Medit i700/i600, iTero Element
3D PRINTING:            SprintRay Pro, Pro S, Pro 55; Formlabs Form 3B
SOFTWARE:               3Shape Dental System, exocad, Medit Design
SPECIALIZATIONS:        Crown & Bridge, Surgical Guides, Night Guards,
                       Dentures, Models, Temporary Restorations

================================================================================
                           EDUCATION & CERTIFICATIONS
================================================================================

• 3Shape Certified Trainer
• SprintRay Certified Specialist
• Medit Scanner Certification
• Continuing Education: 100+ hours in Digital Dentistry

================================================================================
                        TAILORED FOR: ${job.company}
================================================================================

Position: ${job.title}
${job.location ? `Location: ${job.location}` : ''}
${job.salary && job.salary !== 'Not disclosed' ? `Salary Range: ${job.salary}` : ''}

Why I'm a Great Fit:
${job.notes || 'My extensive experience with 3Shape and SprintRay systems, combined with my passion for training and education, makes me an ideal candidate for this role.'}

================================================================================
                          Generated: ${new Date().toLocaleDateString()}
================================================================================
    `.trim()

    // Create and download the file
    const blob = new Blob([resumeContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Logan_Riggs_${job.company.replace(/\s+/g, '_')}_Resume.txt`
    a.click()
    URL.revokeObjectURL(url)

    // Save to database
    setTimeout(() => {
      onGenerated({
        name: resumeName,
        target_role: job.title,
        notes: `Tailored for ${job.company}. ${emphasis || job.notes || ''}`
      })
    }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">📝 Generate Resume</h2>
          <button onClick={onClose} className="text-3xl text-white/50 hover:text-white">&times;</button>
        </div>

        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <div className="text-white font-bold text-lg">{job.title}</div>
          <div className="text-blue-300">{job.company}</div>
          {job.notes && <div className="text-white/60 text-sm mt-2">{job.notes}</div>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white/80 font-medium mb-2">Resume Name</label>
            <input
              value={resumeName}
              onChange={e => setResumeName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0"
            />
          </div>
          <div>
            <label className="block text-white/80 font-medium mb-2">Key Points to Emphasize</label>
            <textarea
              value={emphasis}
              onChange={e => setEmphasis(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 text-white rounded-xl border border-white/20 focus:border-blue-500 focus:ring-0"
              rows={3}
              placeholder="e.g. Highlight 3Shape TRIOS experience, training background..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-4 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition-all">
            Cancel
          </button>
          <button
            onClick={generateAndDownload}
            disabled={generating}
            className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
          >
            {generating ? '⏳ Generating...' : '⬇️ Generate & Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
