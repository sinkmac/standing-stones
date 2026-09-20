#!/usr/bin/env python3
"""Generate the app icons. Pure stdlib (zlib + struct) — no Pillow, no network.

Writes, into static/:
  icon-192.png, icon-512.png   (manifest, any + maskable)
  apple-touch-icon.png         (180x180, iOS home screen)

Design: flat dark navy field, a single light monolith silhouette, a small moon
disc. Deliberately plain — the property is a solemn, zero-advert site.
"""
import struct, zlib, math, os

BG = (4, 6, 14, 255)
STONE = (150, 162, 186, 255)
MOON = (217, 194, 122, 255)

def png(width, height, pixels):
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter: none
        raw.extend(pixels[y])
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))

def render(size):
    px = [[BG] * size for _ in range(size)]
    s = size / 512.0
    # monolith: tapered vertical slab
    cx, base, top = size * 0.46, size * 0.80, size * 0.24
    hw_top, hw_bot = 40 * s, 58 * s
    y = top
    while y <= base:
        t = (y - top) / float(base - top)
        hw = hw_top + (hw_bot - hw_top) * t
        for x in range(int(cx - hw), int(cx + hw) + 1):
            if 0 <= x < size:
                px[int(y)][x] = STONE
        y += 1
    # moon disc, upper left of the stone
    mx, my, r = size * 0.68, size * 0.30, size * 0.085
    for yy in range(int(my - r) - 1, int(my + r) + 2):
        for xx in range(int(mx - r) - 1, int(mx + r) + 2):
            if 0 <= xx < size and 0 <= yy < size and math.hypot(xx - mx, yy - my) <= r:
                px[yy][xx] = MOON
    return b''.join(bytes(p) for row in px for p in row), px

def write(path, size):
    _, px = render(size)
    rows = [px[y] for y in range(size)]
    data = png(size, size, [[c for p in row for c in p] for row in rows])
    with open(path, 'wb') as f:
        f.write(data)
    print(f'{path}  {size}x{size}  {len(data)} bytes  {os.path.getsize(path)} on disk')

if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static')
    os.makedirs(root, exist_ok=True)
    write(os.path.join(root, 'icon-192.png'), 192)
    write(os.path.join(root, 'icon-512.png'), 512)
    write(os.path.join(root, 'apple-touch-icon.png'), 180)
