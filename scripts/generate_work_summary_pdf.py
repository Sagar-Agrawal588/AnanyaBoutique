from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "work-summary-2026-03-01_to_2026-04-08.md"
PDF_OUT = ROOT / "docs" / "work-summary-2026-03-01_to_2026-04-08.pdf"


def format_inline(text: str) -> str:
    escaped = html.escape(text)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)


def parse_markdown(text: str) -> list[dict]:
    blocks: list[dict] = []
    paragraph_lines: list[str] = []
    list_items: list[str] = []
    list_mode: str | None = None

    def flush_paragraph() -> None:
        nonlocal paragraph_lines
        if paragraph_lines:
            blocks.append({"type": "paragraph", "text": " ".join(paragraph_lines).strip()})
            paragraph_lines = []

    def flush_list() -> None:
        nonlocal list_items, list_mode
        if list_items:
            blocks.append({"type": "list", "mode": list_mode or "ul", "items": list_items[:]})
            list_items = []
            list_mode = None

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading_match:
            flush_paragraph()
            flush_list()
            blocks.append(
                {
                    "type": "heading",
                    "level": len(heading_match.group(1)),
                    "text": heading_match.group(2).strip(),
                }
            )
            continue

        unordered_match = re.match(r"^-\s+(.*)$", stripped)
        if unordered_match:
            flush_paragraph()
            if list_mode not in {None, "ul"}:
                flush_list()
            list_mode = "ul"
            list_items.append(unordered_match.group(1).strip())
            continue

        if not stripped:
            flush_paragraph()
            flush_list()
            continue

        paragraph_lines.append(stripped)

    flush_paragraph()
    flush_list()
    return blocks


def render_pdf(blocks: list[dict], output_path: Path) -> None:
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleCompact",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=17,
        textColor=colors.HexColor("#111827"),
        alignment=TA_LEFT,
        spaceAfter=6,
    )
    heading_style = ParagraphStyle(
        "HeadingCompact",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=12,
        textColor=colors.HexColor("#1F2937"),
        spaceBefore=4,
        spaceAfter=3,
    )
    body_style = ParagraphStyle(
        "BodyCompact",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.4,
        leading=10,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#111827"),
        spaceAfter=3,
    )

    story = []

    for block in blocks:
        if block["type"] == "heading":
            level = int(block["level"])
            style = title_style if level == 1 else heading_style
            story.append(Paragraph(format_inline(block["text"]), style))
            continue

        if block["type"] == "paragraph":
            text = format_inline(block["text"])
            story.append(Paragraph(text, body_style))
            continue

        if block["type"] == "list":
            items = [
                ListItem(Paragraph(format_inline(item), body_style), leftIndent=8)
                for item in block["items"]
            ]
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    leftIndent=10,
                    bulletFontName="Helvetica",
                    bulletFontSize=7,
                )
            )
            story.append(Spacer(1, 2))

    document = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        title="bogEcom Work Summary",
        author="Codex",
        leftMargin=26,
        rightMargin=26,
        topMargin=22,
        bottomMargin=22,
    )
    document.build(story)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Source markdown not found: {SOURCE}")

    blocks = parse_markdown(SOURCE.read_text(encoding="utf-8"))
    PDF_OUT.parent.mkdir(parents=True, exist_ok=True)
    render_pdf(blocks, PDF_OUT)
    print(f"Wrote {PDF_OUT}")


if __name__ == "__main__":
    main()
