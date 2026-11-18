# Application-First (Agentic) Flow — Sequence Diagram

**Companion to:** [../ARCHITECTURE_AND_FLOWS.md](../ARCHITECTURE_AND_FLOWS.md) §3, [../Phase2/PHASE2_ENHANCEMENTS.md](../Phase2/PHASE2_ENHANCEMENTS.md) §2
**Status:** Draft — planned for Phase 2 (P2.1–P2.2)
**Sub-slice:** P2.1, P2.2

## Business summary

Instead of navigating a form, the parent has a guided conversation with an AI chatbot. The chatbot collects all application data through natural dialogue, produces a structured summary for review, and then presents eligible schools for multi-school selection. The parent can switch to the manual form at any point (pre-populated with data collected so far).

## Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Parent
    participant UI as Chat UI
    participant API as Chatbot Router
    participant CBS as chatbot_service
    participant LLM as LiteLLM (GPT-4o)
    participant DB as PostgreSQL
    participant AppSvc as application_service
    participant Notif as notification_service

    rect rgb(245,248,250)
    Note over Parent,Notif: A. Start conversation
    Parent->>UI: Clicks "Start with Assistant"
    UI->>API: POST /chatbot/start
    API->>CBS: start_conversation(parent_id)
    CBS->>DB: INSERT chatbot_sessions<br/>(parent_id, status=active, current_topic=welcome)
    CBS->>LLM: System prompt + welcome instruction
    LLM-->>CBS: "Hi! I'll help you apply. Let's start with your child's details."
    CBS->>DB: UPDATE session.conversation_history
    API-->>UI: {session_id, message, current_topic: "welcome"}
    UI-->>Parent: Display welcome message
    end

    rect rgb(245,250,245)
    Note over Parent,Notif: B. Iterative conversation (student details)
    Parent->>UI: "My son Arun is 8 years old, born on March 15, 2018"
    UI->>API: POST /chatbot/respond<br/>{session_id, message}
    API->>CBS: process_response(session_id, message)
    CBS->>DB: Load session state
    CBS->>CBS: Append user message to history
    CBS->>LLM: System prompt + history + extraction instruction
    Note right of LLM: LLM extracts:<br/>student_full_name: "Arun"<br/>date_of_birth: "2018-03-15"<br/>gender: "Male" (inferred)<br/>Asks for confirmation + grade
    LLM-->>CBS: {extracted_fields, response_text, confidence}
    CBS->>CBS: Validate extracted fields
    CBS->>DB: UPDATE session.application_data, conversation_history
    alt confidence < 0.8
        CBS->>CBS: Ask clarifying question
    else all fields for current topic collected
        CBS->>CBS: Advance to next topic
    end
    API-->>UI: {message, current_topic, fields_collected, completeness: 35%}
    UI-->>Parent: Display response + progress bar
    end

    rect rgb(250,248,245)
    Note over Parent,Notif: C. Continue through all topics
    Note over Parent,LLM: ... academic_history topic ...
    Note over Parent,LLM: ... additional_info topic ...
    Note over Parent,LLM: ... documents topic (with file upload prompts) ...
    end

    rect rgb(248,245,250)
    Note over Parent,Notif: D. Review summary
    Parent->>UI: Conversation complete
    UI->>API: GET /chatbot/summary?session_id=...
    API->>CBS: generate_summary(session_id)
    CBS->>DB: Load session.application_data
    CBS->>LLM: Generate human-readable summary
    CBS->>CBS: map_to_application() → validate against app schema
    API-->>UI: {summary, application_data, completeness: 100%, validation_ok}
    UI-->>Parent: Display structured summary with [Edit] per section

    alt Parent edits a section
        Parent->>UI: Clicks [Edit] on "Student Details"
        UI-->>Parent: Inline edit form (pre-populated)
        Parent->>API: POST /chatbot/respond<br/>{session_id, edit: {student_full_name: "Arun Kumar"}}
        API->>CBS: apply_edit(session_id, field, value)
        CBS->>DB: UPDATE session.application_data
        API-->>UI: Updated summary
    end

    Parent->>UI: Clicks [Confirm and Choose Schools]
    end

    rect rgb(245,248,250)
    Note over Parent,Notif: E. Multi-school selection
    UI->>API: GET /schools/eligible?grade=3
    API->>DB: SELECT schools WHERE status IN ('active', 'inactive')<br/>AND grades_offered @> '["Grade 3"]'
    API-->>UI: {schools: [{id, name, status, board, area, ...}]}
    Note right of UI: Active schools: selectable<br/>Inactive schools: greyed out<br/>Already applied: "Already Applied" badge
    UI-->>Parent: School list with checkboxes

    Parent->>UI: Selects [DPS, Ryan International, KV]
    Parent->>UI: Clicks [Submit Application]
    UI->>API: POST /applications/submit-multi<br/>{session_id, school_ids: [s1, s2, s3]}
    API->>CBS: map_to_application(session_id)
    CBS->>AppSvc: create_application(parent_id, form_data)
    AppSvc->>DB: BEGIN
    AppSvc->>DB: INSERT applications (method='agentic', status='submitted')
    loop For each school_id
        AppSvc->>DB: INSERT application_schools (status=pending)
        AppSvc->>Notif: Queue app_received email → school
    end
    AppSvc->>DB: COMMIT
    API-->>UI: 200 {application_id, submitted_to: [s1, s2, s3]}
    UI-->>Parent: "Application submitted to 3 schools!"
    end
```

## Fallback: switch to manual form

```mermaid
sequenceDiagram
    autonumber
    actor Parent
    participant UI as Chat UI
    participant API as Chatbot Router
    participant CBS as chatbot_service

    Parent->>UI: "I'd rather fill the form myself"
    Note right of UI: Or clicks [Switch to Form] button
    UI->>API: POST /chatbot/switch-to-form {session_id}
    API->>CBS: export_to_form(session_id)
    CBS->>CBS: Map collected fields to application form schema
    API-->>UI: {form_data: {student_name: "Arun", dob: "2018-03-15", ...}}
    UI-->>Parent: Redirect to ApplicationFormPage<br/>(pre-populated with chatbot data)
```

## Conversation state transitions

```mermaid
stateDiagram-v2
    [*] --> welcome: POST /chatbot/start
    welcome --> student_details: greeting delivered
    student_details --> academic_history: name + DOB + gender collected
    academic_history --> additional_info: grade + school collected
    additional_info --> documents: contacts collected
    documents --> review: docs uploaded
    review --> school_selection: parent confirms summary
    review --> student_details: parent edits section
    school_selection --> submitted: schools selected + confirmed
    submitted --> [*]

    welcome --> manual_form: switch to form
    student_details --> manual_form: switch to form
    academic_history --> manual_form: switch to form
    additional_info --> manual_form: switch to form
    documents --> manual_form: switch to form
    manual_form --> [*]
```

## Error handling

| Condition | Behavior |
|-----------|----------|
| LLM timeout (> 10s) | Retry once; if still fails, show "I'm having trouble. Try again or switch to the form." |
| LLM extraction confidence < 0.5 | Ask specific clarifying question (not open-ended) |
| LLM produces invalid data (e.g., future DOB) | Validate + ask parent to correct |
| 3 consecutive extraction failures for same field | Auto-switch to inline form field for that item |
| Session idle > 30 min | Save state; parent can resume later |
| Browser closed mid-conversation | Session persisted in DB; resume on next visit |
