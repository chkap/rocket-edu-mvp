export const LAUNCHERS = [
  {
    id: 'falcon9-v12-expendable',
    name: 'Falcon 9 v1.2 expendable',
    referenceOrbit: 'Surface to GTO requirement',
    referenceDeltaV: 12100, // Surface→GTO requirement source: issue #24 advisory comment
    notes:
      'Issue #24 notes that SpaceX does not publish a single total mission Δv, so this preset compares the ideal stack to the cited surface-to-GTO requirement.',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/Falcon_9_Full_Thrust',
      'https://en.wikipedia.org/wiki/Merlin_1D',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
      'https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/e6393974ce4ed22b095f2e1d1a6a8e81_MIT16_07F09_Lec17.pdf',
    ],
    stages: [
      {
        name: 'Stage 1',
        m_p: 410900, // m_p source: issue #24 advisory comment
        m_s: 22200, // m_s source: issue #24 advisory comment
        Isp: 282, // Isp source: issue #24 advisory comment
        thrust_kN: 7607, // thrust_kN source: issue #24 advisory comment
      },
      {
        name: 'Stage 2',
        m_p: 107500, // m_p source: issue #24 advisory comment
        m_s: 4000, // m_s source: issue #24 advisory comment
        Isp: 348, // Isp source: issue #24 advisory comment
        thrust_kN: 934, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
  {
    id: 'saturn-v',
    name: 'Saturn V',
    referenceOrbit: 'Surface to TLI requirement',
    referenceDeltaV: 12800, // Surface→TLI requirement source: issue #24 advisory comment
    notes:
      'Issue #24 recommends comparing Saturn V to the cited TLI requirement assembled from the BYU and ESA sources.',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/S-IC',
      'https://en.wikipedia.org/wiki/S-II',
      'https://en.wikipedia.org/wiki/S-IVB',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
      'https://www.esa.int/esapub/bulletin/bullet103/biesbroek103.pdf',
    ],
    stages: [
      {
        name: 'S-IC',
        m_p: 2077000, // m_p source: issue #24 advisory comment
        m_s: 137000, // m_s source: issue #24 advisory comment
        Isp: 263, // Isp source: issue #24 advisory comment
        thrust_kN: 34500, // thrust_kN source: issue #24 advisory comment
      },
      {
        name: 'S-II',
        m_p: 443000, // m_p source: issue #24 advisory comment
        m_s: 36200, // m_s source: issue #24 advisory comment
        Isp: 421, // Isp source: issue #24 advisory comment
        thrust_kN: 4400, // thrust_kN source: issue #24 advisory comment
      },
      {
        name: 'S-IVB',
        m_p: 109500, // m_p source: issue #24 advisory comment
        m_s: 13500, // m_s source: issue #24 advisory comment
        Isp: 421, // Isp source: issue #24 advisory comment
        thrust_kN: 1033.1, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
  {
    id: 'long-march-5',
    name: 'Long March 5',
    referenceOrbit: 'Surface to GTO requirement',
    referenceDeltaV: 12100, // Surface→GTO requirement source: issue #24 advisory comment
    notes:
      'Issue #24 recommends modeling the four boosters in parallel with the core; this MVP serializes them as a first stage while keeping the cited stage numbers unchanged.',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/Long_March_5',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
      'https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/e6393974ce4ed22b095f2e1d1a6a8e81_MIT16_07F09_Lec17.pdf',
    ],
    stages: [
      {
        name: 'Boosters (4x CZ-5-300, serialized)',
        m_p: 571200, // 4 × booster m_p source: issue #24 advisory comment
        m_s: 55200, // 4 × booster m_s source: issue #24 advisory comment
        Isp: 300, // booster sea-level Isp source: issue #24 advisory comment
        thrust_kN: 9600, // 4 × booster sea-level thrust source: issue #24 advisory comment
      },
      {
        name: 'Core stage',
        m_p: 165300, // m_p source: issue #24 advisory comment
        m_s: 21600, // m_s source: issue #24 advisory comment
        Isp: 316.7, // Isp source: issue #24 advisory comment
        thrust_kN: 1036, // thrust_kN source: issue #24 advisory comment
      },
      {
        name: 'Upper stage',
        m_p: 29100, // m_p source: issue #24 advisory comment
        m_s: 5100, // m_s source: issue #24 advisory comment
        Isp: 442.6, // Isp source: issue #24 advisory comment
        thrust_kN: 176.72, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
  {
    id: 'soyuz-21b',
    name: 'Soyuz-2.1b',
    referenceOrbit: 'Surface to LEO requirement',
    referenceDeltaV: 9700, // Surface→LEO requirement source: issue #24 advisory comment
    notes:
      'Issue #24 recommends modeling the four boosters in parallel with the core; this MVP serializes them as a first stage while preserving the cited per-stage values.',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/Soyuz-2',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
    ],
    stages: [
      {
        name: 'Boosters (4x Block B/V/G/D, serialized)',
        m_p: 156640, // 4 × booster m_p source: issue #24 advisory comment
        m_s: 15136, // 4 × booster m_s source: issue #24 advisory comment
        Isp: 262, // booster sea-level Isp source: issue #24 advisory comment
        thrust_kN: 3354, // 4 × booster sea-level thrust source: issue #24 advisory comment
      },
      {
        name: 'Core stage',
        m_p: 90100, // m_p source: issue #24 advisory comment
        m_s: 6545, // m_s source: issue #24 advisory comment
        Isp: 255, // Isp source: issue #24 advisory comment
        thrust_kN: 792.5, // thrust_kN source: issue #24 advisory comment
      },
      {
        name: 'Block I',
        m_p: 25400, // m_p source: issue #24 advisory comment
        m_s: 2355, // m_s source: issue #24 advisory comment
        Isp: 359, // Isp source: issue #24 advisory comment
        thrust_kN: 294.3, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
];
