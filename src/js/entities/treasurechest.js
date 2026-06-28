const createBubble = (tank, startX, startY) => {
  const b = {
    type: 'bubble',
    x: startX,
    y: startY,
    eaten: false,
    phase: Math.random() * Math.PI * 2,
    speed: 3 + Math.random() * 2,
    driftAmp: 0.3 + Math.random() * 0.3,
    driftSpeed: 0.8 + Math.random() * 0.8,
  };

  b.update = (dt) => {
    b.y -= b.speed * dt;
    b.phase += b.driftSpeed * dt;
    b.x += Math.sin(b.phase) * b.driftAmp * dt;
    if (b.x < tank.x1 + 1) b.x = tank.x1 + 1;
    if (b.x > tank.x2 - 1) b.x = tank.x2 - 1;
    if (b.y <= tank.y1 + 2) b.eaten = true;
  };

  b.draw = (ctx) => {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#33ff33';
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

// rows[0] = FLOOR-1 (base), rows[6] = FLOOR-7 (lid top); 10px wide
const CHEST_ROWS = [
  [0,3,3,3,3,3,3,3,3,0],  // base band
  [0,2,2,2,2,2,2,2,2,0],  // body
  [0,2,2,2,3,3,2,2,2,0],  // lock clasp
  [0,2,2,2,4,4,2,2,2,0],  // lock highlight
  [3,3,3,3,3,3,3,3,3,3],  // brass band
  [0,1,1,1,1,1,1,1,1,0],  // lid
  [0,0,1,1,1,1,1,1,0,0],  // lid top
];

const CHEST_HEIGHT = CHEST_ROWS.length;

const createTreasureChest = (tank, x) => {
  const FLOOR = tank.y2;

  const chest = {
    type: 'treasure-chest',
    x, y: FLOOR,
    dragged: false,
    _timer: 0,
    _next: 1.5 + Math.random() * 2,
  };

  chest.update = (dt, entities) => {
    if (chest.dragged) return;
    chest._timer += dt;
    if (chest._timer >= chest._next) {
      chest._timer = 0;
      chest._next = 1.5 + Math.random() * 2;
      const bx = chest.x + (Math.random() - 0.5) * 4;
      entities.push(createBubble(tank, bx, FLOOR - CHEST_HEIGHT - 1));
    }
  };

  chest.draw = (ctx) => {
    const left = Math.round(chest.x) - 5;
    for (let row = 0; row < CHEST_ROWS.length; row++) {
      const py = FLOOR - 1 - row;
      const cols = CHEST_ROWS[row];
      for (let col = 0; col < cols.length; col++) {
        ctx.fillStyle = CHEST_COLORS[cols[col]];
        ctx.fillRect(left + col, py, 1, 1);
      }
    }
  };

  return chest;
};
