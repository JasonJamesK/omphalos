function rollDice(str) {
  // Parses "2d6", "1d20+5", "3d4", etc. and returns a number
  const m = str.match(/(\d+)d(\d+)([+-]\d+)?/)
  if (!m) return parseInt(str) || 1
  let total = 0
  const count = parseInt(m[1])
  const sides = parseInt(m[2])
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1
  if (m[3]) total += parseInt(m[3])
  return Math.max(1, total)
}

const tiers = {
  Commoner: [
    { name: 'Copper pieces', qty: '2d10', weight: 20 },
    { name: 'Bread loaf', qty: '1d3', weight: 15 },
    { name: 'Tallow candle', qty: '1d6', weight: 12 },
    { name: 'Flint and steel', qty: '1', weight: 8 },
    { name: 'Hemp rope (10 ft)', qty: '1', weight: 8 },
    { name: 'Wooden bowl', qty: '1', weight: 6 },
    { name: 'Tattered cloak', qty: '1', weight: 6 },
    { name: 'Fishing hook', qty: '1d4', weight: 7 },
    { name: 'Waterskin (empty)', qty: '1', weight: 5 },
    { name: 'Small knife (worn)', qty: '1', weight: 5 },
    { name: 'Dried meat', qty: '1d4 portions', weight: 8 },
    { name: 'Cheap wine (flask)', qty: '1', weight: 5 },
    { name: 'Handful of seeds', qty: '1 pouch', weight: 5 },
    { name: 'Clay pot (cracked)', qty: '1', weight: 3 },
    { name: 'Wooden spoon', qty: '1', weight: 3 },
  ],
  Merchant: [
    { name: 'Gold pieces', qty: '2d6', weight: 20 },
    { name: 'Silver pieces', qty: '4d10', weight: 15 },
    { name: 'Bolt of cloth (fine)', qty: '1', weight: 10 },
    { name: 'Fine wine (bottle)', qty: '1d2', weight: 10 },
    { name: 'Merchant\'s scale (brass)', qty: '1', weight: 8 },
    { name: 'Leather coin purse', qty: '1', weight: 8 },
    { name: 'Trade spices (pouch)', qty: '1d3', weight: 8 },
    { name: 'Perfume (vial)', qty: '1', weight: 7 },
    { name: 'Quality rope (50 ft)', qty: '1', weight: 6 },
    { name: 'Fine clothing (set)', qty: '1', weight: 5 },
    { name: 'Ink and quill', qty: '1 set', weight: 5 },
    { name: 'Trade route map', qty: '1', weight: 5 },
    { name: 'Letter of credit', qty: '1', weight: 5 },
    { name: 'Wax seal kit', qty: '1', weight: 4 },
    { name: 'Silver candlestick', qty: '1d2', weight: 4 },
  ],
  Noble: [
    { name: 'Gold pieces', qty: '4d10', weight: 20 },
    { name: 'Platinum pieces', qty: '1d6', weight: 12 },
    { name: 'Jeweled brooch', qty: '1', weight: 10 },
    { name: 'Silver goblet (engraved)', qty: '1', weight: 8 },
    { name: 'Family signet ring', qty: '1', weight: 8 },
    { name: 'Fine vintage wine (bottle)', qty: '1d3', weight: 7 },
    { name: 'Ornate perfume bottle', qty: '1', weight: 7 },
    { name: 'Noble\'s outfit (silk)', qty: '1', weight: 6 },
    { name: 'Gold pocket watch', qty: '1', weight: 6 },
    { name: 'Engraved gold locket', qty: '1', weight: 6 },
    { name: 'Decorative dagger (gem-set)', qty: '1', weight: 5 },
    { name: 'Personal wax seal', qty: '1', weight: 4 },
    { name: 'Ball invitation (signed)', qty: '1', weight: 4 },
    { name: 'Ivory dice set', qty: '1', weight: 4 },
    { name: 'Crystal vial (rare perfume)', qty: '1', weight: 3 },
  ],
  Bandit: [
    { name: 'Gold pieces (stolen)', qty: '1d20', weight: 18 },
    { name: 'Silver pieces', qty: '3d6', weight: 15 },
    { name: 'Lockpick set', qty: '1', weight: 12 },
    { name: 'Dagger', qty: '1d2', weight: 10 },
    { name: 'Dark hooded cloak', qty: '1', weight: 8 },
    { name: 'Rope (30 ft)', qty: '1', weight: 7 },
    { name: 'Flask of strong ale', qty: '1d3', weight: 7 },
    { name: 'Stolen ring (signet)', qty: '1', weight: 6 },
    { name: 'Crude hand-drawn map', qty: '1', weight: 6 },
    { name: 'Manacles (iron)', qty: '1', weight: 5 },
    { name: 'Wanted poster (someone else)', qty: '1', weight: 5 },
    { name: 'Grappling hook', qty: '1', weight: 5 },
    { name: 'Smoke bomb', qty: '1d2', weight: 5 },
    { name: 'Bandit insignia (rough iron)', qty: '1', weight: 4 },
    { name: 'Iron spike', qty: '1d4', weight: 3 },
  ],
  Goblin: [
    { name: 'Copper pieces', qty: '3d6', weight: 20 },
    { name: 'Shiny pebble (worthless)', qty: '1d4', weight: 15 },
    { name: 'Broken weapon fragment', qty: '1', weight: 12 },
    { name: 'Filthy rag', qty: '1d3', weight: 10 },
    { name: 'Rat skull', qty: '1d2', weight: 8 },
    { name: 'Crude charcoal drawing', qty: '1', weight: 8 },
    { name: 'Stolen button (brass)', qty: '1d6', weight: 7 },
    { name: 'Moldy bread (1 day old)', qty: '1', weight: 7 },
    { name: 'Rusty nails', qty: '1d10', weight: 6 },
    { name: 'Fang necklace (crude)', qty: '1', weight: 6 },
    { name: 'Goblin ration (mystery meat)', qty: '1', weight: 5 },
    { name: 'Beetle (alive, jar)', qty: '1', weight: 4 },
    { name: 'Slimy mushroom', qty: '1d3', weight: 4 },
    { name: 'Cracked glass gem (fake)', qty: '1', weight: 3 },
    { name: 'Stolen child\'s toy', qty: '1', weight: 3 },
  ],
  Dragon: [
    { name: 'Gold pieces', qty: '20d20', weight: 18 },
    { name: 'Platinum pieces', qty: '2d20', weight: 12 },
    { name: 'Gemstone (250–2,500 gp value)', qty: '1d4', weight: 12 },
    { name: 'Magic weapon (minor enchantment)', qty: '1', weight: 10 },
    { name: 'Magic armor piece', qty: '1', weight: 8 },
    { name: 'Dragon scale (intact)', qty: '1d4', weight: 8 },
    { name: 'Ancient illuminated tome', qty: '1', weight: 7 },
    { name: 'Rare spell scroll', qty: '1d2', weight: 7 },
    { name: 'Enchanted jewelry (gold & gems)', qty: '1', weight: 6 },
    { name: 'Magic ring (minor)', qty: '1', weight: 6 },
    { name: 'Rare metal ingot (mithral)', qty: '1d2', weight: 5 },
    { name: 'Legendary treasure map', qty: '1', weight: 5 },
    { name: 'Greater healing potion', qty: '1d2', weight: 5 },
    { name: 'Minor wand', qty: '1', weight: 4 },
    { name: 'Artifact shard (arcane)', qty: '1', weight: 3 },
  ],
  Cursed: [
    { name: 'Cursed coin (gold→copper when kept)', qty: '1d6', weight: 15 },
    { name: 'Doll with pin (effigy)', qty: '1', weight: 12 },
    { name: 'Black ritual candle', qty: '1d3', weight: 10 },
    { name: 'Written curse scroll', qty: '1', weight: 10 },
    { name: 'Mirror shard (cracks on touch)', qty: '1', weight: 8 },
    { name: 'Poisoned ring (DC 13 or sleep)', qty: '1', weight: 8 },
    { name: 'Hexed medallion', qty: '1', weight: 8 },
    { name: 'Locket (bound spirit within)', qty: '1', weight: 7 },
    { name: 'Cursed tome (can\'t stop reading)', qty: '1', weight: 7 },
    { name: 'Withered flower (pressed)', qty: '1', weight: 6 },
    { name: 'Obsidian amulet (cold to touch)', qty: '1', weight: 6 },
    { name: 'Death warrant (target\'s name blank)', qty: '1', weight: 5 },
    { name: 'Rusted key (no matching lock)', qty: '1', weight: 5 },
    { name: 'Ash of something burned', qty: '1 vial', weight: 4 },
    { name: 'Mummified severed finger', qty: '1', weight: 3 },
  ],
  Arcane: [
    { name: 'Spell scroll (cantrip)', qty: '1d3', weight: 18 },
    { name: 'Spell scroll (1st–2nd level)', qty: '1', weight: 12 },
    { name: 'Arcane focus fragment', qty: '1', weight: 10 },
    { name: 'Potion of healing (minor)', qty: '1d2', weight: 10 },
    { name: 'Magical ink (vial)', qty: '1d2', weight: 8 },
    { name: 'Rune stone', qty: '1d3', weight: 8 },
    { name: 'Glowing crystal vial (liquid)', qty: '1', weight: 7 },
    { name: 'Spell component pouch', qty: '1', weight: 7 },
    { name: 'Magic trinket', qty: '1', weight: 7 },
    { name: 'Ley line map (annotated)', qty: '1', weight: 6 },
    { name: 'Mana crystal (small, warm)', qty: '1d2', weight: 6 },
    { name: 'Alchemical reagent', qty: '1d4 vials', weight: 5 },
    { name: 'Teleportation chalk', qty: '1 stick', weight: 5 },
    { name: 'Runic tablet (partial formula)', qty: '1', weight: 4 },
    { name: 'Bottled spell effect (smoke, sparks)', qty: '1', weight: 3 },
  ],
}

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let rand = Math.random() * total
  for (const item of items) {
    rand -= item.weight
    if (rand <= 0) return item
  }
  return items[items.length - 1]
}

export function generateLoot(tier) {
  const items = tiers[tier]
  if (!items) return null
  const item = weightedPick(items)
  const qty = rollDice(item.qty)
  const qtyStr = qty === 1 ? item.qty === '1' ? '' : ` ×${qty}` : ` ×${qty}`
  return {
    name: item.name,
    quantity: qty,
    display: `${item.name}${qtyStr}`,
  }
}

export const LOOT_TIERS = Object.keys(tiers)
