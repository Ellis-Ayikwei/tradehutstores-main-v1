import random
import urllib.parse
import urllib.request
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.catalog.models import Attribute, AttributeValue, Brand, SubCategory
from apps.products.models import Product, ProductImage, ProductVariant


class Command(BaseCommand):
    help = "Populate about 150 products across categories/subcategories with variants."

    TARGET_PRODUCTS = 150
    VARIATION_THEMES = ("single", "color", "size", "material", "capacity", "size-color")
    PRODUCT_SERIES = (
        "Pro",
        "Ultra",
        "Max",
        "Prime",
        "Plus",
        "Edge",
        "Elite",
        "Core",
        "Vision",
        "Air",
    )
    PRODUCT_TYPES = {
        "laptops": ["Laptop", "Notebook", "Ultrabook", "Workstation Laptop"],
        "desktop computers": ["Desktop PC", "All-in-One PC", "Tower PC"],
        "monitors": ["Monitor", "Gaming Monitor", "Office Monitor"],
        "keyboards and mice": ["Keyboard", "Mechanical Keyboard", "Wireless Mouse", "Combo Set"],
        "printers": ["Printer", "Laser Printer", "Inkjet Printer"],
        "smartphones": ["Smartphone", "5G Phone", "Android Phone"],
        "bluetooth speakers": ["Bluetooth Speaker", "Portable Speaker", "Party Speaker"],
        "routers": ["Wi-Fi Router", "Mesh Router", "Dual-Band Router"],
        "modems": ["Cable Modem", "Fiber Modem"],
        "switches": ["Network Switch", "Managed Switch"],
        "cameras": ["Mirrorless Camera", "DSLR Camera", "Compact Camera"],
        "lenses": ["Camera Lens", "Prime Lens", "Zoom Lens"],
        "refrigerators": ["Refrigerator", "Double Door Fridge"],
        "washing machines": ["Washing Machine", "Front Load Washer"],
        "microwaves": ["Microwave Oven", "Convection Microwave"],
        "air conditioners": ["Air Conditioner", "Split AC"],
        "headphones": ["Wireless Headphones", "Noise Cancelling Headphones"],
        "default": ["Device", "Product", "Equipment", "Accessory"],
    }

    def _build_attribute_index(self):
        index = {}
        for attr_value in AttributeValue.objects.select_related("attribute"):
            key = attr_value.attribute.name.lower()
            index.setdefault(key, []).append(attr_value)
        return index

    def _get_attr_value(self, attr_index, attr_name):
        key = attr_name.lower()
        if key not in attr_index:
            attribute, _ = Attribute.objects.get_or_create(name=attr_name)
            value, _ = AttributeValue.objects.get_or_create(
                attribute=attribute,
                value_name=f"Default {attr_name}",
            )
            attr_index[key] = [value]
        return random.choice(attr_index[key])

    def _attribute_values_for_theme(self, attr_index, theme):
        if theme == "color":
            return [self._get_attr_value(attr_index, "Color")]
        if theme == "size":
            return [self._get_attr_value(attr_index, "Size")]
        if theme == "material":
            return [self._get_attr_value(attr_index, "Material")]
        if theme == "capacity":
            return [self._get_attr_value(attr_index, "Capacity")]
        if theme == "size-color":
            return [
                self._get_attr_value(attr_index, "Size"),
                self._get_attr_value(attr_index, "Color"),
            ]
        return []

    def _resolve_brand(self, category):
        brands = list(Brand.objects.filter(category=category))
        if brands:
            return random.choice(brands)
        default_brand_name = f"{category.name} Generic"
        brand, _ = Brand.objects.get_or_create(
            category=category,
            name=default_brand_name,
        )
        return brand

    def _product_type_for_subcategory(self, sub_category_name):
        key = sub_category_name.strip().lower()
        options = self.PRODUCT_TYPES.get(key, self.PRODUCT_TYPES["default"])
        return random.choice(options)

    def _generate_product_name(self, brand_name, sub_category_name):
        product_type = self._product_type_for_subcategory(sub_category_name)
        series = random.choice(self.PRODUCT_SERIES)
        model_no = f"{random.randint(100, 999)}{random.choice(['A', 'X', 'S', 'P'])}"
        return f"{brand_name} {series} {product_type} {model_no}"

    def _image_urls(self, brand_name, sub_category_name, product_name):
        query_base = f"{brand_name} {sub_category_name}"
        return [
            f"https://source.unsplash.com/1200x1200/?{urllib.parse.quote(query_base + ' product')}",
            f"https://source.unsplash.com/1200x1200/?{urllib.parse.quote(product_name)}",
            f"https://source.unsplash.com/1200x1200/?{urllib.parse.quote(sub_category_name + ' item')}",
        ]

    def _download_image_content(self, url):
        try:
            with urllib.request.urlopen(url, timeout=20) as response:
                content = response.read()
                if not content:
                    return None
                return content
        except Exception:
            return None

    def _assign_product_images(self, product, variant, image_urls):
        if product.main_product_image and product.product_images.filter(is_main=True).exists():
            return

        saved_any = False
        for index, url in enumerate(image_urls, start=1):
            content = self._download_image_content(url)
            if not content:
                continue

            filename = f"{slugify(product.name)}-{index}.jpg"
            content_file = ContentFile(content, name=filename)

            if not product.main_product_image and index == 1:
                product.main_product_image.save(filename, content_file, save=True)
                saved_any = True
                continue

            image_obj, image_created = ProductImage.objects.get_or_create(
                product=product,
                product_variant=variant,
                image_type="supplementary",
                defaults={"is_main": index == 1},
            )
            if image_created or not image_obj.image:
                image_obj.image.save(filename, content_file, save=True)
                saved_any = True

        if saved_any and not product.product_images.filter(is_main=True).exists():
            product_image = product.product_images.first()
            if product_image:
                product_image.is_main = True
                product_image.image_type = "main"
                product_image.save(update_fields=["is_main", "image_type"])

    def _upsert_product(self, category, sub_category, brand):
        product_name = self._generate_product_name(brand.name, sub_category.sub_category_name)
        quantity = random.randint(5, 80)
        base_price = Decimal(str(random.randint(25, 1500)))
        variation_theme = random.choice(self.VARIATION_THEMES)

        product, product_created = Product.objects.get_or_create(
            name=product_name,
            category=category,
            sub_category=sub_category,
            brand=brand,
            defaults={
                "keywords": f"{category.name} {sub_category.sub_category_name} {brand.name}",
                "description": f"Sample seeded product for {sub_category.sub_category_name}.",
                "status": "Active",
                "available": True,
                "variation_theme": variation_theme,
                "condition": "New",
                "inventory_level": quantity,
            },
        )
        if not product_created:
            variation_theme = product.variation_theme or "single"
            quantity = product.inventory_level or quantity

        return product, product_created, variation_theme, quantity, base_price

    def _upsert_variants(self, product, variation_theme, quantity, base_price, attr_index):
        created_variants = 0
        variant_count = 1 if variation_theme == "single" else random.randint(2, 4)
        default_variant = None

        for variant_idx in range(1, variant_count + 1):
            sku = f"{product.thin}-{variant_idx:02d}"
            variant_price = base_price + Decimal(str(variant_idx * random.randint(3, 20)))
            variant_quantity = max(1, quantity - (variant_idx - 1) * random.randint(0, 4))

            variant, variant_created = ProductVariant.objects.get_or_create(
                product=product,
                sku=sku,
                defaults={
                    "name": f"{product.name} Variant {variant_idx}",
                    "price": variant_price,
                    "quantity": variant_quantity,
                    "min_buy_amount": 1,
                },
            )

            if variant_created:
                created_variants += 1

            attribute_values = self._attribute_values_for_theme(attr_index, variation_theme)
            if attribute_values:
                variant.attribute_values.set(attribute_values)

            if default_variant is None:
                default_variant = variant

        image_urls = self._image_urls(product.brand.name, product.sub_category.sub_category_name, product.name)
        if default_variant:
            self._assign_product_images(product, default_variant, image_urls)

        if default_variant and product.default_variant_id != default_variant.id:
            product.default_variant = default_variant
            product.save(update_fields=["default_variant"])

        return created_variants

    def handle(self, *args, **options):
        random.seed(42)
        sub_categories = list(SubCategory.objects.select_related("category").all())
        if not sub_categories:
            self.stdout.write(
                self.style.ERROR(
                    "No subcategories found. Run populate_categories and populate_brands first."
                )
            )
            return

        attr_index = self._build_attribute_index()

        created_products = 0
        created_variants = 0

        for idx in range(self.TARGET_PRODUCTS):
            sub_category = sub_categories[idx % len(sub_categories)]
            category = sub_category.category
            brand = self._resolve_brand(category)
            (
                product,
                product_created,
                variation_theme,
                quantity,
                base_price,
            ) = self._upsert_product(category, sub_category, brand)

            if product_created:
                created_products += 1

            created_variants += self._upsert_variants(
                product, variation_theme, quantity, base_price, attr_index
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Product population complete. Products created: {created_products}. "
                f"Variants created: {created_variants}."
            )
        )
