from django.core.management.base import BaseCommand
from apps.catalog.models import Brand, Category


class Command(BaseCommand):
    help = "Populate brands with their categories."

    def handle(self, *args, **options):
        brands_with_categories = {
            "Networking and Connectivity": [
                "ON Semiconductor",
                "Netgear",
                "Linksys",
                "D-Link",
                "Cisco",
                "Juniper Networks",
                "Aruba (a Hewlett Packard Enterprise company)",
            ],
            "Computing and Peripherals": [
                "Microsoft (Surface)",
                "Dell",
                "Lenovo",
                "Alienware (a subsidiary of Dell)",
                "HP (Hewlett-Packard)",
                "Logitech",
                "Asus",
                "Apple",
                "AMD",
                "NVIDIA",
            ],
            "Accessories and Connectivity": [
                "Anker",
                "Belkin",
                "Ugreen",
                "Aukey",
                "Monoprice",
                "Zagg",
                "Jabra",
                "Bose",
                "Sennheiser",
            ],
            "Home Appliances": [
                "GE Appliances",
                "Samsung (appliances)",
                "Dyson",
                "Electrolux",
                "KitchenAid",
                "Whirlpool",
                "Shark (vacuums and appliances)",
                "Viking",
                "Frigidaire",
            ],
            "Stationery": [
                "Moleskine",
                "Faber-Castell",
                "Staedtler",
                "Crayola",
                "Sharpie",
                "Post-it (3M)",
                "Pilot",
                "Pentel",
                "Paper Mate",
                "Leuchtturm1917",
            ],
            "Electricals": [
                "Philips",
                "Siemens",
                "Honeywell",
                "Bosch",
                "Schneider Electric",
                "Legrand",
                "Schneider Electric",
                "Eaton",
            ],
            "Clothing and Apparel": [
                "Nike",
                "Adidas",
                "Gucci",
                "Calvin Klein",
                "H&M",
                "Levi's",
                "Ralph Lauren",
                "Prada",
                "Zara",
                "Under Armour",
                "Puma",
                "Vans",
                "The North Face",
                "Reebok",
            ],
            "Tools": [
                "Milwaukee Tool",
                "DeWalt",
                "Makita",
                "Hilti",
                "Ridgid",
                "Ryobi",
                "Bosch Tools",
                "Stanley",
                "Craftsman",
                "Black+Decker",
            ],
            "Electronic Components and Parts": [
                "Analog Devices",
                "NXP Semiconductors",
                "Micron",
                "Broadcom",
                "Texas Instruments (TI)",
                "STMicroelectronics",
                "Emerson Electric",
                "Infineon",
                "Vishay",
                "On Semiconductor",
            ],
            "Photography": [
                "Canon",
                "Fujifilm",
                "Nikon",
                "Sony (cameras)",
                "Olympus",
                "Leica",
                "Sigma (camera lenses)",
                "Panasonic",
                "Pentax",
                "GoPro",
            ],
            "Health and Fitness": [
                "Life Fitness",
                "MyFitnessPal (Under Armour)",
                "Fitbit",
                "Polar",
                "Bowflex (Nautilus)",
                "Garmin",
                "DJI (drones and cameras)",
                "Apple Health",
                "Withings",
                "Omron",
            ],
            "Mobile Phones and Accessories": [
                "Nokia",
                "Motorola",
                "Huawei",
                "HTC",
                "Apple (accessories)",
                "Xiaomi",
                "OnePlus",
                "Samsung (accessories)",
                "Oppo",
                "Realme",
                "Vivo",
                "Google (Pixel)",
            ],
            "Speakers and Sounds": [
                "JBL",
                "Sonos",
                "Sony (headphones and accessories)",
                "Bose",
                "Bang & Olufsen",
                "Marshall",
                "Klipsch",
                "KEF",
                "Denon",
                "Harman Kardon",
                "Ultimate Ears",
            ],
            "Gaming and VR": [
                "Sony (PlayStation)",
                "Microsoft (Xbox)",
                "Nintendo",
                "Oculus (Facebook)",
                "HTC Vive",
                "Valve",
                "Razer",
                "Corsair",
                "Logitech (Gaming)",
            ],
            "Furniture and Interior Design": [
                "Ikea",
                "Wayfair",
                "Ashley Furniture",
                "Pottery Barn",
                "Restoration Hardware",
                "CB2",
                "West Elm",
                "Crate & Barrel",
                "Urban Outfitters (furniture)",
            ],
            "Sports and Outdoor Equipment": [
                "Nike",
                "Adidas",
                "Under Armour",
                "North Face",
                "Columbia Sportswear",
                "The North Face",
                "Patagonia",
                "Reebok",
                "Garmin",
                "Suunto",
            ],
            "Toys and Games": [
                "LEGO",
                "Hasbro",
                "Mattel",
                "Fisher-Price",
                "Barbie",
                "Hot Wheels",
                "Play-Doh",
                "NERF",
                "Playmobil",
                "Nintendo",
            ],
        }

        for category_name, brands in brands_with_categories.items():
            category, created = Category.objects.get_or_create(name=category_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Category '{category_name}' created."))
            else:
                self.stdout.write(self.style.WARNING(f"Category '{category_name}' already exists."))

            for brand_name in brands:
                brand, brand_created = Brand.objects.get_or_create(name=brand_name, category=category)
                if brand_created:
                    self.stdout.write(
                        self.style.SUCCESS(f"Brand '{brand_name}' added to category '{category_name}'.")
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f"Brand '{brand_name}' already exists in category '{category_name}'.")
                    )

