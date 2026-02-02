-- Logan Job Tracker Database Schema
-- Created: 2026-02-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    company VARCHAR(255) NOT NULL,
    url TEXT,
    location VARCHAR(255),
    salary VARCHAR(255),
    remote VARCHAR(50) DEFAULT 'Check listing',
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    notes TEXT,
    source VARCHAR(255),
    date_found DATE DEFAULT CURRENT_DATE,
    resume_created BOOLEAN DEFAULT FALSE,
    submitted BOOLEAN DEFAULT FALSE,
    date_submitted DATE,
    heard_back BOOLEAN DEFAULT FALSE,
    date_heard_back DATE,
    status VARCHAR(100) DEFAULT 'New',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_role VARCHAR(255),
    file_url TEXT,
    file_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scrape logs table (for tracking automated job scraping)
CREATE TABLE IF NOT EXISTS scrape_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    jobs_found INTEGER DEFAULT 0,
    jobs_added INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_jobs_priority ON jobs(priority);
CREATE INDEX idx_jobs_submitted ON jobs(submitted);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_date_found ON jobs(date_found);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a personal tracker)
CREATE POLICY "Allow public read access on jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on jobs" ON jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on jobs" ON jobs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on jobs" ON jobs FOR DELETE USING (true);

CREATE POLICY "Allow public read access on resumes" ON resumes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on resumes" ON resumes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on resumes" ON resumes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on resumes" ON resumes FOR DELETE USING (true);

CREATE POLICY "Allow public read access on scrape_logs" ON scrape_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on scrape_logs" ON scrape_logs FOR INSERT WITH CHECK (true);

