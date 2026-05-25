const validateMember = (data) => {

    const errors = [];

    if (!data.full_name || !String(data.full_name).trim()) {
        errors.push("Full name required");
    }

    if (!data.phone || !String(data.phone).trim()) {
        errors.push("Phone required");
    }

    if (!data.national_id || !String(data.national_id).trim()) {
        errors.push("National ID required");
    }

    return errors;

};

module.exports = validateMember;
