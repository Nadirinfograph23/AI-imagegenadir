// Prompt Enhancement System
// Automatically enhances user prompts with quality-boosting keywords

const STYLE_ENHANCEMENTS: Record<string, string[]> = {
  photo: [
    'ultra realistic photograph',
    'cinematic lighting',
    '8k resolution',
    'highly detailed',
    'professional photography',
    'depth of field',
    'sharp focus',
    'natural colors',
  ],
  art: [
    'masterpiece digital art',
    'trending on artstation',
    'highly detailed',
    'vibrant colors',
    'dramatic lighting',
    'professional illustration',
    '4k',
  ],
  landscape: [
    'breathtaking landscape photography',
    'golden hour lighting',
    'ultra wide angle',
    '8k resolution',
    'highly detailed',
    'vivid colors',
    'dramatic sky',
    'award-winning photo',
  ],
  portrait: [
    'professional portrait photography',
    'studio lighting',
    'shallow depth of field',
    'sharp focus on subject',
    '8k resolution',
    'highly detailed skin texture',
    'natural expression',
  ],
  anime: [
    'high quality anime illustration',
    'detailed anime art style',
    'vibrant colors',
    'clean lines',
    'trending on pixiv',
    'beautiful composition',
  ],
  fantasy: [
    'epic fantasy digital art',
    'dramatic lighting',
    'highly detailed',
    'magical atmosphere',
    'cinematic composition',
    'trending on artstation',
    '4k',
  ],
  scifi: [
    'sci-fi concept art',
    'futuristic',
    'highly detailed',
    'cinematic lighting',
    'volumetric fog',
    'trending on artstation',
    '8k resolution',
  ],
  food: [
    'professional food photography',
    'appetizing presentation',
    'studio lighting',
    'shallow depth of field',
    'high resolution',
    'highly detailed textures',
  ],
  architecture: [
    'architectural photography',
    'professional composition',
    'dramatic lighting',
    'ultra detailed',
    '8k resolution',
    'clean lines',
    'modern design',
  ],
};

const SUBJECT_KEYWORDS: Record<string, string> = {
  car: 'photo',
  vehicle: 'photo',
  truck: 'photo',
  motorcycle: 'photo',
  person: 'portrait',
  woman: 'portrait',
  man: 'portrait',
  face: 'portrait',
  portrait: 'portrait',
  landscape: 'landscape',
  mountain: 'landscape',
  ocean: 'landscape',
  forest: 'landscape',
  sunset: 'landscape',
  sunrise: 'landscape',
  beach: 'landscape',
  nature: 'landscape',
  sky: 'landscape',
  anime: 'anime',
  manga: 'anime',
  dragon: 'fantasy',
  wizard: 'fantasy',
  magic: 'fantasy',
  castle: 'fantasy',
  knight: 'fantasy',
  elf: 'fantasy',
  sword: 'fantasy',
  robot: 'scifi',
  spaceship: 'scifi',
  cyberpunk: 'scifi',
  futuristic: 'scifi',
  alien: 'scifi',
  space: 'scifi',
  food: 'food',
  cake: 'food',
  pizza: 'food',
  dish: 'food',
  meal: 'food',
  coffee: 'food',
  building: 'architecture',
  house: 'architecture',
  skyscraper: 'architecture',
  city: 'architecture',
  interior: 'architecture',
  room: 'architecture',
  cat: 'photo',
  dog: 'photo',
  animal: 'photo',
  bird: 'photo',
  flower: 'photo',
  tree: 'photo',
};

const QUALITY_SUFFIXES = [
  'masterpiece',
  'best quality',
  'highly detailed',
];

function detectStyle(prompt: string): string {
  const lower = prompt.toLowerCase();

  for (const [keyword, style] of Object.entries(SUBJECT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return style;
    }
  }

  return 'photo'; // Default to photo-realistic
}

function isAlreadyEnhanced(prompt: string): boolean {
  const enhancementIndicators = [
    '8k', '4k', 'highly detailed', 'masterpiece', 'ultra realistic',
    'cinematic', 'professional', 'trending on', 'sharp focus',
    'depth of field', 'studio lighting', 'best quality',
  ];

  const lower = prompt.toLowerCase();
  const matchCount = enhancementIndicators.filter(indicator =>
    lower.includes(indicator)
  ).length;

  // If 2+ enhancement indicators found, prompt is already enhanced
  return matchCount >= 2;
}

export function enhancePrompt(prompt: string): string {
  const trimmed = prompt.trim();

  // Don't enhance if already detailed enough (over 100 chars with quality keywords)
  if (isAlreadyEnhanced(trimmed)) {
    return trimmed;
  }

  const style = detectStyle(trimmed);
  const enhancements = STYLE_ENHANCEMENTS[style] || STYLE_ENHANCEMENTS.photo;

  // Pick a subset of enhancements based on prompt length
  const numEnhancements = trimmed.length < 20 ? 5 : 3;
  const selectedEnhancements = enhancements.slice(0, numEnhancements);

  // Add quality suffixes for short prompts
  const qualitySuffix = trimmed.length < 30
    ? `, ${QUALITY_SUFFIXES.join(', ')}`
    : '';

  const enhanced = `${selectedEnhancements[0]} of ${trimmed}, ${selectedEnhancements.slice(1).join(', ')}${qualitySuffix}`;

  return enhanced;
}
