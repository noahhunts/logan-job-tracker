'use client'

import { useEffect, useState } from 'react'
import { supabase, Job, Resume } from '@/lib/supabase'

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'jobs' | 'resumes' | 'analytics'>('jobs')
  const [filters, setFilters] = useState({
    priority: 'all',
    status: 'all',
    remote: 'all',
    search: ''
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)

  useEffect(() => {
    fetchJobs()
    fetchResumes()
  }, [])

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('priority', { ascending: true })
      .order('date_found', { ascending: false })

    if (data) setJobs(data)
    setLoading(false)
  }

  const fetchResumes = async () => {
    const { data } = await supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setResumes(data)
  }

  const updateJob = async (id: number, updates: Partial<Job>) => {
    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setJobs(jobs.map(j => j.id === id ? { ...j, ...updates } : j))
    }
  }

  const deleteJob = async (id: number) => {
    if (!confirm('Delete this job?')) return
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (!error) setJobs(jobs.filter(j => j.id !== id))
  }

  const addJob = async (job: Partial<Job>) => {
    const { data, error } = await supabase
      .from('jobs')
      .insert([job])
      .select()

    if (data) {
      setJobs([data[0], ...jobs])
      setShowAddModal(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    if (filters.priority !== 'all' && job.priority !== filters.priority) return false
    if (filters.status === 'submitted' && !job.submitted) return false
    if (filters.status === 'heard-back' && !job.heard_back) return false
    if (filters.status === 'new' && (job.submitted || job.heard_back)) return false
    if (filters.remote === 'yes' && job.remote !== 'Yes') return false
    if (filters.remote === 'hybrid' && job.remote !== 'Hybrid') return false
    if (filters.search && !job.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !job.company.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: jobs.length,
    highPriority: jobs.filter(j => j.priority === 'HIGH').length,
    submitted: jobs.filter(j => j.submitted).length,
    heardBack: jobs.filter(j => j.heard_back).length,
    resumesReady: jobs.filter(j => j.resume_created).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-8 rounded-xl shadow-lg mb-8">
          <h1 className="text-3xl font-bold mb-2">Logan&apos;s Job Application Tracker</h1>
          <p className="opacity-90 mb-6">Dental 3D Printing &amp; Digital Workflow Roles</p>
          <div className="flex flex-wrap gap-6">
            <Stat label="Total Jobs" value={stats.total} />
            <Stat label="High Priority" value={stats.highPriority} />
            <Stat label="Submitted" value={stats.submitted} />
            <Stat label="Heard Back" value={stats.heardBack} />
            <Stat label="Resumes Ready" value={stats.resumesReady} />
          </div>
        </header>

        <div className="flex gap-2 mb-6 bg-white p-2 rounded-xl shadow">
          {(['jobs', 'resumes', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium capitalize transition ${
                activeTab === tab ? 'bg-blue-800 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'jobs' && (
          <>
            <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-center">
              <select
                value={filters.priority}
                onChange={e => setFilters({ ...filters, priority: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg"
              >
                <option value="all">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="submitted">Submitted</option>
                <option value="heard-back">Heard Back</option>
              </select>
              <select
                value={filters.remote}
                onChange={e => setFilters({ ...filters, remote: e.target.value })}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg"
              >
                <option value="all">All Locations</option>
                <option value="yes">Remote Only</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <input
                type="text"
                placeholder="Search jobs..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 min-w-[200px] px-4 py-2 border-2 border-gray-200 rounded-lg"
              />
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-900"
              >
                + Add Job
              </button>
            </div>

            <div className="space-y-4">
              {filteredJobs.map(job => (
                <JobCard key={job.id} job={job} onUpdate={updateJob} onDelete={deleteJob} />
              ))}
              {filteredJobs.length === 0 && (
                <div className="text-center py-12 text-gray-500">No jobs found.</div>
              )}
            </div>
          </>
        )}

        {activeTab === 'resumes' && (
          <>
            <div className="bg-white p-4 rounded-xl shadow mb-6">
              <button
                onClick={() => setShowResumeModal(true)}
                className="px-6 py-2 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-900"
              >
                + Add Resume
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.map(resume => (
                <ResumeCard key={resume.id} resume={resume} />
              ))}
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-4">Pipeline</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                  <span>New</span>
                  <span className="font-bold text-blue-800">{jobs.filter(j => !j.submitted).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg">
                  <span>Submitted</span>
                  <span className="font-bold text-green-800">{stats.submitted}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-100 rounded-lg">
                  <span>Heard Back</span>
                  <span className="font-bold text-yellow-800">{stats.heardBack}</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-4">Top Companies</h3>
              <div className="space-y-2">
                {Object.entries(jobs.reduce((acc, j) => {
                  acc[j.company] = (acc[j.company] || 0) + 1
                  return acc
                }, {} as Record<string, number>))
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([company, count]) => (
                    <div key={company} className="flex justify-between border-b pb-2">
                      <span>{company}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-4">Salary Data</h3>
              <div className="space-y-2 text-sm">
                {jobs.filter(j => j.salary && j.salary !== 'Not disclosed').slice(0, 6).map(j => (
                  <div key={j.id} className="border-b pb-2">
                    <div className="font-medium">{j.company}</div>
                    <div className="text-green-600">{j.salary}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onAdd={addJob} />}
        {showResumeModal && (
          <AddResumeModal
            onClose={() => setShowResumeModal(false)}
            onAdd={async (resume) => {
              const { data } = await supabase.from('resumes').insert([resume]).select()
              if (data) {
                setResumes([data[0], ...resumes])
                setShowResumeModal(false)
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/15 px-5 py-3 rounded-lg">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-90">{label}</div>
    </div>
  )
}

function JobCard({ job, onUpdate, onDelete }: { job: Job; onUpdate: (id: number, u: Partial<Job>) => void; onDelete: (id: number) => void }) {
  const priorityColors: Record<string, string> = {
    HIGH: 'border-l-red-500',
    MEDIUM: 'border-l-yellow-500',
    LOW: 'border-l-gray-400'
  }
  return (
    <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${priorityColors[job.priority]} ${job.submitted ? 'bg-green-50' : ''}`}>
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-blue-800">{job.title}</h3>
          <p className="text-gray-600 font-medium">{job.company}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${job.priority === 'HIGH' ? 'bg-red-100 text-red-700' : job.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
            {job.priority}
          </span>
          {job.remote === 'Yes' && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Remote</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
        <span>📍 {job.location}</span>
        <span>💰 {job.salary}</span>
        <span>📅 {job.date_found}</span>
      </div>
      {job.notes && <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-4">{job.notes}</div>}
      <div className="flex flex-wrap gap-3 items-center pt-4 border-t">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-900">View Job →</a>
        {job.resume_created ? (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">✓ Resume Ready</span>
        ) : (
          <button onClick={() => onUpdate(job.id, { resume_created: true })} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200">Mark Resume Created</button>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={job.submitted} onChange={e => onUpdate(job.id, { submitted: e.target.checked, date_submitted: e.target.checked ? new Date().toISOString().split('T')[0] : null })} className="w-5 h-5 rounded" />
          <span className="text-sm">Submitted</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={job.heard_back} onChange={e => onUpdate(job.id, { heard_back: e.target.checked, date_heard_back: e.target.checked ? new Date().toISOString().split('T')[0] : null })} className="w-5 h-5 rounded" />
          <span className="text-sm">Heard Back</span>
        </label>
        <button onClick={() => onDelete(job.id)} className="ml-auto text-red-500 hover:text-red-700 text-sm">Delete</button>
      </div>
    </div>
  )
}

function ResumeCard({ resume }: { resume: Resume }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <h3 className="font-semibold text-blue-800 mb-2">{resume.name}</h3>
      <p className="text-sm text-gray-600 mb-2"><strong>Target:</strong> {resume.target_role}</p>
      {resume.notes && <p className="text-sm text-gray-500 mb-4">{resume.notes}</p>}
      <div className="text-xs text-gray-400">{new Date(resume.created_at).toLocaleDateString()}</div>
    </div>
  )
}

function AddJobModal({ onClose, onAdd }: { onClose: () => void; onAdd: (j: Partial<Job>) => void }) {
  const [form, setForm] = useState({ title: '', company: '', url: '', location: '', salary: '', remote: 'Yes', priority: 'MEDIUM' as const, notes: '', source: 'Manual', date_found: new Date().toISOString().split('T')[0], status: 'New' })
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Add New Job</h2>
          <button onClick={onClose} className="text-2xl text-gray-400">&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd(form) }} className="space-y-4">
          <div><label className="block font-medium mb-1">Title *</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
          <div><label className="block font-medium mb-1">Company *</label><input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
          <div><label className="block font-medium mb-1">URL</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block font-medium mb-1">Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
            <div><label className="block font-medium mb-1">Salary</label><input value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block font-medium mb-1">Remote</label><select value={form.remote} onChange={e => setForm({ ...form, remote: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg"><option value="Yes">Remote</option><option value="Hybrid">Hybrid</option><option value="No">On-site</option></select></div>
            <div><label className="block font-medium mb-1">Priority</label><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as 'HIGH'|'MEDIUM'|'LOW' })} className="w-full px-4 py-2 border-2 rounded-lg"><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></div>
          </div>
          <div><label className="block font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" rows={3} /></div>
          <button type="submit" className="w-full py-3 bg-blue-800 text-white rounded-lg font-medium">Add Job</button>
        </form>
      </div>
    </div>
  )
}

function AddResumeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: Partial<Resume>) => void }) {
  const [form, setForm] = useState({ name: '', target_role: '', notes: '' })
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Add Resume</h2>
          <button onClick={onClose} className="text-2xl text-gray-400">&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd(form) }} className="space-y-4">
          <div><label className="block font-medium mb-1">Name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
          <div><label className="block font-medium mb-1">Target Role</label><input value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
          <div><label className="block font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" rows={3} /></div>
          <button type="submit" className="w-full py-3 bg-blue-800 text-white rounded-lg font-medium">Add Resume</button>
        </form>
      </div>
    </div>
  )
}
