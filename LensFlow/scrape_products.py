import requests
import csv
import os
import re
import time
from html import unescape

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

PRIME_PARTICLE = {
    "name": "primeparticle",
    "base_url": "https://primeparticle.com",
    "products_api": "https://primeparticle.com/products.json",
}

UKOPTICA = {
    "name": "ukoptica",
    "base_url": "https://ukoptica.com",
    "products_api": "https://ukoptica.com/products.json",
}

SHOPIFY_CSV_HEADER = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags",
    "Published", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
    "Option3 Name", "Option3 Value", "Variant SKU", "Variant Grams",
    "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
    "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text", "Gift Card",
    "SEO Title", "SEO Description", "Google Shopping / Google Product Category",
    "Google Shopping / Gender", "Google Shopping / Age Group", "Google Shopping / MPN",
    "Google Shopping / AdWords Grouping", "Google Shopping / AdWords Labels",
    "Google Shopping / Condition", "Google Shopping / Custom Product",
    "Google Shopping / Custom Label 0", "Google Shopping / Custom Label 1",
    "Google Shopping / Custom Label 2", "Google Shopping / Custom Label 3",
    "Google Shopping / Custom Label 4", "Variant Image", "Variant Weight Unit",
    "Variant Tax Code", "Cost per item", "Price / International",
    "Compare At Price / International", "Status"
]


def fetch_all_products(products_api_url, max_pages=20):
    all_products = []
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    })

    for page in range(1, max_pages + 1):
        url = f"{products_api_url}?limit=250&page={page}"
        print(f"  Fetching page {page}: {url}")
        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            products = data.get("products", [])
            if not products:
                break
            all_products.extend(products)
            print(f"    Got {len(products)} products (total so far: {len(all_products)})")
            if len(products) < 250:
                break
            time.sleep(0.5)
        except Exception as e:
            print(f"    Error on page {page}: {e}")
            break

    print(f"  Total products fetched: {len(all_products)}")
    return all_products


def clean_html(html_str):
    if not html_str:
        return ""
    text = unescape(html_str)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.strip()
    return text


def extract_tags(product):
    tags = product.get("tags", "")
    if isinstance(tags, list):
        return ", ".join(tags)
    return tags


def extract_body_text(body_html):
    if not body_html:
        return ""
    cleaned = clean_html(body_html)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def get_product_type_label(raw_type):
    raw_type = raw_type.lower()
    if "eyeglasses" in raw_type or "eyewear" in raw_type or "frame" in raw_type or "glasses" in raw_type:
        return "眼镜框"
    return raw_type


def get_variant_image(variant, product):
    variant_image = variant.get("featured_image")
    if variant_image and variant_image.get("src"):
        return variant_image["src"]
    images = product.get("images", [])
    if images:
        return images[0].get("src", "")
    return ""


def get_product_main_image(product):
    images = product.get("images", [])
    if images:
        return images[0].get("src", "")
    return ""


