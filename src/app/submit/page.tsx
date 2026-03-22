"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Rocket } from "lucide-react";
import Link from "next/link";

export default function SubmitPage() {
  const [teamName, setTeamName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: teamName, repo_url: repoUrl, deployment_url: deployUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Final project successfully submitted!");
    } catch (err: any) {
      setError(err.message || "Failed to submit project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center py-20 px-4">
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(60,60,198,0.2),rgba(0,0,0,0))]" />

      <div className="w-full max-w-2xl mb-6">
        <Link href="/" className="text-muted-foreground hover:text-white flex items-center gap-2 group transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-3xl">
            <Rocket className="w-6 h-6 text-primary" />
            Final Submission
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Warning: URL must return a live HTTP 200 status. Submissions are locked after the deadline.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Name</label>
              <Input
                required
                placeholder="Registered Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Registered GitHub URL</label>
              <Input
                required
                type="url"
                placeholder="https://github.com/username/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Live Deployment URL</label>
              <Input
                required
                type="url"
                placeholder="https://your-project.vercel.app"
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
              />
            </div>

            {error && <div className="p-3 bg-danger/10 border border-danger/50 text-danger rounded-md text-sm">{error}</div>}
            {message && <div className="p-3 bg-success/10 border border-success/50 text-success rounded-md text-sm">{message}</div>}

            <Button type="submit" className="w-full h-12 text-md mt-4" disabled={loading}>
              {loading ? "Verifying & Submitting..." : "Submit Project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
