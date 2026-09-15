import { Profile } from '../types/profile';
import { Resume } from '../types/resume';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';

export interface WorkspaceSnapshot {
  exportedAt: string;
  resumes: Resume[];
  activeResumeId: string | null;
  profile: Profile;
  selectedTemplateId: string;
  theme: 'light' | 'dark';
}

export function readWorkspaceSnapshot(fallbackProfile: Profile): WorkspaceSnapshot {
  return {
    exportedAt: new Date().toISOString(),
    resumes: readStorage<Resume[]>(storageKeys.resumes, []),
    activeResumeId: readStorage<string | null>(storageKeys.activeResumeId, null),
    profile: readStorage<Profile>(storageKeys.profile, fallbackProfile),
    selectedTemplateId: readStorage<string>(storageKeys.template, 'atelier'),
    theme: readStorage<'light' | 'dark'>(storageKeys.theme, 'light'),
  };
}

export function writeWorkspaceSnapshot(snapshot: WorkspaceSnapshot): void {
  writeStorage(storageKeys.resumes, snapshot.resumes);
  writeStorage(storageKeys.activeResumeId, snapshot.activeResumeId);
  writeStorage(storageKeys.profile, snapshot.profile);
  writeStorage(storageKeys.template, snapshot.selectedTemplateId);
  writeStorage(storageKeys.theme, snapshot.theme);
}

