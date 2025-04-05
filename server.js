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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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
      main_driver_address TEXT NOT NULL,
      main_driver_postal_code TEXT NOT NULL,
      main_driver_city TEXT NOT NULL,
      main_driver_country TEXT NOT NULL,
      main_driver_birth_date TEXT NOT NULL,
      main_driver_birth_place TEXT NOT NULL,
      main_driver_phone TEXT NOT NULL,
      main_driver_license_number TEXT NOT NULL,
      main_driver_license_issue_date TEXT NOT NULL,
      main_driver_license_validity_date TEXT NOT NULL,
      main_driver_license_issue_place TEXT NOT NULL,
      main_driver_email TEXT NOT NULL,
      main_driver_credit_card TEXT NOT NULL,
      main_driver_credit_card_expiry TEXT NOT NULL,
      has_additional_driver BOOLEAN,
      additional_driver_name TEXT,
      additional_driver_firstname TEXT,
      additional_driver_address TEXT,
      additional_driver_postal_code TEXT,
      additional_driver_city TEXT,
      additional_driver_country TEXT,
      additional_driver_birth_date TEXT,
      additional_driver_birth_place TEXT,
      additional_driver_phone TEXT,
      additional_driver_license_number TEXT,
      additional_driver_license_issue_date TEXT,
      additional_driver_license_issue_place TEXT,
      additional_driver_license_validity_date TEXT,
      additional_driver_email TEXT,
      has_additional_credit_card BOOLEAN,
      additional_credit_card TEXT,
      additional_credit_card_expiry TEXT,
      accept_fines BOOLEAN NOT NULL,
      accept_data_processing BOOLEAN NOT NULL,
      signature_date TEXT NOT NULL,
      signature_name TEXT NOT NULL,
      submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Génération d'un ID unique pour le client
