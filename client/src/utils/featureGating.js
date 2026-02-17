/**
 * Progressive disclosure: check if a feature is unlocked based on level and age group.
 * Adults see everything from level 1. Children/secondary unlock features progressively.
 */
export function isFeatureUnlocked(feature, level, ageGroup) {
  if (ageGroup === 'adult') return true;

  const gates = {
    quests: 3,
    achievements: 5,
    streaks: 5,
    weeklyStreaks: 5,
    variableRewards: 3
  };

  const requiredLevel = gates[feature];
  if (requiredLevel === undefined) return false;
  return level >= requiredLevel;
}
