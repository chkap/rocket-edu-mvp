export const falcon9 = {
  name: 'Falcon 9 Block 5',
  missionTarget: 'LEO',
  payloadMassKg: 4325,
  stages: [
    {
      label: 'Stage 1',
      engineKey: 'merlin_1d',
      engineCount: 9,
      propellantMassKg: 410900,
      tankFraction: 0.06,
    },
    {
      label: 'Stage 2',
      engineKey: 'merlin_vac',
      engineCount: 1,
      propellantMassKg: 107500,
      tankFraction: 0.06,
      fairingMassKg: 1500,
    },
  ],
};

export const saturnV = {
  name: 'Saturn V',
  missionTarget: 'TLI',
  payloadMassKg: 2159,
  stages: [
    {
      label: 'S-IC',
      engineKey: 'f1',
      engineCount: 5,
      propellantMassKg: 2077000,
      tankFraction: 0.06,
    },
    {
      label: 'S-II',
      engineKey: 'j2',
      engineCount: 5,
      propellantMassKg: 427000,
      tankFraction: 0.06,
    },
    {
      label: 'S-IVB',
      engineKey: 'j2',
      engineCount: 1,
      propellantMassKg: 105300,
      tankFraction: 0.06,
      fairingMassKg: 0,
    },
  ],
};

export const slsBlock1 = {
  name: 'SLS Block 1',
  missionTarget: 'LEO',
  payloadMassKg: 80598,
  boosters: {
    label: 'SRB',
    count: 2,
    engineKey: 'srb_blob',
    engineCount: 1,
    propellantMassKg: 631000,
  },
  stages: [
    {
      label: 'Core stage',
      engineKey: 'rs25',
      engineCount: 4,
      propellantMassKg: 984000,
      tankFraction: 0.12,
    },
    {
      label: 'ICPS',
      engineKey: 'rl10b2',
      engineCount: 1,
      propellantMassKg: 28600,
      tankFraction: 0.12,
      fairingMassKg: 1500,
    },
  ],
};

export const longMarch5 = {
  name: 'Long March 5',
  missionTarget: 'LEO',
  payloadMassKg: 82100,
  boosters: {
    label: 'Boosters',
    count: 4,
    engineKey: 'lm5_booster_blob',
    engineCount: 1,
    propellantMassKg: 142800,
  },
  stages: [
    {
      label: 'Core stage',
      engineKey: 'yf77',
      engineCount: 2,
      propellantMassKg: 165300,
      tankFraction: 0.12,
    },
    {
      label: 'Upper stage',
      engineKey: 'yf75d',
      engineCount: 2,
      propellantMassKg: 29100,
      tankFraction: 0.12,
      fairingMassKg: 1500,
    },
  ],
};

export const PRESETS = {
  falcon9,
  saturnV,
  slsBlock1,
  longMarch5,
};
