export function calculateTeamScore(
  judgeScore: number | null,
  strikeCount: number,
  deploymentStatus: "live" | "slow" | "down" | "pending" | null,
  lastPush: string | null,
  createdAt: string
): number {
  const now = new Date().getTime();
  const regTime = new Date(createdAt).getTime();
  const referenceTime = lastPush ? new Date(lastPush).getTime() : regTime;
  const diffMins = Math.max(0, (now - referenceTime) / (1000 * 60));
  
  // Calculate base activity component (0-100 scale, declines linearly up to 24h)
  const activityScore = Math.max(0, 100 - (diffMins / (24 * 60)) * 100);

  let deploymentScore = 0;
  if (deploymentStatus === "live") deploymentScore = 100;
  else if (deploymentStatus === "slow") deploymentScore = 50;

  let stabilityScore = 0;
  if (strikeCount === 0) stabilityScore = 100;
  else if (strikeCount === 1) stabilityScore = 50;
  else if (strikeCount === 2) stabilityScore = 20;

  const behaviorScore = (activityScore * 0.4) + (deploymentScore * 0.4) + (stabilityScore * 0.2); 
  
  let finalRawScore = 0;
  if (judgeScore && judgeScore > 0) {
    // Weighted: 40% Behavior, 60% Judge (normalized to 100)
    const judgeContrib = judgeScore * 10;
    finalRawScore = (behaviorScore * 0.4) + (judgeContrib * 0.6);
  } else {
    // Baseline: 100% Behavior if judging hasn't happened yet
    finalRawScore = behaviorScore;
  }

  return Math.round((finalRawScore / 10) * 10) / 10;
}
