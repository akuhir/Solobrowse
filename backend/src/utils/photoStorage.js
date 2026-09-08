// Persistent photo storage.
//
// Preferred: Cloudinary (free tier, works cleanly on Render, no persistent
// disk required). If CLOUDINARY_* env vars are not set, falls back to local
// disk under /uploads — fine for local development, but note that Render's
// filesystem is ephemeral on redeploy unless you attach a paid persistent
// disk. For real production use, configure Cloudinary.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const useCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let cloudinary = null;
if (useCloudinary) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Stores a photo buffer and returns a persistent public URL.
 * @param {Buffer} buffer
 * @param {string} department - used as a folder/prefix for organization
 * @returns {Promise<string>} public URL
 */
async function storePhoto(buffer, department) {
    if (useCloudinary) {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: `akum-portal/${department}/person-of-week`, resource_type: 'image' },
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result.secure_url);
                }
            );
            stream.end(buffer);
        });
    }

    // Local disk fallback (dev only)
    const filename = `${department}-person-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    return `${baseUrl}/uploads/${filename}`;
}

/**
 * Deletes a previously stored photo given its public URL.
 * Safe to call even if the URL doesn't match anything (no-op).
 */
async function deletePhoto(url) {
    if (!url) return;

    if (useCloudinary && url.includes('res.cloudinary.com')) {
        // Extract the public_id from the URL to delete from Cloudinary.
        const match = url.match(/\/akum-portal\/([^.]+)\.[a-zA-Z]+$/);
        if (match) {
            const publicId = `akum-portal/${match[1]}`;
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.warn('Cloudinary delete warning:', err.message);
            }
        }
        return;
    }

    // Local disk fallback
    const filename = url.split('/uploads/')[1];
    if (filename) {
        const filepath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
}

module.exports = { storePhoto, deletePhoto, UPLOAD_DIR, useCloudinary };
