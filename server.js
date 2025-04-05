require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Définir l'environnement (production sur Render, développement en local)
if (process.env.RENDER) {
  process.env.NODE_ENV = 'production';
} else {
  process.env.NODE_ENV = 'development';
}

// Vérifier si le dossier public existe, sinon le créer
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Le dossier public n\'existe pas, création...');
  fs.mkdirSync(publicDir, { recursive: true });
  
  // Créer un fichier index.html de base si nécessaire
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, `<!DOCTYPE html>
<html>
<head>
    <title>RAIATEA RENT CAR</title>
</head>
<body>
    <h1>RAIATEA RENT CAR - Fiche Client</h1>
    <p>Le formulaire est en cours de maintenance. Veuillez réessayer plus tard.</p>
</body>
</html>`);
    console.log('Fichier index.html créé');
  }
  
  // Créer un fichier test.html
  const testPath = path.join(publicDir, 'test.html');
  if (!fs.existsSync(testPath)) {
    fs.writeFileSync(testPath, `<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Test Page for Render Deployment</h1>
    <p>If you can see this page, the server is running correctly.</p>
</body>
</html>`);
    console.log('Fichier test.html créé');
  }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// Route principale pour s'assurer que l'application fonctionne sur Render
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>RAIATEA RENT CAR</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RAIATEA RENT CAR - Fiche Client</h1>
        <p>Le formulaire est en cours de maintenance. Veuillez réessayer plus tard.</p>
        <p>The form is currently under maintenance. Please try again later.</p>
    </div>
</body>
</html>`);
  }
});

// Route de test pour vérifier le déploiement sur Render
app.get('/test', (req, res) => {
  const testPath = path.join(__dirname, 'public', 'test.html');
  if (fs.existsSync(testPath)) {
    res.sendFile(testPath);
  } else {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333333; }
    </style>
</head>
<body>
    <h1>Test Page for Render Deployment</h1>
    <p>If you can see this page, the server is running correctly.</p>
    <p>Server time: ${new Date().toISOString()}</p>
    <p>Environment: ${process.env.NODE_ENV}</p>
</body>
</html>`);
  }
});

