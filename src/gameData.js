const CREATURE_LIST = window.CREATURE_LIST = {
    1: [ 
        { name: "Blue Fin", type: "fish" },
        { name: "Sand Dab", type: "fish" },
        { name: "Rock Crab", type: "crab" },
        { name: "Moon Jelly", type: "jellyfish" },
        { name: "Sea Seahorse", type: "seahorse" }
    ],
    2: [ 
        { name: "Neon Eel", type: "eel" },
        { name: "Box Squid", type: "squid" },
        { name: "Leatherback", type: "turtle" },
        { name: "Stingray", type: "ray" },
        { name: "Tiger Shark", type: "shark" }
    ],
    3: [ 
        { name: "Colossal Squid", type: "squid" },
        { name: "Abyssal Angler", type: "anglerfish" },
        { name: "Kraken Spawn", type: "octopus" },
        { name: "Great White", type: "shark" }
    ],
    4: [ 
        { name: "The Leviathan", type: "eel" },
        { name: "Ancient Terror", type: "octopus" },
        { name: "Sun Ray", type: "ray" },
        { name: "Chronos Turtle", type: "turtle" }
    ]
};

const BADGES = window.BADGES = {
    first_catch: { id: "first_catch", name: "Novice Angler", desc: "Successfully land your first catch.", earned: false },
    rare_hunter: { id: "rare_hunter", name: "Rare Tracker", desc: "Hook any Rare species or above.", earned: false },
    deep_diver: { id: "deep_diver", name: "Abyss Wanderer", desc: "Reach a depth beyond 300 meters.", earned: false },
    escape_survivor: { id: "escape_survivor", name: "Rope Expert", desc: "Survive 5 escape snaps from struggles.", earned: false },
    gold_albatross: { id: "gold_albatross", name: "Golden Albatross Hunted", desc: "Catch a legendary Golden Albatross.", earned: false },
    gold_leviathan: { id: "gold_leviathan", name: "Leviathan Slayer", desc: "Tame the massive gold Leviathan.", earned: false },
    gold_terror: { id: "gold_terror", name: "Terror Champion", desc: "Overcome the gold Ancient Terror.", earned: false },
    gold_sunray: { id: "gold_sunray", name: "Solar Pioneer", desc: "Land the gold Sun Ray.", earned: false },
    gold_turtle: { id: "gold_turtle", name: "Time Bender", desc: "Catch the gold Chronos Turtle.", earned: false },
    true_fisherman: { id: "true_fisherman", name: "True Fisherman Badge", desc: "Catch all 5 Mythic Golden species. UNLOCKS: GOLDEN ROD ORB!", earned: false }
};

