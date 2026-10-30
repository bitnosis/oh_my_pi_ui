from PIL import Image, ImageDraw

src_path = r"c:\Users\Kylie\Documents\ChatGPT\OhMyPi\ohmypi-svelte\public\backgrounds\logo-leaf.png"
im = Image.open(src_path).convert("RGBA")
w, h = im.size
px = im.load()
mask = [[px[x, y][3] > 96 for x in range(w)] for y in range(h)]

def on(x, y):
    return 0 <= x < w and 0 <= y < h and mask[y][x]

dirs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]

def trace(sx, sy, sdir):
    contour = [(sx, sy)]
    cx, cy, idx = sx, sy, sdir
    for _ in range(w * h * 4):
        found = None
        for k in range(1, 9):
            nd = (idx + k) % 8
            dx, dy = dirs[nd]
            tx, ty = cx + dx, cy + dy
            if on(tx, ty):
                found = (tx, ty, (nd + 4) % 8)
                break
        if not found:
            break
        nx, ny, back = found
        if nx == sx and ny == sy and back == sdir:
            break
        contour.append((nx, ny))
        cx, cy, idx = nx, ny, back
        if len(contour) > 8 and (cx, cy) == (sx, sy):
            break
    return contour

seen = set()
contours = []
for y in range(h):
    for x in range(w):
        if on(x, y) and not on(x, y - 1) and (x, y) not in seen:
            contour = trace(x, y, 6)
            if len(contour) > 30:
                contours.append(contour)
                for cx, cy in contour:
                    if on(cx, cy) and not on(cx, cy - 1):
                        seen.add((cx, cy))

def dist(p, a, b):
    (ax, ay), (bx, by), (px, py) = a, b, p
    dx, dy = bx - ax, by - ay
    if dx == dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    qx, qy = ax + t * dx, ay + t * dy
    return ((px - qx) ** 2 + (py - qy) ** 2) ** 0.5

def rdp(points, eps):
    if len(points) < 3:
        return points
    end = len(points) - 1
    index, farthest = 0, 0
    for i in range(1, end):
        d = dist(points[i], points[0], points[end])
        if d > farthest:
            index, farthest = i, d
    if farthest > eps:
        return rdp(points[: index + 1], eps)[:-1] + rdp(points[index:], eps)
    return [points[0], points[end]]

simplified = []
for contour in contours:
    closed = contour + [contour[0]]
    simplified.append(rdp(closed, 0.55)[:-1])

def inside(x, y, rings):
    hits = 0
    for ring in rings:
        n = len(ring)
        for i in range(n):
            x1, y1 = ring[i]
            x2, y2 = ring[(i + 1) % n]
            if (y1 > y) != (y2 > y):
                cross = (x2 - x1) * (y - y1) / (y2 - y1) + x1
                if x < cross:
                    hits += 1
    return hits % 2 == 1

hit = miss = 0
step = 3
for y in range(0, h, step):
    for x in range(0, w, step):
        a = mask[y][x]
        b = inside(x + 0.5, y + 0.5, simplified)
        if a and b:
            hit += 1
        elif a or b:
            miss += 1
print("contours", [len(c) for c in simplified], "iou", round(hit / (hit + miss), 4))

def path(rings):
    parts = []
    for ring in rings:
        cmd = "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in ring) + "Z"
        parts.append(cmd)
    return "".join(parts)

d = path(simplified)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -80 760 760" fill="none">
  <defs>
    <filter id="leaf-glow" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="26" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path fill="#fff" fill-rule="evenodd" filter="url(#leaf-glow)" d="{d}"/>
</svg>
'''
out = r"c:\Users\Kylie\Documents\ChatGPT\OhMyPi\ohmypi-svelte\public\backgrounds\logo-leaf.svg"
with open(out, "w", encoding="utf-8", newline="\n") as handle:
    handle.write(svg)
print("bytes", len(svg))
