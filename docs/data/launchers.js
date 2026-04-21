export const LAUNCHERS = [
  {
    id: 'falcon9-v12-expendable',
    nameKey: 'compare.launcher.falcon9.name',
    referenceOrbitKey: 'compare.reference.surface_gto',
    referenceDeltaV: 12100, // Surface→GTO requirement source: issue #24 advisory comment
    notesKey: 'compare.launcher.falcon9.note',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/Falcon_9_Full_Thrust',
      'https://en.wikipedia.org/wiki/Merlin_1D',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
      'https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/e6393974ce4ed22b095f2e1d1a6a8e81_MIT16_07F09_Lec17.pdf',
    ],
    stages: [
      {
        nameKey: 'compare.launcher.falcon9.stage_1',
        m_p: 410900, // m_p source: issue #24 advisory comment
        m_s: 22200, // m_s source: issue #24 advisory comment
        Isp: 282, // Isp source: issue #24 advisory comment
        thrust_kN: 7607, // thrust_kN source: issue #24 advisory comment
      },
      {
        nameKey: 'compare.launcher.falcon9.stage_2',
        m_p: 107500, // m_p source: issue #24 advisory comment
        m_s: 4000, // m_s source: issue #24 advisory comment
        Isp: 348, // Isp source: issue #24 advisory comment
        thrust_kN: 934, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
  {
    id: 'saturn-v',
    nameKey: 'compare.launcher.saturn_v.name',
    referenceOrbitKey: 'compare.reference.surface_tli',
    referenceDeltaV: 12800, // Surface→TLI requirement source: issue #24 advisory comment
    notesKey: 'compare.launcher.saturn_v.note',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/S-IC',
      'https://en.wikipedia.org/wiki/S-II',
      'https://en.wikipedia.org/wiki/S-IVB',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
      'https://www.esa.int/esapub/bulletin/bullet103/biesbroek103.pdf',
    ],
    stages: [
      {
        nameKey: 'compare.launcher.saturn_v.stage_1',
        m_p: 2077000, // m_p source: issue #24 advisory comment
        m_s: 137000, // m_s source: issue #24 advisory comment
        Isp: 263, // Isp source: issue #24 advisory comment
        thrust_kN: 34500, // thrust_kN source: issue #24 advisory comment
      },
      {
        nameKey: 'compare.launcher.saturn_v.stage_2',
        m_p: 443000, // m_p source: issue #24 advisory comment
        m_s: 36200, // m_s source: issue #24 advisory comment
        Isp: 421, // Isp source: issue #24 advisory comment
        thrust_kN: 4400, // thrust_kN source: issue #24 advisory comment
      },
      {
        nameKey: 'compare.launcher.saturn_v.stage_3',
        m_p: 109500, // m_p source: issue #24 advisory comment
        m_s: 13500, // m_s source: issue #24 advisory comment
        Isp: 421, // Isp source: issue #24 advisory comment
        thrust_kN: 1033.1, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
  {
    id: 'long-march-5',
    nameKey: 'compare.launcher.long_march_5.name',
    referenceOrbitKey: 'compare.reference.surface_gto',
    referenceDeltaV: 12100, // Surface→GTO requirement source: issue #24 advisory comment
    notesKey: 'compare.launcher.long_march_5.note',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/Long_March_5',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
      'https://ocw.mit.edu/courses/16-07-dynamics-fall-2009/e6393974ce4ed22b095f2e1d1a6a8e81_MIT16_07F09_Lec17.pdf',
    ],
    stages: [
      {
        nameKey: 'compare.launcher.long_march_5.stage_boosters',
        m_p: 571200, // 4 × booster m_p source: issue #24 advisory comment
        m_s: 55200, // 4 × booster m_s source: issue #24 advisory comment
        Isp: 300, // booster sea-level Isp source: issue #24 advisory comment
        thrust_kN: 9600, // 4 × booster sea-level thrust source: issue #24 advisory comment
      },
      {
        nameKey: 'compare.launcher.long_march_5.stage_core',
        m_p: 165300, // m_p source: issue #24 advisory comment
        m_s: 21600, // m_s source: issue #24 advisory comment
        Isp: 316.7, // Isp source: issue #24 advisory comment
        thrust_kN: 1036, // thrust_kN source: issue #24 advisory comment
      },
      {
        nameKey: 'compare.launcher.long_march_5.stage_upper',
        m_p: 29100, // m_p source: issue #24 advisory comment
        m_s: 5100, // m_s source: issue #24 advisory comment
        Isp: 442.6, // Isp source: issue #24 advisory comment
        thrust_kN: 176.72, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
  {
    id: 'soyuz-21b',
    nameKey: 'compare.launcher.soyuz_21b.name',
    referenceOrbitKey: 'compare.reference.surface_leo',
    referenceDeltaV: 9700, // Surface→LEO requirement source: issue #24 advisory comment
    notesKey: 'compare.launcher.soyuz_21b.note',
    sourceUrls: [
      'https://en.wikipedia.org/wiki/Soyuz-2',
      'https://mail.gis.byu.edu/rockets/physics/delta-v',
    ],
    stages: [
      {
        nameKey: 'compare.launcher.soyuz_21b.stage_boosters',
        m_p: 156640, // 4 × booster m_p source: issue #24 advisory comment
        m_s: 15136, // 4 × booster m_s source: issue #24 advisory comment
        Isp: 262, // booster sea-level Isp source: issue #24 advisory comment
        thrust_kN: 3354, // 4 × booster sea-level thrust source: issue #24 advisory comment
      },
      {
        nameKey: 'compare.launcher.soyuz_21b.stage_core',
        m_p: 90100, // m_p source: issue #24 advisory comment
        m_s: 6545, // m_s source: issue #24 advisory comment
        Isp: 255, // Isp source: issue #24 advisory comment
        thrust_kN: 792.5, // thrust_kN source: issue #24 advisory comment
      },
      {
        nameKey: 'compare.launcher.soyuz_21b.stage_upper',
        m_p: 25400, // m_p source: issue #24 advisory comment
        m_s: 2355, // m_s source: issue #24 advisory comment
        Isp: 359, // Isp source: issue #24 advisory comment
        thrust_kN: 294.3, // thrust_kN source: issue #24 advisory comment
      },
    ],
  },
];
