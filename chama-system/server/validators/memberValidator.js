const validateMember = (data) => {
  const errors = [];

  const fullName = data?.full_name?.trim();
  const phone = data?.phone?.trim();
  const nationalId = data?.national_id?.trim();

  if (!fullName) {
    errors.push('Full name is required');
  }

  if (!phone) {
    errors.push('Phone number is required');
  }

  if (!nationalId) {
    errors.push('National ID is required');
  }

  // Optional: basic phone validation (Kenya-friendly format example)
  if (phone && !/^[0-9+]{9,15}$/.test(phone)) {
    errors.push('Phone number format is invalid');
  }

  // Optional: national ID sanity check
  if (nationalId && nationalId.length < 6) {
    errors.push('National ID seems too short');
  }

  return errors;
};

module.exports = validateMember;
