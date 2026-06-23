'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Briefcase, Star, Filter, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/navbar';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  job_type: string;
  url: string;
  source: string;
  posted_at: string;
  skills: string[];
  match_score?: number;
  match_details?: {
    overallScore: number;
    skillScore: number;
    experienceScore: number;
    locationScore: number;
    salaryScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    reasoning: string;
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (location) params.append('location', location);
      
      const response = await fetch(`/api/jobs/search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchedJobs = async () => {
    setLoading(true);
    try {
      // For demo, use a mock resume ID
      const response = await fetch('/api/jobs/match?resumeId=demo');
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch matched jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const getMatchColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return 'Salary not specified';
    const curr = currency || 'USD';
    const symbol = curr === 'USD' ? '$' : curr;
    if (min && max) return `${symbol}${min.toLocaleString()} - ${symbol}${max.toLocaleString()}`;
    if (min) return `From ${symbol}${min.toLocaleString()}`;
    return `Up to ${symbol}${max?.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Next Job</h1>
          <p className="text-gray-600">Discover opportunities matched to your skills and preferences</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Job title, keywords, or company"
                  className="pl-10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchJobs()}
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="City, state, or remote"
                  className="pl-10"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchJobs()}
                />
              </div>
              <Button onClick={fetchJobs} className="md:w-32">
                Search
              </Button>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="md:w-32">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Job Type</label>
                  <select className="w-full p-2 border rounded-md text-sm">
                    <option value="">All Types</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Salary Range</label>
                  <select className="w-full p-2 border rounded-md text-sm">
                    <option value="">Any Salary</option>
                    <option value="0-50000">$0 - $50k</option>
                    <option value="50000-100000">$50k - $100k</option>
                    <option value="100000-150000">$100k - $150k</option>
                    <option value="150000+">$150k+</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Posted</label>
                  <select className="w-full p-2 border rounded-md text-sm">
                    <option value="">Any Time</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">
            {loading ? 'Searching...' : `${jobs.length} jobs found`}
          </p>
          <Button variant="outline" onClick={fetchMatchedJobs}>
            <Star className="h-4 w-4 mr-2" />
            Show Best Matches
          </Button>
        </div>

        {/* Job List */}
        <div className="grid gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/3 mb-4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600">Try adjusting your search criteria</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card 
                key={job.id} 
                className={`cursor-pointer transition-shadow hover:shadow-lg ${
                  selectedJob?.id === job.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedJob(job)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{job.title}</h3>
                      <p className="text-gray-600">{job.company}</p>
                    </div>
                    {job.match_score && (
                      <Badge className={getMatchColor(job.match_score)}>
                        <Star className="h-3 w-3 mr-1" />
                        {job.match_score}% Match
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {job.location}
                    </span>
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                    </span>
                    <span className="flex items-center">
                      <Briefcase className="h-4 w-4 mr-1" />
                      {job.job_type.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500">{formatDate(job.posted_at)}</span>
                  </div>

                  <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.slice(0, 5).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {job.skills.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{job.skills.length - 5} more
                      </Badge>
                    )}
                  </div>

                  {job.match_details && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{job.match_details.overallScore}%</p>
                          <p className="text-xs text-gray-600">Overall</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{job.match_details.skillScore}%</p>
                          <p className="text-xs text-gray-600">Skills</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{job.match_details.experienceScore}%</p>
                          <p className="text-xs text-gray-600">Experience</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{job.match_details.locationScore}%</p>
                          <p className="text-xs text-gray-600">Location</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{job.match_details.reasoning}</p>
                      {job.match_details.matchedSkills.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-green-600 font-medium">
                            Matched: {job.match_details.matchedSkills.join(', ')}
                          </p>
                        </div>
                      )}
                      {job.match_details.missingSkills.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-red-600 font-medium">
                            Missing: {job.match_details.missingSkills.slice(0, 3).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1" onClick={() => window.open(job.url, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Job
                    </Button>
                    <Button variant="outline">
                      Save
                    </Button>
                    <Button variant="outline">
                      Apply with AI
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
