import avatarClara from "../../../assets/mock/posts/avatar-clara.jpg";
import avatarJorge from "../../../assets/mock/posts/avatar-jorge.jpg";
import avatarMateo from "../../../assets/mock/posts/avatar-mateo.jpg";
import mapSample from "../../../assets/mock/posts/map-sample.png";
import photoCaneToad from "../../../assets/mock/posts/photo-cane-toad.jpg";
import photoEagle from "../../../assets/mock/posts/photo-eagle.jpg";
import photoTarsier1 from "../../../assets/mock/posts/photo-tarsier-1.jpg";
import photoTarsier2 from "../../../assets/mock/posts/photo-tarsier-2.jpg";
import photoTarsier3 from "../../../assets/mock/posts/photo-tarsier-3.jpg";
import photoTarsier4 from "../../../assets/mock/posts/photo-tarsier-4.jpg";
import type {
  AiChecklistItem,
  PostComment,
  PostDetail,
  PostRegion,
  PostSeverity,
  PostStatus,
  PostSummary,
  ReporterStats,
  SpeciesCategory,
  SpeciesOrigin,
} from "../models/post";

/**
 * Fictional sample posts for the Post Approvals screens, based on the
 * Figma frames.
 *
 * TODO(schema): Delete this file (and src/assets/mock/) once the posts
 * Service queries Supabase. Reporter role labels ("Senior Ranger", …) are
 * Figma copy, not roles from any schema. Times are relative to page load.
 */

const loadedAt = Date.now();

function minutesAgo(minutes: number): string {
  return new Date(loadedAt - minutes * 60_000).toISOString();
}

interface MockReporter {
  id: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl: string | null;
  stats: ReporterStats;
}

const reporters = {
  jorge: {
    id: "mock-reporter-1",
    fullName: "Jorge Dimaculangan",
    username: "jdimaculangan",
    role: "Senior Ranger",
    avatarUrl: avatarJorge,
    stats: {
      totalPosts: 118,
      approvedPosts: 109,
      declinedPosts: 4,
      memberSince: "2022-06-14",
      isVerified: true,
    },
  },
  clara: {
    id: "mock-reporter-2",
    fullName: "Clara Soriano",
    username: "clara_field",
    role: "Field Biologist",
    avatarUrl: avatarClara,
    stats: {
      totalPosts: 64,
      approvedPosts: 58,
      declinedPosts: 2,
      memberSince: "2023-02-09",
      isVerified: true,
    },
  },
  mateo: {
    id: "mock-reporter-3",
    fullName: "Mateo Dela Cruz",
    username: "mdelacruz",
    role: "Scout Leader",
    avatarUrl: avatarMateo,
    stats: {
      totalPosts: 42,
      approvedPosts: 39,
      declinedPosts: 3,
      memberSince: "2023-11-03",
      isVerified: true,
    },
  },
  aris: {
    id: "mock-reporter-4",
    fullName: "Dr. Aris Thorne",
    username: "thorne_botanist",
    role: "Botanist",
    avatarUrl: null,
    stats: {
      totalPosts: 129,
      approvedPosts: 121,
      declinedPosts: 5,
      memberSince: "2024-01-15",
      isVerified: true,
    },
  },
  bea: {
    id: "mock-reporter-5",
    fullName: "Bea Alcantara",
    username: "bea_ecowatch",
    role: "Community Scout",
    avatarUrl: null,
    stats: {
      totalPosts: 67,
      approvedPosts: 55,
      declinedPosts: 9,
      memberSince: "2024-04-08",
      isVerified: false,
    },
  },
  liza: {
    id: "mock-reporter-6",
    fullName: "Liza Navarro",
    username: "lizanav",
    role: "Park Ranger",
    avatarUrl: null,
    stats: {
      totalPosts: 55,
      approvedPosts: 49,
      declinedPosts: 3,
      memberSince: "2024-06-11",
      isVerified: false,
    },
  },
} satisfies Record<string, MockReporter>;

interface MockPlace {
  name: string;
  region: PostRegion;
  address: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
}

