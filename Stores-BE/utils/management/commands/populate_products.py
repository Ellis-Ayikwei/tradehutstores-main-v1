"""
management/commands/populate_products.py

Covers all 17 categories / 189 subcategories with curated Unsplash photo IDs.
Image verification uses Pillow to confirm the downloaded bytes are a real image
before saving — not just a size check.

Usage:
    python manage.py populate_products
    python manage.py populate_products --no-images
    python manage.py populate_products --dry-run
    python manage.py populate_products --target 50 --images-per-product 4
"""

import random
import time
import urllib.request
from decimal import Decimal
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.catalog.models import Attribute, AttributeValue, Brand, SubCategory
from apps.products.models import Product, ProductImage, ProductVariant

# ─── Curated Unsplash photo IDs ───────────────────────────────────────────────
# URL format: https://images.unsplash.com/photo-{id}?w=1200&q=80&auto=format&fit=crop
# All 189 subcategories mapped. Subcategory name is lowercased + stripped for lookup.
# Add more IDs to any list to increase variety.

SUBCATEGORY_PHOTO_IDS: dict[str, list[str]] = {

    # ── Networking and Connectivity ───────────────────────────────────────────
    "cables": [
        "1558618666-fcd25c85cd64",
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1605810230434-7631ac76ec81",
    ],
    "modems": [
        "1558618666-fcd25c85cd64",
        "1573655349936-e5c6da3e4b9e",
        "1544197150-b99a580bb7a8",
    ],
    "network accessories": [
        "1558618666-fcd25c85cd64",
        "1605810230434-7631ac76ec81",
        "1544197150-b99a580bb7a8",
    ],
    "routers": [
        "1558618666-fcd25c85cd64",
        "1573655349936-e5c6da3e4b9e",
        "1544197150-b99a580bb7a8",
        "1605810230434-7631ac76ec81",
    ],
    "switches": [
        "1558618666-fcd25c85cd64",
        "1605810230434-7631ac76ec81",
        "1544197150-b99a580bb7a8",
    ],
    "wi-fi extenders": [
        "1558618666-fcd25c85cd64",
        "1573655349936-e5c6da3e4b9e",
        "1544197150-b99a580bb7a8",
    ],

    # ── Computing and Peripherals ─────────────────────────────────────────────
    "laptops": [
        "1496181133206-80ce9b88a853",
        "1525547719571-a2d4ac8945e2",
        "1593642632559-0c6d3fc62b89",
        "1587831990711-23ca6441447b",
        "1611078489935-0cb964de46d6",
        "1484788984921-03950022c9ef",
    ],
    "desktop computers": [
        "1547082299-de196ea013d6",
        "1593640408182-31c228b93f7c",
        "1587202372634-32705e3bf49c",
        "1555680202-52d4c9e83b42",
    ],
    "monitors": [
        "1527443224154-c4a3942d3acf",
        "1593642632599-a4e99e5f0d9d",
        "1585771724684-38269d6639fd",
        "1616588589676-62b3bd4ff6d2",
    ],
    "keyboards and mice": [
        "1587829741301-dc798b83add3",
        "1541140532-ad5f3e95e7f8",
        "1615750185825-cd3d47e8b9a1",
        "1627398242454-45a1465196b3",
    ],
    "printers": [
        "1612815154110-e428b3b63725",
        "1586953208270-2b4e47f22e2a",
        "1569400571046-f847e56d4bef",
    ],
    "adapters": [
        "1601439678578-72f5b7e9e9bf",
        "1558618666-fcd25c85cd64",
        "1544197150-b99a580bb7a8",
    ],
    "cable management accessories": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1605810230434-7631ac76ec81",
    ],
    "chargers": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1605810230434-7631ac76ec81",
    ],
    "hdmi cables": [
        "1601439678578-72f5b7e9e9bf",
        "1558618666-fcd25c85cd64",
        "1544197150-b99a580bb7a8",
    ],
    "power banks": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1605810230434-7631ac76ec81",
    ],
    "usb cables": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1558618666-fcd25c85cd64",
    ],

    # ── Home Appliances ───────────────────────────────────────────────────────
    "refrigerators": [
        "1571175443880-49e1d25b2bc5",
        "1556909114-f6e7ad7d3136",
        "1584568694244-14fbdf83bd30",
        "1614671073695-cfae98ca897f",
    ],
    "washing machines": [
        "1626806787461-102c1bfaaea1",
        "1558618047-3c8c76ca7d13",
        "1604335399105-a0c585fd81a1",
        "1558618666-fcd25c85cd64",
    ],
    "microwaves": [
        "1574269909862-7e1d70f2be78",
        "1585771724684-38269d6639fd",
        "1556909114-f6e7ad7d3136",
        "1614671073695-cfae98ca897f",
    ],
    "air conditioners": [
        "1614631446501-abcf76949e41",
        "1585771724684-38269d6639fd",
        "1584568694244-14fbdf83bd30",
        "1556909114-f6e7ad7d3136",
    ],
    "dishwashers": [
        "1585771724684-38269d6639fd",
        "1556909114-f6e7ad7d3136",
        "1574269909862-7e1d70f2be78",
        "1614671073695-cfae98ca897f",
    ],

    # ── Health and Fitness ────────────────────────────────────────────────────
    "fitness equipment and gear": [
        "1517836357463-d25dfeac3438",
        "1571019613454-1cb2f99b2d8b",
        "1576678927484-cc907957088c",
        "1534438327431-c77b08e8e2a3",
        "1549060279-7e168fcee0c2",
    ],
    "exercise and physical activity": [
        "1517836357463-d25dfeac3438",
        "1571019613454-1cb2f99b2d8b",
        "1576678927484-cc907957088c",
        "1549060279-7e168fcee0c2",
    ],
    "nutrition": [
        "1490645935967-10de6ba17061",
        "1512621776951-a57ef161e61b",
        "1498837167922-ddd27525d352",
        "1555243896-b3f4b905a1e3",
    ],
    "sports and athletics": [
        "1517836357463-d25dfeac3438",
        "1571019613454-1cb2f99b2d8b",
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
    ],
    "mental health and mindfulness": [
        "1508672019048-849f3168d814",
        "1545389336-cf090fa36a19",
        "1506126613408-eca07ce68773",
        "1593811167562-9cef47bfc4d7",
    ],
    "weight management": [
        "1517836357463-d25dfeac3438",
        "1490645935967-10de6ba17061",
        "1571019613454-1cb2f99b2d8b",
    ],
    "wellness and holistic health": [
        "1508672019048-849f3168d814",
        "1545389336-cf090fa36a19",
        "1490645935967-10de6ba17061",
    ],
    "recovery and rehabilitation": [
        "1517836357463-d25dfeac3438",
        "1576678927484-cc907957088c",
        "1571019613454-1cb2f99b2d8b",
    ],
    "disease prevention and management": [
        "1584308666744-eb7e62f1b9cc",
        "1576678927484-cc907957088c",
        "1508672019048-849f3168d814",
    ],
    "health education and coaching": [
        "1508672019048-849f3168d814",
        "1490645935967-10de6ba17061",
        "1545389336-cf090fa36a19",
    ],
    "community and social fitness": [
        "1517836357463-d25dfeac3438",
        "1571019613454-1cb2f99b2d8b",
        "1576678927484-cc907957088c",
    ],

    # ── Photography ───────────────────────────────────────────────────────────
    "cameras": [
        "1510127034890-ba27304e36ea",
        "1516035069371-29a1b244cc32",
        "1502982720700-bfff97f2ecac",
        "1542038784456-1ea8e935640e",
        "1606044866331-8e27b3e8f09f",
    ],
    "lenses": [
        "1542038784456-1ea8e935640e",
        "1516035069371-29a1b244cc32",
        "1588421357574-87938a86fa28",
        "1471341971476-ae15ff5dd4ea",
    ],
    "camera accessories": [
        "1542038784456-1ea8e935640e",
        "1510127034890-ba27304e36ea",
        "1516035069371-29a1b244cc32",
        "1588421357574-87938a86fa28",
    ],
    "camera accessories for smartphone photography": [
        "1511707171634-5f897ff02aa9",
        "1542038784456-1ea8e935640e",
        "1516035069371-29a1b244cc32",
    ],
    "camera and lens care": [
        "1542038784456-1ea8e935640e",
        "1510127034890-ba27304e36ea",
        "1588421357574-87938a86fa28",
    ],
    "camera cleaning and maintenance": [
        "1542038784456-1ea8e935640e",
        "1510127034890-ba27304e36ea",
    ],
    "camera drones and accessories": [
        "1473968512647-3e447244af8f",
        "1501854140801-50d01698950b",
        "1527977966861-b2d12b1d0d29",
    ],
    "camera supports and stabilizers": [
        "1542038784456-1ea8e935640e",
        "1510127034890-ba27304e36ea",
        "1516035069371-29a1b244cc32",
    ],
    "lighting equipment": [
        "1495364141860-b0d03eccd065",
        "1568702846914-96b305d2aaeb",
        "1542038784456-1ea8e935640e",
    ],
    "memory cards and storage": [
        "1544197150-b99a580bb7a8",
        "1601439678578-72f5b7e9e9bf",
        "1558618666-fcd25c85cd64",
    ],
    "photography apparel": [
        "1467043237213-65f2da53396f",
        "1520975954005-bef4b3b6b67e",
        "1542291026-7eec264c27ff",
    ],
    "photography books and education": [
        "1512820790803-83ca734da794",
        "1497633762265-9d179a990aa6",
        "1456513080510-7bf3a84b82f8",
    ],
    "photography software": [
        "1496181133206-80ce9b88a853",
        "1525547719571-a2d4ac8945e2",
        "1593642632559-0c6d3fc62b89",
    ],
    "photography studio gear": [
        "1495364141860-b0d03eccd065",
        "1568702846914-96b305d2aaeb",
        "1542038784456-1ea8e935640e",
    ],

    # ── Electronic Components and Parts ───────────────────────────────────────
    "capacitors": [
        "1518770660439-4636190af475",
        "1555680202-52d4c9e83b42",
        "1517420879524-86d64ac2f339",
    ],
    "resistors": [
        "1518770660439-4636190af475",
        "1517420879524-86d64ac2f339",
        "1555680202-52d4c9e83b42",
    ],
    "screens and displays": [
        "1527443224154-c4a3942d3acf",
        "1585771724684-38269d6639fd",
        "1616588589676-62b3bd4ff6d2",
    ],
    "semiconductors": [
        "1518770660439-4636190af475",
        "1517420879524-86d64ac2f339",
        "1555680202-52d4c9e83b42",
    ],

    # ── Tools ─────────────────────────────────────────────────────────────────
    "hand tools": [
        "1504148455328-c376907d081c",
        "1530124566582-a618bc2615dc",
        "1572981779307-38b8cabb2407",
        "1581092160562-811a2dfb3f93",
    ],
    "power tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1581092160562-811a2dfb3f93",
        "1530124566582-a618bc2615dc",
    ],
    "automotive tools": [
        "1504148455328-c376907d081c",
        "1530124566582-a618bc2615dc",
        "1572981779307-38b8cabb2407",
    ],
    "automotive repair tools": [
        "1504148455328-c376907d081c",
        "1530124566582-a618bc2615dc",
        "1572981779307-38b8cabb2407",
    ],
    "cutting tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1581092160562-811a2dfb3f93",
    ],
    "electrical tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1555680202-52d4c9e83b42",
    ],
    "gardening and landscaping tools": [
        "1416879595882-3373a0480b5b",
        "1466692476868-9ee5a3a3e31b",
        "1484557985045-edf25e08da73",
    ],
    "construction and masonry tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1581092160562-811a2dfb3f93",
    ],
    "fastening tools": [
        "1504148455328-c376907d081c",
        "1530124566582-a618bc2615dc",
        "1572981779307-38b8cabb2407",
    ],
    "masonry and tile tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1581092160562-811a2dfb3f93",
    ],
    "measuring and layout tools": [
        "1504148455328-c376907d081c",
        "1530124566582-a618bc2615dc",
        "1572981779307-38b8cabb2407",
    ],
    "metalworking tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1581092160562-811a2dfb3f93",
    ],
    "painting and decorating tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1571757767-3af35c5d7d03",
    ],
    "plumbing tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1530124566582-a618bc2615dc",
    ],
    "welding and soldering tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1581092160562-811a2dfb3f93",
    ],
    "woodworking tools": [
        "1504148455328-c376907d081c",
        "1530124566582-a618bc2615dc",
        "1572981779307-38b8cabb2407",
    ],

    # ── Clothing and Apparel ──────────────────────────────────────────────────
    "tops": [
        "1512436991641-6745cdb1723f",
        "1467043237213-65f2da53396f",
        "1520975954005-bef4b3b6b67e",
        "1523381294911-8d3cead13475",
    ],
    "bottoms": [
        "1490481651871-ab68de25d43d",
        "1542291026-7eec264c27ff",
        "1467043237213-65f2da53396f",
        "1520975954005-bef4b3b6b67e",
    ],
    "dresses": [
        "1515886657613-9f3515b0c78f",
        "1490481651871-ab68de25d43d",
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
    ],
    "outerwear": [
        "1594938298603-c8148c4b4939",
        "1467043237213-65f2da53396f",
        "1520975954005-bef4b3b6b67e",
        "1523381294911-8d3cead13475",
    ],
    "footwear": [
        "1542291026-7eec264c27ff",
        "1549298916-b41d501d3772",
        "1460353581641-37baddab0fa2",
        "1491553895911-0055eca6402d",
    ],
    "activewear": [
        "1517836357463-d25dfeac3438",
        "1571019613454-1cb2f99b2d8b",
        "1520975954005-bef4b3b6b67e",
        "1576678927484-cc907957088c",
    ],
    "accessories": [
        "1553062407-98eeb64c6a62",
        "1548036328-c9fa89d128fa",
        "1523275335684-37898b6baf30",
        "1467043237213-65f2da53396f",
    ],
    "formalwear": [
        "1594938298603-c8148c4b4939",
        "1467043237213-65f2da53396f",
        "1520975954005-bef4b3b6b67e",
        "1512436991641-6745cdb1723f",
    ],
    "intimate apparel": [
        "1515886657613-9f3515b0c78f",
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
    ],
    "swimwear": [
        "1515886657613-9f3515b0c78f",
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
    ],
    "kids' and baby clothing": [
        "1519238263530-99bdd11df2ea",
        "1471286174890-9c112ffca5b4",
        "1515488042361-ee00e0ddd4e4",
    ],
    "maternity wear": [
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
        "1512436991641-6745cdb1723f",
    ],
    "costumes and cosplay": [
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
        "1512436991641-6745cdb1723f",
    ],
    "ethnic and cultural clothing": [
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
        "1512436991641-6745cdb1723f",
    ],
    "specialty clothing": [
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
        "1512436991641-6745cdb1723f",
    ],
    "sustainable and eco-friendly clothing": [
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
        "1512436991641-6745cdb1723f",
    ],
    "uniforms": [
        "1594938298603-c8148c4b4939",
        "1467043237213-65f2da53396f",
        "1512436991641-6745cdb1723f",
    ],
    "vintage and retro clothing": [
        "1520975954005-bef4b3b6b67e",
        "1467043237213-65f2da53396f",
        "1512436991641-6745cdb1723f",
    ],

    # ── Electricals ───────────────────────────────────────────────────────────
    "batteries and power sources": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1558618666-fcd25c85cd64",
    ],
    "smart home devices": [
        "1558618666-fcd25c85cd64",
        "1573655349936-e5c6da3e4b9e",
        "1585771724684-38269d6639fd",
    ],
    "security systems": [
        "1558618666-fcd25c85cd64",
        "1573655349936-e5c6da3e4b9e",
        "1605810230434-7631ac76ec81",
    ],
    "small kitchen appliances": [
        "1556909114-f6e7ad7d3136",
        "1574269909862-7e1d70f2be78",
        "1585771724684-38269d6639fd",
    ],
    "entertainment electronics": [
        "1527443224154-c4a3942d3acf",
        "1593642632599-a4e99e5f0d9d",
        "1616588589676-62b3bd4ff6d2",
    ],
    "home appliances": [
        "1571175443880-49e1d25b2bc5",
        "1556909114-f6e7ad7d3136",
        "1585771724684-38269d6639fd",
    ],
    "automotive electricals": [
        "1504148455328-c376907d081c",
        "1601439678578-72f5b7e9e9bf",
        "1558618666-fcd25c85cd64",
    ],
    "computing and office electronics": [
        "1496181133206-80ce9b88a853",
        "1525547719571-a2d4ac8945e2",
        "1593642632559-0c6d3fc62b89",
    ],
    "electrical safety equipment": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1555680202-52d4c9e83b42",
    ],
    "electrical wiring and components": [
        "1518770660439-4636190af475",
        "1517420879524-86d64ac2f339",
        "1555680202-52d4c9e83b42",
    ],
    "industrial and commercial electrical equipment": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1518770660439-4636190af475",
    ],

    # ── Stationery ────────────────────────────────────────────────────────────
    "pens": [
        "1456735470-eb4bdc44cda6",
        "1471107191479-83b6f5dd1b34",
        "1583485088034-697b5bc54ccd",
    ],
    "pencils": [
        "1456735470-eb4bdc44cda6",
        "1471107191479-83b6f5dd1b34",
        "1583485088034-697b5bc54ccd",
    ],
    "notebooks and notepads": [
        "1512820790803-83ca734da794",
        "1456513080510-7bf3a84b82f8",
        "1497633762265-9d179a990aa6",
    ],
    "art supplies": [
        "1513364776144-60329b5103d5",
        "1572635196237-14b3f281503f",
        "1583485088034-697b5bc54ccd",
    ],
    "paper": [
        "1512820790803-83ca734da794",
        "1456513080510-7bf3a84b82f8",
        "1497633762265-9d179a990aa6",
    ],
    "desk accessories": [
        "1456735470-eb4bdc44cda6",
        "1583485088034-697b5bc54ccd",
        "1512820790803-83ca734da794",
    ],
    "folders and binders": [
        "1512820790803-83ca734da794",
        "1456513080510-7bf3a84b82f8",
        "1583485088034-697b5bc54ccd",
    ],
    "craft supplies": [
        "1513364776144-60329b5103d5",
        "1572635196237-14b3f281503f",
        "1583485088034-697b5bc54ccd",
    ],
    "filing and storage": [
        "1512820790803-83ca734da794",
        "1456513080510-7bf3a84b82f8",
        "1583485088034-697b5bc54ccd",
    ],
    "calendars and planners": [
        "1512820790803-83ca734da794",
        "1456513080510-7bf3a84b82f8",
        "1497633762265-9d179a990aa6",
    ],
    "adhesives": [
        "1456735470-eb4bdc44cda6",
        "1583485088034-697b5bc54ccd",
        "1512820790803-83ca734da794",
    ],
    "clips and fasteners": [
        "1456735470-eb4bdc44cda6",
        "1583485088034-697b5bc54ccd",
        "1512820790803-83ca734da794",
    ],
    "envelopes": [
        "1512820790803-83ca734da794",
        "1456513080510-7bf3a84b82f8",
        "1583485088034-697b5bc54ccd",
    ],
    "erasers": [
        "1456735470-eb4bdc44cda6",
        "1471107191479-83b6f5dd1b34",
        "1583485088034-697b5bc54ccd",
    ],
    "office tools": [
        "1456735470-eb4bdc44cda6",
        "1583485088034-697b5bc54ccd",
        "1512820790803-83ca734da794",
    ],
    "presentation supplies": [
        "1527443224154-c4a3942d3acf",
        "1512820790803-83ca734da794",
        "1456513080510-7bf3a84b82f8",
    ],
    "scissors and cutting tools": [
        "1504148455328-c376907d081c",
        "1572981779307-38b8cabb2407",
        "1456735470-eb4bdc44cda6",
    ],
    "stamps and stamp pads": [
        "1456735470-eb4bdc44cda6",
        "1583485088034-697b5bc54ccd",
        "1512820790803-83ca734da794",
    ],

    # ── Mobile Phones and Accessories ─────────────────────────────────────────
    "smartphones": [
        "1511707171634-5f897ff02aa9",
        "1592750475338-74b7b21085ab",
        "1556656793-08538906a9f8",
        "1565849904461-04a58ad377cb",
        "1601784551446-20c9e07cdbdb",
        "1580910051074-3eb694886505",
    ],
    "mobile phone cases and covers": [
        "1511707171634-5f897ff02aa9",
        "1592750475338-74b7b21085ab",
        "1556656793-08538906a9f8",
    ],
    "mobile phone chargers and cables": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1558618666-fcd25c85cd64",
    ],
    "bluetooth headsets and earbuds": [
        "1505740420928-5e560c06d30e",
        "1618366712010-f4ae9c647dcb",
        "1606016159991-d456965aaa25",
        "1585386959984-a4155224a1ad",
    ],
    "screen protectors": [
        "1511707171634-5f897ff02aa9",
        "1592750475338-74b7b21085ab",
        "1556656793-08538906a9f8",
    ],
    "mobile phone holders and mounts": [
        "1511707171634-5f897ff02aa9",
        "1592750475338-74b7b21085ab",
        "1601439678578-72f5b7e9e9bf",
    ],
    "mobile phone batteries": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1558618666-fcd25c85cd64",
    ],
    "mobile phone repair parts": [
        "1518770660439-4636190af475",
        "1517420879524-86d64ac2f339",
        "1511707171634-5f897ff02aa9",
    ],
    "mobile phone signal boosters": [
        "1558618666-fcd25c85cd64",
        "1573655349936-e5c6da3e4b9e",
        "1544197150-b99a580bb7a8",
    ],
    "car accessories for mobile phones": [
        "1511707171634-5f897ff02aa9",
        "1601439678578-72f5b7e9e9bf",
        "1558618666-fcd25c85cd64",
    ],
    "basic phones": [
        "1511707171634-5f897ff02aa9",
        "1580910051074-3eb694886505",
        "1556656793-08538906a9f8",
    ],
    "feature phones": [
        "1511707171634-5f897ff02aa9",
        "1580910051074-3eb694886505",
        "1556656793-08538906a9f8",
    ],
    "gaming phones": [
        "1511707171634-5f897ff02aa9",
        "1593305841991-05c297ba4575",
        "1592750475338-74b7b21085ab",
    ],
    "refurbished phones": [
        "1511707171634-5f897ff02aa9",
        "1580910051074-3eb694886505",
        "1592750475338-74b7b21085ab",
    ],
    "rugged phones": [
        "1511707171634-5f897ff02aa9",
        "1580910051074-3eb694886505",
        "1592750475338-74b7b21085ab",
    ],
    "unlocked phones": [
        "1511707171634-5f897ff02aa9",
        "1592750475338-74b7b21085ab",
        "1556656793-08538906a9f8",
    ],

    # ── Speakers and Sounds ───────────────────────────────────────────────────
    "bluetooth speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1558618666-fcd25c85cd64",
        "1531163100-3f67bf9ff3e6",
    ],
    "portable speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1558618666-fcd25c85cd64",
    ],
    "headphones": [
        "1505740420928-5e560c06d30e",
        "1618366712010-f4ae9c647dcb",
        "1585386959984-a4155224a1ad",
        "1606016159991-d456965aaa25",
        "1487215066873-16e2bc62ebe3",
    ],
    "soundbars": [
        "1608043152269-423dbba4e7e1",
        "1527443224154-c4a3942d3acf",
        "1545454675-3479531219e3",
    ],
    "subwoofers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1531163100-3f67bf9ff3e6",
    ],
    "home speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1531163100-3f67bf9ff3e6",
    ],
    "bookshelf speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1531163100-3f67bf9ff3e6",
    ],
    "car speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1531163100-3f67bf9ff3e6",
    ],
    "computer speakers": [
        "1608043152269-423dbba4e7e1",
        "1527443224154-c4a3942d3acf",
        "1545454675-3479531219e3",
    ],
    "outdoor speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1531163100-3f67bf9ff3e6",
    ],
    "studio monitors": [
        "1608043152269-423dbba4e7e1",
        "1495364141860-b0d03eccd065",
        "1545454675-3479531219e3",
    ],
    "surround sound speakers": [
        "1608043152269-423dbba4e7e1",
        "1527443224154-c4a3942d3acf",
        "1545454675-3479531219e3",
    ],
    "wireless speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1531163100-3f67bf9ff3e6",
    ],

    # ── Sports and Outdoor Equipment ──────────────────────────────────────────
    "fitness and exercise equipment": [
        "1517836357463-d25dfeac3438",
        "1571019613454-1cb2f99b2d8b",
        "1576678927484-cc907957088c",
        "1534438327431-c77b08e8e2a3",
    ],
    "bicycles and accessories": [
        "1485965120184-e220f721d03e",
        "1497366216548-37526070297c",
        "1571068316344-75bc8c28fc6d",
    ],
    "camping and hiking gear": [
        "1478131143081-80a7fb328057",
        "1452421186569-25f1dc4ca2de",
        "1533240332153-8b44e1b2f5ac",
    ],
    "cycling": [
        "1485965120184-e220f721d03e",
        "1497366216548-37526070297c",
        "1571068316344-75bc8c28fc6d",
    ],
    "swimming and diving equipment": [
        "1530549387789-4c161e8f0a74",
        "1519315307-8284683ad9a8",
        "1576013551627-0cc20b96c2a7",
    ],
    "golf equipment": [
        "1535131323-bded-42e5-b04e-99e92edbb9d3",
        "1568792923760-d70635a89081",
        "1593111774240-d529f12cf4bb",
    ],
    "soccer equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1579952363873-27f3bade9f55",
    ],
    "tennis equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1531315396756-905d68d21b56",
    ],
    "football equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1579952363873-27f3bade9f55",
    ],
    "baseball and softball equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1531315396756-905d68d21b56",
    ],
    "basketball equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1579952363873-27f3bade9f55",
    ],
    "hockey equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1531315396756-905d68d21b56",
    ],
    "lacrosse equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1531315396756-905d68d21b56",
    ],
    "racquet sports equipment": [
        "1518611012118-696072aa579a",
        "1531315396756-905d68d21b56",
        "1546483875-ad9de16168f0",
    ],
    "track and field equipment": [
        "1517836357463-d25dfeac3438",
        "1571019613454-1cb2f99b2d8b",
        "1518611012118-696072aa579a",
    ],
    "volleyball equipment": [
        "1518611012118-696072aa579a",
        "1546483875-ad9de16168f0",
        "1531315396756-905d68d21b56",
    ],

    # ── Toys and Games ────────────────────────────────────────────────────────
    "games and puzzles": [
        "1518546305927-8699bc274b53",
        "1566694271453-e1ee9c63d241",
        "1576471182393-4e0bce8e95d6",
    ],
    "educational and learning toys": [
        "1519238263530-99bdd11df2ea",
        "1471286174890-9c112ffca5b4",
        "1515488042361-ee00e0ddd4e4",
    ],
    "action figures and accessories": [
        "1518546305927-8699bc274b53",
        "1566694271453-e1ee9c63d241",
        "1576471182393-4e0bce8e95d6",
    ],
    "building and construction toys": [
        "1518546305927-8699bc274b53",
        "1566694271453-e1ee9c63d241",
        "1576471182393-4e0bce8e95d6",
    ],
    "dolls and accessories": [
        "1519238263530-99bdd11df2ea",
        "1471286174890-9c112ffca5b4",
        "1518546305927-8699bc274b53",
    ],
    "baby and preschool toys": [
        "1519238263530-99bdd11df2ea",
        "1471286174890-9c112ffca5b4",
        "1515488042361-ee00e0ddd4e4",
    ],
    "outdoor toys and games": [
        "1518611012118-696072aa579a",
        "1519238263530-99bdd11df2ea",
        "1566694271453-e1ee9c63d241",
    ],
    "electronic toys": [
        "1518770660439-4636190af475",
        "1518546305927-8699bc274b53",
        "1566694271453-e1ee9c63d241",
    ],
    "art and craft supplies": [
        "1513364776144-60329b5103d5",
        "1572635196237-14b3f281503f",
        "1583485088034-697b5bc54ccd",
    ],
    "collectible toys": [
        "1518546305927-8699bc274b53",
        "1566694271453-e1ee9c63d241",
        "1576471182393-4e0bce8e95d6",
    ],
    "imaginative play toys": [
        "1519238263530-99bdd11df2ea",
        "1471286174890-9c112ffca5b4",
        "1518546305927-8699bc274b53",
    ],
    "pretend play toys": [
        "1519238263530-99bdd11df2ea",
        "1471286174890-9c112ffca5b4",
        "1518546305927-8699bc274b53",
    ],
    "ride-on toys": [
        "1519238263530-99bdd11df2ea",
        "1471286174890-9c112ffca5b4",
        "1515488042361-ee00e0ddd4e4",
    ],
    "toy building sets": [
        "1518546305927-8699bc274b53",
        "1566694271453-e1ee9c63d241",
        "1576471182393-4e0bce8e95d6",
    ],
    "toy vehicles": [
        "1518546305927-8699bc274b53",
        "1566694271453-e1ee9c63d241",
        "1576471182393-4e0bce8e95d6",
    ],

    # ── Gaming and VR ─────────────────────────────────────────────────────────
    "gaming laptops": [
        "1587831990711-23ca6441447b",
        "1593642632559-0c6d3fc62b89",
        "1496181133206-80ce9b88a853",
        "1611078489935-0cb964de46d6",
    ],
    "gaming monitors": [
        "1593642632599-a4e99e5f0d9d",
        "1527443224154-c4a3942d3acf",
        "1616588589676-62b3bd4ff6d2",
    ],
    "gaming keyboards and mice": [
        "1587829741301-dc798b83add3",
        "1627398242454-45a1465196b3",
        "1615750185825-cd3d47e8b9a1",
    ],
    "gaming controllers": [
        "1593305841991-05c297ba4575",
        "1587202372634-32705e3bf49c",
        "1568702846914-96b305d2aaeb",
    ],
    "gaming pcs and consoles": [
        "1593305841991-05c297ba4575",
        "1547082299-de196ea013d6",
        "1587202372634-32705e3bf49c",
    ],
    "gaming desks and chairs": [
        "1547082299-de196ea013d6",
        "1593640408182-31c228b93f7c",
        "1585771724684-38269d6639fd",
    ],
    "gaming sound cards and speakers": [
        "1608043152269-423dbba4e7e1",
        "1545454675-3479531219e3",
        "1505740420928-5e560c06d30e",
    ],
    "gaming virtual reality (vr) and augmented reality (ar)": [
        "1593305841991-05c297ba4575",
        "1587202372634-32705e3bf49c",
        "1568702846914-96b305d2aaeb",
    ],
    "gaming webcams": [
        "1516035069371-29a1b244cc32",
        "1542038784456-1ea8e935640e",
        "1593642632559-0c6d3fc62b89",
    ],
    "console accessories": [
        "1593305841991-05c297ba4575",
        "1587202372634-32705e3bf49c",
        "1568702846914-96b305d2aaeb",
    ],
    "gaming software": [
        "1593305841991-05c297ba4575",
        "1496181133206-80ce9b88a853",
        "1587202372634-32705e3bf49c",
    ],

    # ── Furniture and Interior Design ─────────────────────────────────────────
    "living room furniture": [
        "1555041469-db61528b73ae",
        "1567016376408-0226e4d0c1ea",
        "1493663284031-b7e3aefcae7e",
    ],
    "bedroom furniture": [
        "1505693416388-ac5ce068fe85",
        "1555041469-db61528b73ae",
        "1567016376408-0226e4d0c1ea",
    ],
    "office furniture": [
        "1547082299-de196ea013d6",
        "1593640408182-31c228b93f7c",
        "1585771724684-38269d6639fd",
    ],
    "decor": [
        "1555041469-db61528b73ae",
        "1567016376408-0226e4d0c1ea",
        "1493663284031-b7e3aefcae7e",
    ],
    "lighting": [
        "1495364141860-b0d03eccd065",
        "1568702846914-96b305d2aaeb",
        "1555041469-db61528b73ae",
    ],
    "storage solutions": [
        "1555041469-db61528b73ae",
        "1567016376408-0226e4d0c1ea",
        "1493663284031-b7e3aefcae7e",
    ],

    # ── Accessories and Connectivity ──────────────────────────────────────────
    "accessories and connectivity": [
        "1601439678578-72f5b7e9e9bf",
        "1544197150-b99a580bb7a8",
        "1558618666-fcd25c85cd64",
    ],
}

