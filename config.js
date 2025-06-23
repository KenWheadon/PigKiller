// Game Configuration
const GAME_CONFIG = {
  // Pig Types Configuration
  PIG_TYPES: {
    runt: {
      baseCost: 0,
      baseStartValue: 1,
      baseClickValue: 1,
      image: "runt.png",
      emoji: "🐖",
      className: "runt",
      name: "Runt Pig",
    },
    piglet: {
      baseCost: 25,
      baseStartValue: 3,
      baseClickValue: 2,
      image: "piglet.png",
      emoji: "🐷",
      className: "piglet",
      name: "Piglet",
    },
    farm: {
      baseCost: 100,
      baseStartValue: 8,
      baseClickValue: 3,
      image: "pig.png",
      emoji: "🐷",
      className: "farm",
      name: "Farm Pig",
    },
    prize: {
      baseCost: 500,
      baseStartValue: 25,
      baseClickValue: 5,
      image: "prize.png",
      emoji: "🐽",
      className: "prize",
      name: "Prize Pig",
    },
    royal: {
      baseCost: 2500,
      baseStartValue: 75,
      baseClickValue: 10,
      image: "premium.png",
      emoji: "👑",
      className: "royal",
      name: "Royal Pig",
    },
    diamond: {
      baseCost: 12500,
      baseStartValue: 200,
      baseClickValue: 20,
      image: "diamond.png",
      emoji: "💎",
      className: "diamond",
      name: "Diamond Pig",
    },
    legendary: {
      baseCost: 75000,
      baseStartValue: 600,
      baseClickValue: 50,
      image: "gold.png",
      emoji: "⭐",
      className: "legendary",
      name: "Legendary Pig",
    },
  },

  // Ribbon System
  RIBBON: {
    baseChance: 1, // 1% base chance
    maxChance: 10, // 10% maximum chance
    bonusPercent: 25, // 25% bonus to pig value
    upgradeCosts: [100, 250, 500, 1000, 2000, 4000, 7500, 12500, 20000],
  },

  // Auto-Clicker System
  AUTO_CLICKER: {
    baseCost: 25,
    baseSpeed: 2000, // 2 seconds
    minSpeed: 200, // 0.2 seconds minimum
    upgradeBaseCost: 100,
    upgradeCostMultiplier: 1.5,
    speedMultiplier: 1.25, // 25% faster per upgrade
  },

  // Game Timing
  TIMING: {
    saveInterval: 25000, // Auto-save every 10 seconds
    loadingScreenDuration: 1500, // 1.5 seconds
    notificationDuration: 1000, // 2 seconds
    effectDuration: 1000, // 1 second for click effects
    particleDuration: 2000, // 2 seconds for particles
    ribbonEffectDuration: 2000, // 2 seconds for ribbon effects
    sparkleEffectDuration: 1500, // 1.5 seconds for sparkles
    deathMessageDuration: 1000, // 2 seconds for death messages
    confettiDuration: 2000, // 2 seconds for confetti
  },

  // Visual Effects
  EFFECTS: {
    particleCount: 5,
    sparkleCount: 8,
    confettiCount: 30,
    confettiDelay: 30, // ms between confetti pieces
  },

  // Audio
  AUDIO: {
    defaultVolume: 0.3, // 30% volume
    musicFiles: ["bg.mp3", "bg.ogg", "bg.wav"],
  },

  // Achievements Configuration
  ACHIEVEMENTS: {
    firstClick: {
      id: "firstClick",
      name: "First Click",
      description: "Click a pig for the first time",
      icon: "👆",
      requirement: { type: "clicks", value: 1 },
    },
    clickMaster: {
      id: "clickMaster",
      name: "Click Master",
      description: "Click 100 times",
      icon: "🖱️",
      requirement: { type: "clicks", value: 100 },
    },
    clickLegend: {
      id: "clickLegend",
      name: "Click Legend",
      description: "Click 1,000 times",
      icon: "⚡",
      requirement: { type: "clicks", value: 1000 },
    },
    firstHarvest: {
      id: "firstHarvest",
      name: "First Harvest",
      description: "Harvest your first pig",
      icon: "🔪",
      requirement: { type: "harvested", value: 1 },
    },
    butcher: {
      id: "butcher",
      name: "Butcher",
      description: "Harvest 10 pigs",
      icon: "🥩",
      requirement: { type: "harvested", value: 10 },
    },
    slaughterhouse: {
      id: "slaughterhouse",
      name: "Slaughterhouse",
      description: "Harvest 100 pigs",
      icon: "🏭",
      requirement: { type: "harvested", value: 100 },
    },
    firstRibbon: {
      id: "firstRibbon",
      name: "First Ribbon",
      description: "Win your first ribbon",
      icon: "🎀",
      requirement: { type: "ribbons", value: 1 },
    },
    ribbonCollector: {
      id: "ribbonCollector",
      name: "Ribbon Collector",
      description: "Win 25 ribbons",
      icon: "🏆",
      requirement: { type: "ribbons", value: 25 },
    },
    ribbonMaster: {
      id: "ribbonMaster",
      name: "Ribbon Master",
      description: "Win 100 ribbons",
      icon: "👑",
      requirement: { type: "ribbons", value: 100 },
    },
    coinCollector: {
      id: "coinCollector",
      name: "Coin Collector",
      description: "Earn 1,000 coins",
      icon: "💰",
      requirement: { type: "coins", value: 1000 },
    },
    richFarmer: {
      id: "richFarmer",
      name: "Rich Farmer",
      description: "Earn 10,000 coins",
      icon: "💎",
      requirement: { type: "coins", value: 10000 },
    },
    pigMogul: {
      id: "pigMogul",
      name: "Pig Mogul",
      description: "Earn 100,000 coins",
      icon: "🏰",
      requirement: { type: "coins", value: 100000 },
    },
    automation: {
      id: "automation",
      name: "Automation",
      description: "Buy your first auto-clicker",
      icon: "🤖",
      requirement: { type: "autoClickers", value: 1 },
    },
    speedDemon: {
      id: "speedDemon",
      name: "Speed Demon",
      description: "Upgrade auto-clicker 5 times",
      icon: "⚡",
      requirement: { type: "autoClickerUpgrades", value: 5 },
    },
    runtKiller: {
      id: "runtKiller",
      name: "Runt Killer",
      description: "Kill 10 runt pigs",
      icon: "🐖",
      requirement: { type: "pigKills", subtype: "runt", value: 10 },
    },
    legendaryFarmer: {
      id: "legendaryFarmer",
      name: "Legendary Farmer",
      description: "Raise a legendary pig",
      icon: "⭐",
      requirement: { type: "pigType", value: "legendary" },
    },
  },
};
