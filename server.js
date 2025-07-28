const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FILES_ROOT = path.join(__dirname, 'files');

// Ensure files root exists
if (!fs.existsSync(FILES_ROOT)) {
  fs.mkdirSync(FILES_ROOT, { recursive: true });
}

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer storage: files/<material>/<type>/<year>/originalname
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { material, type, year } = req.body;
    if (!material || !type || !year) {
      return cb(new Error('جميع الحقول مطلوبة'));
    }
    const target = path.join(FILES_ROOT, material, type, year);
    fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename: function (req, file, cb) {
    // Clean filename and ensure .pdf extension
    let name = file.originalname.replace(/[^\w\-.]+/g, '_');
    if (!name.toLowerCase().endsWith('.pdf')) {
      name += '.pdf';
    }
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('PDF فقط!'));
    }
  },
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Serve main student UI (ensk.html)
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'ensk.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>File Not Found</title></head>
      <body>
        <h1>enser.html not found</h1>
        <p>Please make sure ensk.html is in the same directory as this server file.</p>
        <p><a href="/admin">Go to Admin Panel</a></p>
      </body>
      </html>
    `);
  }
});

// Serve static PDFs with proper headers
app.use('/files', express.static(FILES_ROOT, {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Admin upload page
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رفع ملفات PDF (واجهة الأدمن)</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      margin: 0; 
      padding: 0; 
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { 
      max-width: 600px; 
      background: rgba(255,255,255,0.95); 
      border-radius: 20px; 
      padding: 40px; 
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      backdrop-filter: blur(10px);
    }
    h2 { 
      color: #4682B4; 
      text-align: center; 
      margin-bottom: 30px; 
      font-size: 1.8rem;
    }
    form label { 
      font-size: 1.1em; 
      color: #444; 
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    input, select { 
      width: 100%; 
      margin-bottom: 20px; 
      padding: 12px; 
      border-radius: 10px; 
      border: 2px solid #ddd; 
      font-size: 1em;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #4682B4;
    }
    button { 
      background: linear-gradient(45deg, #4682B4, #87CEEB); 
      color: #fff; 
      border: none; 
      padding: 15px; 
      border-radius: 10px; 
      width: 100%; 
      font-size: 1.2em; 
      cursor: pointer;
      transition: transform 0.3s ease;
      font-weight: 600;
    }
    button:hover { 
      transform: translateY(-2px);
    }
    .success { 
      background: #d4edda; 
      color: #155724; 
      border-radius: 10px; 
      padding: 15px; 
      text-align: center; 
      margin-bottom: 20px;
      border: 1px solid #c3e6cb;
    }
    .error { 
      background: #f8d7da; 
      color: #721c24; 
      border-radius: 10px; 
      padding: 15px; 
      text-align: center; 
      margin-bottom: 20px;
      border: 1px solid #f5c6cb;
    }
    .nav-link {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background: #6c757d;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      transition: background 0.3s ease;
    }
    .nav-link:hover {
      background: #5a6268;
    }
    .file-input {
      border: 2px dashed #4682B4;
      padding: 20px;
      text-align: center;
      border-radius: 10px;
      background: rgba(70,130,180,0.1);
      cursor: pointer;
      transition: background 0.3s ease;
    }
    .file-input:hover {
      background: rgba(70,130,180,0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>📤 رفع ملفات PDF للمكتبة</h2>
    <form id="fileForm" method="post" enctype="multipart/form-data" action="/upload">
      <label>المادة (Material):</label>
      <select name="material" required>
        <option value="">اختر المادة</option>
        <option value="systeme-d-exploitation1">Système d'Exploitation 1</option>
        <option value="algorithmes-et-structures-de-donnees">Algorithmes et Structures de Données</option>
        <option value="structure-machines">Structure Machines</option>
        <option value="systemes-d-information">Systèmes d'Information</option>
        <option value="traitement-du-signal">Traitement du Signal</option>
        <option value="theorie-des-langages">Théorie des Langages</option>
        <option value="analyse-numerique">Analyse Numérique</option>
        <option value="psychologie-enfant-adolescent">Psychologie de l'Enfant et de l'Adolescent</option>
        <option value="anglais-1">Anglais 1</option>
        <option value="les-examens">Les Examens</option>
      </select>

      <label>النوع (Type):</label>
      <select name="type" required>
        <option value="">اختر النوع</option>
        <option value="cours">Cours</option>
        <option value="td">TD</option>
        <option value="tp">TP</option>
        <option value="exam">Exam</option>
      </select>

      <label>السنة (Year):</label>
      <select name="year" required>
        <option value="">اختر السنة</option>
        <option value="2025">2025</option>
        <option value="2024">2024</option>
        <option value="2023">2023</option>
      </select>

      <label>ملفات PDF:</label>
      <div class="file-input" onclick="document.getElementById('fileInput').click()">
        <input type="file" id="fileInput" name="pdfs" accept="application/pdf,.pdf" multiple required style="display: none;">
        <div>📁 انقر هنا لاختيار ملفات PDF</div>
        <div id="selectedFiles" style="margin-top: 10px; font-size: 0.9em; color: #666;"></div>
      </div>

      <button type="submit">رفع الملفات</button>
    </form>
    
    <div id="msg"></div>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="/" class="nav-link">العودة لواجهة الطلاب</a>
    </div>
  </div>

  <script>
    // Handle file selection display
    document.getElementById('fileInput').addEventListener('change', function(e) {
      const files = e.target.files;
      const selectedFiles = document.getElementById('selectedFiles');
      if (files.length > 0) {
        const fileNames = Array.from(files).map(f => f.name).join(', ');
        selectedFiles.textContent = \`تم اختيار \${files.length} ملف: \${fileNames}\`;
      } else {
        selectedFiles.textContent = '';
      }
    });

    // Handle form submission
    document.getElementById('fileForm').onsubmit = async function(e) {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const msgDiv = document.getElementById('msg');
      
      msgDiv.innerHTML = '<div style="text-align: center; color: #4682B4;">جاري الرفع...</div>';
      
      try {
        const resp = await fetch('/upload', { 
          method: 'POST', 
          body: formData 
        });
        const data = await resp.json();
        
        if (data.success) {
          msgDiv.innerHTML = \`<div class="success">✅ تم رفع \${data.files.length} ملف بنجاح!</div>\`;
          form.reset();
          document.getElementById('selectedFiles').textContent = '';
        } else {
          throw new Error(data.error || 'فشل في الرفع');
        }
      } catch (err) {
        msgDiv.innerHTML = \`<div class="error">❌ \${err.message}</div>\`;
      }
    };
  </script>
</body>
</html>
  `);
});