# Fallback for any subcategory not explicitly listed
FALLBACK_PHOTO_IDS = [
    "1523275335684-37898b6baf30",
    "1491553895911-0055eca6402d",
    "1553456558-aff63285bdd1",
    "1511556820780-d912e42b4980",
    "1600494603989-9650cf6dad51",
    "1585386959984-a4155224a1ad",
]

UNSPLASH_BASE  = "https://images.unsplash.com/photo-{id}?w=1200&q=80&auto=format&fit=crop"
IMAGES_PER_PRODUCT = 5


class Command(BaseCommand):
    help = "Seed products across all 17 categories / 189 subcategories."

    TARGET_PRODUCTS = 150

    VARIATION_THEMES = (
        "single", "color", "size", "material", "capacity", "size-color",
    )
    PRODUCT_SERIES = (
        "Pro", "Ultra", "Max", "Prime", "Plus",
        "Edge", "Elite", "Core", "Vision", "Air",
    )
    PRODUCT_TYPES = {
        "laptops":                  ["Laptop", "Notebook", "Ultrabook"],
        "desktop computers":        ["Desktop PC", "All-in-One PC", "Tower PC"],
        "monitors":                 ["Monitor", "Gaming Monitor", "Office Monitor"],
        "keyboards and mice":       ["Keyboard", "Mechanical Keyboard", "Mouse Combo"],
        "printers":                 ["Printer", "Laser Printer", "Inkjet Printer"],
        "smartphones":              ["Smartphone", "5G Phone", "Android Phone"],
        "bluetooth speakers":       ["Bluetooth Speaker", "Portable Speaker"],
        "routers":                  ["Wi-Fi Router", "Mesh Router", "Dual-Band Router"],
        "cameras":                  ["Mirrorless Camera", "DSLR", "Compact Camera"],
        "lenses":                   ["Prime Lens", "Zoom Lens", "Wide-Angle Lens"],
        "refrigerators":           ["Refrigerator", "Double Door Fridge"],
        "washing machines":         ["Washing Machine", "Front Load Washer"],
        "microwaves":               ["Microwave Oven", "Convection Microwave"],
        "air conditioners":         ["Split AC", "Window AC", "Portable AC"],
        "headphones":               ["Wireless Headphones", "ANC Headphones"],
        "fitness equipment and gear":["Treadmill", "Dumbbell Set", "Resistance Bands"],
        "hand tools":               ["Screwdriver Set", "Wrench Set", "Hammer"],
        "power tools":              ["Drill", "Circular Saw", "Angle Grinder"],
        "tops":                     ["T-Shirt", "Polo Shirt", "Blouse", "Hoodie"],
        "bottoms":                  ["Jeans", "Chinos", "Joggers", "Shorts"],
        "footwear":                 ["Sneakers", "Boots", "Sandals", "Loafers"],
        "gaming laptops":           ["Gaming Laptop", "Gaming Notebook"],
        "gaming controllers":       ["Gaming Controller", "Gamepad", "Joystick"],
        "living room furniture":    ["Sofa", "Coffee Table", "TV Stand", "Armchair"],
        "bedroom furniture":        ["Bed Frame", "Wardrobe", "Dresser", "Nightstand"],
        "pens":                     ["Ballpoint Pen", "Fountain Pen", "Rollerball Pen"],
        "notebooks and notepads":   ["Notebook", "Journal", "Notepad"],
        "default":                  ["Device", "Product", "Equipment", "Accessory"],
    }

    def add_arguments(self, parser):
        parser.add_argument("--no-images",          action="store_true")
        parser.add_argument("--dry-run",             action="store_true")
        parser.add_argument("--target",              type=int, default=self.TARGET_PRODUCTS)
        parser.add_argument("--images-per-product",  type=int, default=IMAGES_PER_PRODUCT)

    # ── Attribute helpers ─────────────────────────────────────────────────────

    def _build_attribute_index(self):
        index = {}
        for av in AttributeValue.objects.select_related("attribute"):
            index.setdefault(av.attribute.name.lower(), []).append(av)
        return index

    def _get_attr_value(self, attr_index, attr_name):
        key = attr_name.lower()
        if key not in attr_index:
            attr, _ = Attribute.objects.get_or_create(name=attr_name)
            val, _  = AttributeValue.objects.get_or_create(
                attribute=attr, value_name=f"Default {attr_name}"
            )
            attr_index[key] = [val]
        return random.choice(attr_index[key])

    def _attribute_values_for_theme(self, attr_index, theme):
        mapping = {
            "color":      ["Color"],
            "size":       ["Size"],
            "material":   ["Material"],
            "capacity":   ["Capacity"],
            "size-color": ["Size", "Color"],
        }
        return [self._get_attr_value(attr_index, a) for a in mapping.get(theme, [])]

    # ── Brand / name helpers ──────────────────────────────────────────────────

    def _resolve_brand(self, category):
        brands = list(Brand.objects.filter(category=category))
        if brands:
            return random.choice(brands)
        brand, _ = Brand.objects.get_or_create(
            category=category,
            name=f"{category.name} Generic",
        )
        return brand

    def _product_type(self, sub_category_name):
        key = sub_category_name.strip().lower()
        return random.choice(self.PRODUCT_TYPES.get(key, self.PRODUCT_TYPES["default"]))

    def _product_name(self, brand_name, sub_category_name):
        return (
            f"{brand_name} {random.choice(self.PRODUCT_SERIES)} "
            f"{self._product_type(sub_category_name)} "
            f"{random.randint(100,999)}{random.choice(['A','X','S','P'])}"
        )

    # ── Image helpers ─────────────────────────────────────────────────────────

    def _photo_ids_for(self, sub_category_name: str) -> list:
        key = sub_category_name.strip().lower()
        return SUBCATEGORY_PHOTO_IDS.get(key, FALLBACK_PHOTO_IDS)

    def _download_image(self, url: str, retries: int = 3) -> bytes | None:
        for attempt in range(1, retries + 1):
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "TradeHut-Seeder/2.0"}
                )
                with urllib.request.urlopen(req, timeout=15) as r:
                    data = r.read()
                # ── Real image verification using Pillow ──────────────────────
                # This is the correct check — actually try to decode the image.
                # A 404 page or error response will raise here, not slip through.
                try:
                    from PIL import Image as PilImage
                    from io import BytesIO
                    img = PilImage.open(BytesIO(data))
                    img.verify()   # raises if not a valid image
                    return data
                except Exception:
                    raise ValueError("Downloaded bytes are not a valid image")
            except Exception as e:
                if attempt < retries:
                    time.sleep(2 ** attempt)
                else:
                    self.stderr.write(f"    ✗ {url}  [{e}]")
        return None

    def _save_images(self, product, variant, sub_category_name: str, n: int) -> int:
        from io import BytesIO
        photo_ids = self._photo_ids_for(sub_category_name)
        # Cycle through IDs to fill n slots — shuffle for variety across runs
        shuffled = photo_ids[:]
        random.shuffle(shuffled)
        ids_to_use = [shuffled[i % len(shuffled)] for i in range(n)]

        saved = 0
        for i, photo_id in enumerate(ids_to_use):
            url  = UNSPLASH_BASE.format(id=photo_id)
            data = self._download_image(url)
            if not data:
                continue

            is_main  = (i == 0)
            filename = f"{slugify(product.name)[:40]}-{i+1}.jpg"
            cfile    = ContentFile(data, name=filename)

            # Save to the denormalised main_product_image field (first image only)
            if is_main and not product.main_product_image:
                product.main_product_image.save(filename, ContentFile(data, name=filename), save=True)

            # Always create a ProductImage record for every image
            img_obj, created = ProductImage.objects.get_or_create(
                product=product,
                product_variant=variant,
                image_type="main" if is_main else "supplementary",
            )
            if created or not img_obj.image:
                img_obj.is_main = is_main
                img_obj.image.save(filename, ContentFile(data, name=filename), save=True)
                saved += 1

        return saved

    # ── Product / variant upsert ──────────────────────────────────────────────

    def _upsert_product(self, category, sub_category, brand):
        name  = self._product_name(brand.name, sub_category.sub_category_name)
        qty   = random.randint(5, 80)
        price = Decimal(str(random.randint(25, 1500)))
        theme = random.choice(self.VARIATION_THEMES)

        product, created = Product.objects.get_or_create(
            name=name, category=category,
            sub_category=sub_category, brand=brand,
            defaults={
                "keywords":        f"{category.name} {sub_category.sub_category_name} {brand.name}",
                "description":     (
                    f"High-quality {sub_category.sub_category_name} from {brand.name}. "
                    f"Part of the {random.choice(self.PRODUCT_SERIES)} range."
                ),
                "status":          "Active",
                "available":       True,
                "variation_theme": theme,
                "condition":       "New",
                "inventory_level": qty,
            },
        )
        if not created:
            theme = product.variation_theme or "single"
            qty   = product.inventory_level or qty

        return product, created, theme, qty, price

    def _upsert_variants(self, product, theme, qty, base_price, attr_index):
        variant_count   = 1 if theme == "single" else random.randint(2, 4)
        default_variant = None
        created_count   = 0
        sku_prefix      = f"{slugify(product.name)[:15]}-{product.id}"

        for idx in range(1, variant_count + 1):
            sku     = f"{sku_prefix}-{idx:02d}"
            price   = base_price + Decimal(str(idx * random.randint(3, 20)))
            v_qty   = max(1, qty - (idx - 1) * random.randint(0, 4))

            variant, created = ProductVariant.objects.get_or_create(
                product=product, sku=sku,
                defaults={
                    "name":           f"{product.name} — Variant {idx}",
                    "price":          price,
                    "quantity":       v_qty,
                    "min_buy_amount": 1,
                },
            )
            if created:
                created_count += 1

            attr_vals = self._attribute_values_for_theme(attr_index, theme)
            if attr_vals:
                variant.attribute_values.set(attr_vals)

            if default_variant is None:
                default_variant = variant

        if default_variant and product.default_variant_id != default_variant.id:
            product.default_variant = default_variant
            product.save(update_fields=["default_variant"])

        return default_variant, created_count

    # ── Main ──────────────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        random.seed(42)
        skip_images = options["no_images"]
        dry_run     = options["dry_run"]
        target      = options["target"]
        images_per  = options["images_per_product"]

        sub_categories = list(SubCategory.objects.select_related("category").all())
        if not sub_categories:
            self.stdout.write(self.style.ERROR(
                "No subcategories found. Run populate_categories first."
            ))
            return

        # Report coverage
        known   = set(SUBCATEGORY_PHOTO_IDS.keys())
        all_sub = {s.sub_category_name.strip().lower() for s in sub_categories}
        missing = all_sub - known
        if missing:
            self.stdout.write(self.style.WARNING(
                f"{len(missing)} subcategories have no curated photos "
                f"(will use fallback): {', '.join(sorted(missing))}"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"All {len(all_sub)} subcategories have curated photo IDs."
            ))

        attr_index = self._build_attribute_index()

        try:
            from tqdm import tqdm
            iterator = tqdm(range(target), desc="Seeding")
        except ImportError:
            iterator = range(target)

        products_created = 0
        variants_created = 0
        images_saved     = 0

        for i in iterator:
            sub_cat  = sub_categories[i % len(sub_categories)]
            category = sub_cat.category
            brand    = self._resolve_brand(category)

            if dry_run:
                self.stdout.write(
                    f"  [dry] {self._product_name(brand.name, sub_cat.sub_category_name)}"
                )
                continue

            product, p_created, theme, qty, price = self._upsert_product(
                category, sub_cat, brand
            )
            if p_created:
                products_created += 1

            default_variant, v_created = self._upsert_variants(
                product, theme, qty, price, attr_index
            )
            variants_created += v_created

            if not skip_images and default_variant:
                existing = product.product_images.count()
                if existing < images_per:
                    saved = self._save_images(
                        product, default_variant,
                        sub_cat.sub_category_name,
                        images_per - existing,
                    )
                    images_saved += saved
                    self.stdout.write(
                        f"  ✓ {product.name[:50]}  "
                        f"[{existing + saved}/{images_per} images]"
                    )

        self.stdout.write(self.style.SUCCESS(
            f"\nDone.\n"
            f"  Products : {products_created}\n"
            f"  Variants : {variants_created}\n"
            f"  Images   : {images_saved}\n"
        ))