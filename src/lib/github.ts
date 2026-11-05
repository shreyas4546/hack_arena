export async function getLatestPushTime(repoUrl: string, retries = 3): Promise<Date | null> {
  try {
    const parsed = new URL(repoUrl);
    if (parsed.hostname.toLowerCase() !== "github.com" && parsed.hostname.toLowerCase() !== "www.github.com") {
      return null;
    }
    const urlParts = parsed.pathname.split("/").filter(Boolean);
    if (urlParts.length < 2) return null;
    const owner = urlParts[0];
    let repo = urlParts[1];

    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }

    const githubIdentifierRegex = /^[A-Za-z0-9_.-]+$/;
    if (!githubIdentifierRegex.test(owner) || !githubIdentifierRegex.test(repo)) {
      return null;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            ...(process.env.GITHUB_TOKEN && {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            }),
          },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          return data.pushed_at ? new Date(data.pushed_at) : null;
        }

        if (response.status === 404) return null; // Fast fail if repo doesn't exist/private
        console.error(`GitHub API HTTP ${response.status} on attempt ${attempt} for ${repoUrl}`);

      } catch (error) {
        console.error(`GitHub fetch attempt ${attempt} failed for ${repoUrl}:`, error);
      }

      // Exponential backoff
      if (attempt < retries) await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt-1)));
    }
    return null;
  } catch {
    return null;
  }
}
