  export const commonItems = [
   { name: 'furniture',
    items: [
      { name: 'Sofa/Couch (3-seater)', dimensions: '200 × 90 × 90 cm', weight: '45', needs_disassembly: false, fragile: false },
      { name: 'Loveseat (2-seater)', dimensions: '150 × 90 × 90 cm', weight: '35', needs_disassembly: false, fragile: false },
      { name: 'Sectional Sofa', dimensions: '300 × 200 × 90 cm', weight: '80', needs_disassembly: true, fragile: false },
      { name: 'Armchair', dimensions: '90 × 85 × 85 cm', weight: '25', needs_disassembly: false, fragile: false },
      { name: 'Recliner Chair', dimensions: '95 × 95 × 100 cm', weight: '35', needs_disassembly: false, fragile: false },
      { name: 'Ottoman', dimensions: '60 × 60 × 45 cm', weight: '8', needs_disassembly: false, fragile: false },
      { name: 'Coffee Table', dimensions: '120 × 60 × 45 cm', weight: '15', needs_disassembly: true, fragile: false },
      { name: 'Side Table', dimensions: '45 × 45 × 55 cm', weight: '8', needs_disassembly: false, fragile: false },
      { name: 'TV Stand', dimensions: '160 × 45 × 50 cm', weight: '25', needs_disassembly: true, fragile: false },
      { name: 'Display Cabinet', dimensions: '100 × 40 × 180 cm', weight: '35', needs_disassembly: true, fragile: true },
      
      // Dining Room
      { name: 'Dining Table', dimensions: '180 × 90 × 75 cm', weight: '30', needs_disassembly: true, fragile: false },
      { name: 'Dining Chair', dimensions: '45 × 45 × 90 cm', weight: '5', needs_disassembly: false, fragile: false },
      { name: 'Buffet/Sideboard', dimensions: '150 × 50 × 85 cm', weight: '45', needs_disassembly: false, fragile: false },
      { name: 'China Cabinet', dimensions: '120 × 45 × 190 cm', weight: '55', needs_disassembly: true, fragile: true },
      { name: 'Bar Stool', dimensions: '40 × 40 × 75 cm', weight: '7', needs_disassembly: false, fragile: false },
      
      // Bedroom
      { name: 'Bed Frame (Single)', dimensions: '90 × 190 × 40 cm', weight: '30', needs_disassembly: true, fragile: false },
      { name: 'Bed Frame (Double)', dimensions: '140 × 190 × 40 cm', weight: '40', needs_disassembly: true, fragile: false },
      { name: 'Bed Frame (Queen)', dimensions: '150 × 200 × 40 cm', weight: '45', needs_disassembly: true, fragile: false },
      { name: 'Bed Frame (King)', dimensions: '180 × 200 × 40 cm', weight: '50', needs_disassembly: true, fragile: false },
      { name: 'Mattress (Single)', dimensions: '90 × 190 × 20 cm', weight: '15', needs_disassembly: false, fragile: false },
      { name: 'Mattress (Double)', dimensions: '140 × 190 × 25 cm', weight: '25', needs_disassembly: false, fragile: false },
      { name: 'Mattress (Queen)', dimensions: '150 × 200 × 25 cm', weight: '30', needs_disassembly: false, fragile: false },
      { name: 'Mattress (King)', dimensions: '180 × 200 × 25 cm', weight: '35', needs_disassembly: false, fragile: false },
      { name: 'Nightstand', dimensions: '45 × 40 × 50 cm', weight: '10', needs_disassembly: false, fragile: false },
      { name: 'Dresser', dimensions: '120 × 50 × 80 cm', weight: '40', needs_disassembly: false, fragile: false },
      { name: 'Wardrobe', dimensions: '120 × 60 × 200 cm', weight: '60', needs_disassembly: true, fragile: false },
      { name: 'Chest of Drawers', dimensions: '80 × 45 × 90 cm', weight: '30', needs_disassembly: false, fragile: false },
      { name: 'Vanity Table', dimensions: '100 × 45 × 75 cm', weight: '20', needs_disassembly: true, fragile: true },
      { name: 'Mirror (Floor)', dimensions: '60 × 5 × 170 cm', weight: '15', needs_disassembly: false, fragile: true },
      
      // Office
      { name: 'Desk', dimensions: '140 × 70 × 75 cm', weight: '25', needs_disassembly: true, fragile: false },
      { name: 'Office Chair', dimensions: '60 × 60 × 110 cm', weight: '12', needs_disassembly: false, fragile: false },
      { name: 'Bookshelf', dimensions: '90 × 30 × 180 cm', weight: '25', needs_disassembly: true, fragile: false },
      { name: 'Filing Cabinet', dimensions: '40 × 50 × 100 cm', weight: '30', needs_disassembly: false, fragile: false },
      
      // Kids
      { name: 'Crib', dimensions: '140 × 70 × 90 cm', weight: '25', needs_disassembly: true, fragile: false },
      { name: 'Changing Table', dimensions: '90 × 60 × 90 cm', weight: '20', needs_disassembly: true, fragile: false },
      { name: 'Bunk Bed', dimensions: '200 × 90 × 160 cm', weight: '70', needs_disassembly: true, fragile: false },
      { name: 'Toy Chest', dimensions: '80 × 40 × 50 cm', weight: '15', needs_disassembly: false, fragile: false },
    ],

    },
    { name: 'electronics',
     items: [
      // TVs and Displays
      { name: 'TV (32-40 inch)', dimensions: '95 × 15 × 60 cm', weight: '10', fragile: true },
      { name: 'TV (40-50 inch)', dimensions: '120 × 15 × 70 cm', weight: '15', fragile: true },
      { name: 'TV (50-65 inch)', dimensions: '150 × 15 × 90 cm', weight: '20', fragile: true },
      { name: 'TV (65+ inch)', dimensions: '170 × 15 × 100 cm', weight: '30', fragile: true },
      { name: 'Computer Monitor', dimensions: '60 × 20 × 40 cm', weight: '5', fragile: true },
      { name: 'Projector', dimensions: '35 × 25 × 15 cm', weight: '4', fragile: true },
      
      // Computers
      { name: 'Desktop Computer', dimensions: '50 × 25 × 50 cm', weight: '10', fragile: true },
      { name: 'Laptop', dimensions: '35 × 25 × 3 cm', weight: '2.5', fragile: true },
      { name: 'Tablet', dimensions: '25 × 18 × 1 cm', weight: '0.5', fragile: true },
      
      // Audio Equipment
      { name: 'Stereo System', dimensions: '60 × 40 × 30 cm', weight: '15', fragile: true },
      { name: 'Speakers (Pair)', dimensions: '30 × 25 × 40 cm', weight: '8', fragile: true },
      { name: 'Soundbar', dimensions: '100 × 10 × 10 cm', weight: '4', fragile: true },
      { name: 'Turntable/Record Player', dimensions: '45 × 35 × 15 cm', weight: '6', fragile: true },
      { name: 'Subwoofer', dimensions: '40 × 40 × 40 cm', weight: '12', fragile: true },
      
      // Office Electronics
      { name: 'Printer', dimensions: '50 × 40 × 30 cm', weight: '8', fragile: true },
      { name: 'Scanner', dimensions: '45 × 30 × 10 cm', weight: '4', fragile: true },
      { name: 'Photocopier (Small)', dimensions: '60 × 50 × 40 cm', weight: '20', fragile: true },
      
      // Gaming & Entertainment
      { name: 'Gaming Console', dimensions: '35 × 30 × 10 cm', weight: '3', fragile: true },
      { name: 'Gaming PC', dimensions: '50 × 25 × 50 cm', weight: '15', fragile: true },
      
      // Networking
      { name: 'Router/Modem', dimensions: '25 × 20 × 5 cm', weight: '1', fragile: true },
      { name: 'Network Switch', dimensions: '30 × 20 × 5 cm', weight: '1.5', fragile: true },
    ],
    },
   { name: 'appliances',
    items: [
      // Major Kitchen Appliances
      { name: 'Refrigerator (Standard)', dimensions: '70 × 70 × 180 cm', weight: '80', fragile: true },
      { name: 'Refrigerator (Side-by-Side)', dimensions: '90 × 70 × 180 cm', weight: '120', fragile: true },
      { name: 'Freezer (Upright)', dimensions: '60 × 60 × 150 cm', weight: '70', fragile: true },
      { name: 'Freezer (Chest)', dimensions: '90 × 60 × 85 cm', weight: '60', fragile: true },
      { name: 'Range/Stove', dimensions: '75 × 65 × 90 cm', weight: '60', fragile: true },
      { name: 'Oven (Built-in)', dimensions: '60 × 60 × 60 cm', weight: '35', fragile: true },
      { name: 'Dishwasher', dimensions: '60 × 60 × 85 cm', weight: '50', fragile: true },
      { name: 'Washing Machine', dimensions: '60 × 60 × 85 cm', weight: '70', fragile: true },
      { name: 'Dryer', dimensions: '60 × 60 × 85 cm', weight: '40', fragile: true },
      { name: 'Washer/Dryer Combo', dimensions: '60 × 60 × 85 cm', weight: '85', fragile: true },
      
      // Counter Appliances
      { name: 'Microwave', dimensions: '50 × 40 × 30 cm', weight: '12', fragile: true },
      { name: 'Toaster Oven', dimensions: '45 × 35 × 25 cm', weight: '5', fragile: true },
      { name: 'Coffee Maker', dimensions: '35 × 25 × 40 cm', weight: '4', fragile: true },
      { name: 'Food Processor', dimensions: '30 × 25 × 40 cm', weight: '5', fragile: true },
      { name: 'Blender', dimensions: '20 × 20 × 40 cm', weight: '3', fragile: true },
      { name: 'Stand Mixer', dimensions: '35 × 30 × 35 cm', weight: '10', fragile: true },
      { name: 'Toaster', dimensions: '30 × 20 × 20 cm', weight: '2', fragile: true },
      { name: 'Kettle', dimensions: '25 × 20 × 25 cm', weight: '1.5', fragile: true },
      
      // Other Appliances
      { name: 'Vacuum Cleaner', dimensions: '40 × 30 × 30 cm', weight: '7', fragile: false },
      { name: 'Air Purifier', dimensions: '40 × 25 × 60 cm', weight: '8', fragile: true },
      { name: 'Dehumidifier', dimensions: '35 × 25 × 50 cm', weight: '10', fragile: true },
      { name: 'Air Conditioner (Portable)', dimensions: '45 × 40 × 80 cm', weight: '30', fragile: true },
      { name: 'Air Conditioner (Window)', dimensions: '60 × 55 × 40 cm', weight: '25', fragile: true },
      { name: 'Space Heater', dimensions: '25 × 20 × 40 cm', weight: '4', fragile: true },
      { name: 'Fan (Standing)', dimensions: '50 × 50 × 130 cm', weight: '5', fragile: true },
    ],},
    
   { name: 'exercise', 
    items: [
      { name: 'Treadmill', dimensions: '180 × 90 × 140 cm', weight: '90', needs_disassembly: true, fragile: true },
      { name: 'Exercise Bike', dimensions: '100 × 60 × 140 cm', weight: '35', needs_disassembly: false, fragile: true },
      { name: 'Elliptical Machine', dimensions: '170 × 65 × 170 cm', weight: '80', needs_disassembly: true, fragile: true },
      { name: 'Weight Bench', dimensions: '120 × 60 × 50 cm', weight: '25', needs_disassembly: true, fragile: false },
      { name: 'Home Gym System', dimensions: '200 × 100 × 210 cm', weight: '150', needs_disassembly: true, fragile: true },
      { name: 'Rowing Machine', dimensions: '210 × 55 × 50 cm', weight: '30', needs_disassembly: true, fragile: false },
      { name: 'Dumbbells Set', dimensions: '50 × 30 × 25 cm', weight: '30', needs_disassembly: false, fragile: false },
      { name: 'Weight Plates Set', dimensions: '60 × 60 × 30 cm', weight: '80', needs_disassembly: false, fragile: false },
      { name: 'Yoga Equipment', dimensions: '70 × 40 × 15 cm', weight: '3', needs_disassembly: false, fragile: false },
    ],},
    
   { name: 'musical',
    items: [
      { name: 'Piano (Upright)', dimensions: '150 × 60 × 130 cm', weight: '250', needs_disassembly: false, fragile: true },
      { name: 'Piano (Grand)', dimensions: '200 × 150 × 100 cm', weight: '400', needs_disassembly: false, fragile: true },
      { name: 'Digital Piano/Keyboard', dimensions: '140 × 45 × 90 cm', weight: '25', needs_disassembly: true, fragile: true },
      { name: 'Guitar (Acoustic)', dimensions: '110 × 40 × 15 cm', weight: '3', needs_disassembly: false, fragile: true },
      { name: 'Guitar (Electric)', dimensions: '100 × 40 × 15 cm', weight: '4', needs_disassembly: false, fragile: true },
      { name: 'Drum Set', dimensions: '150 × 150 × 130 cm', weight: '50', needs_disassembly: true, fragile: true },
      { name: 'Amplifier', dimensions: '60 × 50 × 25 cm', weight: '15', needs_disassembly: false, fragile: true },
      { name: 'Violin/Viola', dimensions: '80 × 30 × 15 cm', weight: '1.5', needs_disassembly: false, fragile: true },
      { name: 'Cello', dimensions: '120 × 40 × 20 cm', weight: '5', needs_disassembly: false, fragile: true },
    ],
    },
   { name: 'garden',
    items: [
      { name: 'Patio Table', dimensions: '150 × 90 × 75 cm', weight: '20', needs_disassembly: true, fragile: false },
      { name: 'Patio Chair', dimensions: '60 × 60 × 90 cm', weight: '6', needs_disassembly: false, fragile: false },
      { name: 'Garden Bench', dimensions: '150 × 60 × 85 cm', weight: '25', needs_disassembly: false, fragile: false },
      { name: 'BBQ/Grill', dimensions: '120 × 60 × 110 cm', weight: '40', needs_disassembly: true, fragile: false },
      { name: 'Lawn Mower', dimensions: '170 × 50 × 100 cm', weight: '30', needs_disassembly: false, fragile: true },
      { name: 'Garden Shed (Small)', dimensions: '180 × 120 × 200 cm', weight: '90', needs_disassembly: true, fragile: false },
      { name: 'Parasol/Umbrella', dimensions: '200 × 30 × 30 cm', weight: '10', needs_disassembly: true, fragile: false },
      { name: 'Outdoor Heater', dimensions: '50 × 50 × 220 cm', weight: '15', needs_disassembly: true, fragile: true },
      { name: 'Plant Pots (Large)', dimensions: '50 × 50 × 50 cm', weight: '15', needs_disassembly: false, fragile: true },
    ],},
    
    {name: 'fragile',
      items: [
      { name: 'Mirror (Wall)', dimensions: '100 × 5 × 80 cm', weight: '10', fragile: true },
      { name: 'Artwork/Painting', dimensions: '100 × 5 × 80 cm', weight: '5', fragile: true },
      { name: 'China Set', dimensions: '60 × 40 × 30 cm', weight: '15', fragile: true },
      { name: 'Glassware Box', dimensions: '40 × 30 × 30 cm', weight: '10', fragile: true },
      { name: 'Crystal Chandelier', dimensions: '60 × 60 × 80 cm', weight: '15', fragile: true },
      { name: 'Antique Furniture', dimensions: '120 × 60 × 90 cm', weight: '40', fragile: true, needs_disassembly: false },
      { name: 'Sculpture', dimensions: '40 × 40 × 60 cm', weight: '15', fragile: true },
      { name: 'Aquarium (Empty)', dimensions: '100 × 50 × 50 cm', weight: '20', fragile: true },
    ]},
  ];