export default function computeDerivedStats(baseStats: any) {
    const level = baseStats.level;
  
    return {
      HP: Math.floor((baseStats.baseHP/10) * Math.pow((level/5) + 3, 1.2)),
      maxHP: Math.floor((baseStats.baseHP/10) * Math.pow((level/5) + 3, 1.2)),
      Speed: ((baseStats.baseSpeed/10) * (level/5)) + 10,
      Attack: ((baseStats.baseAttack/10) * (level/5)) + 10,
      Defense: ((baseStats.baseDefense/10) * (level/5)) + 10,
      SpecialAttack: ((baseStats.baseSpAttack/10) * (level/5)) + 10,
      SpecialDefense: ((baseStats.baseSpDefense/10) * (level/5)) + 10,
    };
  }
  