const CREATURE_SVGS = window.CREATURE_SVGS = {
    jellyfish: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path fill="currentColor" fill-opacity="0.85" d="M20,50 C20,20 80,20 80,50 L75,55 C75,55 70,50 65,55 C60,50 55,55 50,50 C45,55 40,50 35,55 L20,50 Z" /><path d="M30,55 Q25,80 35,95 M42,52 Q45,85 40,95 M50,50 Q55,80 50,95 M58,52 Q55,85 60,95 M70,55 Q75,80 65,95" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" /></svg>`,
    squid: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M50,15 L30,45 L40,55 L35,90 M50,15 L70,45 L60,55 L65,90 M45,55 L45,95 M55,55 L55,95 M50,55 L50,95"/><path fill="currentColor" d="M50,10 L30,40 L70,40 Z"/></svg>`,
    octopus: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><circle fill="currentColor" cx="50" cy="40" r="23"/><path d="M35,60 Q20,70 15,90 M42,65 Q35,85 30,95 M50,65 Q50,90 50,98 M58,65 Q65,85 70,95 M65,60 Q80,70 85,90 M30,50 Q10,55 5,75 M70,50 Q90,55 95,75" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
    turtle: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><circle fill="currentColor" cx="50" cy="50" r="23" /><circle fill="currentColor" cx="50" cy="22" r="9"/><path d="M30,40 C15,35 15,25 25,35 M70,40 C85,35 85,25 75,35 M32,65 C18,75 22,80 30,72 M68,65 C82,75 78,80 70,72" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
    ray: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path fill="currentColor" d="M50,15 L20,50 L50,65 L80,50 Z" /><path d="M50,65 Q50,85 45,95" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`,
    crab: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><ellipse fill="currentColor" cx="50" cy="55" rx="25" ry="18" /><path d="M30,45 Q20,25 35,20 M70,45 Q80,25 65,20" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" /><path d="M25,55 Q10,60 5,70 M25,60 Q10,70 10,80 M75,55 Q90,60 95,70 M75,60 Q90,70 90,80" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
    eel: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none" d="M15,50 Q30,30 45,50 T75,50 T90,45" /></svg>`,
    shark: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path fill="currentColor" d="M15,55 Q50,35 85,50 L90,35 L95,65 L85,55 Q50,75 15,55" /><path fill="currentColor" d="M50,42 L55,20 L65,30 Z" /></svg>`,
    seahorse: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path d="M55,20 C45,15 40,25 45,35 C42,45 55,50 48,65 C40,75 52,85 45,95" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/><path fill="currentColor" d="M45,25 L30,22 L30,28 Z"/><path d="M48,32 C58,35 55,48 45,45" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
    anglerfish: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><circle fill="currentColor" cx="45" cy="55" r="23"/><path fill="currentColor" d="M20,55 L5,45 L5,65 Z"/><path d="M50,35 Q65,15 75,30" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/><circle fill="#ffffff" cx="75" cy="30" r="5"/><path d="M55,55 L65,52 M55,60 L65,60" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`,
    bird: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path d="M20,40 Q40,15 50,40 T80,40" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none" /><path d="M45,40 L45,55 M52,40 L52,55" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" /></svg>`,
    dolphin: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><path fill="currentColor" d="M10,50 C25,30 55,18 80,32 C95,40 92,52 82,56 C68,60 52,52 38,58 C25,62 12,54 10,50 Z" /><path fill="currentColor" d="M75,35 C80,22 75,15 68,12 C72,20 72,28 73,34 Z" /><path fill="currentColor" d="M45,48 C52,62 48,70 42,75 C45,66 43,58 41,52 Z" /><path fill="currentColor" d="M15,48 C5,45 2,38 0,32 C4,38 10,42 12,45 Z" /></svg>`,
    fish: `<svg viewBox="0 0 100 100" class="w-10 h-10 fill-none"><ellipse fill="currentColor" cx="50" cy="50" rx="35" ry="20" /><path fill="currentColor" d="M15,50 L0,35 L0,65 Z" /></svg>`
};

