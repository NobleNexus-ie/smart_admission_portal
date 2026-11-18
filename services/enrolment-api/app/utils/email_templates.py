from app.config import get_settings

settings = get_settings()


TEMPLATES: dict[str, dict[str, str]] = {
    "verify_email": {
        "subject": "Verify your VedaAcademy Enrolment account",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Welcome to VedaAcademy Enrolment</h2>
        <p>Please verify your email address by clicking the button below.</p>
        <p><a href="{verify_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Verify Email</a></p>
        <p>Or copy this link: {verify_url}</p>
        <p>This link expires in 24 hours.</p>
        </body></html>
        """,
        "text": "Welcome to VedaAcademy Enrolment.\nVerify your email: {verify_url}\nLink expires in 24 hours.",
    },
    "app_received": {
        "subject": "New application received — {student_name}",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>New Application Received</h2>
        <p>A new application has been submitted for <strong>{student_name}</strong>
           (Grade: {grade}).</p>
        <p><a href="{review_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Review Application</a></p>
        </body></html>
        """,
        "text": "New application for {student_name} (Grade: {grade}).\nReview: {review_url}",
    },
    "app_approved": {
        "subject": "Congratulations! Application approved by {school_name}",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Congratulations!</h2>
        <p>Your application for <strong>{student_name}</strong> has been
           <strong style="color:green;">approved</strong> by {school_name}.</p>
        <p><a href="{app_url}">View Application</a></p>
        </body></html>
        """,
        "text": "Congratulations! Your application for {student_name} was approved by {school_name}.\n{app_url}",
    },
    "app_rejected": {
        "subject": "Application update from {school_name}",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Application Update</h2>
        <p>Your application for <strong>{student_name}</strong> to {school_name}
           was not successful.</p>
        <p><strong>Reason:</strong> {reason}</p>
        <p><a href="{app_url}">View Application</a></p>
        </body></html>
        """,
        "text": "Your application for {student_name} to {school_name} was not successful.\nReason: {reason}\n{app_url}",
    },
    "info_requested": {
        "subject": "Additional information needed — {school_name}",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Additional Information Requested</h2>
        <p>{school_name} has requested additional information for your application
           for <strong>{student_name}</strong>.</p>
        <p><strong>Message:</strong> {message}</p>
        <p><strong>Fields:</strong> {fields}</p>
        <p><strong>Documents:</strong> {documents}</p>
        <p><a href="{respond_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Update Application</a></p>
        </body></html>
        """,
        "text": "{school_name} needs more info for {student_name}.\nMessage: {message}\nFields: {fields}\nDocuments: {documents}\nRespond: {respond_url}",
    },
    "info_provided": {
        "subject": "Parent responded to info request — {student_name}",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Information Provided</h2>
        <p>The parent has responded to your information request for
           <strong>{student_name}</strong>.</p>
        <p><a href="{review_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Review Updates</a></p>
        </body></html>
        """,
        "text": "Parent responded for {student_name}.\nReview: {review_url}",
    },
    "password_reset": {
        "subject": "Reset your VedaAcademy password",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <p><a href="{reset_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Reset Password</a></p>
        <p>Or copy this link: {reset_url}</p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </body></html>
        """,
        "text": "Reset your password: {reset_url}\nThis link expires in 1 hour.",
    },
    "app_reminder": {
        "subject": "Reminder: Complete your application for {student_name}",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Application Reminder</h2>
        <p>Your application for <strong>{student_name}</strong> is still in draft.
           Complete and submit it to avoid missing any deadlines.</p>
        <p><a href="{app_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Continue Application</a></p>
        </body></html>
        """,
        "text": "Your application for {student_name} is still in draft.\nContinue: {app_url}",
    },
    "info_deadline_reminder": {
        "subject": "Deadline approaching: Info requested for {student_name}",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Deadline Approaching</h2>
        <p>{school_name} requested additional information for <strong>{student_name}</strong>.
           The deadline is <strong>{deadline}</strong>.</p>
        <p><a href="{respond_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Respond Now</a></p>
        </body></html>
        """,
        "text": "Deadline approaching for {student_name} at {school_name}.\nDeadline: {deadline}\nRespond: {respond_url}",
    },
    "multi_school_summary": {
        "subject": "Application submitted to {school_count} schools",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Applications Submitted</h2>
        <p>Your application for <strong>{student_name}</strong> has been submitted to
           {school_count} school(s): {school_names}.</p>
        <p><a href="{dashboard_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">View Dashboard</a></p>
        </body></html>
        """,
        "text": "Application for {student_name} submitted to {school_count} schools: {school_names}\n{dashboard_url}",
    },
    "weekly_digest": {
        "subject": "Your weekly enrolment update",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Weekly Enrolment Digest</h2>
        <p>Here's a summary of your applications this week:</p>
        <p>{summary}</p>
        <p><a href="{dashboard_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">View Dashboard</a></p>
        </body></html>
        """,
        "text": "Weekly digest:\n{summary}\n{dashboard_url}",
    },
    "staff_setup": {
        "subject": "Set up your VedaAcademy staff account",
        "html": """
        <html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Welcome to VedaAcademy Enrolment</h2>
        <p>You have been invited as staff for <strong>{school_name}</strong>.</p>
        <p><a href="{setup_url}" style="background:#1a73e8;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block;">Set Password</a></p>
        <p>This link expires in 24 hours.</p>
        </body></html>
        """,
        "text": "Set up your staff account for {school_name}: {setup_url}",
    },
}


def render_template(template_name: str, variables: dict) -> tuple[str, str, str]:
    tmpl = TEMPLATES.get(template_name)
    if not tmpl:
        raise ValueError(f"Unknown email template: {template_name}")
    subject = tmpl["subject"].format(**variables)
    html = tmpl["html"].format(**variables)
    text = tmpl["text"].format(**variables)
    return subject, html, text
