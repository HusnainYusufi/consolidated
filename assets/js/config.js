/* Site configuration. Edit these values; no other code changes are needed. */
window.SITE_CONFIG = {
  domain: 'https://www.caudit.net',

  // WhatsApp number that receives button clicks and the form's "Send via WhatsApp" (international format, digits only).
  whatsapp: '962796650500',

  // Inquiry form email delivery. The site is static, so a form relay service delivers submissions by email.
  // Recommended: Web3Forms (free). Create an access key at https://web3forms.com using the inbox that should
  // receive inquiries (for example emulazem@caudit.net), paste it below, and submissions arrive as emails.
  // Leave the key empty to fall back to opening the visitor's email client with the message pre-filled.
  formEndpoint: 'https://api.web3forms.com/submit',
  formAccessKey: '',

  // Inbox used for the email fallback and the "Send Us An Email" buttons.
  inquiryEmail: 'emulazem@caudit.net',

  // Careers page. Applications (with the CV attached) are delivered the same way as inquiries.
  // Leave careersAccessKey empty to reuse formAccessKey. CV attachments require a relay plan that allows file uploads.
  careersEmail: 'emulazem@caudit.net',
  careersAccessKey: '',
  careersMaxFileMb: 5
};
