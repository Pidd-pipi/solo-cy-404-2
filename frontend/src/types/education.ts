import { EducationLevel } from './enums';

export interface Education {
  id: string;
  school: string;
  major: string;
  level: EducationLevel;
  startDate: string;
  endDate: string;
  gpa: string;
  honors: string[];
}