const places = {
  mountApo: {
    name: "Mount Apo Natural Park, Davao",
    region: "mindanao",
    address: "Mount Apo Natural Park, Davao del Sur, Philippines",
    latitude: 6.9875,
    longitude: 125.2708,
    elevationMeters: 1650,
  },
  pasonanca: {
    name: "Pasonanca Natural Park, Zamboanga",
    region: "mindanao",
    address: "Pasonanca Natural Park, Zamboanga City, Philippines",
    latitude: 7.0321,
    longitude: 122.0854,
    elevationMeters: 310,
  },
  sierraMadre: {
    name: "Sierra Madre, Isabela",
    region: "luzon",
    address: "Northern Sierra Madre Natural Park, Isabela, Philippines",
    latitude: 17.0213,
    longitude: 122.2104,
    elevationMeters: 420,
  },
  losBanos: {
    name: "Los Baños, Laguna",
    region: "luzon",
    address: "Barangay Batong Malake, Los Baños, Laguna, Philippines",
    latitude: 14.1675,
    longitude: 121.2433,
    elevationMeters: 28,
  },
  carcar: {
    name: "Carcar City, Cebu",
    region: "visayas",
    address: "Barangay Valladolid, Carcar City, Cebu, Philippines",
    latitude: 10.1248,
    longitude: 123.6391,
    elevationMeters: 142,
  },
  iloilo: {
    name: "Pavia, Iloilo",
    region: "visayas",
    address: "Barangay Ungka, Pavia, Iloilo, Philippines",
    latitude: 10.7751,
    longitude: 122.5446,
    elevationMeters: 15,
  },
  corella: {
    name: "Corella Sanctuary, Bohol",
    region: "visayas",
    address: "Barangay Canapnapan, Corella, Bohol, Philippines",
    latitude: 9.6871,
    longitude: 123.9531,
    elevationMeters: 142,
  },
  loboc: {
    name: "Loboc River, Bohol",
    region: "visayas",
    address: "Barangay Valladolid, Loboc, Bohol, Philippines",
    latitude: 9.6402,
    longitude: 124.0341,
    elevationMeters: 64,
  },
} satisfies Record<string, MockPlace>;

interface MockSpecies {
  commonName: string;
  scientificName: string;
  category: SpeciesCategory;
  origin: SpeciesOrigin;
  isInvasive: boolean;
  confidencePercent: number;
  photoUrls: readonly string[];
  description: string;
  fieldNotes: PostDetail["fieldNotes"];
  severitySummary: string;
  checklist: readonly AiChecklistItem[];
  synthesis: string;
  recommendations: readonly string[];
  usedArtificialFlash: boolean | null;
  recommendedBufferKm: number | null;
}

