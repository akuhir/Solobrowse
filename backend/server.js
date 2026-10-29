
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;
const STUDENTS_FILE =
  process.env.STUDENTS_FILE || '/etc/secrets/students.json';

// Render's temporary storage: no paid disk required.
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.RENDER
    ? '/tmp/akuhir-data'
    : path.join(__dirname, 'data'));

const CONTENT_FILE = path.join(DATA_DIR, 'spotlights.json');

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must contain at least 32 characters.');
  process.exit(1);
}

const cloudinaryConfigured =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

fs.mkdirSync(DATA_DIR, { recursive: true });

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'https://akuhir.github.io'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '1mb' }));

function loadStudents() {
  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
  } catch (error) {
    throw new Error(
      `Cannot read STUDENTS_FILE at ${STUDENTS_FILE}: ${error.message}`
    );
  }

  const list = Array.isArray(parsed) ? parsed : parsed.students;

  if (!Array.isArray(list) || !list.length) {
    throw new Error(
      'students.json must contain a non-empty students array.'
    );
  }

  return list.map(student => ({
    matric: String(
      student.matric || student.matricNo || ''
    ).trim().toUpperCase(),
    name: String(student.name || '').trim(),
    department: String(student.department || 'hir')
      .trim()
      .toLowerCase(),
    role: student.role === 'admin' ? 'admin' : 'student',
    isActive:
      student.isActive !== false && student.active !== false
  })).filter(student => student.matric && student.name);
}

function readContent() {
  try {
    return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { person: null, quote: null };
    }
    throw error;
  }
}

