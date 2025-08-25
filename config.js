
/**
 * Global Config (Frontend)
 * Replace placeholders before deploying.
 */
window.APP_CONFIG = {
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbyHjj0Xj0DnVUFKBwK8HipIsTs7Ol5BT8cYtwJ_X7g8Ffrq3bOdfzrwvL6flSg-41yw6g/exec',
  RECAPTCHA_SITE_KEY: '6LervKorAAAAAGfASzwwujTy77Wa19sNrYepTkdK',
  OAUTH_CLIENT_ID: '696796297498-6nm6iqn4nae01nvsk2eke5e7p9lb53se.apps.googleusercontent.com',
  TIMEZONE: 'Asia/Bangkok',

  FILE_PREFIX: 'Monthly Report Summary - ',
  // SECURITY: Keep SERVER-ONLY secrets (RECAPTCHA_SECRET, ADMIN_EMAILS, TEMPLATE_FILE_ID, MONTHLY_FOLDER_ID)
  // in Apps Script Script Properties — not here.

  QUESTIONS: {
    executiveSummary: {
      keyHighlights: 'Key Highlights (Reporting Period)',
      upcomingFocus: 'Upcoming Focus',
      projectSpecificHighlights: 'Project-Specific Highlights',
      callToAction: 'Call to Action'
    },
    concerns: {
      concerns: 'Concerns',
      risks: 'Risks',
      issues: 'Issues'
    },
    supportNeeded: {
      legend: "Support needed to achieve next month's goals",
      options: {
        additionalResources: 'Additional Resources',
        training: 'Training',
        managerialSupport: 'Managerial Support',
        collaboration: 'Inter-departmental Collaboration',
        other: 'Other (Please specify in comments)'
      }
    }
  }
};
