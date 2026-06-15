import type {
  Member,
  StudentVerificationRequest,
  StudentVerificationStatus,
} from '@/types';

import { getActiveMember, getLocalMemberById } from './localAccountStore';

export type StudentVerificationWithMember = StudentVerificationRequest & {
  member?: Member;
};

export type StudentVerificationSubmitInput = {
  proofUri?: string;
  proofLabel?: string;
};

let verificationRecords: StudentVerificationRequest[] = [];

function createRequestId() {
  return `student-verification-${Date.now().toString(36)}`;
}

async function withMember(
  request: StudentVerificationRequest,
): Promise<StudentVerificationWithMember> {
  return {
    ...request,
    member: await getLocalMemberById(request.memberId),
  };
}

export const getMemberStudentVerification = async (
  memberId: string,
): Promise<StudentVerificationRequest | undefined> => {
  return verificationRecords.find((request) => request.memberId === memberId);
};

export const getCurrentMemberStudentVerification = async (): Promise<
  StudentVerificationRequest | undefined
> => {
  const member = await getActiveMember();

  return getMemberStudentVerification(member.id);
};

export const getStudentVerificationStatus = async (
  memberId: string,
): Promise<StudentVerificationStatus> => {
  return (await getMemberStudentVerification(memberId))?.status ?? 'Not Submitted';
};

export const submitStudentVerification = async (
  memberId: string,
  input: StudentVerificationSubmitInput,
): Promise<StudentVerificationRequest> => {
  // TODO: Real file upload, secure storage, and verification must be handled by backend/Gmind.
  const timestamp = new Date().toISOString();
  const existingRequest = await getMemberStudentVerification(memberId);

  const request: StudentVerificationRequest = {
    id: existingRequest?.id ?? createRequestId(),
    memberId,
    proofLabel: input.proofLabel ?? 'Student ID proof',
    proofUri: input.proofUri,
    status: 'Pending Verification',
    submittedAt: timestamp,
  };

  verificationRecords = existingRequest
    ? verificationRecords.map((item) => (item.id === existingRequest.id ? request : item))
    : [request, ...verificationRecords];

  return request;
};

export const submitCurrentMemberStudentVerification = async (
  input: StudentVerificationSubmitInput,
): Promise<StudentVerificationRequest> => {
  const member = await getActiveMember();

  return submitStudentVerification(member.id, input);
};

export const getStudentVerificationRequests = async (): Promise<
  StudentVerificationWithMember[]
> => {
  const requests = await Promise.all(
    verificationRecords.map((request) => withMember(request)),
  );
  const statusOrder: Record<StudentVerificationStatus, number> = {
    'Pending Verification': 0,
    Confirmed: 1,
    Rejected: 2,
    'Not Submitted': 3,
  };

  return requests.sort((first, second) => {
    const statusDifference = statusOrder[first.status] - statusOrder[second.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime();
  });
};

export const approveStudentVerification = async (
  requestId: string,
): Promise<StudentVerificationRequest | undefined> => {
  const request = verificationRecords.find((item) => item.id === requestId);

  if (!request) {
    return undefined;
  }

  const updatedRequest: StudentVerificationRequest = {
    ...request,
    status: 'Confirmed',
    reviewedAt: new Date().toISOString(),
    reviewerNote: 'Approved in mock admin portal.',
  };

  verificationRecords = verificationRecords.map((item) =>
    item.id === requestId ? updatedRequest : item,
  );

  return updatedRequest;
};

export const rejectStudentVerification = async (
  requestId: string,
): Promise<StudentVerificationRequest | undefined> => {
  const request = verificationRecords.find((item) => item.id === requestId);

  if (!request) {
    return undefined;
  }

  const updatedRequest: StudentVerificationRequest = {
    ...request,
    status: 'Rejected',
    reviewedAt: new Date().toISOString(),
    reviewerNote: 'Rejected in mock admin portal.',
  };

  verificationRecords = verificationRecords.map((item) =>
    item.id === requestId ? updatedRequest : item,
  );

  return updatedRequest;
};

export const studentVerificationService = {
  getCurrentMemberStudentVerification,
  getMemberStudentVerification,
  getStudentVerificationRequests,
  getStudentVerificationStatus,
  submitCurrentMemberStudentVerification,
  submitStudentVerification,
  approveStudentVerification,
  rejectStudentVerification,
};
