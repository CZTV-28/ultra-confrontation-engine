export type SeasonTemplateLanguage = "zh" | "en";
export type SeasonId = "S1";

export interface SeasonTemplate {
  id: SeasonId;
  name: Record<SeasonTemplateLanguage, string>;
  subtitle: Record<SeasonTemplateLanguage, string>;
  rulesetVersion: string;
  characterDefaults: {
    hp: number;
    mp: number;
  };
  draftDefaults: Record<
    SeasonTemplateLanguage,
    {
      projectName: string;
      characterName: string;
      description: string;
      trainingNotes: string;
    }
  >;
  basicAttack: {
    baseDamage: number;
    minMpSpend: number;
    maxMpSpend: number;
    mpStep: number;
    damageRange: [number, number];
    damageTable: Record<number, number>;
  };
  melee: {
    range: number;
    coneAngleDegrees: number;
    baseDamage: number;
    minMpCost: number;
    maxMpCost: number;
    mpStep: number;
    minDamage: number;
    maxDamage: number;
  };
  ranged: {
    defaultMpCost: number;
    minMpCost: number;
    maxMpCost: number;
    mpStep: number;
    defaultDamage: number;
    minDamage: number;
    maxDamage: number;
    defaultHitRate: number;
    minHitRate: number;
    maxHitRate: number;
    defaultRange: number;
    minRange: number;
    maxRange: number;
    maxKnockback: number;
    damageCostAtMax: number;
    hitCostAtMax: number;
    rangeCostAtMax: number;
    boostedAttributeCost: number;
  };
  block: {
    defaultReduction: number;
    minReduction: number;
    maxReduction: number;
    minMpCost: number;
    maxMpCost: number;
    mpStep: number;
    counterDamageMin: number;
    counterDamageMax: number;
    reductionCostAtMax: number;
    counterBaseCost: number;
    counterCostAtMax: number;
  };
  dodge: {
    normalMpCost: number;
    doubleRetreatMpCost: number;
    mpStep: number;
    normalRetreatDistance: number;
    doubleRetreatDistance: number;
    counterMinMpCost: number;
    counterMaxMpCost: number;
    counterExtraBaseCost: number;
    counterDamageMin: number;
    counterDamageMax: number;
    counterCostAtMax: number;
  };
  skillDefaults: {
    basic: {
      maxMpSpend: number;
    };
    melee: {
      id: string;
      name: string;
      mpCost: number;
      damage: number;
    };
    ranged: {
      id: string;
      name: string;
      damage: number;
      hitRate: number;
      range: number;
    };
    block: {
      id: string;
      name: string;
      counterDamage: number;
    };
    dodge: {
      id: string;
      name: string;
      counterDamage: number;
    };
    passive: {
      id: string;
      name: string;
    };
  };
}

export const seasonTemplates: SeasonTemplate[] = [
  {
    id: "S1",
    name: {
      zh: "S1：起源",
      en: "S1: Origin",
    },
    subtitle: {
      zh: "S1 参赛角色文件生成器",
      en: "S1 Participant Character Generator",
    },
    rulesetVersion: "0.1.0",
    characterDefaults: {
      hp: 500,
      mp: 250,
    },
    draftDefaults: {
      zh: {
        projectName: "起源项目",
        characterName: "起源斗士",
        description: "用于 S1 起源赛季模拟与 AI 训练的均衡型角色。",
        trainingNotes: "这里填写期望行为、连招思路、弱点、战斗风格和训练要求。",
      },
      en: {
        projectName: "Origin Project",
        characterName: "Origin Fighter",
        description: "A balanced S1 prototype character prepared for simulation and AI training.",
        trainingNotes: "Preferred behavior, combo ideas, weaknesses, and style notes can be written here.",
      },
    },
    basicAttack: {
      baseDamage: 10,
      minMpSpend: 0,
      maxMpSpend: 30,
      mpStep: 5,
      damageRange: [10, 40],
      damageTable: {
        0: 10,
        5: 20,
        10: 26,
        15: 31,
        20: 35,
        25: 38,
        30: 40,
      },
    },
    melee: {
      range: 10,
      coneAngleDegrees: 120,
      baseDamage: 25,
      minMpCost: 0,
      maxMpCost: 50,
      mpStep: 5,
      minDamage: 10,
      maxDamage: 75,
    },
    ranged: {
      defaultMpCost: 50,
      minMpCost: 25,
      maxMpCost: 100,
      mpStep: 5,
      defaultDamage: 75,
      minDamage: 25,
      maxDamage: 150,
      defaultHitRate: 0.6,
      minHitRate: 0.6,
      maxHitRate: 1,
      defaultRange: 100,
      minRange: 100,
      maxRange: 200,
      maxKnockback: 100,
      damageCostAtMax: 25,
      hitCostAtMax: 25,
      rangeCostAtMax: 15,
      boostedAttributeCost: 5,
    },
    block: {
      defaultReduction: 0.5,
      minReduction: 0.5,
      maxReduction: 0.75,
      minMpCost: 0,
      maxMpCost: 80,
      mpStep: 5,
      counterDamageMin: 10,
      counterDamageMax: 75,
      reductionCostAtMax: 30,
      counterBaseCost: 15,
      counterCostAtMax: 35,
    },
    dodge: {
      normalMpCost: 25,
      doubleRetreatMpCost: 50,
      mpStep: 5,
      normalRetreatDistance: 100,
      doubleRetreatDistance: 200,
      counterMinMpCost: 40,
      counterMaxMpCost: 80,
      counterExtraBaseCost: 15,
      counterDamageMin: 10,
      counterDamageMax: 75,
      counterCostAtMax: 35,
    },
    skillDefaults: {
      basic: {
        maxMpSpend: 30,
      },
      melee: {
        id: "origin_fighter_melee",
        name: "Origin Slash",
        mpCost: 0,
        damage: 25,
      },
      ranged: {
        id: "origin_fighter_ranged",
        name: "Origin Bolt",
        damage: 75,
        hitRate: 0.6,
        range: 100,
      },
      block: {
        id: "origin_fighter_block",
        name: "Origin Guard",
        counterDamage: 25,
      },
      dodge: {
        id: "origin_fighter_dodge",
        name: "Origin Dodge",
        counterDamage: 25,
      },
      passive: {
        id: "origin_fighter_passive",
        name: "Origin Passive",
      },
    },
  },
];

export function getSeasonTemplate(id: string): SeasonTemplate {
  return seasonTemplates.find((template) => template.id === id) ?? seasonTemplates[0];
}
