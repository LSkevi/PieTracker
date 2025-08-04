import express from 'express';
import multer from 'multer';
import * as tesseract from 'node-tesseract-ocr';
import { preprocessImage } from './utils/imageProcessor';
import { parseReceiptText } from './utils/textParser';

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const tesseractConfig = {
  lang: 'por', // Língua portuguesa
  oem: 1,      // Modo do motor de OCR
  psm: 3,      // Modo de segmentação de página
};

app.get('/', (req, res) => {
    res.send('Servidor de OCR funcionando! Envie uma imagem para /api/processar-nota');
});

app.post('/api/processar-nota', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  try {
    const imageBuffer = await preprocessImage(req.file.buffer);
    const text = await tesseract.recognize(imageBuffer, tesseractConfig);
    console.log(text)

    const data = parseReceiptText(text);
    return res.status(200).json(data);

  } catch (error) {
    console.error('Erro no processamento da imagem:', error);
    return res.status(500).json({ error: 'Falha ao processar a imagem.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});