-- Insert initial job data
INSERT INTO jobs (title, company, url, location, salary, remote, priority, notes, source, date_found, resume_created, status) VALUES
('Digital Workflow Agent', 'Aspen Dental', 'https://careers.aspendental.com/us/en/job/R2025-019603/Digital-Workflow-Agent', 'Remote Alabama', '$56K-$62K ($27-30/hr)', 'Yes', 'HIGH', 'PERFECT FIT - 3Shape TRIOS + SprintRay required. Former employer.', 'careers.aspendental.com', '2026-02-02', true, 'Ready to Apply'),
('Dental Technician CAD CAM Designer (REMOTE)', 'Dental Career Services', 'https://dentalcareerservices.com/job/1051055_69/', 'Remote', 'Competitive + Equity', 'Yes', 'HIGH', '3Shape required, C&B + Implants. Fully sponsored healthcare.', 'dentalcareerservices.com', '2026-02-02', false, 'New'),
('Dental CAD Anteriors A2 Designer', 'Dandy', 'https://himalayas.app/companies/dandy-com/jobs/dental-cad-anteriors-a2-designer', 'Remote USA', 'Not disclosed', 'Yes', 'HIGH', '3-5 years 3Shape experience, multi-unit crown designs', 'himalayas.app', '2026-02-02', true, 'New'),
('Scanner Program Trainer & Administrator', 'Catalis Dental Lab Partners', 'https://www.remoterocketship.com/job/scanner-program-trainer-administrator', 'Remote', 'Not disclosed', 'Yes', 'HIGH', 'Scanner training focus - perfect for training background', 'remoterocketship.com', '2026-02-02', false, 'New'),
('Digital Dentistry Trainer', 'Indeed', 'https://www.indeed.com/viewjob?jk=ac3d6369534cce78', 'Newport Beach CA', 'Not disclosed', 'Hybrid', 'MEDIUM', 'May require some on-site, verify remote options', 'indeed.com', '2026-02-02', false, 'New'),
('Clinical Training Specialist', 'National Dentex Labs', 'https://www.tealhq.com', 'Remote', 'Not disclosed', 'Yes', 'HIGH', 'Clinical training role - strong fit', 'tealhq.com', '2026-02-02', false, 'New'),
('Dental Field Trainer', 'Dandy', 'https://www.builtinnyc.com', 'Detroit MI', 'Not disclosed', 'Hybrid', 'MEDIUM', 'Field role - may have travel requirements', 'builtinnyc.com', '2026-02-02', false, 'New'),
('Customer Success Specialist', 'Medit', 'https://www.jobright.ai', 'Remote', 'Not disclosed', 'Yes', 'MEDIUM', 'Medit scanner company - good brand fit', 'jobright.ai', '2026-02-02', false, 'New'),
('Digital Adoption Specialist', 'Align Technology', 'https://jobs.aligntech.com', 'Field/Remote', 'Not disclosed', 'Hybrid', 'HIGH', 'iTero focus, practice workflows', 'jobs.aligntech.com', '2026-02-02', false, 'New'),
('Integration Specialist', 'Align Technology', 'https://jobs.aligntech.com', 'Remote', 'Not disclosed', 'Yes', 'HIGH', 'Platform implementation and integration', 'jobs.aligntech.com', '2026-02-02', false, 'New'),
('Digital Workflow Specialist', 'SprintRay', 'https://careers.sprintray.com/jobs', 'UK/Spain/Remote', 'Performance-based', 'Yes', 'HIGH', 'SprintRay brand - perfect match but EU focused currently', 'careers.sprintray.com', '2026-02-02', false, 'New'),
('Digital Dentistry Technology Trainer (Per Diem)', 'Benco Dental', 'https://www.indeed.com/q-dental-clinical-trainer-l-remote-jobs.html', 'Remote USA', 'Per Diem', 'Yes', 'HIGH', '3+ years clinical training in digital dentistry required', 'indeed.com', '2026-02-02', false, 'New'),
('Director Corporate Accounts - Intraoral Scanner', 'DEXIS', 'https://www.linkedin.com/jobs/view/dexis-director-corporate-accounts-intraoral-scanner-remote-us-east-at-dexis-3367458142', 'Remote US East', '$92K+ (senior level)', 'Yes', 'MEDIUM', '5+ years digital dental experience. Sales/support focus.', 'linkedin.com', '2026-02-02', false, 'New'),
('Remote Digital Dentures Designer', 'Integrity Dental Services', 'https://www.indeed.com/q-dental-cad-cam-designer-remote-jobs.html', 'Remote', 'Not disclosed', 'Yes', 'MEDIUM', '5 years experience required, CDT certification plus', 'indeed.com', '2026-02-02', false, 'New'),
('Senior ExoCad Designer', 'Various Labs', 'https://www.glassdoor.com/Job/dental-cad-cam-designer-jobs-SRCH_KO0,23.htm', 'Phoenix AZ', '$90K-$110K', 'Hybrid', 'MEDIUM', 'Higher salary but may need ExoCad vs 3Shape', 'glassdoor.com', '2026-02-02', false, 'New'),
('Digital CAD Dental Designer', 'Jobot', 'https://www.linkedin.com/jobs/view/digital-cad-dental-designer-at-jobot-4208683015', 'Tucson AZ', 'Not disclosed', 'Check listing', 'MEDIUM', 'Staffing agency placement', 'linkedin.com', '2026-02-02', false, 'New'),
('Dental CAD/CAM Printing Technician', 'Modern Dental Laboratory USA', 'https://www.linkedin.com/jobs/view/dental-cad-cam-printing-technician-at-modern-dental-laboratory-usa-4183236486', 'Check listing', 'Not disclosed', 'Check listing', 'MEDIUM', 'Lab environment, CAD/CAM + printing', 'linkedin.com', '2026-02-02', false, 'New'),
('CAD/CAM Designer', 'Glidewell Dental', 'https://jobs.jobvite.com/glidewelldental/job/oqmYwfw0', 'Irvine CA', '$17/hr starting', 'No', 'LOW', 'On-site only, lower pay than target', 'jobvite.com', '2026-02-02', false, 'New'),
('Manufacturing Technician', 'LightForce Orthodontics', 'https://lf.co/sp/careers', 'Cambridge MA', 'Not disclosed', 'No', 'LOW', '3D printing orthodontics, but on-site', 'lf.co', '2026-02-02', false, 'New'),
('iTero Territory Sales Manager', 'Align Technology', 'https://jobs.aligntech.com', 'Territory-based', 'Commission + base', 'Hybrid', 'MEDIUM', 'Sales focus but scanner expertise valued', 'jobs.aligntech.com', '2026-02-02', false, 'New'),
('Practice Development Manager', 'Align Technology', 'https://jobs.aligntech.com', 'Remote', '$80K-$150K+', 'Yes', 'HIGH', 'Invisalign focus, technical + business development', 'jobs.aligntech.com', '2026-02-02', false, 'New'),
('Virtual Clinical Account Manager', 'Various', 'https://www.indeed.com/q-remote-dental-jobs.html', 'Remote', 'Not disclosed', 'Yes', 'MEDIUM', 'Educates dental professionals on products/protocols', 'indeed.com', '2026-02-02', false, 'New'),
('IT Analyst - Inbound Account Management', 'Heartland Dental', 'https://jobs.heartland.com/jobs/information-technology/', 'Remote', '$16/hr', 'Yes', 'LOW', 'IT support focus, lower pay', 'jobs.heartland.com', '2026-02-02', false, 'New'),
('Account Tech Revenue (Remote)', 'Heartland Dental', 'https://www.tealhq.com/job/account-tech-revenue-remote_6ca948a9-143c-422a-af0b-bbad27e55b52', 'Remote', 'Not disclosed', 'Yes', 'LOW', 'Accounting focus, not technical', 'tealhq.com', '2026-02-02', false, 'New'),
('Quality Assurance Specialist', 'SprintRay', 'https://www.indeed.com/q-dental-3d-printing-jobs.html', 'Huntington Beach CA', 'Not disclosed', 'No', 'LOW', 'FDA/ISO compliance focus, on-site', 'indeed.com', '2026-02-02', false, 'New'),
('Dental Field Trainer', 'Dandy', 'https://www.meetdandy.com/careers/', 'USA', 'Not disclosed', 'Hybrid', 'HIGH', 'Position may reopen - join talent community', 'meetdandy.com', '2026-02-02', false, 'Monitor'),
('Dental CAD Implant Designer', 'Dandy', 'https://www.builtinnyc.com/job/dental-cad-implant-designer-3shape/6642840', 'Remote USA', 'Not disclosed', 'Yes', 'HIGH', '3Shape implant planning - check if still active', 'builtinnyc.com', '2026-02-02', false, 'Monitor'),
('Dental CAD Crown & Bridge Designer', 'Dandy', 'https://www.builtinnyc.com/job/dental-cad-crown-bridge-model-designer-3shape/3126040', 'Remote USA', 'Not disclosed', 'Yes', 'HIGH', '3Shape C&B focus - check if still active', 'builtinnyc.com', '2026-02-02', false, 'Monitor'),
('Technical Support and Training Specialist', 'Medit', 'https://www.linkedin.com/company/medit/jobs', 'Remote', 'Not disclosed', 'Yes', 'HIGH', 'Scanner training specialist - direct manufacturer', 'linkedin.com', '2026-02-02', false, 'New'),
('3D Print Technician', 'Evolution Dental Lab', 'https://evolutiondental.net/careers/', 'Various', 'Not disclosed', 'Check listing', 'MEDIUM', 'Lab environment', 'evolutiondental.net', '2026-02-02', false, 'New');

-- Insert initial resume data
INSERT INTO resumes (name, target_role, file_name, notes) VALUES
('Base Resume (Digital Focus)', 'General Digital Dentistry', 'LoganRiggsResumeSprint.pdf', 'Emphasizes SprintRay and 3Shape experience'),
('Aspen Digital Workflow Agent', 'Digital Workflow Agent', 'Logan_Riggs_Aspen_Digital_Workflow_Agent.docx', 'Tailored for Aspen Dental - emphasizes 3Shape TRIOS, SprintRay, former employee status'),
('Dandy CAD Designer', 'Dental CAD Designer', 'Logan_Riggs_Dandy_CAD_Designer.md', 'Tailored for Dandy - emphasizes 3Shape CAD, design workflows, fast-paced environment fit');
