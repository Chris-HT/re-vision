import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { apiFetch } from '../utils/api';

const GamificationContext = createContext(null);

export function useGamification() {
  return useContext(GamificationContext);
}

export function GamificationProvider({ profileId, ageGroup, children }) {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpProgress, setXpProgress] = useState(0);
  const [xpRequired, setXpRequired] = useState(100);
  const [coins, setCoins] = useState(0);
  const [combo, setCombo] = useState(0);
  const [rewardQueue, setRewardQueue] = useState([]);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(0);
  const [achievementsTotal, setAchievementsTotal] = useState(10);
  const [tokens, setTokens] = useState(0);

  // Variable rewards state
  const [variableRewards, setVariableRewards] = useState(true);
  const [dailyBonusActive, setDailyBonusActive] = useState(false);
  const dailyBonusUsedThisSession = useRef(false);

  // Accumulated awards to sync to server
  const pendingXp = useRef(0);
  const pendingCoins = useRef(0);
  const idCounter = useRef(0);

  // Ref for combo so awardXP always reads the current value even when called
  // immediately after incrementCombo() in the same event handler (before re-render)
  const comboRef = useRef(0);

  const fetchGamification = useCallback(async () => {
    if (!profileId) return;
    try {
      const res = await apiFetch(`/api/gamification/${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setXp(data.totalXp);
        setLevel(data.level);
        setXpProgress(data.xpProgress);
        setXpRequired(data.xpRequired);
        setCoins(data.coins);
        setAchievementsUnlocked(data.achievementsUnlocked);
        setAchievementsTotal(data.achievementsTotal);
      }
      // Fetch token balance
      const tokenRes = await apiFetch(`/api/tokens/${profileId}`);
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        setTokens(tokenData.tokens);
      }
      // Fetch reward state for variable rewards
      const rewardRes = await apiFetch(`/api/progress/${profileId}/reward-state`);
      if (rewardRes.ok) {
        const rewardData = await rewardRes.json();
        setVariableRewards(rewardData.variableRewards);

        // Comeback bonus: auto-award 50 coins if eligible
        if (rewardData.variableRewards && rewardData.comebackBonus?.eligible) {
          pendingCoins.current += 50;
          setCoins(prev => prev + 50);
          const id = ++idCounter.current;
          setRewardQueue(q => [...q, {
            id, type: 'coins', amount: 50,
            label: `+50 coins Welcome Back! (${rewardData.comebackBonus.daysSinceLastSession} days away)`
          }]);
        }

        // Daily bonus availability
        if (rewardData.variableRewards && rewardData.dailyBonus?.available) {
          setDailyBonusActive(true);
          dailyBonusUsedThisSession.current = false;
        }
      }
    } catch {
      // Non-critical
    }
  }, [profileId]);

  useEffect(() => {
    fetchGamification();
    comboRef.current = 0;
    setCombo(0);
    setRewardQueue([]);
    pendingXp.current = 0;
    pendingCoins.current = 0;
    dailyBonusUsedThisSession.current = false;
  }, [profileId, fetchGamification]);

  const pushReward = useCallback((reward) => {
    const id = ++idCounter.current;
    setRewardQueue(q => [...q, { ...reward, id }]);
  }, []);

  const dismissReward = useCallback(() => {
    setRewardQueue(q => q.slice(1));
  }, []);

  const getComboMultiplier = useCallback((currentCombo) => {
    if (currentCombo >= 5) return 2;
    if (currentCombo >= 3) return 1.5;
    return 1;
  }, []);

  const awardXP = useCallback((amount, label) => {
    // Use comboRef for the current combo value — avoids stale closure when
    // incrementCombo() and awardXP() are called together in the same event handler
    const multiplier = getComboMultiplier(comboRef.current);
    let finalAmount = Math.round(amount * multiplier);

    // Daily bonus: 2x XP on first XP award of the session
    let dailyBonusApplied = false;
    if (dailyBonusActive && !dailyBonusUsedThisSession.current) {
      finalAmount *= 2;
      dailyBonusApplied = true;
      dailyBonusUsedThisSession.current = true;
      setDailyBonusActive(false);
      // Mark on server
      if (profileId) {
        apiFetch(`/api/progress/${profileId}/daily-bonus-used`, { method: 'POST' }).catch(() => {});
      }
    }

    pendingXp.current += finalAmount;
    setXp(prev => prev + finalAmount);

    // Compute level-up iteratively so large awards spanning multiple levels are handled correctly
    setXpProgress(prev => {
      let newProgress = prev + finalAmount;
      let currentReq = xpRequired;
      let levelsGained = 0;

      while (newProgress >= currentReq) {
        newProgress -= currentReq;
        levelsGained++;
        // xpRequired for the level after the one we're about to set
        currentReq = Math.floor(100 * Math.pow(1.5, (level + levelsGained) - 1));
      }

      if (levelsGained > 0) {
        const newLevel = level + levelsGained;
        setLevel(newLevel);
        setXpRequired(currentReq);
        for (let i = 1; i <= levelsGained; i++) {
          const gainedLevel = level + i;
          pushReward({ type: 'level-up', amount: gainedLevel, label: `Level ${gainedLevel}` });
          if (ageGroup && ageGroup !== 'adult') {
            if (gainedLevel === 3) {
              pushReward({ type: 'unlock', label: 'Quests Unlocked!', description: 'You can now track daily and weekly quests' });
            }
            if (gainedLevel === 5) {
              pushReward({ type: 'unlock', label: 'Achievements & Streaks Unlocked!', description: 'View your achievements and streak progress' });
            }
          }
        }
      }

      return newProgress;
    });

    if (dailyBonusApplied) {
      pushReward({ type: 'xp', amount: finalAmount, label: `+${finalAmount} XP (Daily Bonus! 2x)` });
    } else {
      const displayLabel = multiplier > 1
        ? `+${finalAmount} XP (${multiplier}x combo)`
        : label || `+${finalAmount} XP`;
      pushReward({ type: 'xp', amount: finalAmount, label: displayLabel });
    }
  }, [level, xpRequired, getComboMultiplier, pushReward, dailyBonusActive, profileId, ageGroup]);

  const awardCoins = useCallback((amount, label) => {
    pendingCoins.current += amount;
    setCoins(prev => prev + amount);
    pushReward({ type: 'coins', amount, label: label || `+${amount} coins` });
  }, [pushReward]);

  const incrementCombo = useCallback(() => {
    comboRef.current += 1;
    setCombo(c => c + 1);
  }, []);

  const resetCombo = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
  }, []);

  const syncToServer = useCallback(async () => {
    if (!profileId) return;
    const xpToSync = pendingXp.current;
    const coinsToSync = pendingCoins.current;
    pendingXp.current = 0;
    pendingCoins.current = 0;

    if (xpToSync === 0 && coinsToSync === 0) return;

    try {
      const res = await apiFetch(`/api/gamification/${profileId}/award`, {
        method: 'POST',
        body: JSON.stringify({ xp: xpToSync, coins: coinsToSync, reason: 'session-sync' })
      });
      if (res.ok) {
        const data = await res.json();
        // Sync with server truth
        if (data.xp) {
          setXp(data.xp.totalXp);
          setLevel(data.xp.level);
          setXpProgress(data.xp.xpProgress);
          setXpRequired(data.xp.xpRequired);
        }
        if (data.coins) {
          setCoins(data.coins.coins);
        }
        // Queue any newly unlocked achievements
        if (data.newAchievements?.length > 0) {
          for (const a of data.newAchievements) {
            pushReward({ type: 'achievement', label: a.name, icon: a.icon, description: a.description });
          }
          setAchievementsUnlocked(prev => prev + data.newAchievements.length);
        }
      }
    } catch {
      // Put back what we couldn't sync
      pendingXp.current += xpToSync;
      pendingCoins.current += coinsToSync;
    }
  }, [profileId, pushReward]);

  const value = useMemo(() => ({
    xp, level, coins, combo, xpProgress, xpRequired,
    achievementsUnlocked, achievementsTotal,
    tokens, setTokens,
    variableRewards, dailyBonusActive,
    rewardQueue,
    awardXP, awardCoins, incrementCombo, resetCombo,
    syncToServer, fetchGamification, dismissReward,
    getComboMultiplier
  }), [
    xp, level, coins, combo, xpProgress, xpRequired,
    achievementsUnlocked, achievementsTotal,
    tokens,
    variableRewards, dailyBonusActive,
    rewardQueue,
    awardXP, awardCoins, incrementCombo, resetCombo,
    syncToServer, fetchGamification, dismissReward,
    getComboMultiplier
  ]);

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}