function writeContent(data) {
  const tempFile =
    `${CONTENT_FILE}.${process.pid}.${Date.now()}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(data, null, 2),
    { encoding: 'utf8', mode: 0o600 }
  );

  fs.renameSync(tempFile, CONTENT_FILE);
}

function bearer(req, res, next) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Please log in again.'
    });
  }

  try {
    req.user = jwt.verify(
      authorization.slice(7),
      JWT_SECRET
    );
    return next();
  } catch (_) {
    return res.status(401).json({
      success: false,
      message: 'Your session is invalid or expired. Please log in again.'
    });
  }
}

function adminOnly(req, res, next) {
  if (
    req.user.role !== 'admin' ||
    req.user.department !== 'hir'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Administrator permission required.'
    });
  }

  return next();
}

function publicPerson(person) {
  return person ? {
    name: person.name,
    description: person.description,
    photo_url: person.photo || '',
    updated_at: person.updatedAt
  } : null;
}

function publicQuote(quote) {
  return quote ? {
    quote_text: quote.quote,
    quote_author: quote.author,
    updated_at: quote.updatedAt
  } : null;
}

// Cloudinary URLs are remote; no local photo deletion is necessary here.
function safeDeletePhoto(_photoUrl) {
  // Existing Cloudinary images are retained when content is deleted.
}

app.get('/health', (_req, res) => {
  let roster = 'unavailable';

  try {
    roster = `${loadStudents().length} student records loaded`;
  } catch (_) {}

  res.json({
    status: 'ok',
    storage: 'json-file',
    photoStorage: cloudinaryConfigured ? 'cloudinary' : 'not-configured',
    database: 'none',
    roster
  });
});

// Login using matric number and part of a name.
const recentAttempts = new Map();

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const prior = recentAttempts.get(ip) || {
    count: 0,
    start: now
  };

  if (now - prior.start > 10 * 60 * 1000) {
    prior.count = 0;
    prior.start = now;
  }

  prior.count += 1;
  recentAttempts.set(ip, prior);

  if (prior.count > 30) {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please wait a few minutes.'
    });
  }

  try {
    const matric = String(
      req.body?.matric || req.body?.matricNo || ''
    ).trim().toUpperCase();

    const namePart = String(
      req.body?.namePart || req.body?.name || ''
    ).trim().toLowerCase();

    if (!matric || namePart.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Enter your matric number and at least 3 letters of your name.'
      });
    }

    const student = loadStudents().find(
      item => item.matric === matric
    );

    const match = student &&
      student.name.toLowerCase()
        .split(/\s+/)
        .some(part => part.startsWith(namePart));

    if (!student || !student.isActive || !match) {
      return res.status(401).json({
        success: false,
        message: 'Matric number or name does not match our records.'
      });
    }

    const expiresIn = req.body?.rememberMe ? '30d' : '1d';

    const token = jwt.sign({
      sub: student.matric,
      matric: student.matric,
      name: student.name,
      department: student.department,
      role: student.role
    }, JWT_SECRET, { expiresIn });

    recentAttempts.delete(ip);

    return res.json({
      success: true,
      token,
      user: {
        matric: student.matric,
        matricNo: student.matric,
        name: student.name,
        department: student.department,
        role: student.role
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Login service is not configured correctly. Please contact the administrator.'
    });
  }
});

app.get('/api/me', bearer, (req, res) => {
  res.json({
    success: true,
    user: {
      matric: req.user.matric,
      matricNo: req.user.matric,
      name: req.user.name,
      department: req.user.department,
      role: req.user.role
    }
  });
});

// Public Person of the Week.
app.get('/api/:department/person-of-week', (req, res) => {
  if (req.params.department !== 'hir') {
    return res.status(404).json({
      success: false,
      message: 'Department not found.'
    });
  }

  try {
    return res.json({
      success: true,
      data: publicPerson(readContent().person)
    });
  } catch (error) {
    console.error('Read person:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Could not read monthly content.'
    });
  }
});

// Public Quote of the Week.
app.get('/api/:department/quote-of-week', (req, res) => {
  if (req.params.department !== 'hir') {
    return res.status(404).json({
      success: false,
      message: 'Department not found.'
    });
  }

  try {
    return res.json({
      success: true,
      data: publicQuote(readContent().quote)
    });
  } catch (error) {
    console.error('Read quote:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Could not read monthly content.'
    });
  }
});

// Upload images into memory rather than Render's filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    const valid = allowedTypes.includes(file.mimetype);

    callback(
      valid
        ? null
        : new Error('Only JPEG, PNG, WEBP, or GIF images are allowed.'),
      valid
    );
  }
});

function uploadError(error, _req, res, next) {
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Photo upload failed.'
    });
  }
  next();
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'akuhir/person-of-week',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(buffer);
  });
}

// Save Person of the Week details.
app.put(
  '/api/admin/:department/person-of-week',
  bearer,
  adminOnly,
  (req, res) => {
    if (req.params.department !== 'hir') {
      return res.status(404).json({
        success: false,
        message: 'Department not found.'
      });
    }

    const name = String(req.body?.name || '').trim();
    const description = String(
      req.body?.description || ''
    ).trim();

    if (
      !name || name.length > 150 ||
      !description || description.length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a name (max 150 characters) and description (max 3000 characters).'
      });
    }

    try {
      const content = readContent();

      content.person = {
        ...(content.person || {}),
        name,
        description,
        photo: content.person?.photo || '',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.matric
      };

      writeContent(content);

      return res.json({
        success: true,
        data: publicPerson(content.person)
      });
    } catch (error) {
      console.error('Save person:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Could not save Person of the Month.'
      });
    }
  }
);

// Upload Person of the Week photo to Cloudinary.
app.post(
  '/api/admin/:department/person-of-week/photo',
  bearer,
  adminOnly,
  upload.single('photo'),
  uploadError,
  async (req, res) => {
    if (req.params.department !== 'hir') {
      return res.status(404).json({
        success: false,
        message: 'Department not found.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Choose an image first.'
      });
    }

    if (!cloudinaryConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Photo hosting is not configured on the server.'
      });
    }

    try {
      const content = readContent();

      if (!content.person) {
        return res.status(400).json({
          success: false,
          message: 'Save the person name and description before uploading the photo.'
        });
      }

      const result = await uploadToCloudinary(req.file.buffer);

      content.person.photo = result.secure_url;
      content.person.updatedAt = new Date().toISOString();
      content.person.updatedBy = req.user.matric;

      writeContent(content);

      return res.json({
        success: true,
        data: publicPerson(content.person)
      });
    } catch (error) {
      console.error('Cloudinary photo upload:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Could not upload or save the photo.'
      });
    }
  }
);

// Delete Person of the Week details.
app.delete(
  '/api/admin/:department/person-of-week',
  bearer,
  adminOnly,
  (req, res) => {
    if (req.params.department !== 'hir') {
      return res.status(404).json({
        success: false,
        message: 'Department not found.'
      });
    }

    try {
      const content = readContent();
      safeDeletePhoto(content.person?.photo);
      content.person = null;
      writeContent(content);

      return res.json({
        success: true,
        message: 'Person of the Month deleted.'
      });
    } catch (error) {
      console.error('Delete person:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Could not delete Person of the Month.'
      });
    }
  }
);

// Save Quote of the Week.
app.put(
  '/api/admin/:department/quote-of-week',
  bearer,
  adminOnly,
  (req, res) => {
    if (req.params.department !== 'hir') {
      return res.status(404).json({
        success: false,
        message: 'Department not found.'
      });
    }

    const quote = String(
      req.body?.quoteText ?? req.body?.quote ?? ''
    ).trim();

    const author = String(
      req.body?.quoteAuthor ?? req.body?.author ?? ''
    ).trim();

    if (
      !quote || quote.length > 1200 ||
      !author || author.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a quote (max 1200 characters) and author (max 150 characters).'
      });
    }

    try {
      const content = readContent();

      content.quote = {
        quote,
        author,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.matric
      };

      writeContent(content);

      return res.json({
        success: true,
        data: publicQuote(content.quote)
      });
    } catch (error) {
      console.error('Save quote:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Could not save Quote of the Month.'
      });
    }
  }
);

// Delete Quote of the Week.
app.delete(
  '/api/admin/:department/quote-of-week',
  bearer,
  adminOnly,
  (req, res) => {
    if (req.params.department !== 'hir') {
      return res.status(404).json({
        success: false,
        message: 'Department not found.'
      });
    }

    try {
      const content = readContent();
      content.quote = null;
      writeContent(content);

      return res.json({
        success: true,
        message: 'Quote of the Month deleted.'
      });
    } catch (error) {
      console.error('Delete quote:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Could not delete Quote of the Month.'
      });
    }
  }
);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
});

app.use((error, _req, res, _next) => {
  console.error('Request error:', error.message);

  res.status(400).json({
    success: false,
    message: error.message || 'Request failed.'
  });
});

app.listen(PORT, () => {
  console.log(
    `AKUHIR JSON backend listening on ${PORT}; ` +
    `content directory: ${DATA_DIR}; ` +
    `roster file: ${STUDENTS_FILE}`
  );
});
