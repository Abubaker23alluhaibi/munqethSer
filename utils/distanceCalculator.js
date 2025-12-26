/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  // التحقق من وجود القيم وعدم كونها null أو undefined
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }

  // التحقق من أن القيم أرقام صحيحة
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);

  // التحقق من أن القيم ليست NaN وأنها ضمن النطاق الصحيح
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) {
    return null;
  }

  // التحقق من نطاق الإحداثيات
  if (numLat1 < -90 || numLat1 > 90 || numLat2 < -90 || numLat2 > 90) {
    return null;
  }
  if (numLon1 < -180 || numLon1 > 180 || numLon2 < -180 || numLon2 > 180) {
    return null;
  }

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(numLat2 - numLat1);
  const dLon = toRad(numLon2 - numLon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(numLat1)) *
      Math.cos(toRad(numLat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // التحقق من أن النتيجة ليست NaN
  if (isNaN(distance) || !isFinite(distance)) {
    return null;
  }
  
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = { calculateDistance };







