export async function getLatestPushTime(repoUrl: string): Promise<Date | null> {
  try {
    const urlParts = new URL(repoUrl).pathname.split("/").filter(Boolean);
    if (urlParts.length < 2) return null;

    const owner = urlParts[0];
    const repo = urlParts[1];

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`GitHub API error for ${repoUrl}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.pushed_at ? new Date(data.pushed_at) : null;
  } catch (error) {
    console.error(`Failed to fetch GitHub data for ${repoUrl}:`, error);
    return null;
  }
}
