const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const forge = require('node-forge');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer();
const PORT = 3000;

const CRL_PATH = path.join(__dirname, 'revoked_certs.json');

function loadCRL() {
  if (fs.existsSync(CRL_PATH)) {
    return JSON.parse(fs.readFileSync(CRL_PATH));
  } else {
    return [];
  }
}

function extractSerialNumberFromCert(certPath) {
  const pem = fs.readFileSync(certPath, 'utf8');
  const cert = forge.pki.certificateFromPem(pem);
  return cert.serialNumber.toUpperCase(); // Aseguramos mayúsculas para coincidencia
}

function generateSerialList(){
    const revoked_serials = getAllSerialNumbers(path.join(__dirname, '../revocados'))
    const expired_serials = getExpiredSerialNumbers(path.join(__dirname, '../ya_certificados'))
    const all_serials = revoked_serials.concat(expired_serials);
    fs.writeFileSync(CRL_PATH, JSON.stringify(all_serials, null, 2), 'utf8');
}

function getExpiredSerialNumbers(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }else{
    const files = fs.readdirSync(dirPath);
    const serialNumbers = [];
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isFile()) {
        try {
          const pem = fs.readFileSync(filePath, 'utf8');
          const cert = forge.pki.certificateFromPem(pem);
          const serial = cert.serialNumber.toUpperCase();
          const now = new Date();
          if (cert.validity.notAfter < now) {
            serialNumbers.push(serial);
          }
        } catch (err) {
          console.error(`Error procesando ${file}:`, err.message);
        }
      }
    }
    return serialNumbers;
  }
}

function getAllSerialNumbers(dirPath) {
  const serialNumbers = [];
  if (fs.existsSync(dirPath)){
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isFile()) {
        try {
          const pem = fs.readFileSync(filePath, 'utf8');
          const cert = forge.pki.certificateFromPem(pem);
          const serial = cert.serialNumber.toUpperCase();
          serialNumbers.push(serial);
        } catch (err) {
          console.error(`Error procesando ${file}:`, err.message);
        }
      }
    }
  }
  return serialNumbers;
}
  
function verifySignature(documentBuffer, signatureBuffer, certPEM) {
  return crypto.verify(
    'sha256',
    documentBuffer,
    {
      key: certPEM,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    signatureBuffer
  );
}

function moveCertToRevoked(serialNumber) {
  const sourceDir = path.join(__dirname, '../ya_certificados');
  const destDir = path.join(__dirname, '../revocados');

  if (!fs.existsSync(destDir)) {
    throw new Error(`Destination directory ${destDir} does not exist`);
  }

  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    if (fs.statSync(filePath).isFile()) {
      try {
        const pem = fs.readFileSync(filePath, 'utf8');
        const cert = forge.pki.certificateFromPem(pem);
        const serial = cert.serialNumber.toUpperCase();
        if (serial === serialNumber) {
          fs.renameSync(filePath, path.join(destDir, file));
          break;
        }
      } catch (err) {
        console.error(`Error procesando ${file}:`, err.message);
      }
    }
  }
}

app.post('/to-certificate', upload.single('cert'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No certificate uploaded' });
  try {
    const outputDir = path.join(__dirname, '../para_certificar');
    const filename = req.file.originalname || `cert_${Date.now()}.pem`;
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, req.file.buffer);
    res.json({ message: 'Certificado guardado correctamente.', path: outputPath });
    
  } catch (err) {
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to revoke certificate', details: err.message });
  }
});

app.post('/revoke', upload.single('cert'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No certificate uploaded' });

  try {
    const certificate = req.file.buffer.toString('utf8');
    const cert = forge.pki.certificateFromPem(certificate);
    const serialNumber = cert.serialNumber.toUpperCase();
    const crl = loadCRL();

    // Verificar si el certificado ya está revocado
    if (crl.includes(serialNumber)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Certificate already revoked' });
    }
    // debo buscar en ya certrificados el archivo que tenga el mismo serial y moverlo a revocados luego actualizar el json
    moveCertToRevoked(serialNumber);
    generateSerialList();

    res.json({ message: 'Certificate revoked successfully', serialNumber });
  } catch (err) {
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to revoke certificate', details: err.message });
  }
});

app.post('/check-revoked', upload.single('cert'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No certificate uploaded' });

  try {
    const certificate = req.file.buffer.toString('utf8');
    const cert = forge.pki.certificateFromPem(certificate);
    const serialNumber = cert.serialNumber.toUpperCase();
    const crl = loadCRL();
    const isRevoked = crl.includes(serialNumber);

    res.json({ serialNumber, revoked: isRevoked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse certificate', details: err.message });
  }
});

app.get('/revoked_list', (req, res) => {
  const certsDir = path.join(__dirname, '../revocados');
  try {
    // Verificar que el directorio exista
    if (!fs.existsSync(certsDir)) {
      return res.status(404).json({ error: 'Directorio no encontrado.' });
    }

    const files = fs.readdirSync(certsDir);

    const certificados = [];

    for (const file of files) {
      const certPath = path.join(certsDir, file);
      const pem = fs.readFileSync(certPath, 'utf8');
      try {
        const cert = forge.pki.certificateFromPem(pem);
        certificados.push({
          sujeto: cert.subject.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
          valido_hasta: cert.validity.notAfter.toISOString(),
          serial: cert.serialNumber
        });
      } catch (err) {

      }
    }

    res.json(certificados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar certificados.' });
  }
});

app.get('/certificates', (req, res) => {
  const certsDir = path.join(__dirname, '../ya_certificados');

  try {
    // Verificar que el directorio exista
    if (!fs.existsSync(certsDir)) {
      return res.status(404).json({ error: 'Directorio no encontrado.' });
    }

    const files = fs.readdirSync(certsDir);

    const certificados = [];

    for (const file of files) {
      const certPath = path.join(certsDir, file);
      const pem = fs.readFileSync(certPath, 'utf8');
      try {
        const cert = forge.pki.certificateFromPem(pem);
        certificados.push({
          sujeto: cert.subject.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
          valido_hasta: cert.validity.notAfter.toISOString(),
          serial: cert.serialNumber
        });
      } catch (err) {

      }
    }

    res.json(certificados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar certificados.' });
  }
});

app.post('/verify', upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'certificate', maxCount: 1 }
]), (req, res) => {
  try {
    const document = req.files.document[0].buffer;
    const signature = req.files.signature[0].buffer;
    const certificate = req.files.certificate[0].buffer.toString('utf8');

    const valid = verifySignature(document, signature, certificate);

    res.json({ valid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar firma' });
  }
});

app.listen(PORT, () => {
  generateSerialList();
  console.log(`CA server running on http://localhost:${PORT}`);
});