def build_product_rows(product, vendor_name):
    handle = product.get("handle", "")
    title = product.get("title", "")
    body_html = product.get("body_html", "")
    raw_type = product.get("product_type", "")
    product_type = get_product_type_label(raw_type)
    tags = extract_tags(product)
    published_at = product.get("published_at")
    published = "TRUE" if published_at else "FALSE"
    main_image = get_product_main_image(product)

    options = product.get("options", [])
    option_names = []
    for opt in options:
        option_names.append(opt.get("name", ""))

    while len(option_names) < 3:
        option_names.append("")

    variants = product.get("variants", [])
    rows = []

    for idx, variant in enumerate(variants):
        row = {key: "" for key in SHOPIFY_CSV_HEADER}

        row["Handle"] = handle
        row["Variant Inventory Tracker"] = "shopify"
        row["Variant Inventory Policy"] = "deny"
        row["Variant Fulfillment Service"] = "manual"
        row["Variant Requires Shipping"] = "TRUE"
        row["Variant Taxable"] = "TRUE"
        row["Gift Card"] = "FALSE"
        row["Status"] = "active"

        raw_price = variant.get("price", "0")
        raw_compare = variant.get("compare_at_price")

        try:
            price_val = float(raw_price) if raw_price else 0.0
        except (ValueError, TypeError):
            price_val = 0.0

        compare_val = None
        if raw_compare and raw_compare != "0" and raw_compare != "0.00":
            try:
                compare_val = float(raw_compare)
            except (ValueError, TypeError):
                compare_val = None

        row["Variant Price"] = f"{price_val:.2f}"
        if compare_val is not None:
            row["Variant Compare At Price"] = f"{compare_val:.2f}"

        grams = variant.get("grams", 0)
        row["Variant Grams"] = str(grams) if grams else "0"

        sku = variant.get("sku", "")
        row["Variant SKU"] = sku if sku else ""

        row["Variant Inventory Qty"] = "1"

        op1_val = variant.get("option1") or ""
        op2_val = variant.get("option2") or ""
        op3_val = variant.get("option3") or ""
        row["Option1 Value"] = op1_val
        row["Option2 Value"] = op2_val
        row["Option3 Value"] = op3_val

        variant_img = get_variant_image(variant, product)
        row["Variant Image"] = variant_img

        if idx == 0:
            row["Title"] = title
            row["Body (HTML)"] = body_html
            row["Vendor"] = vendor_name
            row["Type"] = product_type
            row["Tags"] = tags
            row["Published"] = published
            row["Option1 Name"] = option_names[0] if len(option_names) > 0 else ""
            row["Option2 Name"] = option_names[1] if len(option_names) > 1 else ""
            row["Option3 Name"] = option_names[2] if len(option_names) > 2 else ""
            row["Image Src"] = variant_img if variant_img else main_image
            row["Image Position"] = "1"
            row["Image Alt Text"] = title
            row["SEO Title"] = f"{title} | {vendor_name}"
            row["SEO Description"] = extract_body_text(body_html)[:300]

        rows.append(row)

    return rows


def generate_lens_products(frame_products, vendor_name):
    lens_options = [
        {
            "handle_suffix": "-basic-lens",
            "name": "Basic Lens (1.56 Index)",
            "body": "<p>Standard CR-39 lens with 1.56 refractive index. Ideal for mild prescriptions. Includes anti-scratch coating.</p>",
            "option1_name": "Prescription Type",
            "option1_values": ["Non-Prescription", "Single Vision", "Reading"],
            "option2_name": "Coating",
            "option2_values": ["None", "Anti-Scratch"],
            "prices": {"Non-Prescription": {"None": 0, "Anti-Scratch": 50},
                       "Single Vision": {"None": 80, "Anti-Scratch": 130},
                       "Reading": {"None": 80, "Anti-Scratch": 130}},
        },
        {
            "handle_suffix": "-pro-lens",
            "name": "Pro Lens (1.67 High Index)",
            "body": "<p>High-index 1.67 lens with blue light filter. Thinner and lighter than standard lenses. Ideal for moderate to strong prescriptions.</p>",
            "option1_name": "Prescription Type",
            "option1_values": ["Non-Prescription", "Single Vision", "Progressive"],
            "option2_name": "Coating",
            "option2_values": ["Blue Light Filter", "Anti-Scratch+Blue Light"],
            "prices": {"Non-Prescription": {"Blue Light Filter": 80, "Anti-Scratch+Blue Light": 150},
                       "Single Vision": {"Blue Light Filter": 180, "Anti-Scratch+Blue Light": 250},
                       "Progressive": {"Blue Light Filter": 280, "Anti-Scratch+Blue Light": 350}},
        },
        {
            "handle_suffix": "-premium-lens",
            "name": "Premium Lens (1.74 Ultra-Thin)",
            "body": "<p>Ultra-thin 1.74 index lens. Premium multi-coating with anti-reflective, anti-smudge, hydrophobic treatment. Best for strong prescriptions.</p>",
            "option1_name": "Prescription Type",
            "option1_values": ["Non-Prescription", "Single Vision", "Progressive", "Reading"],
            "option2_name": "Coating",
            "option2_values": ["Premium Multi-Coat"],
            "prices": {"Non-Prescription": {"Premium Multi-Coat": 180},
                       "Single Vision": {"Premium Multi-Coat": 300},
                       "Progressive": {"Premium Multi-Coat": 480},
                       "Reading": {"Premium Multi-Coat": 300}},
        },
        {
            "handle_suffix": "-transition-lens",
            "name": "Transition Lens (Photochromic)",
            "body": "<p>Photochromic lens that darkens in sunlight and clears indoors. 1.60 index with UV400 protection. Available in Grey and Brown tint.</p>",
            "option1_name": "Prescription Type",
            "option1_values": ["Non-Prescription", "Single Vision", "Progressive"],
            "option2_name": "Tint Color",
            "option2_values": ["Grey", "Brown"],
            "prices": {"Non-Prescription": {"Grey": 200, "Brown": 200},
                       "Single Vision": {"Grey": 320, "Brown": 320},
                       "Progressive": {"Grey": 480, "Brown": 480}},
        },
    ]

    rows = []
    for frame in frame_products:
        frame_handle = frame.get("handle", "")
        if not frame_handle:
            continue
        for lens in lens_options:
            handle = frame_handle + lens["handle_suffix"]
            title = f"{frame.get('title', '')} - {lens['name']}"
            body_html = lens["body"]
            opt1_name = lens["option1_name"]
            opt2_name = lens["option2_name"]
            prices = lens["prices"]
            first_variant_for_this_lens = True

            for op1_val in lens["option1_values"]:
                for op2_val in lens["option2_values"]:
                    price = prices.get(op1_val, {}).get(op2_val, 0)
                    row = {key: "" for key in SHOPIFY_CSV_HEADER}
                    row["Handle"] = handle
                    row["Status"] = "active"
                    row["Variant Inventory Tracker"] = "shopify"
                    row["Variant Inventory Policy"] = "deny"
                    row["Variant Fulfillment Service"] = "manual"
                    row["Variant Requires Shipping"] = "TRUE"
                    row["Variant Taxable"] = "TRUE"
                    row["Gift Card"] = "FALSE"
                    row["Variant Price"] = f"{price:.2f}"
                    row["Variant Grams"] = "0"
                    row["Variant Inventory Qty"] = "1"
                    row["Variant SKU"] = f"{handle}-{op1_val.lower().replace(' ', '-')}-{op2_val.lower().replace(' ', '-')}"
                    row["Option1 Value"] = op1_val
                    row["Option2 Value"] = op2_val

                    if first_variant_for_this_lens:
                        row["Title"] = title
                        row["Body (HTML)"] = body_html
                        row["Option1 Name"] = opt1_name
                        row["Option2 Name"] = opt2_name
                        row["Vendor"] = vendor_name
                        row["Type"] = "镜片"
                        row["Tags"] = "lensflow-lens"
                        row["Published"] = "TRUE"
                        first_variant_for_this_lens = False

                    rows.append(row)

    return rows


