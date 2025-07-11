class PigClickerGame {
  constructor() {
    this.coins = 0;
    this.pigsRaised = 0;
    this.pigsHarvested = 0;
    this.totalClicks = 0;
    this.ribbonsWon = 0;
    this.ribbonChance = GAME_CONFIG.RIBBON.baseChance;
    this.currentPig = null;
    this.autoClickers = 0;
    this.autoClickerSpeed = GAME_CONFIG.AUTO_CLICKER.baseSpeed;
    this.autoClickerUpgrades = 0;
    this.autoClickerIntervals = [];
    this.activeElements = new Set();
    this.boundEventHandlers = new Map();

    // Music system
    this.bgMusic = null;
    this.musicMuted = false;

    // Achievement system
    this.achievements = {};
    this.newAchievements = [];

    // Track kills by pig type for multiplier system
    this.pigKills = {
      runt: 0,
      piglet: 0,
      farm: 0,
      prize: 0,
      royal: 0,
      diamond: 0,
      legendary: 0,
    };

    // Initialize achievements
    Object.keys(GAME_CONFIG.ACHIEVEMENTS).forEach((key) => {
      this.achievements[key] = false;
    });

    this.init();
  }

  init() {
    this.loadGame();
    this.updateUI();
    this.bindEvents();
    this.initMusic();
    this.initAchievements();
    this.startAutoClickers();

    // Remove loading screen
    setTimeout(() => {
      const loadingEl = document.querySelector(".loading");
      if (loadingEl) {
        loadingEl.style.display = "none";
      }
    }, GAME_CONFIG.TIMING.loadingScreenDuration);

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => this.cleanup());

    // Auto-save
    setInterval(() => this.saveGame(), GAME_CONFIG.TIMING.saveInterval);
  }

  cleanup() {
    // Pause music
    if (this.bgMusic) {
      this.bgMusic.pause();
    }

    // Clear all intervals
    this.autoClickerIntervals.forEach((interval) => clearInterval(interval));
    this.autoClickerIntervals = [];

    // Remove active elements
    this.activeElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.activeElements.clear();

    // Remove bound event handlers
    this.boundEventHandlers.forEach((handler, element) => {
      if (element.removeEventListener) {
        element.removeEventListener("click", handler);
      }
    });
    this.boundEventHandlers.clear();
  }

  safeElementOperation(elementId, operation) {
    try {
      const element = document.getElementById(elementId);
      if (element) {
        return operation(element);
      }
    } catch (error) {
      console.warn(`Element operation failed for ${elementId}:`, error);
    }
    return null;
  }

  // Calculate dynamic pig stats based on kills
  getPigStats(type) {
    const baseStats = GAME_CONFIG.PIG_TYPES[type];
    const kills = this.pigKills[type] || 0;

    return {
      cost: baseStats.baseCost,
      startValue: baseStats.baseStartValue + kills, // +1 gold per previous kill
      clickValue: baseStats.baseClickValue,
      image: baseStats.image,
      emoji: baseStats.emoji,
      className: baseStats.className,
      name: baseStats.name,
    };
  }

  buyPig(type) {
    const pigStats = this.getPigStats(type);
    if (this.currentPig || this.coins < pigStats.cost) {
      this.showNotification("Cannot buy pig!", "error");
      return;
    }

    this.coins -= pigStats.cost;
    this.pigsRaised++;

    this.currentPig = {
      type: type,
      value: pigStats.startValue,
      ribbons: 0,
    };

    this.createPigElement();
    this.updateRibbonCollection();
    this.updateUI();
    this.saveGame();
    this.showNotification(
      `${type.charAt(0).toUpperCase() + type.slice(1)} pig purchased!`,
      "success"
    );

    // Check achievements
    this.checkAchievements();
  }

  createPigElement() {
    const pigStats = this.getPigStats(this.currentPig.type);
    const pigArea = document.getElementById("pig-area");
    if (!pigArea) return;

    // Show kill bonus if applicable
    const killBonus = this.pigKills[this.currentPig.type] || 0;
    const bonusText = killBonus > 0 ? ` (+${killBonus} kill bonus!)` : "";

    // Create pig image element with fallback
    const pigImageHTML = `
      <img src="${pigStats.image}" 
           alt="${this.currentPig.type} pig" 
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <span class="pig-emoji" style="display: none;">${pigStats.emoji}</span>
    `;

    pigArea.innerHTML = `
      <div class="pig-container">
        <div class="pig-value">💰 ${this.formatNumber(
          this.currentPig.value
        )} coins${bonusText}</div>
        <div class="pig ${pigStats.className}" id="current-pig">
          ${pigImageHTML}
          <div class="ribbon-display" id="ribbon-display" style="display: none;">
            🎀<span id="ribbon-count">0</span>
          </div>
        </div>
        <button class="kill-button" id="kill-pig-btn">
          💀 HARVEST PIG 💀
        </button>
      </div>
    `;

    // Add event listeners with proper cleanup tracking
    const pigElement = document.getElementById("current-pig");
    const killButton = document.getElementById("kill-pig-btn");

    if (pigElement) {
      const pigHandler = (e) => this.clickPig(e);
      pigElement.addEventListener("click", pigHandler);
      this.boundEventHandlers.set(pigElement, pigHandler);
    }

    if (killButton) {
      const killHandler = () => this.killPig();
      killButton.addEventListener("click", killHandler);
      this.boundEventHandlers.set(killButton, killHandler);
    }

    // Apply initial appearance
    this.updatePigAppearance();
    this.updateRibbonDisplay();
  }

  clickPig(event, isAutoClick = false) {
    if (!this.currentPig) return;

    const pigStats = this.getPigStats(this.currentPig.type);
    this.currentPig.value += pigStats.clickValue;
    this.totalClicks++;

    // Check for ribbon
    if (Math.random() * 100 < this.ribbonChance) {
      this.awardRibbon(event, isAutoClick);
    }

    // Update appearance
    this.updatePigAppearance();

    // Show click effect
    this.showClickEffect(event, `+${pigStats.clickValue}`);

    // Create particles
    this.createParticles(event.clientX, event.clientY);

    // Haptic feedback for mobile (only for real user clicks)
    if (!isAutoClick && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }

    this.updateUI();
    this.checkAchievements();
  }

  initAchievements() {
    // Bind achievement drawer events
    this.safeElementOperation("achievements-btn", (element) => {
      const handler = () => this.showAchievements();
      element.addEventListener("click", handler);
      this.boundEventHandlers.set(element, handler);
    });

    this.safeElementOperation("close-achievements", (element) => {
      const handler = () => this.hideAchievements();
      element.addEventListener("click", handler);
      this.boundEventHandlers.set(element, handler);
    });

    this.safeElementOperation("achievements-overlay", (element) => {
      const handler = () => this.hideAchievements();
      element.addEventListener("click", handler);
      this.boundEventHandlers.set(element, handler);
    });

    this.updateAchievementsDisplay();
  }

  showAchievements() {
    this.safeElementOperation("achievements-drawer", (drawer) => {
      drawer.classList.add("open");
    });
    this.safeElementOperation("achievements-overlay", (overlay) => {
      overlay.classList.add("visible");
    });
    // Remove new achievement indicator
    this.newAchievements = [];
    this.updateAchievementButton();
  }

  hideAchievements() {
    this.safeElementOperation("achievements-drawer", (drawer) => {
      drawer.classList.remove("open");
    });
    this.safeElementOperation("achievements-overlay", (overlay) => {
      overlay.classList.remove("visible");
    });
  }

  checkAchievements() {
    const newlyUnlocked = [];

    Object.entries(GAME_CONFIG.ACHIEVEMENTS).forEach(([key, achievement]) => {
      if (this.achievements[key]) return; // Already unlocked

      let unlocked = false;
      const req = achievement.requirement;

      switch (req.type) {
        case "clicks":
          unlocked = this.totalClicks >= req.value;
          break;
        case "harvested":
          unlocked = this.pigsHarvested >= req.value;
          break;
        case "ribbons":
          unlocked = this.ribbonsWon >= req.value;
          break;
        case "coins":
          unlocked = this.coins >= req.value;
          break;
        case "autoClickers":
          unlocked = this.autoClickers >= req.value;
          break;
        case "autoClickerUpgrades":
          unlocked = this.autoClickerUpgrades >= req.value;
          break;
        case "pigKills":
          unlocked = (this.pigKills[req.subtype] || 0) >= req.value;
          break;
        case "pigType":
          unlocked = this.currentPig && this.currentPig.type === req.value;
          break;
      }

      if (unlocked) {
        this.achievements[key] = true;
        newlyUnlocked.push(achievement);
        this.newAchievements.push(key);
      }
    });

    if (newlyUnlocked.length > 0) {
      this.updateAchievementsDisplay();
      this.updateAchievementButton();

      // Show achievement notifications
      newlyUnlocked.forEach((achievement, index) => {
        setTimeout(() => {
          this.showAchievementNotification(achievement);
        }, index * 1000);
      });
    }
  }

  showAchievementNotification(achievement) {
    const notification = document.createElement("div");
    notification.className = "achievement-notification";
    notification.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">${achievement.icon}</div>
      <div style="font-size: 1.1rem; margin-bottom: 0.25rem;">Achievement Unlocked!</div>
      <div style="font-size: 1rem; font-weight: 600;">${achievement.name}</div>
    `;

    document.body.appendChild(notification);
    this.activeElements.add(notification);

    setTimeout(() => {
      this.removeElement(notification);
    }, 3000);
  }

  updateAchievementsDisplay() {
    this.safeElementOperation("achievements-content", (content) => {
      content.innerHTML = "";

      Object.entries(GAME_CONFIG.ACHIEVEMENTS).forEach(([key, achievement]) => {
        const unlocked = this.achievements[key];

        const item = document.createElement("div");
        item.className = `achievement-item ${unlocked ? "unlocked" : "locked"}`;

        item.innerHTML = `
          <div class="achievement-icon">${achievement.icon}</div>
          <div class="achievement-info">
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
          </div>
        `;

        content.appendChild(item);
      });
    });
  }

  updateAchievementButton() {
    this.safeElementOperation("achievements-btn", (button) => {
      if (this.newAchievements.length > 0) {
        button.classList.add("has-new");
      } else {
        button.classList.remove("has-new");
      }
    });
  }

  addRibbonToCollection() {
    this.safeElementOperation("ribbon-collection", (collection) => {
      const ribbon = document.createElement("div");
      ribbon.className = "collected-ribbon";
      ribbon.textContent = "🎀";

      collection.appendChild(ribbon);
      this.activeElements.add(ribbon);

      // Auto-scroll to show new ribbon
      collection.scrollLeft = collection.scrollWidth;
    });
  }

  updateRibbonCollection() {
    this.safeElementOperation("ribbon-collection", (collection) => {
      const currentRibbons = this.currentPig ? this.currentPig.ribbons : 0;
      const existingRibbons =
        collection.querySelectorAll(".collected-ribbon").length;

      // Clear collection if no pig or starting fresh
      if (!this.currentPig) {
        collection.innerHTML =
          '<div class="ribbon-collection-empty">No ribbons yet - click to collect!</div>';
        return;
      }

      // Remove empty message if it exists
      const emptyMsg = collection.querySelector(".ribbon-collection-empty");
      if (emptyMsg) {
        emptyMsg.remove();
      }

      // Add new ribbons if current pig has more
      for (let i = existingRibbons; i < currentRibbons; i++) {
        this.addRibbonToCollection();
      }
    });
  }

  updateRibbonUpgradeShop() {
    const currentLevel = this.ribbonChance - 1;

    this.safeElementOperation("ribbon-upgrade-price", (priceElement) => {
      this.safeElementOperation("ribbon-upgrade-desc", (descElement) => {
        this.safeElementOperation("buy-ribbon-upgrade", (shopItem) => {
          if (currentLevel >= GAME_CONFIG.RIBBON.upgradeCosts.length) {
            priceElement.textContent = "MAXED";
            descElement.textContent = `Ribbon chance is at maximum (${GAME_CONFIG.RIBBON.maxChance}%)!`;
            shopItem.classList.add("disabled");
            shopItem.classList.remove("affordable");
          } else {
            const cost = GAME_CONFIG.RIBBON.upgradeCosts[currentLevel];
            const nextLevel = this.ribbonChance + 1;
            priceElement.textContent = this.formatNumber(cost) + " coins";
            descElement.textContent = `Increase ribbon chance from ${this.ribbonChance}% to ${nextLevel}% per click.`;

            shopItem.classList.toggle("affordable", this.coins >= cost);
            shopItem.classList.remove("disabled");
          }
        });
      });
    });
  }

  buyRibbonUpgrade() {
    const currentLevel = this.ribbonChance - 1;

    if (currentLevel >= GAME_CONFIG.RIBBON.upgradeCosts.length) {
      this.showNotification("Ribbon chance maxed out!", "info");
      return;
    }

    const cost = GAME_CONFIG.RIBBON.upgradeCosts[currentLevel];
    if (this.coins >= cost) {
      this.coins -= cost;
      this.ribbonChance++;
      this.updateUI();
      this.saveGame();
      this.showNotification(
        `Ribbon chance increased to ${this.ribbonChance}%!`,
        "success"
      );
    } else {
      this.showNotification("Not enough coins!", "error");
    }
  }

  awardRibbon(event, isAutoClick = false) {
    this.currentPig.ribbons++;
    this.ribbonsWon++;

    // Apply 25% bonus to current value
    const bonus = Math.floor(
      this.currentPig.value * (GAME_CONFIG.RIBBON.bonusPercent / 100)
    );
    this.currentPig.value += bonus;

    // Show ribbon effect
    this.showRibbonEffect(event, bonus);

    // Create sparkles
    this.createSparkles(event.clientX, event.clientY);

    // Update ribbon display and collection
    this.updateRibbonDisplay();
    this.updateRibbonCollection();

    // Haptic feedback for mobile (only for real user clicks)
    if (!isAutoClick && window.navigator.vibrate) {
      window.navigator.vibrate([50, 30, 50]);
    }

    this.checkAchievements();
  }

  showRibbonEffect(event, bonus) {
    const effect = document.createElement("div");
    effect.className = "ribbon-effect";
    effect.textContent = `🎀 +${this.formatNumber(bonus)} BONUS!`;
    effect.style.left = event.clientX + "px";
    effect.style.top = event.clientY + "px";

    document.body.appendChild(effect);
    this.activeElements.add(effect);

    setTimeout(() => {
      this.removeElement(effect);
    }, GAME_CONFIG.TIMING.ribbonEffectDuration);
  }

  createSparkles(x, y) {
    for (let i = 0; i < GAME_CONFIG.EFFECTS.sparkleCount; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "ribbon-sparkle";
      sparkle.style.left = x + "px";
      sparkle.style.top = y + "px";

      const dx = (Math.random() - 0.5) * 120;
      const dy = (Math.random() - 0.5) * 120;
      sparkle.style.setProperty("--dx", dx + "px");
      sparkle.style.setProperty("--dy", dy + "px");

      document.body.appendChild(sparkle);
      this.activeElements.add(sparkle);

      setTimeout(() => {
        this.removeElement(sparkle);
      }, GAME_CONFIG.TIMING.sparkleEffectDuration);
    }
  }

  updateRibbonDisplay() {
    this.safeElementOperation("ribbon-display", (ribbonDisplay) => {
      this.safeElementOperation("ribbon-count", (ribbonCount) => {
        if (this.currentPig && this.currentPig.ribbons > 0) {
          ribbonDisplay.style.display = "flex";
          ribbonCount.textContent = this.currentPig.ribbons;
        } else {
          ribbonDisplay.style.display = "none";
        }
      });
    });
  }

  updatePigAppearance() {
    if (!this.currentPig) return;

    const value = this.currentPig.value;

    this.safeElementOperation("current-pig", (pigElement) => {
      const valueElement = document.querySelector(".pig-value");
      const killButton = document.getElementById("kill-pig-btn");

      if (!valueElement || !killButton) return;

      // Update value display
      const killBonus = this.pigKills[this.currentPig.type] || 0;
      const bonusText = killBonus > 0 ? ` (+${killBonus} kill bonus!)` : "";
      valueElement.textContent = `💰 ${this.formatNumber(
        value
      )} coins${bonusText}`;

      // Dynamic scaling based on value
      let scale = 1 + Math.min(value / 500, 0.5);
      pigElement.style.transform = `scale(${scale})`;

      // Update colors and effects based on value thresholds
      if (value >= 500) {
        valueElement.style.color = "#e91e63";
        killButton.textContent = "👑 LEGENDARY HARVEST 👑";
        killButton.style.background =
          "linear-gradient(135deg, #4ade80, #22c55e)";
      } else if (value >= 200) {
        valueElement.style.color = "#f44336";
        killButton.textContent = "💎 EPIC HARVEST 💎";
        killButton.style.background =
          "linear-gradient(135deg, #f59e0b, #f97316)";
      } else if (value >= 100) {
        valueElement.style.color = "#ff9800";
        killButton.textContent = "🔥 MEGA HARVEST 🔥";
        killButton.style.background =
          "linear-gradient(135deg, #ef4444, #dc2626)";
      } else if (value >= 50) {
        valueElement.style.color = "#fbbf24";
        killButton.textContent = "⚔️ HARVEST PIG ⚔️";
      } else {
        valueElement.style.color = "#4ade80";
        killButton.textContent = "💀 HARVEST PIG 💀";
      }

      // Add glow effect for high values
      if (value >= 100) {
        pigElement.style.boxShadow = `0 0 ${20 + value / 10}px currentColor`;
      }
    });
  }

  showClickEffect(event, text) {
    const effect = document.createElement("div");
    effect.className = "click-effect";
    effect.textContent = text;
    effect.style.left = event.clientX + "px";
    effect.style.top = event.clientY + "px";

    document.body.appendChild(effect);
    this.activeElements.add(effect);

    setTimeout(() => {
      this.removeElement(effect);
    }, GAME_CONFIG.TIMING.effectDuration);
  }

  createParticles(x, y) {
    for (let i = 0; i < GAME_CONFIG.EFFECTS.particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = x + "px";
      particle.style.top = y + "px";
      particle.style.setProperty("--x", `${(Math.random() - 0.5) * 100}px`);
      particle.style.setProperty("--y", `${(Math.random() - 0.5) * 100}px`);
      particle.style.backgroundColor = ["#4ade80", "#ec4899", "#fbbf24"][
        Math.floor(Math.random() * 3)
      ];

      document.body.appendChild(particle);
      this.activeElements.add(particle);

      setTimeout(() => {
        this.removeElement(particle);
      }, GAME_CONFIG.TIMING.particleDuration);
    }
  }

  removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    this.activeElements.delete(element);
  }

  killPig() {
    if (!this.currentPig) return;

    const value = this.currentPig.value;
    const pigType = this.currentPig.type;
    const previousKills = this.pigKills[pigType] || 0;

    this.coins += value;
    this.pigsHarvested++;

    // Increment kill counter for this pig type
    this.pigKills[pigType] = previousKills + 1;

    // Calculate the bonus from kills (how much extra we got from previous kills)
    const killBonus = previousKills; // Each previous kill added +1 to start value

    this.showDeathMessage(
      `💰 Earned ${this.formatNumber(value)} coins! 💰 ${
        killBonus > 0 ? `(+${killBonus} slaughter bonus)` : ""
      }`
    );

    this.currentPig = null;
    this.safeElementOperation("pig-area", (pigArea) => {
      pigArea.innerHTML =
        '<div class="no-pig">🌾 Pig harvested! Buy a new one from the shop → 🛒</div>';
    });

    // Clear ribbon collection
    this.updateRibbonCollection();

    this.updateUI();
    this.saveGame();
    this.checkAchievements();
  }

  showDeathMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "death-message";
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    this.activeElements.add(messageElement);

    // Confetti effect
    this.createConfetti();

    setTimeout(() => {
      messageElement.classList.add("death-fade-out");
      setTimeout(() => {
        this.removeElement(messageElement);
      }, 500);
    }, GAME_CONFIG.TIMING.deathMessageDuration);
  }

  createConfetti() {
    const colors = ["#4ade80", "#ec4899", "#fbbf24", "#3b82f6", "#8b5cf6"];
    for (let i = 0; i < GAME_CONFIG.EFFECTS.confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement("div");
        confetti.className = "particle";
        confetti.style.left = Math.random() * window.innerWidth + "px";
        confetti.style.top = window.innerHeight / 2 + "px";
        confetti.style.setProperty("--x", `${(Math.random() - 0.5) * 300}px`);
        confetti.style.setProperty("--y", `${Math.random() * -300}px`);
        confetti.style.backgroundColor =
          colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = "15px";
        confetti.style.height = "15px";

        document.body.appendChild(confetti);
        this.activeElements.add(confetti);

        setTimeout(() => {
          this.removeElement(confetti);
        }, GAME_CONFIG.TIMING.confettiDuration);
      }, i * GAME_CONFIG.EFFECTS.confettiDelay);
    }
  }

  buyAutoClicker() {
    const cost = GAME_CONFIG.AUTO_CLICKER.baseCost;
    if (this.autoClickers > 0) {
      this.showNotification(
        "You already have an auto-clicker! Use upgrades to make it faster.",
        "info"
      );
      return;
    }

    if (this.coins >= cost) {
      this.coins -= cost;
      this.autoClickers++;
      this.updateUI();
      this.saveGame();
      this.showNotification(
        "Auto Clicker purchased! Use upgrades to make it faster.",
        "success"
      );
      this.restartAutoClickers();
      this.checkAchievements();
    } else {
      this.showNotification("Not enough coins!", "error");
    }
  }

  upgradeAutoClicker() {
    const cost = Math.floor(
      GAME_CONFIG.AUTO_CLICKER.upgradeBaseCost *
        Math.pow(
          GAME_CONFIG.AUTO_CLICKER.upgradeCostMultiplier,
          this.autoClickerUpgrades
        )
    );
    if (this.coins >= cost && this.autoClickers > 0) {
      this.coins -= cost;
      this.autoClickerUpgrades++;
      // Each upgrade makes auto-clickers faster
      this.autoClickerSpeed = Math.max(
        GAME_CONFIG.AUTO_CLICKER.minSpeed,
        Math.floor(
          GAME_CONFIG.AUTO_CLICKER.baseSpeed /
            Math.pow(
              GAME_CONFIG.AUTO_CLICKER.speedMultiplier,
              this.autoClickerUpgrades
            )
        )
      );
      this.updateUI();
      this.saveGame();
      this.showNotification(
        `Auto Clickers upgraded! Now ${(this.autoClickerSpeed / 1000).toFixed(
          1
        )}s interval`,
        "success"
      );
      this.restartAutoClickers();
      this.checkAchievements();
    } else {
      this.showNotification("Cannot upgrade!", "error");
    }
  }

  startAutoClickers() {
    // Clear existing intervals
    this.autoClickerIntervals.forEach((interval) => clearInterval(interval));
    this.autoClickerIntervals = [];

    // Create new intervals for each auto clicker
    for (let i = 0; i < this.autoClickers; i++) {
      const interval = setInterval(() => {
        if (this.currentPig) {
          const pigElement = document.getElementById("current-pig");
          if (pigElement) {
            const rect = pigElement.getBoundingClientRect();
            this.clickPig(
              {
                clientX:
                  rect.left + rect.width / 2 + (Math.random() - 0.5) * 50,
                clientY:
                  rect.top + rect.height / 2 + (Math.random() - 0.5) * 50,
              },
              true
            ); // Pass true to indicate this is an auto-click
          }
        }
      }, this.autoClickerSpeed);
      this.autoClickerIntervals.push(interval);
    }
  }

  restartAutoClickers() {
    this.startAutoClickers();
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      color: white;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
    `;

    if (type === "success") {
      notification.style.background =
        "linear-gradient(135deg, #4ade80, #22c55e)";
    } else if (type === "error") {
      notification.style.background =
        "linear-gradient(135deg, #ef4444, #dc2626)";
    } else {
      notification.style.background =
        "linear-gradient(135deg, #3b82f6, #2563eb)";
    }

    notification.textContent = message;
    document.body.appendChild(notification);
    this.activeElements.add(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-out forwards";
      setTimeout(() => {
        this.removeElement(notification);
      }, 300);
    }, GAME_CONFIG.TIMING.notificationDuration);
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }

  updateUI() {
    // Update stats with safe operations
    const updates = [
      { id: "coins", value: this.formatNumber(this.coins) },
      { id: "pigs-raised", value: this.formatNumber(this.pigsRaised) },
      { id: "pigs-harvested", value: this.formatNumber(this.pigsHarvested) },
      { id: "total-clicks", value: this.formatNumber(this.totalClicks) },
      { id: "ribbons-won", value: this.formatNumber(this.ribbonsWon) },
      { id: "ribbon-chance", value: this.ribbonChance + "%" },
      { id: "auto-clicker-count", value: this.autoClickers },
      {
        id: "auto-clicker-speed",
        value: (this.autoClickerSpeed / 1000).toFixed(1) + "s",
      },
    ];

    updates.forEach(({ id, value }) => {
      this.safeElementOperation(id, (element) => {
        element.textContent = value;
      });
    });

    // Update shop affordability with dynamic costs and kill counts
    const shopUpdates = [
      { id: "buy-runt-pig", type: "runt" },
      { id: "buy-piglet-pig", type: "piglet" },
      { id: "buy-farm-pig", type: "farm" },
      { id: "buy-prize-pig", type: "prize" },
      { id: "buy-royal-pig", type: "royal" },
      { id: "buy-diamond-pig", type: "diamond" },
      { id: "buy-legendary-pig", type: "legendary" },
    ];

    shopUpdates.forEach(({ id, type }) => {
      const pigStats = this.getPigStats(type);
      const killCount = this.pigKills[type] || 0;

      // Update affordability
      this.updateShopItem(id, pigStats.cost, !this.currentPig);

      // Update description with kill count and bonus info
      this.safeElementOperation(id, (element) => {
        const descElement = element.querySelector(".item-description");
        if (descElement) {
          const baseStats = GAME_CONFIG.PIG_TYPES[type];
          const killBonus = killCount > 0 ? ` (+${killCount} kill bonus)` : "";
          const killCountText = killCount > 0 ? ` | ${killCount} killed` : "";

          descElement.innerHTML = `
            ${baseStats.baseStartValue + killCount} coins start${killBonus}, +${
            baseStats.baseClickValue
          } per click.${killCountText}
          `;
        }
      });
    });

    this.updateShopItem(
      "buy-auto-clicker",
      GAME_CONFIG.AUTO_CLICKER.baseCost,
      this.autoClickers === 0
    );

    // Hide auto-clicker purchase button if already owned
    this.safeElementOperation("buy-auto-clicker", (element) => {
      if (this.autoClickers > 0) {
        element.style.display = "none";
      } else {
        element.style.display = "block";
      }
    });

    // Update auto-clicker upgrade with dynamic cost
    const autoClickerUpgradeCost = Math.floor(
      GAME_CONFIG.AUTO_CLICKER.upgradeBaseCost *
        Math.pow(
          GAME_CONFIG.AUTO_CLICKER.upgradeCostMultiplier,
          this.autoClickerUpgrades
        )
    );
    this.updateShopItem(
      "upgrade-auto-clicker",
      autoClickerUpgradeCost,
      this.autoClickers > 0
    );

    // Update auto-clicker upgrade price display
    this.safeElementOperation("upgrade-auto-clicker", (element) => {
      const priceElement = element.querySelector(".item-price");
      if (priceElement) {
        priceElement.textContent =
          this.formatNumber(autoClickerUpgradeCost) + " coins";
      }
    });

    // Update ribbon upgrade
    this.updateRibbonUpgradeShop();
  }

  updateShopItem(elementId, cost, canBuy) {
    this.safeElementOperation(elementId, (element) => {
      const affordable = this.coins >= cost;
      element.classList.toggle("affordable", affordable && canBuy);
      element.classList.toggle("disabled", !canBuy);
    });
  }

  saveGame() {
    const gameState = {
      coins: this.coins,
      pigsRaised: this.pigsRaised,
      pigsHarvested: this.pigsHarvested,
      totalClicks: this.totalClicks,
      ribbonsWon: this.ribbonsWon,
      ribbonChance: this.ribbonChance,
      currentPig: this.currentPig,
      autoClickers: this.autoClickers,
      autoClickerUpgrades: this.autoClickerUpgrades,
      autoClickerSpeed: this.autoClickerSpeed,
      pigKills: this.pigKills,
      musicMuted: this.musicMuted,
      achievements: this.achievements,
      newAchievements: this.newAchievements,
    };

    // Save to localStorage when available
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("pigClickerSave", JSON.stringify(gameState));
      } catch (error) {
        console.warn("Could not save game:", error);
      }
    }
  }

  loadGame() {
    // Load from localStorage when available
    if (typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem("pigClickerSave");
        if (saved) {
          const gameState = JSON.parse(saved);

          // Load basic properties
          Object.assign(this, gameState);

          // Ensure pigKills exists (backwards compatibility)
          if (!this.pigKills) {
            this.pigKills = {
              runt: 0,
              piglet: 0,
              farm: 0,
              prize: 0,
              royal: 0,
              diamond: 0,
              legendary: 0,
            };
          }

          // Load music preference (default to unmuted)
          if (typeof this.musicMuted === "undefined") {
            this.musicMuted = false;
          }

          // Load achievements (ensure all exist)
          if (!this.achievements) {
            this.achievements = {};
          }
          Object.keys(GAME_CONFIG.ACHIEVEMENTS).forEach((key) => {
            if (typeof this.achievements[key] === "undefined") {
              this.achievements[key] = false;
            }
          });

          // Load new achievements indicator
          if (!this.newAchievements) {
            this.newAchievements = [];
          }

          // Recreate pig if one exists
          if (this.currentPig) {
            this.createPigElement();
            this.updateRibbonCollection();
          }
        }
      } catch (error) {
        console.warn("Could not load game:", error);
      }
    }
  }

  initMusic() {
    this.bgMusic = document.getElementById("bg-music");
    const muteBtn = document.getElementById("mute-btn");

    if (this.bgMusic && muteBtn) {
      // Set initial volume
      this.bgMusic.volume = GAME_CONFIG.AUDIO.defaultVolume;

      // Try to play music (some browsers require user interaction first)
      this.playMusic();

      // Mute button handler
      const muteHandler = () => this.toggleMusic();
      muteBtn.addEventListener("click", muteHandler);
      this.boundEventHandlers.set(muteBtn, muteHandler);

      // Update button state
      this.updateMuteButton();
    }
  }

  playMusic() {
    if (this.bgMusic && !this.musicMuted) {
      this.bgMusic.play().catch((error) => {
        // Auto-play failed (common in modern browsers)
        console.log(
          "Auto-play prevented. Music will start on first user interaction."
        );

        // Add one-time click handler to start music
        const startMusic = () => {
          if (!this.musicMuted) {
            this.bgMusic.play();
          }
          document.removeEventListener("click", startMusic);
        };
        document.addEventListener("click", startMusic);
      });
    }
  }

  toggleMusic() {
    if (!this.bgMusic) return;

    this.musicMuted = !this.musicMuted;

    if (this.musicMuted) {
      this.bgMusic.pause();
    } else {
      this.bgMusic.play();
    }

    this.updateMuteButton();
    this.saveGame(); // Save mute preference
  }

  updateMuteButton() {
    const muteBtn = document.getElementById("mute-btn");
    if (muteBtn) {
      if (this.musicMuted) {
        muteBtn.textContent = "🔇";
        muteBtn.classList.add("muted");
        muteBtn.title = "Unmute Music";
      } else {
        muteBtn.textContent = "🔊";
        muteBtn.classList.remove("muted");
        muteBtn.title = "Mute Music";
      }
    }
  }

  bindEvents() {
    // Shop items - using arrow functions to maintain 'this' context
    const shopItems = [
      { id: "buy-runt-pig", type: "runt" },
      { id: "buy-piglet-pig", type: "piglet" },
      { id: "buy-farm-pig", type: "farm" },
      { id: "buy-prize-pig", type: "prize" },
      { id: "buy-royal-pig", type: "royal" },
      { id: "buy-diamond-pig", type: "diamond" },
      { id: "buy-legendary-pig", type: "legendary" },
    ];

    shopItems.forEach(({ id, type }) => {
      this.safeElementOperation(id, (element) => {
        const handler = () => this.buyPig(type);
        element.addEventListener("click", handler);
        this.boundEventHandlers.set(element, handler);
      });
    });

    // Other shop items
    this.safeElementOperation("buy-auto-clicker", (element) => {
      const handler = () => this.buyAutoClicker();
      element.addEventListener("click", handler);
      this.boundEventHandlers.set(element, handler);
    });

    this.safeElementOperation("upgrade-auto-clicker", (element) => {
      const handler = () => this.upgradeAutoClicker();
      element.addEventListener("click", handler);
      this.boundEventHandlers.set(element, handler);
    });

    this.safeElementOperation("buy-ribbon-upgrade", (element) => {
      const handler = () => this.buyRibbonUpgrade();
      element.addEventListener("click", handler);
      this.boundEventHandlers.set(element, handler);
    });

    // Keyboard shortcuts
    const keyHandler = (e) => {
      if (e.key === " " && this.currentPig) {
        e.preventDefault();
        const pigElement = document.getElementById("current-pig");
        if (pigElement) {
          const rect = pigElement.getBoundingClientRect();
          this.clickPig({
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
          });
        }
      }
    };
    document.addEventListener("keydown", keyHandler);
    this.boundEventHandlers.set(document, keyHandler);
  }
}

// Start the game
document.addEventListener("DOMContentLoaded", () => {
  const game = new PigClickerGame();
});
