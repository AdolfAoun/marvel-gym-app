import { machineGuides } from '../mock';
import type { MachineGuide } from '../types';

export const getMachineGuides = async (): Promise<MachineGuide[]> => {
  return [...machineGuides];
};

export const machineGuideService = {
  getMachineGuides,
};
