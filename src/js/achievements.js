// The DOM-wiring runtime for achievements: checks conditions (defined in
// achievement-conditions.js, loaded before this file), queues an unlock
// modal, and persists unlocked ids alongside the tank save (see
// buildStateObject/applyState in game.js -- Achievements.serialize/restore
// are called from there, not from storage.js, so unlocks ride the same
// save file as the tank instead of a separate storage channel).
const Achievements = (() => {
  const unlocked = new Set();
  const queue = [];

  const isUnlocked = (id) => unlocked.has(id);

  const unlock = (id) => {
    if (unlocked.has(id)) return;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    unlocked.add(id);
    queue.push(def);
    showNextInQueue();
  };

  const showNextInQueue = () => {
    const modal = document.getElementById('achievement-unlock-modal');
    if (!modal.classList.contains('hidden') || queue.length === 0) return;
    const def = queue[0];
    document.getElementById('achievement-unlock-name').textContent = def.name;
    document.getElementById('achievement-unlock-description').textContent = def.description;
    modal.classList.remove('hidden');
  };

  document.getElementById('achievement-unlock-close').addEventListener('click', () => {
    queue.shift();
    document.getElementById('achievement-unlock-modal').classList.add('hidden');
    showNextInQueue();
  });

  const renderList = () => {
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(def => {
      const unlockedNow = isUnlocked(def.id);
      const row = document.createElement('div');
      row.className = 'achievement-row' + (unlockedNow ? ' unlocked' : ' locked');

      const name = document.createElement('div');
      name.className = 'achievement-name';
      name.textContent = unlockedNow ? def.name : '???';

      const description = document.createElement('div');
      description.className = 'achievement-description';
      description.textContent = unlockedNow ? def.description : 'Locked';

      row.append(name, description);
      list.appendChild(row);
    });
  };

  document.getElementById('achievements-btn').addEventListener('click', () => {
    renderList();
    document.getElementById('achievements-modal').classList.remove('hidden');
  });
  document.getElementById('achievements-modal-close').addEventListener('click', () => {
    document.getElementById('achievements-modal').classList.add('hidden');
  });

  // Condition checks run periodically against live tank state -- see
  // game.js's setInterval(Achievements.check, ...). `stats` carries the
  // event-driven counters (births, murders, bubbles, tank age) that aren't
  // observable from an entities snapshot alone -- see achievement-conditions.js.
  const check = (entities, stats) => {
    ACHIEVEMENTS.forEach(def => {
      if (def.condition && def.condition(entities, stats)) unlock(def.id);
    });
  };

  const serialize = () => Array.from(unlocked);
  const restore = (ids) => {
    unlocked.clear();
    (ids || []).forEach(id => unlocked.add(id));
  };

  return { unlock, check, serialize, restore };
})();
