import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';

const GamificationContext = createContext(null);

export function useGamification() {
  return useContext(GamificationContext);
}

export function GamificationProvider({ profileId, children }) {
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

  // Accumulated awards to sync to server
  const pendingXp = useRef(0);
  const pendingCoins = useRef(0);
  const idCounter = useRef(0);

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
    } catch {
      // Non-critical
    }
  }, [profileId]);

  useEffect(() => {
    fetchGamification();
    setCombo(0);
    setRewardQueue([]);
    pendingXp.current = 0;
    pendingCoins.current = 0;
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
    const multiplier = getComboMultiplier(combo);
    const finalAmount = Math.round(amount * multiplier);
    pendingXp.current += finalAmount;

    setXp(prev => prev + finalAmount);
    setXpProgress(prev => {
      const newProgress = prev + finalAmount;
      if (newProgress >= xpRequired) {
        // Level up
        const overflow = newProgress - xpRequired;
        setLevel(l => {
          const newLevel = l + 1;
          // Approximate next level XP requirement
          setXpRequired(Math.floor(100 * Math.pow(1.5, newLevel - 1)));
          pushReward({ type: 'level-up', amount: newLevel, label: `Level ${newLevel}` });
          return newLevel;
        });
        return overflow;
      }
      return newProgress;
    });

    const displayLabel = multiplier > 1
      ? `+${finalAmount} XP (${multiplier}x combo)`
      : label || `+${finalAmount} XP`;
    pushReward({ type: 'xp', amount: finalAmount, label: displayLabel });
  }, [combo, xpRequired, getComboMultiplier, pushReward]);

  const awardCoins = useCallback((amount, label) => {
    pendingCoins.current += amount;
    setCoins(prev => prev + amount);
    pushReward({ type: 'coins', amount, label: label || `+${amount} coins` });
  }, [pushReward]);

  const incrementCombo = useCallback(() => {
    setCombo(c => c + 1);
  }, []);

  const resetCombo = useCallback(() => {
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

  const value = {
    xp, level, coins, combo, xpProgress, xpRequired,
    achievementsUnlocked, achievementsTotal,
    tokens, setTokens,
    rewardQueue,
    awardXP, awardCoins, incrementCombo, resetCombo,
    syncToServer, fetchGamification, dismissReward,
    getComboMultiplier
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}
