from __future__ import annotations

import io
from pathlib import Path
from zipfile import ZipFile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"d:\AnanyaBoutique")
SOURCE_DOCX = Path(r"C:\Users\piyush songara\Downloads\Piyush_Songara_Mid_Review_Report 69.docx")
OUTPUT_DOCX = Path(r"C:\Users\piyush songara\Downloads\Friend_Mid_Review_Report_Netparam.docx")
OUTPUT_LOGO = ROOT / "output" / "friend-report-media" / "netparam_logo_generated.png"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def create_netparam_logo() -> None:
    width, height = 1200, 1200
    image = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)

    green = (77, 204, 63, 255)
    dark = (39, 55, 69, 255)
    soft = (129, 179, 123, 255)

    draw.arc((160, 220, 1040, 630), start=196, end=344, fill=dark, width=16)
    draw.arc((160, 500, 1040, 910), start=18, end=164, fill=dark, width=16)

    large = load_font(250, bold=True)
    medium = load_font(170, bold=True)
    small = load_font(80, bold=False)

    draw.text((320, 340), "N", font=large, fill=green)
    draw.text((500, 338), "E", font=large, fill=dark)
    draw.text((635, 338), "T", font=large, fill=green)
    draw.text((785, 338), "P", font=large, fill=dark)

    net_w = draw.textlength("NET", font=medium)
    param_w = draw.textlength("PARAM", font=medium)
    total_w = net_w + param_w + 20
    start_x = (width - total_w) / 2
    draw.text((start_x, 720), "NET", font=medium, fill=dark)
    draw.text((start_x + net_w + 20, 720), "PARAM", font=medium, fill=green)

    footer = "Technologies Pvt. Ltd"
    footer_w = draw.textlength(footer, font=small)
    draw.text(((width - footer_w) / 2, 930), footer, font=small, fill=soft)

    image.save(OUTPUT_LOGO)


def replace_company_logo() -> None:
    create_netparam_logo()
    with ZipFile(SOURCE_DOCX, "r") as src:
        with ZipFile(OUTPUT_DOCX, "w") as dst:
            for item in src.infolist():
                data = src.read(item.filename)
                if item.filename == "word/media/image2.png":
                    data = OUTPUT_LOGO.read_bytes()
                dst.writestr(item, data)


if __name__ == "__main__":
    OUTPUT_LOGO.parent.mkdir(parents=True, exist_ok=True)
    replace_company_logo()
    print(OUTPUT_DOCX)
    print(OUTPUT_LOGO)
