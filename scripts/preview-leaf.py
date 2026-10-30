from PIL import Image, ImageDraw

svg_path = r"c:\Users\Kylie\Documents\ChatGPT\OhMyPi\ohmypi-svelte\public\backgrounds\logo-leaf.svg"
text = open(svg_path, encoding="utf-8").read()
d = text.split(' d="', 1)[1].split('"', 1)[0]
rings = []
for part in d.split("M")[1:]:
    nums = part.replace("Z", "").replace("L", " ").split()
    rings.append([(float(nums[i]) + 80, float(nums[i + 1]) + 80) for i in range(0, len(nums), 2)])
print([len(ring) for ring in rings], rings[0][:2])
im = Image.new("RGBA", (760, 760), (30, 30, 36, 255))
draw = ImageDraw.Draw(im)
draw.polygon(rings[0], fill=(190, 210, 90, 255))
for ring in rings[1:]:
    draw.polygon(ring, fill=(30, 30, 36, 255))
im.save(r"c:\Users\Kylie\Documents\ChatGPT\OhMyPi\ohmypi-svelte\scripts\leaf-preview.png")