def write_csv(filename, rows):
    output_path = os.path.join(OUTPUT_DIR, filename)
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=SHOPIFY_CSV_HEADER)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    print(f"  Wrote {len(rows)} rows to {output_path}")
    return output_path


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Scrape eyewear products for LensFlow testing")
    parser.add_argument("--site", choices=["primeparticle", "ukoptica", "both"],
                        default="both", help="Which site to scrape")
    parser.add_argument("--limit", type=int, default=0,
                        help="Limit number of products per site (0 = all)")
    args = parser.parse_args()

    sites = []
    if args.site in ("primeparticle", "both"):
        sites.append(PRIME_PARTICLE)
    if args.site in ("ukoptica", "both"):
        sites.append(UKOPTICA)

    all_frame_rows = []
    all_lens_rows = []

    for site in sites:
        products = fetch_all_products(site["products_api"])
        if args.limit > 0:
            products = products[:args.limit]
            print(f"  Limited to {len(products)} products")

        vendor_name = site.get("vendor", site["name"].title())

        frame_rows = []
        for product in products:
            rows = build_product_rows(product, vendor_name)
            frame_rows.extend(rows)

        frame_filename = f"{site['name']}_frames.csv"
        write_csv(frame_filename, frame_rows)

        lens_rows = generate_lens_products(products, vendor_name)
        lens_filename = f"{site['name']}_lenses.csv"
        write_csv(lens_filename, lens_rows)

        combined = frame_rows + lens_rows
        combined_filename = f"{site['name']}_all_products.csv"
        write_csv(combined_filename, combined)

        all_frame_rows.extend(frame_rows)
        all_lens_rows.extend(lens_rows)

    if args.site == "both":
        combined_all = all_frame_rows + all_lens_rows
        write_csv("all_frames.csv", all_frame_rows)
        write_csv("all_lenses.csv", all_lens_rows)
        write_csv("all_products_combined.csv", combined_all)

    print(f"\n{'='*60}")
    print("DONE! Summary:")
    print(f"  Frame product rows: {len(all_frame_rows)}")
    print(f"  Lens product rows:  {len(all_lens_rows)}")
    print(f"  Total rows:         {len(all_frame_rows) + len(all_lens_rows)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()