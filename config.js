// ===== ของคุณ =====
window.APP_CONFIG = {
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxVBFA2A9GP15AIn1g3YA4K24uy36UJF91GPGWy8jEfWD8zlI0oGEEjGmK01FG3E_N30Q/exec',
  RECAPTCHA_SITE_KEY: '6LervKorAAAAAGfASzwwujTy77Wa19sNrYepTkdK',
  OAUTH_CLIENT_ID: '696796297498-6nm6iqn4nae01nvsk2eke5e7p9lb53se.apps.googleusercontent.com',
  TIMEZONE: 'Asia/Bangkok',
  FILE_PREFIX: 'Monthly Report Summary - ',
  QUESTIONS: {
    executiveSummary: {
      keyHighlights: 'Key Highlights (Reporting Period)',
      upcomingFocus: 'Upcoming Focus',
      projectSpecificHighlights: 'Project-Specific Highlights',
      callToAction: 'Call to Action'
    },
    concerns: { concerns: 'Concerns', risks: 'Risks', issues: 'Issues' },
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

// // ===== bridge ให้โค้ดเดิมที่อ้าง window.CONFIG ทำงานร่วมกัน =====
// window.CONFIG = {
//   API_URL: window.APP_CONFIG.API_ENDPOINT,
//   OAUTH_CLIENT_ID: window.APP_CONFIG.OAUTH_CLIENT_ID,
//   RECAPTCHA_SITE_KEY: window.APP_CONFIG.RECAPTCHA_SITE_KEY,
//   DISABLE_SIGNIN: false // ต้อง false เพื่อ "เปิด" Google Sign-In
// };