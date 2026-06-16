"""Crop, remove dark background, and optimize ministry logo for Flutter assets."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SOURCE = Path(
    r"C:\Users\user\.cursor\projects\c-new-wop-app\assets"
    r"\c__Users_user_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
    r"_wop_image-dc786cbf-af32-48db-a547-99eb4ccc337b.png"
)
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "images" / "logo.png"
OUTPUT_ICON = Path(__file__).resolve().parents[1] / "assets" / "images" / "logo_icon.png"
MAX_SIZE = 512
ICON_SIZE = 512
PADDING_RATIO = 0.06
BG_THRESHOLD = 42


def remove_dark_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            brightness = max(r, g, b)
            if brightness <= BG_THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
            elif brightness <= BG_THRESHOLD + 35:
                fade = (brightness - BG_THRESHOLD) / 35
                pixels[x, y] = (r, g, b, int(255 * fade))

    return rgba


def content_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.split()[3]
    return alpha.getbbox() or (0, 0, image.width, image.height)


def add_padding(image: Image.Image, ratio: float) -> Image.Image:
    pad_x = max(4, int(image.width * ratio))
    pad_y = max(4, int(image.height * ratio))
    padded = Image.new("RGBA", (image.width + pad_x * 2, image.height + pad_y * 2), (0, 0, 0, 0))
    padded.paste(image, (pad_x, pad_y), image)
    return padded


def resize_max(image: Image.Image, max_size: int) -> Image.Image:
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    return image


def to_square_icon(image: Image.Image, size: int) -> Image.Image:
    scale = min(size / image.width, size / image.height) * 0.82
    resized = image.resize(
        (max(1, int(image.width * scale)), max(1, int(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source logo not found: {SOURCE}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(SOURCE) as source:
        processed = remove_dark_background(source)
        bbox = content_bbox(processed)
        cropped = processed.crop(bbox)
        padded = add_padding(cropped, PADDING_RATIO)
        final = resize_max(padded, MAX_SIZE)
        final.save(OUTPUT, format="PNG", optimize=True)
        icon = to_square_icon(final, ICON_SIZE)
        icon.save(OUTPUT_ICON, format="PNG", optimize=True)

    print(f"Saved {OUTPUT} ({final.width}x{final.height}, {OUTPUT.stat().st_size} bytes)")
    print(f"Saved {OUTPUT_ICON} ({icon.width}x{icon.height}, {OUTPUT_ICON.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
