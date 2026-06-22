require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fse = require('fs-extra');

const resumeRoutes = require('./routes/resume');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure output directories exist
fse.ensureDirSync(path.join(__dirname, '../uploads'));
fse.ensureDirSync(path.join(__dirname, '../output'));

app.use(cors({
  origin: '*', // Tighten this to your extension ID in production
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve generated PDFs for download
app.use('/output', express.static(path.join(__dirname, '../output')));

app.use('/health', healthRoutes);
app.use('/api/resume', resumeRoutes);

app.listen(PORT, () => {
  console.log(`Resume Customizer backend running on port ${PORT}`);
});
