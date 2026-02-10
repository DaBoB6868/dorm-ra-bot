import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from './pdf-loader';
import { splitDocumentIntoChunks } from './embeddings';
import { vectorStore } from './vector-store';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_PDFS_PATH = path.join(process.cwd(), 'backend', 'pdfs');

export async function initializeDocuments(): Promise<void> {
  try {
    if (vectorStore.getAllDocuments().length > 0) {
      console.log('📚 Vector store already initialized. Skipping PDF load.');
      return;
    }
    // Check if backend/pdfs folder exists
    if (!fs.existsSync(BACKEND_PDFS_PATH)) {
      console.log('📁 No backend/pdfs folder found. Skipping initialization.');
      return;
    }

    // Get all PDF files
    const files = fs.readdirSync(BACKEND_PDFS_PATH);
    const pdfFiles = files.filter((file) => file.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.log('📄 No PDFs found in backend/pdfs folder.');
      return;
    }

    console.log(`\n🚀 Loading ${pdfFiles.length} PDF(s) from backend/pdfs...`);

    // Process each PDF
    for (const pdfFile of pdfFiles) {
      const filePath = path.join(BACKEND_PDFS_PATH, pdfFile);

      try {
        console.log(`📖 Processing: ${pdfFile}`);

        // Read file as buffer
        const fileBuffer = fs.readFileSync(filePath);
        const file = typeof File !== 'undefined'
          ? new File([fileBuffer], pdfFile, { type: 'application/pdf' })
          : ({
              name: pdfFile,
              arrayBuffer: async () => fileBuffer,
            } as unknown as File);

        // Extract text from PDF
        const text = await extractTextFromPDF(file);

        // Split into chunks
        const chunks = await splitDocumentIntoChunks(text);

        // Add chunks to vector store
        for (let i = 0; i < chunks.length; i++) {
          const chunkId = `${pdfFile}_chunk_${i}_${uuidv4()}`;
          await vectorStore.addDocument(
            chunkId,
            chunks[i],
            pdfFile,
            Math.floor(i / 3) + 1 // Rough estimate of page number
          );
        }

        console.log(`✅ ${pdfFile}: ${chunks.length} chunks loaded`);
      } catch (error) {
        console.error(`❌ Error processing ${pdfFile}:`, error);
      }
    }

    const totalDocs = vectorStore.getAllDocuments().length;
    console.log(
      `\n✨ Initialization complete! Loaded ${totalDocs} total document chunks.\n`
    );
  } catch (error) {
    console.error('❌ Error during document initialization:', error);
  }
}