// Route pour l'interface d'administration
app.get('/admin', (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>RAIATEA RENT CAR - Administration</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RAIATEA RENT CAR - Administration</h1>
        <p>L'interface d'administration est en cours de maintenance. Veuillez réessayer plus tard.</p>
        <p>The administration interface is currently under maintenance. Please try again later.</p>
    </div>
</body>
</html>`);
  }
});

// Route de diagnostic pour vérifier l'état du serveur
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    render: process.env.RENDER ? true : false,
    time: new Date().toISOString(),
    publicDir: fs.existsSync(publicDir),
    indexHtml: fs.existsSync(path.join(publicDir, 'index.html')),
    testHtml: fs.existsSync(path.join(publicDir, 'test.html')),
    adminHtml: fs.existsSync(path.join(publicDir, 'admin.html'))
  });
});

// Initialisation de la base de données
// Utiliser un chemin qui fonctionne à la fois en local et sur Render
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/database.sqlite' : './database.sqlite';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite');
    
    // Création des tables
    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      language TEXT NOT NULL,
      main_driver_name TEXT NOT NULL,
      main_driver_firstname TEXT NOT NULL,
      main_driver_birth_date TEXT NOT NULL,
      main_driver_birth_place TEXT NOT NULL,
      main_driver_nationality TEXT NOT NULL,
      main_driver_passport TEXT,
      main_driver_passport_issue_date TEXT,
      main_driver_passport_expiry_date TEXT,
      main_driver_license TEXT NOT NULL,
      main_driver_license_issue_date TEXT NOT NULL,
      main_driver_license_expiry_date TEXT NOT NULL,
      main_driver_license_issue_place TEXT NOT NULL,
      main_driver_address TEXT NOT NULL,
      main_driver_city TEXT NOT NULL,
      main_driver_postal_code TEXT NOT NULL,
      main_driver_country TEXT NOT NULL,
      main_driver_phone TEXT NOT NULL,
      main_driver_email TEXT NOT NULL,
      main_driver_hotel TEXT,
      has_additional_driver BOOLEAN,
      additional_driver_name TEXT,
      additional_driver_firstname TEXT,
      additional_driver_birth_date TEXT,
      additional_driver_birth_place TEXT,
      additional_driver_nationality TEXT,
      additional_driver_license TEXT,
      additional_driver_license_issue_date TEXT,
      additional_driver_license_expiry_date TEXT,
      additional_driver_license_issue_place TEXT,
      main_card_type TEXT NOT NULL,
      main_card_number TEXT NOT NULL,
      main_card_expiry_date TEXT NOT NULL,
      main_card_holder_name TEXT NOT NULL,
      has_additional_card BOOLEAN,
      additional_card_type TEXT,
      additional_card_number TEXT,
      additional_card_expiry_date TEXT,
      additional_card_holder_name TEXT,
      accept_terms BOOLEAN NOT NULL,
      accept_data_processing BOOLEAN NOT NULL,
      signature_date TEXT NOT NULL,
      signature_name TEXT NOT NULL,
      signature_data TEXT,
      submission_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Fonction pour générer le PDF
function generatePDF(clientData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const pdfDir = process.env.NODE_ENV === 'production' ? '/tmp/pdfs' : './pdfs';
    const pdfPath = `${pdfDir}/${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`;
    
    // Assurez-vous que le dossier pdfs existe
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }
    
    const pdfStream = fs.createWriteStream(pdfPath);
    
    // Événements de stream
    pdfStream.on('finish', () => {
      resolve(pdfPath);
    });
    
    pdfStream.on('error', (err) => {
      reject(err);
    });
    
    // Pipe le PDF vers le stream
    doc.pipe(pdfStream);
    
    // En-tête
    doc.fontSize(20).text('RAIATEA RENT CAR', { align: 'center' });
    doc.fontSize(16).text('Fiche de renseignements client', { align: 'center' });
    doc.moveDown();
    
    // ID du client
    doc.fontSize(12).text(`ID: ${clientData.id}`, { align: 'right' });
    doc.moveDown();
    
    // Conducteur principal
    doc.fontSize(14).text('Conducteur Principal', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Nom: ${clientData.main_driver_name}`);
    doc.text(`Prénom: ${clientData.main_driver_firstname}`);
    doc.text(`Date de naissance: ${clientData.main_driver_birth_date}`);
    doc.text(`Lieu de naissance: ${clientData.main_driver_birth_place}`);
    doc.text(`Nationalité: ${clientData.main_driver_nationality}`);
    
    if (clientData.main_driver_passport) {
      doc.text(`N° Passeport: ${clientData.main_driver_passport}`);
      doc.text(`Date d'émission: ${clientData.main_driver_passport_issue_date}`);
      doc.text(`Date d'expiration: ${clientData.main_driver_passport_expiry_date}`);
    }
    
    doc.text(`N° Permis de conduire: ${clientData.main_driver_license}`);
    doc.text(`Date d'émission: ${clientData.main_driver_license_issue_date}`);
    doc.text(`Date d'expiration: ${clientData.main_driver_license_expiry_date}`);
    doc.text(`Lieu d'émission: ${clientData.main_driver_license_issue_place}`);
    doc.text(`Adresse: ${clientData.main_driver_address}`);
    doc.text(`Ville: ${clientData.main_driver_city}`);
    doc.text(`Code Postal: ${clientData.main_driver_postal_code}`);
    doc.text(`Pays: ${clientData.main_driver_country}`);
    doc.text(`Téléphone: ${clientData.main_driver_phone}`);
    doc.text(`Email: ${clientData.main_driver_email}`);
    
    if (clientData.main_driver_hotel) {
      doc.text(`Hôtel / Pension / Bateau: ${clientData.main_driver_hotel}`);
    }
    
    doc.moveDown();
    
    // Conducteur additionnel
    if (clientData.has_additional_driver === 'true' || clientData.has_additional_driver === true) {
      doc.fontSize(14).text('Conducteur Additionnel', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Nom: ${clientData.additional_driver_name}`);
      doc.text(`Prénom: ${clientData.additional_driver_firstname}`);
      doc.text(`Date de naissance: ${clientData.additional_driver_birth_date}`);
      doc.text(`Lieu de naissance: ${clientData.additional_driver_birth_place}`);
      doc.text(`Nationalité: ${clientData.additional_driver_nationality}`);
      doc.text(`N° Permis de conduire: ${clientData.additional_driver_license}`);
      doc.text(`Date d'émission: ${clientData.additional_driver_license_issue_date}`);
      doc.text(`Date d'expiration: ${clientData.additional_driver_license_expiry_date}`);
      doc.text(`Lieu d'émission: ${clientData.additional_driver_license_issue_place}`);
      doc.moveDown();
    }
    
    // Carte de crédit principale
    doc.fontSize(14).text('Carte de Crédit Principale', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Type de carte: ${clientData.main_card_type}`);
    doc.text(`Numéro de carte: ${clientData.main_card_number}`);
    doc.text(`Date d'expiration: ${clientData.main_card_expiry_date}`);
    doc.text(`Nom du titulaire: ${clientData.main_card_holder_name}`);
    doc.moveDown();
    
    // Carte de crédit supplémentaire
    if (clientData.has_additional_card === 'true' || clientData.has_additional_card === true) {
      doc.fontSize(14).text('Carte de Crédit Supplémentaire', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Type de carte: ${clientData.additional_card_type}`);
      doc.text(`Numéro de carte: ${clientData.additional_card_number}`);
      doc.text(`Date d'expiration: ${clientData.additional_card_expiry_date}`);
      doc.text(`Nom du titulaire: ${clientData.additional_card_holder_name}`);
      doc.moveDown();
    }
    
    // Signature
    doc.fontSize(14).text('Signature', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Nom: ${clientData.signature_name}`);
    doc.text(`Date: ${clientData.signature_date}`);
    doc.moveDown();
    
    // Ajouter la signature si elle existe
    if (clientData.signature_data) {
      doc.image(clientData.signature_data, {
        fit: [250, 100],
        align: 'center'
      });
    }
    
    // Finaliser le PDF
    doc.end();
  });
}

// API pour soumettre le formulaire
app.post('/api/submit', async (req, res) => {
  try {
    const clientData = req.body;
    
    // Générer un ID unique pour le client
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const uuid = uuidv4();
    clientData.id = `${timestamp}_${uuid}`;
    
    // Insérer les données dans la base de données
    const placeholders = Object.keys(clientData).map(() => '?').join(',');
    const columns = Object.keys(clientData).join(',');
    const values = Object.values(clientData);
    
    const sql = `INSERT INTO clients (${columns}) VALUES (${placeholders})`;
    
    db.run(sql, values, async function(err) {
      if (err) {
        console.error('Erreur lors de l\'insertion dans la base de données:', err.message);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement des données' });
      }
      
      try {
        // Générer le PDF
        const pdfPath = await generatePDF(clientData);
        
        // Désactivation temporaire de l'envoi d'email pour tester le formulaire
        console.log('Génération du PDF réussie. Chemin:', pdfPath);
        console.log('Configuration email:');
        console.log('  HOST:', process.env.EMAIL_HOST);
        console.log('  PORT:', process.env.EMAIL_PORT);
        console.log('  USER:', process.env.EMAIL_USER ? 'Configuré' : 'Non configuré');
        console.log('  PASS:', process.env.EMAIL_PASS ? 'Configuré' : 'Non configuré');
        console.log('  TO:', process.env.EMAIL_TO || 'raiatearentcar@mail.pf');
        
        // Répondre immédiatement avec succès sans envoyer d'email
        res.status(200).json({ 
          message: 'Formulaire traité avec succès (email désactivé temporairement)',
          id: clientData.id,
          pdfPath: pdfPath
        });
      } catch (error) {
        console.error('Erreur lors de la génération du PDF ou de l\'envoi de l\'email:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF ou de l\'envoi de l\'email' });
      }
    });
  } catch (error) {
    console.error('Erreur lors du traitement de la requête:', error);
    res.status(500).json({ error: 'Erreur lors du traitement de la requête' });
  }
});

// API pour récupérer tous les clients
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY submission_date DESC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des clients:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
    
    res.status(200).json(rows);
  });
});

// API pour récupérer un client par ID
app.get('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM clients WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération du client:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    res.status(200).json(row);
  });
});

// API pour exporter les données au format CSV
app.get('/api/export/csv', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY submission_date DESC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des clients:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
    
    // Créer le contenu CSV
    const headers = Object.keys(rows[0]).join(',');
    const csvContent = rows.map(row => {
      return Object.values(row).map(value => {
        // Échapper les virgules et les guillemets
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    }).join('\n');
    
    const csv = `${headers}\n${csvContent}`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
    res.status(200).send(csv);
  });
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