app.get('/api/generate-client-id', (req, res) => {
  const clientId = uuidv4();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  res.json({ clientId: `${timestamp}_${clientId}` });
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
    doc.pipe(pdfStream);
    
    // Langue du document
    const isEnglish = clientData.language === 'en';
    
    
    // En-tête
    doc.fontSize(16).font('Helvetica-Bold').text('RAIATEA RENT CAR', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('RCS: 07238B - NR TAHITI: 834119', { align: 'center' });
    doc.text(isEnglish ? 'Raiatea Airport' : 'Aéroport de Raiatea', { align: 'center' });
    doc.text('GSM: +689 87-313262', { align: 'center' });
    doc.moveDown(2);
    
    // Titre
    doc.fontSize(14).font('Helvetica-Bold').text(isEnglish ? 'CLIENT INFORMATION FORM' : 'FICHE DE RENSEIGNEMENT CLIENT', { align: 'center' });
    doc.moveDown();
    
    // Conducteur principal
    doc.fontSize(12).font('Helvetica-Bold').text(isEnglish ? 'MAIN DRIVER' : 'CONDUCTEUR PRINCIPAL');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    doc.text(`${isEnglish ? 'Name' : 'Nom'}: ${clientData.main_driver_name}`);
    doc.text(`${isEnglish ? 'Firstname(s)' : 'Prénom(s)'}: ${clientData.main_driver_firstname}`);
    doc.text(`${isEnglish ? 'Address' : 'Adresse'}: ${clientData.main_driver_address}, ${clientData.main_driver_postal_code}, ${clientData.main_driver_city}, ${clientData.main_driver_country}`);
    doc.text(`${isEnglish ? 'Birth date' : 'Date de naissance'}: ${clientData.main_driver_birth_date}`);
    doc.text(`${isEnglish ? 'Birth place' : 'Lieu de naissance'}: ${clientData.main_driver_birth_place}`);
    doc.text(`${isEnglish ? 'Phone' : 'Téléphone'}: ${clientData.main_driver_phone}`);
    doc.text(`${isEnglish ? 'Email' : 'Email'}: ${clientData.main_driver_email}`);
    doc.text(`${isEnglish ? 'Driver\'s license number' : 'N° du permis de conduire'}: ${clientData.main_driver_license_number}`);
    doc.text(`${isEnglish ? 'Issue date' : 'Date d\'émission'}: ${clientData.main_driver_license_issue_date}`);
    doc.text(`${isEnglish ? 'Validity date' : 'Date de validité'}: ${clientData.main_driver_license_validity_date}`);
    doc.text(`${isEnglish ? 'Issue place' : 'Lieu d\'émission'}: ${clientData.main_driver_license_issue_place}`);
    doc.moveDown();
    
    // Carte de crédit principale
    doc.fontSize(12).font('Helvetica-Bold').text(isEnglish ? 'CREDIT CARD' : 'CARTE DE CRÉDIT');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`${isEnglish ? 'Number' : 'Numéro'}: ${clientData.main_driver_credit_card}`);
    doc.text(`${isEnglish ? 'Expiry date' : 'Date d\'expiration'}: ${clientData.main_driver_credit_card_expiry}`);
    doc.moveDown();
    
    // Conducteur additionnel (si présent)
    if (clientData.has_additional_driver) {
      doc.fontSize(12).font('Helvetica-Bold').text(isEnglish ? 'ADDITIONAL DRIVER' : 'CONDUCTEUR ADDITIONNEL');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      
      doc.text(`${isEnglish ? 'Name' : 'Nom'}: ${clientData.additional_driver_name}`);
      doc.text(`${isEnglish ? 'Firstname(s)' : 'Prénom(s)'}: ${clientData.additional_driver_firstname}`);
      doc.text(`${isEnglish ? 'Address' : 'Adresse'}: ${clientData.additional_driver_address}, ${clientData.additional_driver_postal_code}, ${clientData.additional_driver_city}, ${clientData.additional_driver_country}`);
      doc.text(`${isEnglish ? 'Birth date' : 'Date de naissance'}: ${clientData.additional_driver_birth_date}`);
      doc.text(`${isEnglish ? 'Birth place' : 'Lieu de naissance'}: ${clientData.additional_driver_birth_place}`);
      doc.text(`${isEnglish ? 'Phone' : 'Téléphone'}: ${clientData.additional_driver_phone}`);
      doc.text(`${isEnglish ? 'Email' : 'Email'}: ${clientData.additional_driver_email}`);
      doc.text(`${isEnglish ? 'Driver\'s license number' : 'N° du permis de conduire'}: ${clientData.additional_driver_license_number}`);
      doc.text(`${isEnglish ? 'Issue date' : 'Date d\'émission'}: ${clientData.additional_driver_license_issue_date}`);
      doc.text(`${isEnglish ? 'Validity date' : 'Date de validité'}: ${clientData.additional_driver_license_validity_date}`);
      doc.text(`${isEnglish ? 'Issue place' : 'Lieu d\'émission'}: ${clientData.additional_driver_license_issue_place}`);
      doc.moveDown();
    }
    
    // Carte de crédit additionnelle (si présente)
    if (clientData.has_additional_credit_card) {
      doc.fontSize(12).font('Helvetica-Bold').text(isEnglish ? 'ADDITIONAL CREDIT CARD' : 'CARTE DE CRÉDIT SUPPLÉMENTAIRE');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`${isEnglish ? 'Number' : 'Numéro'}: ${clientData.additional_credit_card}`);
      doc.text(`${isEnglish ? 'Expiry date' : 'Date d\'expiration'}: ${clientData.additional_credit_card_expiry}`);
      doc.moveDown();
    }
    
    // Informations sur les amendes
    doc.fontSize(12).font('Helvetica-Bold').text(isEnglish ? 'FINES INFORMATION' : 'INFORMATIONS SUR LES AMENDES');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text(isEnglish 
      ? 'Please note that SARL RAIATEA RENT A CAR cannot be held responsible for fines received during the rental period. You authorize RAIATEA RENT CAR to debit your credit card for the fine amount, plus a flat administrative fee of 3000 XPF, if this amount is claimed from RAIATEA RENT CAR by the competent authorities.'
      : 'Nous vous informons que la société SARL RAIATEA RENT A CAR ne peut être tenue responsable des amendes reçues dans le cadre de la location. Vous autorisez la société RAIATEA RENT CAR à débiter votre carte de crédit du montant de l\'amende, majorée de frais de dossier forfaitaire de 3000 FCP au cas où ce montant serait réclamé à RAIATEA RENT CAR par les autorités compétentes.'
    );
    doc.moveDown();
    doc.text(`${isEnglish ? 'Accepted' : 'Accepté'}: ${clientData.accept_fines ? 'Oui/Yes' : 'Non/No'}`);
    doc.moveDown();
    
    // Traitement des données personnelles (résumé)
    doc.fontSize(12).font('Helvetica-Bold').text(isEnglish ? 'PERSONAL DATA PROCESSING' : 'TRAITEMENT DES DONNÉES PERSONNELLES');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text(isEnglish 
      ? 'I consent to the processing of my personal data as described in the form.'
      : 'J\'accepte le traitement de mes données personnelles comme décrit dans le formulaire.'
    );
    doc.moveDown();
    doc.text(`${isEnglish ? 'Accepted' : 'Accepté'}: ${clientData.accept_data_processing ? 'Oui/Yes' : 'Non/No'}`);
    doc.moveDown();
    
    // Signature
    doc.fontSize(12).font('Helvetica-Bold').text(isEnglish ? 'SIGNATURE' : 'SIGNATURE');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`${isEnglish ? 'Date' : 'Date'}: ${clientData.signature_date}`);
    doc.text(`${isEnglish ? 'Name' : 'Nom'}: ${clientData.signature_name}`);
    doc.moveDown();
    
    // Ajout de la signature manuscrite
    if (clientData.signature_data) {
      try {
        doc.image(clientData.signature_data, {
          fit: [250, 100],
          align: 'center'
        });
      } catch (err) {
        console.error('Erreur lors de l\'ajout de la signature au PDF:', err);
      }
    }
    
    // Finalisation du document
    doc.end();
    
    pdfStream.on('finish', () => {
      resolve(pdfPath);
    });
    
    pdfStream.on('error', (err) => {
      reject(err);
    });
  });
}

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465, // true pour 465, false pour les autres ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Soumission du formulaire
app.post('/api/submit-form', async (req, res) => {
  try {
    const clientData = req.body;
    
    // Insertion des données dans la base de données
    const placeholders = Object.keys(clientData).map(() => '?').join(',');
    const columns = Object.keys(clientData).join(',');
    const values = Object.values(clientData);
    
    const sql = `INSERT INTO clients (${columns}) VALUES (${placeholders})`;
    
    db.run(sql, values, async function(err) {
      if (err) {
        console.error('Erreur lors de l\'insertion des données:', err.message);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement des données' });
      }
      
      try {
        // Génération du PDF
        const pdfPath = await generatePDF(clientData);
        
        // Envoi de l'email
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
          subject: `Nouvelle fiche client - ${clientData.main_driver_name} ${clientData.main_driver_firstname} (ID: ${clientData.id})`,
          text: `Veuillez trouver ci-joint la fiche client de ${clientData.main_driver_name} ${clientData.main_driver_firstname}.

Informations client :
- ID: ${clientData.id}
- Nom: ${clientData.main_driver_name}
- Prénom: ${clientData.main_driver_firstname}
- Email: ${clientData.main_driver_email}
- Téléphone: ${clientData.main_driver_phone}
- Date de soumission: ${new Date().toLocaleString()}
`,
          attachments: [
            {
              filename: `${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`,
              path: pdfPath
            }
          ]
        };
        
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ message: 'Formulaire soumis avec succès' });
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

// Route pour accéder à un formulaire client spécifique
app.get('/form/:clientId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour l'interface d'administration
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API pour récupérer tous les clients (pour l'interface admin)
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY submission_date DESC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des clients:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
    }
    res.json(rows);
  });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