const storeInventory = window.storeInventory = {
    rods: [
        { id: 'wood_rod', name: 'Rustic Bamboo Rod', desc: 'Slightly worn wooden rod', thresholdMod: 1.0, reelMultiplier: 1.0, tensionMod: 1.25, price: 0 },
        { id: 'carbon_rod', name: 'Carbon Fiber Reel', desc: 'Slightly reduces tension sensitivity', thresholdMod: 0.8, reelMultiplier: 1.0, tensionMod: 0.9, price: 150 },
        { id: 'titan_rod', name: 'Titanium Resonator', desc: 'Moderately buffers line tension build', thresholdMod: 0.65, reelMultiplier: 1.0, tensionMod: 0.7, price: 500 },
        { id: 'mythic_rod', name: 'The Whispering Trident', desc: 'Superbly dampens line tension speed', thresholdMod: 0.45, reelMultiplier: 1.0, tensionMod: 0.5, price: 1800 }
    ],
    hats: [
        { id: 'none', name: 'No Hat', desc: 'Let the sea breeze flow', color: 'transparent', price: 0 },
        { id: 'cap', name: 'Baseball Cap', desc: 'Keeps the sun out', color: '#ef4444', price: 25 },
        { id: 'bandana', name: 'Crimson Bandana', desc: 'Keeps sweat out of your eyes', color: '#b91c1c', price: 60 },
        { id: 'straw', name: 'Straw Hat', desc: 'A classic fisherman look', color: '#d4af37', price: 75 },
        { id: 'beanie', name: 'Warm Beanie', desc: 'For cold, deep sea nights', color: '#22c55e', price: 120 },
        { id: 'captain', name: 'Captain\'s Yacht Hat', desc: 'Authority on open waters', color: '#ffffff', price: 280 },
        { id: 'crown', name: 'Golden Angler Crown', desc: 'A crown fit for deep sea royalty', color: '#eab308', price: 1200 }
    ],
    shirts: [
        { id: 'blue', name: 'Classic Blue', desc: 'Reliable and comfortable', color: '#1e3a8a', price: 0 },
        { id: 'red', name: 'Simple Crimson', desc: 'Standard vibrant red tee', color: '#b91c1c', price: 35 },
        { id: 'yellow', name: 'Raincoat Yellow', desc: 'Heavy duty waterproof slicker', color: '#eab308', price: 95 },
        { id: 'stripes', name: 'Sailor Stripes', desc: 'Traditional maritime striped wear', color: '#1e40af', price: 140 },
        { id: 'flannel', name: 'Checked Flannel', desc: 'Rugged red-and-black lumberjack check', color: '#7f1d1d', price: 190 },
        { id: 'suspenders', name: 'Work Suspenders', desc: 'Grey gear with leather strapping buckles', color: '#4b5563', price: 260 },
        { id: 'black', name: 'Stealth Quarter-Zip', desc: 'Midnight knit with metallic zipper lining', color: '#171717', price: 320 },
        { id: 'tuxedo', name: 'Gentleman\'s Vest', desc: 'Angular black vest over white tie fitting', color: '#0f172a', price: 650 }
    ],
    boatColors: [
        { id: 'brown', name: 'Natural Oak', desc: 'Sturdy, traditional light wood', color: '#8d6e63', price: 0 },
        { id: 'walnut', name: 'Dark Walnut', desc: 'Deep, rich chocolate tones', color: '#3e2723', price: 100 },
        { id: 'driftwood', name: 'Sun-Bleached Gray', desc: 'Salt-crusted grey wood', color: '#9e9e9e', price: 250 },
        { id: 'cherry', name: 'Aged Cherry', desc: 'Beautiful reddish-brown grain', color: '#7b1f1f', price: 400 },
        { id: 'teak', name: 'Golden Teak', desc: 'Highly water-resistant golden hue', color: '#b08d57', price: 750 },
        { id: 'ebony', name: 'Charred Ebony', desc: 'Fire-treated black timber', color: '#1a1a1a', price: 1200 }
    ],
    boatTypes: [
        { id: 'wood', name: 'Simple Skiff', desc: 'Basic rowboat. Capacity: 5', capacity: 5, price: 0 },
        { id: 'dory', name: 'Fisherman Dory', desc: 'Deep-hulled. Capacity: 12', capacity: 12, price: 400 },
        { id: 'punt', name: 'Utility Punt', desc: 'Square-ended. Capacity: 25', capacity: 25, price: 850 },
        { id: 'canoe', name: 'Hand-Carved Canoe', desc: 'Sleek, narrow. Capacity: 50', capacity: 50, price: 1600 },
        { id: 'schooner', name: 'Grand Schooner', desc: 'A massive wooden marvel. Capacity: 100', capacity: 100, price: 3500 }
    ],
    supplies: [
        { id: 'hook', name: 'Hook', desc: '$10 each', price: 10, type: 'supply' }
    ]
};

const BOAT_OFFSETS = window.BOAT_OFFSETS = {
    'wood': 0,
    'dory': 0, 
    'punt': -2,
    'canoe': 0,
    'schooner': -15
};

const HAPPY_PHRASES = window.HAPPY_PHRASES = ["What a beauty!", "Gotcha!", "That's a big one!", "Nice pull!", "Look at that haul!"];
