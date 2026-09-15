import { SkillCategory, SkillLevel, SkillProficiency } from './enums';

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
  proficiency: SkillProficiency;
  category: SkillCategory;
}

