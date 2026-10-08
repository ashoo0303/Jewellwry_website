from pathlib import Path

from fpdf import FPDF
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "Assignment-Submission.pdf"
DOWNLOADS = Path(r"C:\Users\Suzair\Downloads\Website-Assignment-v3.pdf")
DESKTOP = Path(r"C:\Users\Suzair\OneDrive\Desktop\Website-Assignment-v3.pdf")

LIVE = "https://jewellwry-website.vercel.app"
GITHUB = "https://github.com/ashoo0303/Jewellwry_website"

PAGES = [
    ("4. Home", ROOT / "hero-home.png"),
    ("5. About", ROOT / "hero-about.png"),
    ("6. Contact", ROOT / "hero-contact.png"),
    ("7. Sign In", ROOT / "hero-signin.png"),
    ("8. Sign Up", ROOT / "hero-signup.png"),
]

SHOT_SIZE = (1606, 1034)
MARGIN = 15
TITLE_Y = 12
IMAGE_Y = 24
IMAGE_W = 180


def normalize_shot(path: Path) -> Path:
    im = Image.open(path).convert("RGB")
    out = Image.new("RGB", SHOT_SIZE, (255, 255, 255))
    im.thumbnail(SHOT_SIZE, Image.Resampling.LANCZOS)
    x = (SHOT_SIZE[0] - im.width) // 2
    y = (SHOT_SIZE[1] - im.height) // 2
    out.paste(im, (x, y))
    dest = path.with_name(path.stem + "-fit.png")
    out.save(dest, "PNG")
    return dest


class PDF(FPDF):
    def heading(self, text):
        self.set_text_color(0, 0, 0)
        self.set_font("Times", "B", 14)
        self.set_xy(MARGIN, TITLE_Y)
        self.cell(0, 8, text)

    def clickable_url(self, x, y, url):
        self.set_xy(x, y)
        self.set_font("Times", "U", 12)
        self.set_text_color(0, 0, 238)
        w = self.get_string_width(url) + 2
        self.cell(w, 8, url, link=url)
        self.set_text_color(0, 0, 0)

    def screenshot(self, path: Path):
        self.image(str(path), x=MARGIN, y=IMAGE_Y, w=IMAGE_W)


def add_links_page(pdf: PDF):
    pdf.add_page()
    pdf.set_text_color(0, 0, 0)

    pdf.set_font("Times", "B", 18)
    pdf.set_xy(MARGIN, 20)
    pdf.cell(0, 10, "Website Assignment")

    pdf.set_font("Times", "", 14)
    pdf.set_xy(MARGIN, 38)
    pdf.cell(0, 8, "Name : Ayesha Babar")

    pdf.set_xy(MARGIN, 48)
    pdf.cell(0, 8, "Roll No : A-11")

    pdf.set_font("Times", "B", 14)
    pdf.set_xy(MARGIN, 68)
    pdf.cell(0, 8, "1. Live Website Link (Vercel)")
    pdf.set_font("Times", "", 12)
    pdf.set_xy(MARGIN, 78)
    pdf.cell(0, 8, "Vercel:")
    pdf.clickable_url(MARGIN, 86, LIVE)

    pdf.set_font("Times", "B", 14)
    pdf.set_xy(MARGIN, 106)
    pdf.cell(0, 8, "2. GitHub Repository Link")
    pdf.set_font("Times", "", 12)
    pdf.set_xy(MARGIN, 116)
    pdf.cell(0, 8, "GitHub:")
    pdf.clickable_url(MARGIN, 124, GITHUB)


def add_folder_page(pdf: PDF, image_path: Path):
    pdf.add_page()
    pdf.heading("3. Expanded VS Code Project Folder Structure")
    im = Image.open(image_path)
    w, h = im.size
    max_w = IMAGE_W
    max_h = pdf.h - 40
    scale = min(max_w / w, max_h / h)
    nw, nh = w * scale, h * scale
    x = (pdf.w - nw) / 2
    pdf.image(str(image_path), x=x, y=IMAGE_Y, w=nw, h=nh)


def add_shot_page(pdf: PDF, title: str, image_path: Path):
    pdf.add_page()
    pdf.heading(title)
    pdf.screenshot(image_path)


def save(pdf: PDF, path: Path):
    try:
        pdf.output(str(path))
        print("Wrote", path)
    except OSError:
        print("Could not write", path, "(close the file if it is open)")


def main():
    fitted = [normalize_shot(path) for _, path in PAGES]
    pdf = PDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.set_title("Website Assignment")
    pdf.set_author("Ayesha Babar")
    add_links_page(pdf)
    add_folder_page(pdf, ROOT / "folder-structure-shot.png")
    for (title, _), path in zip(PAGES, fitted):
        add_shot_page(pdf, title, path)
    save(pdf, OUT)
    save(pdf, DOWNLOADS)
    save(pdf, DESKTOP)


if __name__ == "__main__":
    main()
