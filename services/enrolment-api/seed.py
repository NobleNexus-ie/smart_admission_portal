"""
Seed script — loads sample schools, staff, parents, and applications.

Usage:
    cd services/enrolment-api
    python seed.py

Requires the database to be running (docker-compose up db).
"""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.database import Base
from app.models.parent import Parent
from app.models.parent_profile import ParentProfile
from app.models.school import School
from app.models.school_staff import SchoolStaff
from app.models.application import Application
from app.models.application_school import ApplicationSchool
from app.utils.tokens import hash_password

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

STAFF_PASSWORD = hash_password("Staff@123")
PARENT_PASSWORD = hash_password("Parent@123")


SCHOOLS = [
    {
        "name": "Delhi Public School, Noida",
        "board": "CBSE",
        "address": "Sector 30, Noida",
        "area": "Noida",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "contact_email": "admissions@dpsnoida.edu",
        "phone": "0120-2450000",
        "description": "One of the leading CBSE schools in NCR with state-of-the-art facilities.",
        "status": "active",
        "facilities": ["Library", "Science Lab", "Sports Ground", "Swimming Pool", "Computer Lab"],
        "fee_range": "₹80,000 – ₹1,20,000/year",
        "grades_offered": ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
        "required_documents": ["transfer_certificate", "previous_marksheet"],
    },
    {
        "name": "Ryan International School, Chennai",
        "board": "ICSE",
        "address": "OMR Road, Sholinganallur",
        "area": "Sholinganallur",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "contact_email": "admissions@ryanchennai.edu",
        "phone": "044-2450000",
        "description": "A premier ICSE institution fostering holistic education.",
        "status": "active",
        "facilities": ["Library", "Science Lab", "Sports Ground", "Auditorium", "Music Room"],
        "fee_range": "₹60,000 – ₹90,000/year",
        "grades_offered": ["LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
        "required_documents": ["transfer_certificate"],
    },
    {
        "name": "Kendriya Vidyalaya, Bangalore",
        "board": "CBSE",
        "address": "MEG Centre, Ulsoor",
        "area": "Ulsoor",
        "city": "Bangalore",
        "state": "Karnataka",
        "contact_email": "kv.bangalore@kvs.gov.in",
        "phone": "080-2556000",
        "description": "Government-run CBSE school with excellent academic record.",
        "status": "active",
        "facilities": ["Library", "Science Lab", "Sports Ground", "Computer Lab"],
        "fee_range": "₹5,000 – ₹10,000/year",
        "grades_offered": ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
        "required_documents": ["transfer_certificate", "previous_marksheet", "migration_certificate"],
    },
    {
        "name": "Presidency School, Bangalore",
        "board": "State Board",
        "address": "Kempapura, Hebbal",
        "area": "Hebbal",
        "city": "Bangalore",
        "state": "Karnataka",
        "contact_email": "info@presidencyschool.com",
        "phone": "080-2333000",
        "description": "Well-known State Board school in North Bangalore.",
        "status": "active",
        "facilities": ["Library", "Science Lab", "Sports Ground"],
        "fee_range": "₹40,000 – ₹65,000/year",
        "grades_offered": ["LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
    },
    {
        "name": "St. Mary's School, Pune",
        "board": "ICSE",
        "address": "Camp Area, Pune",
        "area": "Camp",
        "city": "Pune",
        "state": "Maharashtra",
        "contact_email": "admissions@stmaryspune.edu",
        "phone": "020-2612000",
        "description": "Heritage ICSE school with strong values and academic excellence.",
        "status": "inactive",
        "facilities": ["Library", "Chapel", "Science Lab", "Sports Ground"],
        "fee_range": "₹50,000 – ₹75,000/year",
        "grades_offered": ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT count(*) FROM schools"))
        count = result.scalar()
        if count and count > 0:
            print(f"Database already has {count} schools. Skipping seed.")
            return

        school_ids = []

        # Create schools
        for s in SCHOOLS:
            school = School(id=uuid.uuid4(), **s)
            session.add(school)
            school_ids.append(school.id)
            print(f"  + School: {s['name']} ({s['board']})")

        # Create staff for each active school
        for i, sid in enumerate(school_ids):
            s = SCHOOLS[i]
            if s["status"] != "active":
                continue
            staff = SchoolStaff(
                id=uuid.uuid4(),
                school_id=sid,
                email=f"admin@{s['name'].lower().replace(' ', '').replace(',', '')[:12]}.edu",
                password_hash=STAFF_PASSWORD,
                name=f"Admin - {s['name'].split(',')[0]}",
                role="school_admin",
                permissions=["view", "review", "approve", "reject", "request_info", "manage_staff"],
            )
            session.add(staff)
            print(f"  + Staff: {staff.email} (password: Staff@123)")

            reviewer = SchoolStaff(
                id=uuid.uuid4(),
                school_id=sid,
                email=f"reviewer@{s['name'].lower().replace(' ', '').replace(',', '')[:12]}.edu",
                password_hash=STAFF_PASSWORD,
                name=f"Reviewer - {s['name'].split(',')[0]}",
                role="reviewer",
                permissions=["view", "review", "approve", "reject", "request_info"],
            )
            session.add(reviewer)
            print(f"  + Staff: {reviewer.email} (password: Staff@123)")

        # Create test parents
        parents_data = [
            ("parent1@test.com", "Rajesh Kumar", "9876543210", "Noida", "Uttar Pradesh"),
            ("parent2@test.com", "Priya Sharma", "9876543211", "Chennai", "Tamil Nadu"),
            ("parent3@test.com", "Amit Singh", "9876543212", "Bangalore", "Karnataka"),
        ]

        parent_ids = []
        for email, name, phone, city, state in parents_data:
            parent = Parent(
                id=uuid.uuid4(),
                email=email,
                password_hash=PARENT_PASSWORD,
                is_verified=True,
            )
            session.add(parent)
            parent_ids.append(parent.id)

            profile = ParentProfile(
                id=uuid.uuid4(),
                parent_id=parent.id,
                full_name=name,
                phone=phone,
                city=city,
                state=state,
                address=f"123, Sector 15, {city}",
                profile_complete=True,
            )
            session.add(profile)
            print(f"  + Parent: {email} (password: Parent@123) — {name}")

        # Create sample applications
        app_data = [
            (parent_ids[0], school_ids[0], "Arun Kumar", "2018-03-15", "Male", "Grade 1", "pending"),
            (parent_ids[0], school_ids[1], "Arun Kumar", "2018-03-15", "Male", "Grade 1", "approved"),
            (parent_ids[1], school_ids[0], "Meera Sharma", "2019-06-20", "Female", "LKG", "pending"),
            (parent_ids[1], school_ids[2], "Meera Sharma", "2019-06-20", "Female", "LKG", "rejected"),
            (parent_ids[2], school_ids[0], "Vikram Singh", "2017-11-10", "Male", "Grade 2", "info_requested"),
            (parent_ids[2], school_ids[3], "Vikram Singh", "2017-11-10", "Male", "Grade 2", "pending"),
        ]

        for pid, sid, student, dob, gender, grade, status in app_data:
            app_id = uuid.uuid4()
            application = Application(
                id=app_id,
                parent_id=pid,
                form_data={
                    "student_full_name": student,
                    "date_of_birth": dob,
                    "gender": gender,
                    "grade_applying_for": grade,
                    "nationality": "Indian",
                    "emergency_contact_name": "Self",
                    "emergency_contact_phone": "9876543210",
                },
                status=status if status != "pending" else "pending",
                method="form",
                submitted_at=datetime.now(timezone.utc),
            )
            session.add(application)

            app_school = ApplicationSchool(
                id=uuid.uuid4(),
                application_id=app_id,
                school_id=sid,
                status=status,
            )
            session.add(app_school)
            print(f"  + Application: {student} → {SCHOOLS[[s_id for s_id in school_ids].index(sid)]['name']} ({status})")

        await session.commit()
        print("\nSeed complete!")
        print(f"  {len(SCHOOLS)} schools")
        print(f"  {len(parents_data)} parents")
        print(f"  {len(app_data)} applications")
        print("\nTest credentials:")
        print("  Parents: parent1@test.com / parent2@test.com / parent3@test.com  (password: Parent@123)")
        print("  Staff: admin@delhipublic.edu / reviewer@delhipublic.edu  (password: Staff@123)")


if __name__ == "__main__":
    asyncio.run(seed())
