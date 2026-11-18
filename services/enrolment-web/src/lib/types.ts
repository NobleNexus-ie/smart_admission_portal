export type UserRole = 'parent' | 'staff';

export type ApplicationStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info_requested'
  | 'withdrawn';

export type SchoolStatus = 'pending' | 'active' | 'inactive' | 'archived';

export type SchoolBoard =
  | 'CBSE'
  | 'ICSE'
  | 'Matriculation'
  | 'State Board'
  | 'International'
  | 'Other';

export type IdProofType = 'aadhaar' | 'passport' | 'dl' | 'voter_id';

export type Gender = 'Male' | 'Female' | 'Other';

export type SchoolType = 'public' | 'private';

export type Language = 'en' | 'hi' | 'ta' | 'bn';

export type StaffRole = 'school_admin' | 'reviewer' | 'viewer';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ParentUser {
  id: string;
  email: string;
  is_verified: boolean;
  role: 'parent';
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  school_id: string;
  role: StaffRole;
}

export interface AuthResponse extends TokenPair {
  user: ParentUser | StaffUser;
}

export interface ParentProfile {
  id: string;
  parent_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  address_line_2: string | null;
  landmark: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  id_proof_type: IdProofType | null;
  id_proof_url: string | null;
  spouse_name: string | null;
  spouse_phone: string | null;
  spouse_email: string | null;
  spouse_occupation: string | null;
  education_qualification: string | null;
  occupation: string | null;
  annual_income: string | null;
  language_preference: Language | null;
  profile_complete: boolean;
}

export interface ProfileUpdatePayload {
  full_name: string;
  phone: string;
  address?: string;
  address_line_2?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  id_proof_type?: IdProofType;
  spouse_name?: string;
  spouse_phone?: string;
  spouse_email?: string;
  spouse_occupation?: string;
  education_qualification?: string;
  occupation?: string;
  annual_income?: string;
  language_preference?: Language;
}

export interface DashboardSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  info_requested: number;
  recent_activity: ActivityItem[];
  action_required: ApplicationSummary[];
}

export interface ActivityItem {
  id: string;
  application_id: string;
  event_type: string;
  message: string;
  created_at: string;
}

export interface ApplicationSummary {
  id: string;
  student_full_name: string;
  school_name: string;
  school_id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  created_at: string;
  action_required: boolean;
}

export interface School {
  id: string;
  name: string;
  board: SchoolBoard | string;
  school_type: SchoolType | null;
  address: string;
  area: string;
  city: string;
  state: string;
  contact_email: string;
  phone: string;
  description: string | null;
  logo_url: string | null;
  status: SchoolStatus;
  facilities: string[] | null;
  application_requirements: string | null;
  accepting_applications: boolean;
}

export interface SchoolSearchParams {
  board?: string;
  area?: string;
  name?: string;
  school_type?: SchoolType;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ApplicationFormData {
  student_full_name: string;
  date_of_birth: string;
  gender: Gender;
  grade_applying_for: string;
  nationality?: string;
  previous_school_name?: string;
  previous_board?: string;
  previous_marks?: number | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  special_needs?: string;
  medical_conditions?: string;
}

export interface ApplicationDocument {
  id: string;
  category: string;
  file_name: string;
  download_url: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface ApplicationSchoolStatus {
  id: string;
  school_id: string;
  school_name: string;
  status: ApplicationStatus;
  reason: string | null;
  notes: string | null;
  reviewed_at: string | null;
}

export interface InfoRequest {
  id: string;
  application_school_id: string;
  fields: string[];
  documents: string[];
  message: string;
  status: 'pending' | 'responded' | 'expired';
  created_at: string;
  responded_at: string | null;
}

export interface Application {
  id: string;
  parent_id: string;
  school_id: string;
  school_name?: string;
  form_data: ApplicationFormData;
  status: ApplicationStatus;
  method: 'form' | 'chatbot';
  documents: ApplicationDocument[];
  schools: ApplicationSchoolStatus[];
  info_requests: InfoRequest[];
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
}

export interface CreateApplicationPayload {
  school_id: string;
  form_data: ApplicationFormData;
}

export interface RespondInfoPayload {
  info_request_id: string;
  field_responses: Record<string, string>;
  message?: string;
}

export interface ApprovePayload {
  notes?: string;
}

export interface RejectPayload {
  reason: string;
}

export interface RequestInfoPayload {
  fields_requested: string[];
  documents_requested: string[];
  message: string;
}

export interface EmbedResolveResponse {
  school_id: string;
  school_name: string;
}

export interface ApiError {
  detail: string | { msg: string; loc: string[] }[];
}

export const SCHOOL_BOARDS: SchoolBoard[] = [
  'CBSE',
  'ICSE',
  'Matriculation',
  'State Board',
  'International',
  'Other',
];

export const ID_PROOF_TYPES: { value: IdProofType; label: string }[] = [
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'passport', label: 'Passport' },
  { value: 'dl', label: 'Driving Licence' },
  { value: 'voter_id', label: 'Voter ID' },
];

export const GRADES = [
  'Nursery',
  'LKG',
  'UKG',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const DOCUMENT_TYPES = [
  { value: 'birth_cert', label: 'Birth Certificate', required: true },
  { value: 'photo', label: 'Recent Photograph', required: true },
  { value: 'transcript', label: 'Previous Transcripts', required: false },
  { value: 'other', label: 'Additional Documents', required: false },
] as const;
