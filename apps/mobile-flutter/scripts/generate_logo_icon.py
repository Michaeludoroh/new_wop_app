"""Generate square logo_icon.png from logo.png for launcher icons."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "assets" / "images" / "logo.png"
ICON = ROOT / "assets" / "images" / "logo_icon.png"
ICON_SIZE = 512


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
    if not LOGO.exists():
        raise FileNotFoundError(f"Missing logo asset: {LOGO}")

    with Image.open(LOGO) as source:
        icon = to_square_icon(source.convert("RGBA"), ICON_SIZE)
        ICON.parent.mkdir(parents=True, exist_ok=True)
        icon.save(ICON, format="PNG", optimize=True)

    print(f"Saved {ICON} ({icon.width}x{icon.height})")


if __name__ == "__main__":
    main()
