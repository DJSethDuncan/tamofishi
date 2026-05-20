const createFlake = (tank, x) => {
  const f = {
    type: 'flake',
    x,
    y: tank.y1,
    vx: (Math.random() - 0.5) * 0.15,
    vy: 0.02 + Math.random() * 0.02,
    eaten: false,
    color: '#1a5a1a',
  };

  f.update = (dt) => {
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.99;
    if (f.y >= tank.y2) { f.y = tank.y2; f.vy = 0; f.vx = 0; }
    if (f.x <= tank.x1) f.x = tank.x1;
    if (f.x >= tank.x2) f.x = tank.x2;
  };

  f.draw = (ctx) => {
    ctx.fillStyle = f.color;
    ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
  };

  return f;
};