const species = {
  eagle: {
    commonName: "Philippine Eagle",
    scientificName: "Pithecophaga jefferyi",
    category: "bird",
    origin: "endemic",
    isInvasive: false,
    confidencePercent: 98.4,
    photoUrls: [photoEagle],
    description:
      "Observed active feeding behavior near the ridge line. Juvenile Pithecophaga jefferyi perched on a dead branch for about 20 minutes before flying toward the nesting territory. GPS coordinates verified on a handheld unit.",
    fieldNotes: {
      perchHeightMeters: 18,
      hostTree: "S. contorta",
      observerDevice: "Nikon P1000",
      isNightObservation: false,
      cameraSettings: "f/5.6 • 1/1000s • ISO 400 • 600mm",
    },
    severitySummary:
      "Critically endangered raptor near an active nesting territory; restrict location details.",
    checklist: [
      {
        label: "Image matches described species (Confidence 98.4%)",
        passed: true,
      },
      {
        label: "Location is consistent with historical habitat & elevation",
        passed: true,
      },
      { label: "No duplicate post found in 30-day radius", passed: true },
      {
        label:
          "Image is authentic (No synthetic AI generation / reverse matches)",
        passed: true,
      },
    ],
    synthesis:
      "High-confidence detection of a juvenile Pithecophaga jefferyi. Plumage and size match a first-year bird. Coordinates fall inside a known breeding range. Recommend approving with a 2km public coordinate buffer to protect the nest from disturbance.",
    recommendations: [
      "Keep observers at least 500 meters from the nest tree",
      "Avoid drone flights within the nesting territory",
      "Redact precise GPS coordinates in public observation feeds",
    ],
    usedArtificialFlash: false,
    recommendedBufferKm: 2,
  },
  caneToad: {
    commonName: "Cane Toad",
    scientificName: "Rhinella marina",
    category: "amphibian",
    origin: "introduced",
    isInvasive: true,
    confidencePercent: 96.1,
    photoUrls: [photoCaneToad],
    description:
      "Cluster of approx 8 mature specimens located near a freshwater stream. High density along the agricultural drainage channel, with several juveniles in standing water.",
    fieldNotes: {
      perchHeightMeters: null,
      hostTree: null,
      observerDevice: "iPhone 15",
      isNightObservation: true,
      cameraSettings: "f/1.8 • 1/60s • ISO 1250 • 26mm",
    },
    severitySummary:
      "Invasive amphibian spreading through farmland drainage; early containment advised.",
    checklist: [
      {
        label: "Image matches described species (Confidence 96.1%)",
        passed: true,
      },
      {
        label: "Location is consistent with known invasive range",
        passed: true,
      },
      {
        label: "Similar post found within 2km in the last 30 days",
        passed: false,
      },
      {
        label:
          "Image is authentic (No synthetic AI generation / reverse matches)",
        passed: true,
      },
    ],
    synthesis:
      "Rhinella marina identified with high confidence. Breeding-age adults near standing water suggest an established population. Recommend approving and notifying the local agriculture office for containment.",
    recommendations: [
      "Report the site to the municipal agriculture office",
      "Wear gloves when handling; parotoid glands secrete toxins",
      "Check nearby ponds for egg strings",
    ],
    usedArtificialFlash: null,
    recommendedBufferKm: null,
  },
  tarsier: {
    commonName: "Philippine Tarsier",
    scientificName: "Carlito syrichta",
    category: "mammal",
    origin: "endemic",
    isInvasive: false,
    confidencePercent: 94.2,
    photoUrls: [photoTarsier1, photoTarsier2, photoTarsier3, photoTarsier4],
    description:
      "Observed single adult Philippine Tarsier (Carlito syrichta) clinging quietly to a slender mahogany trunk approx. 2.4 meters above ground. Animal displayed calm nocturnal foraging posture, large eyes adapted to low light. No artificial flash was used to prevent disturbance. GPS coordinates captured on handheld Garmin eTrex.",
    fieldNotes: {
      perchHeightMeters: 2.4,
      hostTree: "S. macrophylla",
      observerDevice: "Garmin eTrex",
      isNightObservation: true,
      cameraSettings: "f/2.8 • 1/120s • ISO 800 • 85mm",
    },
    severitySummary:
      "Near-threatened endemic primate in unprotected fringe forest; location redaction recommended.",
    checklist: [
      {
        label: "Image matches described species (Confidence 98.4%)",
        passed: true,
      },
      {
        label: "Location is consistent with historical habitat & elevation",
        passed: true,
      },
      { label: "No duplicate post found in 30-day radius", passed: true },
      {
        label:
          "Image is authentic (No synthetic AI generation / reverse matches)",
        passed: true,
      },
    ],
    synthesis:
      "High-confidence biological detection. Specimen exhibits characteristic nocturnal arboreal traits of Carlito syrichta. Coordinates verified within Bohol-Cebu biogeographical sub-region. Recommend approving sighting with blurred public coordinate precision (1km radius) to protect habitat from poaching or unregulated tourism.",
    recommendations: [
      "Maintain minimum 5-meter buffer zone during nocturnal surveys",
      "Prohibit flash photography and thermal spot lighting",
      "Redact sub-hectare GPS coordinates in public observation feeds",
    ],
    usedArtificialFlash: false,
    recommendedBufferKm: 1,
  },
} satisfies Record<string, MockSpecies>;

type MockComment = Omit<PostComment, "id" | "postedAt"> & {
  minutesAgo: number;
};

