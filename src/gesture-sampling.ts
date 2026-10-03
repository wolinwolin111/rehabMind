export interface ScreenPoint { x: number; y: number }

function insidePolygon(point: ScreenPoint, points: ScreenPoint[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Uniform screen coverage for a loop; uniform arc length for an open stroke. */
export function sampleGesture(points: ScreenPoint[]): { closed: boolean; samples: ScreenPoint[] } {
  if (!points.length) return { closed: false, samples: [] };
  const first = points[0], last = points[points.length - 1];
  if (points.every(point => Math.hypot(point.x - first.x, point.y - first.y) <= 6)) {
    return { closed: false, samples: [first] };
  }
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  const area = Math.abs(points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  const closeDistance = Math.min(35, Math.max(8, Math.hypot(width, height) * .3));
  const closed = points.length >= 4 && area >= 36 && area >= width * height * .15 &&
    Math.hypot(first.x - last.x, first.y - last.y) <= closeDistance;
  if (closed) {
    // At most 24 × 24 rays, including small loops at the full-body zoom level.
    // Boundary samples are deliberately excluded: dwelling on an edge isn't coverage.
    const step = Math.max(width, height) / 24;
    const samples: ScreenPoint[] = [];
    for (let y = minY + step / 2; y < minY + height; y += step) {
      for (let x = minX + step / 2; x < minX + width; x += step) {
        const point = { x, y };
        if (insidePolygon(point, points)) samples.push(point);
      }
    }
    return { closed: true, samples };
  }
  const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
  const length = lengths.reduce((sum, value) => sum + value, 0);
  const count = Math.min(70, Math.max(2, Math.ceil(length / 3) + 1));
  const samples: ScreenPoint[] = [];
  let segment = 0, start = 0;
  for (let i = 0; i < count; i++) {
    const distance = length * i / (count - 1);
    while (segment < lengths.length - 1 && start + lengths[segment] < distance) start += lengths[segment++];
    const a = points[segment], b = points[segment + 1];
    const t = lengths[segment] ? (distance - start) / lengths[segment] : 0;
    samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return { closed: false, samples };
}
