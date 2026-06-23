"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Phone,
  FileText,
} from "lucide-react";

interface ApplicationEmail {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  category: string;
  summary: string;
  actionRequired: boolean;
  isRead: boolean;
}

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  url: string;
}

interface Application {
  id: string;
  job: Job;
  status: string;
  submittedAt: string | null;
  submittedVia: string | null;
  notes: string | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  emails: ApplicationEmail[];
}

interface Stats {
  total: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  screening: number;
  actionRequired: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pending", color: "bg-gray-500", icon: Clock },
  APPLIED: { label: "Applied", color: "bg-blue-500", icon: FileText },
  APPLICATION_CONFIRMATION: { label: "Confirmed", color: "bg-blue-600", icon: CheckCircle2 },
  OA: { label: "Assessment", color: "bg-purple-500", icon: FileText },
  PHONE_SCREEN: { label: "Phone Screen", color: "bg-indigo-500", icon: Phone },
  FOLLOW_UP: { label: "Follow Up", color: "bg-yellow-500", icon: MessageSquare },
  INTERVIEW: { label: "Interview", color: "bg-orange-500", icon: Star },
  OFFER: { label: "Offer", color: "bg-green-500", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-500", icon: XCircle },
};

const emailCategoryConfig: Record<string, { label: string; color: string }> = {
  INTERVIEW_INVITE: { label: "Interview", color: "bg-orange-100 text-orange-700" },
  REJECTION: { label: "Rejection", color: "bg-red-100 text-red-700" },
  OFFER: { label: "Offer", color: "bg-green-100 text-green-700" },
  OA: { label: "Assessment", color: "bg-purple-100 text-purple-700" },
  FOLLOW_UP: { label: "Follow Up", color: "bg-yellow-100 text-yellow-700" },
  PHONE_SCREEN: { label: "Phone Screen", color: "bg-indigo-100 text-indigo-700" },
  APPLICATION_CONFIRMATION: { label: "Confirmation", color: "bg-blue-100 text-blue-700" },
  OTHER: { label: "Other", color: "bg-gray-100 text-gray-700" },
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [emailSyncConfig, setEmailSyncConfig] = useState<any>(null);

  useEffect(() => {
    fetchApplications();
    fetchEmailSyncConfig();
  }, [activeFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const url = activeFilter === "ALL" 
        ? "/api/applications" 
        : `/api/applications?status=${activeFilter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailSyncConfig = async () => {
    try {
      const response = await fetch("/api/emails/config");
      if (response.ok) {
        const data = await response.json();
        setEmailSyncConfig(data);
        setSyncEnabled(data.syncEnabled);
      }
    } catch (error) {
      console.error("Failed to fetch email sync config:", error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch("/api/emails/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 50 }),
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Synced ${result.synced} emails successfully!`);
        fetchApplications();
      } else {
        const error = await response.json();
        alert(error.error || "Sync failed");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const toggleEmailSync = async () => {
    try {
      const newState = !syncEnabled;
      const response = await fetch("/api/emails/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncEnabled: newState }),
      });
      if (response.ok) {
        setSyncEnabled(newState);
        alert(`Email sync ${newState ? "enabled" : "disabled"}`);
      }
    } catch (error) {
      console.error("Failed to toggle email sync:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const filteredApplications = applications.filter((app) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "ACTION_REQUIRED") return app.emails.some((e) => e.actionRequired);
    return app.status === activeFilter;
  });

  const statCards = stats
    ? [
        { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
        { label: "Applied", value: stats.applied, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Screening", value: stats.screening, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Interview", value: stats.interview, color: "text-orange-600", bg: "bg-orange-50" },
        { label: "Offers", value: stats.offer, color: "text-green-600", bg: "bg-green-50" },
        { label: "Rejected", value: stats.rejected, color: "text-red-600", bg: "bg-red-50" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Tracker</h1>
            <p className="text-gray-500 mt-1">
              Track your job applications and email responses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={toggleEmailSync}
              className={syncEnabled ? "border-green-300 text-green-700" : ""}
            >
              <Mail className="w-4 h-4 mr-2" />
              {syncEnabled ? "Sync On" : "Sync Off"}
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncing || !syncEnabled}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Emails
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.label} className={`${stat.bg} border-0`}>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="ACTION_REQUIRED" className="relative">
              Action Required
              {stats && stats.actionRequired > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {stats.actionRequired}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="APPLIED">Applied</TabsTrigger>
            <TabsTrigger value="INTERVIEW">Interview</TabsTrigger>
            <TabsTrigger value="OFFER">Offer</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Application List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredApplications.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-500 mb-4">
                {activeFilter === "ALL"
                  ? "Start applying to jobs or sync your emails to track applications."
                  : "No applications match this filter."}
              </p>
              <Button onClick={() => window.location.href = "/jobs"} className="bg-blue-600">
                Browse Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const statusInfo = statusConfig[app.status] || statusConfig.PENDING;
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedApp === app.id;

              return (
                <Card key={app.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg ${statusInfo.color} flex items-center justify-center text-white shrink-0`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{app.job.title}</h3>
                            <p className="text-sm text-gray-500">{app.job.company} · {app.job.location}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={`${statusInfo.color} text-white text-xs`}>
                                {statusInfo.label}
                              </Badge>
                              {app.emails.some((e) => e.actionRequired) && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Action Required
                                </Badge>
                              )}
                              {app.submittedAt && (
                                <span className="text-xs text-gray-400">
                                  Applied {formatRelativeTime(app.submittedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {app.job.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(app.job.url, "_blank");
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-6">
                        <Separator className="my-4" />

                        {/* Timeline */}
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Activity Timeline</h4>
                          <div className="space-y-3">
                            {app.submittedAt && (
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Application Submitted</p>
                                  <p className="text-xs text-gray-500">{formatDate(app.submittedAt)}</p>
                                </div>
                              </div>
                            )}
                            {app.emails.length > 0 ? (
                              app.emails.map((email, idx) => {
                                const catConfig = emailCategoryConfig[email.category] || emailCategoryConfig.OTHER;
                                return (
                                  <div key={email.id} className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                      email.category === "OFFER" ? "bg-green-500" :
                                      email.category === "REJECTION" ? "bg-red-500" :
                                      email.category === "INTERVIEW_INVITE" ? "bg-orange-500" :
                                      "bg-blue-500"
                                    }`}></div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                                        <Badge className={`text-xs ${catConfig.color}`}>
                                          {catConfig.label}
                                        </Badge>
                                        {email.actionRequired && (
                                          <Badge variant="destructive" className="text-xs">Action Needed</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">{email.sender} · {formatRelativeTime(email.receivedAt)}</p>
                                      {email.summary && (
                                        <p className="text-sm text-gray-600 mt-1">{email.summary}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-sm text-gray-400 italic">No email updates yet</p>
                            )}
                          </div>
                        </div>

                        {/* Notes */}
                        {app.notes && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{app.notes}</p>
                          </div>
                        )}

                        {/* Follow-up date */}
                        {app.followUpDate && (
                          <div className="flex items-center gap-2 text-sm text-yellow-600">
                            <Clock className="w-4 h-4" />
                            Follow up scheduled for {formatDate(app.followUpDate)}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