const tarsierComments: readonly MockComment[] = [
  {
    authorName: "Dr. Aris Thorne",
    username: "thorne_botanist",
    minutesAgo: 60,
    body: "Confirming species morphology matches Carlito syrichta. Note the elongated tarsal bones and rounded digit pads.",
    isFlagged: false,
    moderationNote: null,
  },
  {
    authorName: "Clara Soriano",
    username: "clara_field",
    minutesAgo: 120,
    body: "Coordinates place this in a known secondary forest corridor outside the municipal reserve boundary. Excellent sighting.",
    isFlagged: false,
    moderationNote: null,
  },
  {
    authorName: "Scout_Dan",
    username: "dan_ranger",
    minutesAgo: 124,
    body: "Can anyone drop exact pin for tourist visits?",
    isFlagged: true,
    moderationNote:
      "Potentially exposes sensitive micro-habitat to poaching or tourist stress.",
  },
  {
    authorName: "Liza Navarro",
    username: "lizanav",
    minutesAgo: 126,
    body: "Same tree had a tarsier last month too. Might be a regular perch.",
    isFlagged: false,
    moderationNote: null,
  },
  {
    authorName: "Bea Alcantara",
    username: "bea_ecowatch",
    minutesAgo: 127,
    body: "Great shot without flash. Thank you for keeping the disturbance low.",
    isFlagged: false,
    moderationNote: null,
  },
  {
    authorName: "Jorge Dimaculangan",
    username: "jdimaculangan",
    minutesAgo: 128,
    body: "Logged for the Bohol tarsier monitoring sheet.",
    isFlagged: false,
    moderationNote: null,
  },
];

const shortComments: readonly MockComment[] = [
  {
    authorName: "Clara Soriano",
    username: "clara_field",
    minutesAgo: 10,
    body: "Matches what we have seen in this area. Thanks for reporting.",
    isFlagged: false,
    moderationNote: null,
  },
];

type MockPostDefinition = [
  speciesKey: keyof typeof species,
  placeKey: keyof typeof places,
  reporterKey: keyof typeof reporters,
  minutesAgo: number,
  status: PostStatus,
  severity: PostSeverity,
  title: string,
];

/** Newest first within each status. */
const definitions: readonly MockPostDefinition[] = [
  [
    "eagle",
    "mountApo",
    "jorge",
    24,
    "pending",
    "high",
    "Critically Endangered Philippine Eagle juvenile spotted near nesting territory",
  ],
  [
    "caneToad",
    "carcar",
    "clara",
    65,
    "pending",
    "medium",
    "Multiple invasive Cane Toad specimens colonizing agricultural drainage",
  ],
  [
    "tarsier",
    "corella",
    "mateo",
    130,
    "pending",
    "medium",
    "Philippine Tarsier spotted on a mahogany tree",
  ],
  [
    "caneToad",
    "losBanos",
    "bea",
    190,
    "pending",
    "low",
    "Cane Toads gathering under a campus street lamp",
  ],
  [
    "eagle",
    "sierraMadre",
    "liza",
    260,
    "pending",
    "high",
    "Adult Philippine Eagle soaring over a logging road",
  ],
  [
    "tarsier",
    "loboc",
    "aris",
    380,
    "pending",
    "low",
    "Tarsier resting in a bamboo thicket near the river trail",
  ],
  [
    "caneToad",
    "iloilo",
    "clara",
    520,
    "pending",
    "medium",
    "Cane Toad egg strings found in an irrigation canal",
  ],
  [
    "eagle",
    "pasonanca",
    "jorge",
    700,
    "pending",
    "high",
    "Philippine Eagle pair calling near a ridge clearing",
  ],
  [
    "tarsier",
    "corella",
    "mateo",
    900,
    "pending",
    "medium",
    "Two tarsiers foraging at dusk outside the sanctuary fence",
  ],
  [
    "caneToad",
    "losBanos",
    "liza",
    1300,
    "pending",
    "low",
    "Juvenile Cane Toads crossing a rice paddy dike",
  ],
  [
    "eagle",
    "mountApo",
    "aris",
    1700,
    "pending",
    "medium",
    "Philippine Eagle feather found below a known roost",
  ],
  [
    "tarsier",
    "loboc",
    "bea",
    2200,
    "pending",
    "low",
    "Tarsier photographed on a guided night walk",
  ],
  [
    "caneToad",
    "carcar",
    "jorge",
    2900,
    "pending",
    "medium",
    "Cane Toad found in a backyard fish pond",
  ],
  [
    "eagle",
    "sierraMadre",
    "mateo",
    3600,
    "pending",
    "high",
    "Injured Philippine Eagle seen near a farm clearing",
  ],
  [
    "tarsier",
    "corella",
    "clara",
    4300,
    "approved",
    "medium",
    "Tarsier mother carrying an infant along the forest edge",
  ],
  [
    "eagle",
    "pasonanca",
    "liza",
    5800,
    "approved",
    "high",
    "Philippine Eagle nest confirmed in a dipterocarp crown",
  ],
  [
    "caneToad",
    "iloilo",
    "bea",
    7200,
    "approved",
    "medium",
    "Cane Toad chorus recorded near a fishpond",
  ],
  [
    "tarsier",
    "loboc",
    "jorge",
    9000,
    "approved",
    "low",
    "Tarsier sleeping in a fig tree hollow",
  ],
  [
    "eagle",
    "mountApo",
    "clara",
    11500,
    "approved",
    "high",
    "Philippine Eagle hunting a flying lemur at dawn",
  ],
  [
    "caneToad",
    "losBanos",
    "aris",
    14400,
    "approved",
    "low",
    "Cane Toad sheltering under a garden pot",
  ],
  [
    "tarsier",
    "corella",
    "liza",
    20000,
    "approved",
    "medium",
    "Tarsier sighting during a sanctuary boundary survey",
  ],
  [
    "eagle",
    "sierraMadre",
    "bea",
    26000,
    "approved",
    "medium",
    "Philippine Eagle perched above a river gorge",
  ],
  [
    "caneToad",
    "carcar",
    "mateo",
    33000,
    "approved",
    "medium",
    "Cane Toads spreading along a new road culvert",
  ],
  [
    "tarsier",
    "loboc",
    "clara",
    40000,
    "approved",
    "low",
    "Tarsier clinging to a rattan stem",
  ],
  [
    "eagle",
    "pasonanca",
    "bea",
    6000,
    "declined",
    "medium",
    "Blurry photo of a possible eagle over the hills",
  ],
  [
    "tarsier",
    "corella",
    "liza",
    12000,
    "declined",
    "low",
    "Duplicate tarsier report from the same night",
  ],
  [
    "caneToad",
    "iloilo",
    "mateo",
    21000,
    "declined",
    "low",
    "Toad photo taken from a pet shop listing",
  ],
  [
    "eagle",
    "mountApo",
    "aris",
    30000,
    "declined",
    "medium",
    "Eagle sighting without location data",
  ],
];

