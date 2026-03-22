"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Rocket, ExternalLink, Github } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Team = {
  id: string;
  team_name: string;
  repo_url: string;
  deployment_url: string | null;
  status: string;
};

export default function ProjectsGallery() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const data = await res.json();
          // Only show teams that have submitted a deployment URL
          setTeams(data.filter((t: Team) => t.deployment_url !== null));
        }
      } catch (e) {
        console.error("Failed to fetch projects", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center py-20 px-4">
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,60,198,0.2),rgba(0,0,0,0))]" />

      <div className="w-full max-w-5xl mb-6 flex justify-between items-center">
        <Link href="/" className="text-muted-foreground hover:text-white flex items-center gap-2 group transition-colors w-fit">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
        <Badge variant="outline" className="text-primary border-primary">Judging Phase</Badge>
      </div>

      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Project Gallery</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover all the final completed projects submitted by our extremely talented hackathon teams.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading submitted projects...</div>
        ) : teams.length === 0 ? (
          <div className="text-center text-muted-foreground p-12 bg-card rounded-xl border border-border">
            No projects have been submitted yet. Check back after the deadline!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card key={team.id} className="flex flex-col h-full hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Rocket className="w-5 h-5 text-primary" />
                    {team.team_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between gap-6">
                  <div className="flex flex-wrap gap-2">
                    {team.status === "disqualified" ? (
                      <Badge variant="danger">Disqualified</Badge>
                    ) : (
                      <Badge variant="success">Completed</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 mt-auto">
                    <Button onClick={() => window.open(team.deployment_url!, '_blank')} variant="default" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Live Project
                    </Button>
                    <Button onClick={() => window.open(team.repo_url, '_blank')} variant="outline" className="w-full">
                      <Github className="w-4 h-4 mr-2" />
                      GitHub Source
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
