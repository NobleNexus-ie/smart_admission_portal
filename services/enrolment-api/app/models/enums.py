import enum


class Board(str, enum.Enum):
    CBSE = "CBSE"
    ICSE = "ICSE"
    MATRICULATION = "Matriculation"
    STATE_BOARD = "State Board"
    INTERNATIONAL = "International"
    OTHER = "Other"


class SchoolType(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class SchoolStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class StaffRole(str, enum.Enum):
    SCHOOL_ADMIN = "school_admin"
    REVIEWER = "reviewer"
    VIEWER = "viewer"


class IdProofType(str, enum.Enum):
    AADHAAR = "aadhaar"
    PASSPORT = "passport"
    DL = "dl"
    VOTER_ID = "voter_id"


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    COMPLETED = "completed"


class ApplicationMethod(str, enum.Enum):
    SCHOOL_FIRST = "school_first"
    AGENTIC = "agentic"


class ApplicationSchoolStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    INFO_REQUESTED = "info_requested"


class DocumentCategory(str, enum.Enum):
    BIRTH_CERT = "birth_cert"
    PHOTO = "photo"
    TRANSCRIPT = "transcript"
    MEDICAL = "medical"
    ID_PROOF = "id_proof"
    OTHER = "other"


class ReviewActionType(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUEST_INFO = "request_info"


class InfoRequestStatus(str, enum.Enum):
    PENDING = "pending"
    RESPONDED = "responded"
    EXPIRED = "expired"


class NotificationStatus(str, enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    RETRY_1 = "retry_1"
    RETRY_2 = "retry_2"
    RETRY_3 = "retry_3"
    FAILED = "failed"


ROLE_PERMISSIONS: dict[str, list[str]] = {
    StaffRole.SCHOOL_ADMIN.value: [
        "applications:read",
        "applications:act",
        "school:manage",
        "staff:manage",
    ],
    StaffRole.REVIEWER.value: [
        "applications:read",
        "applications:act",
    ],
    StaffRole.VIEWER.value: [
        "applications:read",
    ],
}