/** Post numbers count up from the oldest post, e.g. #1001. */
const references = new Map(
  [...definitions]
    .sort((a, b) => b[3] - a[3])
    .map((definition, index) => [definition, 1001 + index]),
);

function toComment(
  comment: MockComment,
  postId: string,
  index: number,
): PostComment {
  const { minutesAgo: age, ...rest } = comment;
  return {
    ...rest,
    id: `${postId}-comment-${String(index + 1)}`,
    postedAt: minutesAgo(age),
  };
}

function toDetail(definition: MockPostDefinition): PostDetail {
  const [speciesKey, placeKey, reporterKey, age, status, severity, title] =
    definition;
  const sighting: MockSpecies = species[speciesKey];
  const place: MockPlace = places[placeKey];
  const { stats, ...reporter }: MockReporter = reporters[reporterKey];
  const reference = references.get(definition) ?? 0;
  const id = `mock-post-${String(reference)}`;
  const comments =
    speciesKey === "tarsier" &&
    placeKey === "corella" &&
    reporterKey === "mateo"
      ? tarsierComments
      : shortComments.filter((comment) => comment.minutesAgo < age);

  return {
    id,
    reference,
    title,
    description: sighting.description,
    status,
    severity,
    category: sighting.category,
    region: place.region,
    locationName: place.name,
    isInvasive: sighting.isInvasive,
    submittedAt: minutesAgo(age),
    photoUrls: sighting.photoUrls,
    aiMatch: {
      commonName: sighting.commonName,
      scientificName: sighting.scientificName,
      confidencePercent: sighting.confidencePercent,
    },
    reporter,
    fieldNotes: sighting.fieldNotes,
    location: {
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      elevationMeters: place.elevationMeters,
      isExifVerified: true,
      recommendedBufferKm: sighting.recommendedBufferKm,
      mapPreviewUrl: mapSample,
    },
    comments: comments.map((comment, index) => toComment(comment, id, index)),
    reporterStats: stats,
    ai: {
      severitySummary: sighting.severitySummary,
      origin: sighting.origin,
      checklist: sighting.checklist,
      synthesis: sighting.synthesis,
      recommendations: sighting.recommendations,
      usedArtificialFlash: sighting.usedArtificialFlash,
    },
  };
}

export const mockPostDetails: readonly PostDetail[] = definitions.map(toDetail);

export const mockPosts: readonly PostSummary[] = mockPostDetails;
