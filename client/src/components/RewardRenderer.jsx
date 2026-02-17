import { useEffect } from 'react';
import { useGamification } from '../context/GamificationContext';
import { useTheme } from '../context/ThemeContext';
import RewardPopup from './RewardPopup';
import LevelUpModal from './LevelUpModal';
import AchievementToast from './AchievementToast';

export default function RewardRenderer() {
  const gam = useGamification();
  const { focusMode } = useTheme();

  const current = gam?.rewardQueue[0];
  const shouldAutoDismiss = focusMode && (current?.type === 'xp' || current?.type === 'coins');

  // Auto-dismiss xp/coin rewards in focus mode — must be in useEffect, not render
  useEffect(() => {
    if (shouldAutoDismiss) gam.dismissReward();
  }, [shouldAutoDismiss, gam]);

  if (!gam || gam.rewardQueue.length === 0) return null;
  if (shouldAutoDismiss) return null;

  if (current.type === 'level-up') {
    return <LevelUpModal level={current.amount} onDismiss={gam.dismissReward} />;
  }

  if (current.type === 'achievement') {
    return (
      <AchievementToast
        icon={current.icon}
        label={current.label}
        description={current.description}
        onDismiss={gam.dismissReward}
      />
    );
  }

  if (current.type === 'unlock') {
    return (
      <AchievementToast
        icon="🔓"
        label={current.label}
        description={current.description}
        onDismiss={gam.dismissReward}
      />
    );
  }

  // xp or coins
  return (
    <RewardPopup
      type={current.type}
      amount={current.amount}
      label={current.label}
      onDismiss={gam.dismissReward}
    />
  );
}
