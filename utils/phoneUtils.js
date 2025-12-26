/**
 * Normalize Iraqi phone number
 * @param {string} phone - Phone number
 * @returns {string} Normalized phone number with +964 prefix
 */
function normalizeIraqiPhone(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove + if exists
  let digits = cleaned.replace('+', '');
  
  // If starts with 964, remove it
  if (digits.startsWith('964')) {
    digits = digits.substring(3);
  }
  
  // If starts with 0, remove it
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  
  // Ensure we have 10 digits (7xxxxxxxxx)
  if (digits.length === 10 && digits.startsWith('7')) {
    return '+964' + digits;
  }
  
  // If already has +964, return as is
  if (cleaned.startsWith('+964')) {
    return cleaned;
  }
  
  // Default: add +964 prefix
  return '+964' + digits;
}

module.exports = { normalizeIraqiPhone };





