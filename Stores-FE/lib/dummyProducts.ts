export interface DummyProduct {
    id: number
    name: string
    price: number
    original_price?: number
    discount?: number
    image: string
    category: string
    rating: number
    reviews: number
    stock: number
    brand?: string
}

export const dummyProducts: DummyProduct[] = [
    // Electronics
    {
        id: 1,
        name: "Samsung Galaxy A16 - 128GB + 4GB RAM - 6.7\" - Gray",
        price: 1861.70,
        original_price: 2000.00,
        discount: 7,
        image: "/assets/images/categories/Smartphones.jpeg",
        category: "Electronics",
        rating: 4.5,
        reviews: 234,
        stock: 15,
        brand: "Samsung"
    },
    {
        id: 2,
        name: "Xiaomi Redmi 15C - 256GB - 8GB RAM - 50MP Camera",
        price: 1607.00,
        original_price: 2999.00,
        discount: 46,
        image: "/assets/images/categories/Smartphones.jpeg",
        category: "Electronics",
        rating: 4.7,
        reviews: 189,
        stock: 8,
        brand: "Xiaomi"
    },
    {
        id: 3,
        name: "HP Pavilion 15.6\" Laptop - Intel Core i5 - 8GB RAM - 256GB SSD",
        price: 3500.00,
        original_price: 4500.00,
        discount: 22,
        image: "/assets/images/categories/Laptops.jpeg",
        category: "Electronics",
        rating: 4.6,
        reviews: 156,
        stock: 12,
        brand: "HP"
    },
    {
        id: 4,
        name: "Dell Inspiron 14\" Business Laptop - 16GB RAM - 512GB SSD",
        price: 5200.00,
        original_price: 6800.00,
        discount: 24,
        image: "/assets/images/categories/Laptops.jpeg",
        category: "Electronics",
        rating: 4.8,
        reviews: 203,
        stock: 6,
        brand: "Dell"
    },
    {
        id: 5,
        name: "Apple iPad 10.2\" 64GB WiFi - Space Gray",
        price: 2800.00,
        original_price: 3500.00,
        discount: 20,
        image: "/assets/images/categories/Laptops.jpeg",
        category: "Electronics",
        rating: 4.9,
        reviews: 412,
        stock: 20,
        brand: "Apple"
    },
    {
        id: 6,
        name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        price: 1850.00,
        original_price: 2300.00,
        discount: 20,
        image: "/assets/images/categories/Accessories.jpeg",
        category: "Electronics",
        rating: 4.9,
        reviews: 567,
        stock: 18,
        brand: "Sony"
    },
    // Home Appliances
    {
        id: 7,
        name: "Roch RH-LE32DS-C 32\" Digital Satellite LED TV - Black",
        price: 1038.46,
        original_price: 1400.00,
        discount: 26,
        image: "/assets/images/categories/Computing & Peripherals.avif",
        category: "Home Appliances",
        rating: 4.3,
        reviews: 145,
        stock: 16,
        brand: "Roch"
    },
    {
        id: 8,
        name: "Westpool WP-167A Double Door Refrigerator - 112L - Silver",
        price: 2383.00,
        original_price: 3500.00,
        discount: 32,
        image: "/assets/images/categories/Home Appliances.avif",
        category: "Home Appliances",
        rating: 4.4,
        reviews: 98,
        stock: 10,
        brand: "Westpool"
    },
    {
        id: 9,
        name: "Samsung 43\" 4K Smart TV - HDR - Built-in WiFi",
        price: 3200.00,
        original_price: 4200.00,
        discount: 24,
        image: "/assets/images/categories/Computing & Peripherals.avif",
        category: "Home Appliances",
        rating: 4.7,
        reviews: 289,
        stock: 14,
        brand: "Samsung"
    },
    {
        id: 10,
        name: "LG 190L Top Mount Refrigerator - Silver",
        price: 3100.00,
        original_price: 3800.00,
        discount: 18,
        image: "/assets/images/categories/Home Appliances.avif",
        category: "Home Appliances",
        rating: 4.5,
        reviews: 167,
        stock: 8,
        brand: "LG"
    },
    {
        id: 11,
        name: "Bruhm 5 Burner Gas Cooker - Glass Top - Silver",
        price: 1511.63,
        original_price: 2100.00,
        discount: 28,
        image: "/assets/images/categories/Home Appliances.avif",
        category: "Home Appliances",
        rating: 4.6,
        reviews: 134,
        stock: 9,
        brand: "Bruhm"
    },
    {
        id: 12,
        name: "Hisense 7Kg Washing Machine - Front Load - White",
        price: 2800.00,
        original_price: 3600.00,
        discount: 22,
        image: "/assets/images/categories/Home Appliances.avif",
        category: "Home Appliances",
        rating: 4.4,
        reviews: 112,
        stock: 7,
        brand: "Hisense"
    },
    // Fashion
    {
        id: 13,
        name: "Men's Casual Cotton Polo Shirt - Various Colors",
        price: 89.00,
        original_price: 150.00,
        discount: 41,
        image: "/assets/images/categories/Clothing & Apparel.avif",
        category: "Fashion",
        rating: 4.2,
        reviews: 456,
        stock: 50,
        brand: "Generic"
    },
    {
        id: 14,
        name: "Women's Summer Floral Dress - Cotton Blend",
        price: 120.00,
        original_price: 200.00,
        discount: 40,
        image: "/assets/images/categories/Clothing & Apparel.avif",
        category: "Fashion",
        rating: 4.5,
        reviews: 234,
        stock: 35,
        brand: "Fashion Hub"
    },
    {
        id: 15,
        name: "Men's Classic Denim Jeans - Slim Fit",
        price: 150.00,
        original_price: 250.00,
        discount: 40,
        image: "/assets/images/categories/Clothing & Apparel.avif",
        category: "Fashion",
        rating: 4.6,
        reviews: 389,
        stock: 42,
        brand: "Denim Co"
    },
    {
        id: 16,
        name: "Women's Leather Handbag - Designer Style",
        price: 180.00,
        original_price: 300.00,
        discount: 40,
        image: "/assets/images/categories/Accessories.jpeg",
        category: "Fashion",
        rating: 4.7,
        reviews: 178,
        stock: 22,
        brand: "Luxe"
    },
    {
        id: 17,
        name: "Unisex Sneakers - Comfortable Running Shoes",
        price: 200.00,
        original_price: 350.00,
        discount: 43,
        image: "/assets/images/categories/Accessories.jpeg",
        category: "Fashion",
        rating: 4.5,
        reviews: 567,
        stock: 38,
        brand: "SportFit"
    },
    {
        id: 18,
        name: "Men's Business Suit - 2 Piece - Formal",
        price: 450.00,
        original_price: 800.00,
        discount: 44,
        image: "/assets/images/categories/Clothing & Apparel.avif",
        category: "Fashion",
        rating: 4.8,
        reviews: 145,
        stock: 15,
        brand: "Executive"
    },
    // Home & Office
    {
        id: 19,
        name: "Ergonomic Office Chair - Mesh Back - Adjustable",
        price: 350.00,
        original_price: 550.00,
        discount: 36,
        image: "/assets/images/categories/Furniture & Interior.avif",
        category: "Home & Office",
        rating: 4.6,
        reviews: 234,
        stock: 18,
        brand: "ComfortSeating"
    },
    {
        id: 20,
        name: "L-Shaped Computer Desk - Wood Finish",
        price: 580.00,
        original_price: 900.00,
        discount: 36,
        image: "/assets/images/categories/Furniture & Interior.avif",
        category: "Home & Office",
        rating: 4.5,
        reviews: 156,
        stock: 12,
        brand: "HomeOffice Pro"
    },
    {
        id: 21,
        name: "3-Seater Fabric Sofa - Modern Design - Gray",
        price: 1200.00,
        original_price: 1800.00,
        discount: 33,
        image: "/assets/images/categories/Furniture & Interior.avif",
        category: "Home & Office",
        rating: 4.7,
        reviews: 189,
        stock: 8,
        brand: "Living Comfort"
    },
    {
        id: 22,
        name: "Queen Size Bed Frame with Storage - Wooden",
        price: 950.00,
        original_price: 1500.00,
        discount: 37,
        image: "/assets/images/categories/Furniture & Interior.avif",
        category: "Home & Office",
        rating: 4.6,
        reviews: 167,
        stock: 10,
        brand: "Bedroom Essentials"
    },
    {
        id: 23,
        name: "6-Piece Dining Table Set - Modern",
        price: 1100.00,
        original_price: 1700.00,
        discount: 35,
        image: "/assets/images/categories/Furniture & Interior.avif",
        category: "Home & Office",
        rating: 4.5,
        reviews: 134,
        stock: 6,
        brand: "Dining Style"
    },
    {
        id: 24,
        name: "Bookshelf 5-Tier - Wood and Metal",
        price: 280.00,
        original_price: 450.00,
        discount: 38,
        image: "/assets/images/categories/Furniture & Interior.avif",
        category: "Home & Office",
        rating: 4.4,
        reviews: 198,
        stock: 22,
        brand: "Storage Plus"
    },
    // Sports & Fitness
    {
        id: 25,
        name: "Yoga Mat - Non-Slip - Extra Thick 10mm",
        price: 45.00,
        original_price: 80.00,
        discount: 44,
        image: "/assets/images/categories/Sports & Outdoor.avif",
        category: "Sports",
        rating: 4.6,
        reviews: 456,
        stock: 60,
        brand: "FitLife"
    },
    {
        id: 26,
        name: "Adjustable Dumbbell Set - 5-25kg",
        price: 320.00,
        original_price: 500.00,
        discount: 36,
        image: "/assets/images/categories/Sports & Outdoor.avif",
        category: "Sports",
        rating: 4.7,
        reviews: 289,
        stock: 18,
        brand: "PowerFit"
    },
    {
        id: 27,
        name: "Treadmill - Foldable - Digital Display",
        price: 2200.00,
        original_price: 3200.00,
        discount: 31,
        image: "/assets/images/categories/Sports & Outdoor.avif",
        category: "Sports",
        rating: 4.5,
        reviews: 167,
        stock: 8,
        brand: "RunPro"
    },
    {
        id: 28,
        name: "Professional Football - Size 5",
        price: 55.00,
        original_price: 90.00,
        discount: 39,
        image: "/assets/images/categories/Sports & Outdoor.avif",
        category: "Sports",
        rating: 4.8,
        reviews: 523,
        stock: 45,
        brand: "SportMaster"
    },
    {
        id: 29,
        name: "Bicycle - Mountain Bike - 21 Speed",
        price: 850.00,
        original_price: 1300.00,
        discount: 35,
        image: "/assets/images/categories/Sports & Outdoor.avif",
        category: "Sports",
        rating: 4.6,
        reviews: 234,
        stock: 12,
        brand: "CycleTech"
    },
    {
        id: 30,
        name: "Resistance Bands Set - 5 Levels",
        price: 35.00,
        original_price: 60.00,
        discount: 42,
        image: "/assets/images/categories/Sports & Outdoor.avif",
        category: "Sports",
        rating: 4.5,
        reviews: 678,
        stock: 80,
        brand: "FitBand"
    },
    // Beauty & Health
    {
        id: 31,
        name: "NIVEA Body Lotion - Cocoa Moisture - 400ml",
        price: 78.00,
        original_price: 98.00,
        discount: 20,
        image: "/assets/images/categories/Health & Fitness.avif",
        category: "Beauty",
        rating: 4.7,
        reviews: 890,
        stock: 100,
        brand: "NIVEA"
    },
    {
        id: 32,
        name: "Dove Body Wash - Pomegranate - 750ml",
        price: 56.00,
        original_price: 70.00,
        discount: 20,
        image: "/assets/images/categories/Health & Fitness.avif",
        category: "Beauty",
        rating: 4.6,
        reviews: 567,
        stock: 85,
        brand: "Dove"
    },
    {
        id: 33,
        name: "Hair Dryer - Professional - 2000W",
        price: 180.00,
        original_price: 280.00,
        discount: 36,
        image: "/assets/images/categories/Health & Fitness.avif",
        category: "Beauty",
        rating: 4.5,
        reviews: 234,
        stock: 28,
        brand: "BeautyTech"
    },
    {
        id: 34,
        name: "Electric Shaver - Rechargeable - Waterproof",
        price: 220.00,
        original_price: 350.00,
        discount: 37,
        image: "/assets/images/categories/Health & Fitness.avif",
        category: "Beauty",
        rating: 4.6,
        reviews: 345,
        stock: 32,
        brand: "ShaveMaster"
    },
    {
        id: 35,
        name: "Makeup Brush Set - 12 Pieces - Professional",
        price: 95.00,
        original_price: 150.00,
        discount: 37,
        image: "/assets/images/categories/Health & Fitness.avif",
        category: "Beauty",
        rating: 4.8,
        reviews: 456,
        stock: 45,
        brand: "GlamPro"
    },
    {
        id: 36,
        name: "Perfume Gift Set - Men's Collection - 3x50ml",
        price: 280.00,
        original_price: 450.00,
        discount: 38,
        image: "/assets/images/categories/Health & Fitness.avif",
        category: "Beauty",
        rating: 4.7,
        reviews: 289,
        stock: 22,
        brand: "Essence"
    },
]

// Helper function to get products by category
export const getProductsByCategory = (category: string, limit?: number) => {
    const filtered = dummyProducts.filter(p => p.category === category)
    return limit ? filtered.slice(0, limit) : filtered
}

// Helper function to get flash sale products (high discount items)
export const getFlashSaleProducts = (limit?: number) => {
    const filtered = dummyProducts.filter(p => p.discount && p.discount >= 30).sort((a, b) => (b.discount || 0) - (a.discount || 0))
    return limit ? filtered.slice(0, limit) : filtered
}

// Helper function to get random products
export const getRandomProducts = (limit: number) => {
    const shuffled = [...dummyProducts].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, limit)
}

