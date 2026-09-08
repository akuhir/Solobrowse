const jwt = require('jsonwebtoken');

// Verifies the JWT and attaches { id, matricNo, department, role } to req.user.
// Never trusts anything from the request body/query for identity — only the
// signed token issued at login.
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    }
}

// Must be used AFTER requireAuth. Restricts to a specific department + admin role.
function requireDepartmentAdmin(department) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        if (req.user.role !== 'admin' || req.user.department !== department) {
            return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
        }
        next();
    };
}

module.exports = { requireAuth, requireDepartmentAdmin };
