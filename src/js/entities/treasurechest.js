// Dual-sine meandering bubble — matches bubbler-rock visual style
const createChestBubble = (tank, startX, startY) => {
  const b = {
    type: 'bubble',
    x: startX,
    y: startY,
    eaten: false,
    phase:       Math.random() * Math.PI * 2,
    phase2:      Math.random() * Math.PI * 2,
    speed:       3 + Math.random() * 2,
    driftAmp:    0.6 + Math.random() * 0.5,
    driftSpeed:  0.6 + Math.random() * 0.5,
    driftAmp2:   0.3 + Math.random() * 0.3,
    driftSpeed2: 1.3 + Math.random() * 0.7,
  };
  b.update = (dt) => {
    b.y -= b.speed * dt;
    b.phase  += b.driftSpeed  * dt;
    b.phase2 += b.driftSpeed2 * dt;
    b.x += (Math.sin(b.phase) * b.driftAmp + Math.sin(b.phase2) * b.driftAmp2) * dt;
    if (b.x < tank.x1 + 1) b.x = tank.x1 + 1;
    if (b.x > tank.x2 - 1) b.x = tank.x2 - 1;
    if (b.y <= tank.y1 + 2) b.eaten = true;
  };
  b.draw = (ctx) => {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#99eebb';
    ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    ctx.globalAlpha = 1;
  };
  return b;
};

// Colors: 0=shadow, 1=dark wood (lid), 2=mid wood (body), 3=gold/brass, 4=lock highlight
const CHEST_COLORS = [
  'rgb(10,32,10)',
  'rgb(18,55,18)',
  'rgb(25,80,25)',
  'rgb(45,140,45)',
  'rgb(60,190,60)',
];

// Body rows drawn at floor; lid rows drawn offset upward by _lidLift when open
// rows[0] = FLOOR-1 (base), rows[4] = FLOOR-5 (brass band); 10px wide
const CHEST_BODY_ROWS = [
  [0,3,3,3,3,3,3,3,3,0],  // base band
  [0,2,2,2,2,2,2,2,2,0],  // body
  [0,2,2,2,3,3,2,2,2,0],  // lock clasp
  [0,2,2,2,4,4,2,2,2,0],  // lock highlight
  [3,3,3,3,3,3,3,3,3,3],  // brass band
];
const CHEST_LID_ROWS = [
  [0,1,1,1,1,1,1,1,1,0],  // lid
  [0,0,1,1,1,1,1,1,0,0],  // lid top
];

const CHEST_HEIGHT = CHEST_BODY_ROWS.length + CHEST_LID_ROWS.length;
const LID_SPEED = 8; // pixels per second for lid open/close animation

const createTreasureChest = (tank, x) => {
  const FLOOR = tank.y2;

  const chest = {
    type: 'treasure-chest',
    x, y: FLOOR,
    dragged: false,
    intensity: 1.0,
    // Build-up timer: counts toward the next burst
    _buildTimer: 0,
    _buildNext: 20 + Math.random() * 10, // 20–30 s between bursts
    // Burst state: emits _burstRemain bubbles, one every _burstInterval seconds
    _burstRemain: 0,
    _burstTimer: 0,
    _burstInterval: 0,
    // Lid animation: 0 = closed, 3 = fully open (pixels above body top)
    _lidLift: 0,
    _lidTarget: 0,
  };

  chest.update = (dt, entities) => {
    if (chest.dragged) return;

    // Animate lid toward its target
    if (chest._lidLift < chest._lidTarget) {
      chest._lidLift = Math.min(chest._lidTarget, chest._lidLift + LID_SPEED * dt);
    } else if (chest._lidLift > chest._lidTarget) {
      chest._lidLift = Math.max(chest._lidTarget, chest._lidLift - LID_SPEED * dt);
    }

    if (chest._burstRemain > 0) {
      // Mid-burst: fire one bubble per interval until burst is exhausted
      chest._burstTimer += dt;
      if (chest._burstTimer >= chest._burstInterval) {
        chest._burstTimer -= chest._burstInterval;
        const bx = chest.x + (Math.random() - 0.5) * 4;
        const bubble = createChestBubble(tank, bx, FLOOR - CHEST_BODY_ROWS.length - 1);
        entities.push(bubble);
        chest._burstRemain--;
        if (chest._burstRemain === 0) chest._lidTarget = 0;

        // 1% chance a nearby idle fish gets curious about this bubble
        if (Math.random() < 0.01) {
          for (const e of entities) {
            if (e.type === 'fish' && !e.panic && Math.hypot(e.x - bx, e.y - FLOOR) < 20) {
              e.target = bubble;
              break;
            }
          }
        }
      }
    } else {
      // Between bursts: wait for pressure to build
      chest._buildTimer += dt;
      if (chest._buildTimer >= chest._buildNext) {
        chest._buildTimer = 0;
        chest._buildNext = (4 + Math.random() * 4) / chest.intensity;
        chest._burstRemain = Math.max(1, Math.round((3 + Math.floor(Math.random() * 4)) * chest.intensity));
        chest._burstInterval = 0.12 + Math.random() * 0.1;      // ~0.12–0.22 s apart
        // Prime the timer so the first bubble fires at the start of the next update
        chest._burstTimer = chest._burstInterval;
        chest._lidTarget = 3;
        // Startle nearby animals
        for (const e of entities) {
          if (e === chest) continue;
          const d = Math.hypot(e.x - chest.x, e.y - chest.y);
          if (d < 15 && e.panic !== undefined && typeof startPanic === 'function') startPanic(e);
        }
      }
    }
  };

  chest.draw = (ctx) => {
    const left = Math.round(chest.x) - 5;
    // Draw body rows
    for (let row = 0; row < CHEST_BODY_ROWS.length; row++) {
      const py = FLOOR - 1 - row;
      const cols = CHEST_BODY_ROWS[row];
      for (let col = 0; col < cols.length; col++) {
        ctx.fillStyle = CHEST_COLORS[cols[col]];
        ctx.fillRect(left + col, py, 1, 1);
      }
    }
    // Draw lid rows offset upward when chest is opening/open
    const lidOffset = Math.round(chest._lidLift);
    for (let row = 0; row < CHEST_LID_ROWS.length; row++) {
      const py = FLOOR - 1 - CHEST_BODY_ROWS.length - row - lidOffset;
      const cols = CHEST_LID_ROWS[row];
      for (let col = 0; col < cols.length; col++) {
        ctx.fillStyle = CHEST_COLORS[cols[col]];
        ctx.fillRect(left + col, py, 1, 1);
      }
    }
  };

  return chest;
};
