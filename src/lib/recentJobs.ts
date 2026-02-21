const STORAGE_KEY = 'rugboost_recent_jobs';
const MAX_RECENT = 5;

export interface RecentJob {
  id: string;
  job_number: string;
  client_name: string;
}

export function getRecentJobs(): RecentJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function addRecentJob(job: RecentJob): void {
  try {
    const recent = getRecentJobs().filter((j) => j.id !== job.id);
    recent.unshift(job);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage errors
  }
}