// Multiple upload endpoint: unlimited files
app.post('/upload', (req, res, next) => {
  upload.array('pdfs')(req, res, err => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "لم يتم رفع أي ملف!" 
      });
    }

    console.log(`Successfully uploaded ${req.files.length} files for ${req.body.material}/${req.body.type}/${req.body.year}`);

    res.json({
      success: true,
      files: req.files.map(f => ({
        name: f.filename,
        originalName: f.originalname,
        size: f.size,
        url: `/files/${req.body.material}/${req.body.type}/${req.body.year}/${encodeURIComponent(f.filename)}`
      }))
    });
  });
});

// API: list files for a module/type/year (used by ensk.html)
app.get('/api/files', (req, res) => {
  const { material, type, year } = req.query;
  
  if (!material || !type || !year) {
    return res.status(400).json({ 
      success: false, 
      error: "حدد المادة والنوع والسنة" 
    });
  }

  const dir = path.join(FILES_ROOT, material, type, year);
  
  if (!fs.existsSync(dir)) {
    return res.json({ 
      success: true, 
      files: [] 
    });
  }

  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => {
        const filePath = path.join(dir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          size: stats.size,
          url: `/files/${material}/${type}/${year}/${encodeURIComponent(f)}`
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ar')); // Sort alphabetically

    res.json({ 
      success: true, 
      files 
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ 
      success: false, 
      error: "خطأ في قراءة الملفات" 
    });
  }
});

// API: Get directory structure (optional - for debugging)
app.get('/api/structure', (req, res) => {
  try {
    function getDirectoryStructure(dirPath, relativePath = '') {
      const items = [];
      if (!fs.existsSync(dirPath)) return items;
      
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        const itemPath = path.join(relativePath, file);
        
        if (stat.isDirectory()) {
          items.push({
            name: file,
            type: 'directory',
            path: itemPath,
            children: getDirectoryStructure(fullPath, itemPath)
          });
        } else if (file.toLowerCase().endsWith('.pdf')) {
          items.push({
            name: file,
            type: 'file',
            path: itemPath,
            size: stat.size
          });
        }
      }
      return items;
    }

    const structure = getDirectoryStructure(FILES_ROOT);
    res.json({ success: true, structure });
  } catch (error) {
    console.error('Error getting structure:', error);
    res.status(500).json({ 
      success: false, 
      error: "خطأ في قراءة هيكل الملفات" 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    filesRoot: FILES_ROOT
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: '404 Not Found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'خطأ في الخادم' 
  });
});

app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على: http://localhost:${PORT}/`);
  console.log(`📁 مجلد الملفات: ${FILES_ROOT}`);
  console.log(`- واجهة الطلاب: http://localhost:${PORT}/`);
  console.log(`- واجهة الأدمن: http://localhost:${PORT}/admin`);
  console.log(`- API الملفات: http://localhost:${PORT}/api/files`);
  console.log(`- هيكل الملفات: http://localhost:${PORT}/api/structure`);
});