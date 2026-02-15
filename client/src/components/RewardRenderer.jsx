import { useGamification } from '../context/GamificationContext';
import RewardPopup from './RewardPopup';
import LevelUpModal from './LevelUpModal';
import AchievementToast from './AchievementToast';

export default function RewardRenderer() {
  const gam = useGamification();
  if (!gam || gam.rewardQueue.length === 0) return null;

  const current = gam.rewardQueue[0];

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
