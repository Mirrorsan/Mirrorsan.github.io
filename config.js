
/**
 * Global Config (Frontend)
 * Replace placeholders before deploying.
 */
window.APP_CONFIG = {
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbwoSlBRLcVBzYcXiz85zZirgBytLpaq9qe9UP5BQXbvReH-6O4QniwSuwNSd2xGF6Nz6A/exec',
  RECAPTCHA_SITE_KEY: '6LervKorAAAAAGfASzwwujTy77Wa19sNrYepTkdK',
  OAUTH_CLIENT_ID: '696796297498-6nm6iqn4nae01nvsk2eke5e7p9lb53se.apps.googleusercontent.com',
  TIMEZONE: 'Asia/Bangkok',
  DISABLE_SIGNIN: false,
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



  // // ใส่ค่าจริงของโปรเจกต์คุณ
  // window.CONFIG = {
  //   API_URL: 'https://script.google.com/macros/s/AKfycbwoSlBRLcVBzYcXiz85zZirgBytLpaq9qe9UP5BQXbvReH-6O4QniwSuwNSd2xGF6Nz6A/exec', // Web App URL จาก Apps Script
  //   OAUTH_CLIENT_ID: '696796297498-6nm6iqn4nae01nvsk2eke5e7p9lb53se.apps.googleusercontent.com',  // จาก Google Cloud Console
  //   RECAPTCHA_SITE_KEY: '6LervKorAAAAAGfASzwwujTy77Wa19sNrYepTkdK',
  //   DISABLE_SIGNIN: false  // เปิดใช้ Google Sign-In
  // };
