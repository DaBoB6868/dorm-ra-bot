# AURA - AI-powered University Resident Assistant

## Project Overview
A Next.js-based intelligent chatbot system (AURA) for university dorm residents with Retrieval-Augmented Generation (RAG) capabilities. Uses OpenAI embeddings and LangChain for semantic document retrieval and response generation.

## Key Technologies
- Next.js 16 with TypeScript
- React for UI components
- Tailwind CSS for styling
- LangChain for RAG pipeline
- OpenAI API for embeddings and chat
- pdf-parse and pdfjs-dist for PDF processing

## Current Project Status
✅ Project Structure: Complete
✅ PDF Ingestion: Implemented
✅ Vector Embeddings: Integrated
✅ RAG Pipeline: Functional
✅ Chat Interface: Built
✅ API Routes: Operational
✅ Build: Successful

## Important Directories
- `src/app/api/` - API routes for chat and document upload
- `src/components/` - React UI components
- `src/lib/` - Core business logic (embeddings, RAG, PDF parsing)

## Environment Variables Required
```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Running the Project
```bash
npm run dev           # Development server
npm run build         # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

## Key Features Implemented
1. PDF upload and text extraction (server & client-side)
2. Semantic chunking and embedding generation
3. In-memory vector store with cosine similarity search
4. RAG pipeline with context-aware responses
5. Modern, responsive chat interface
6. Source attribution for retrieved documents
7. Conversation history tracking

## Customization Points
- System prompt: `src/lib/rag-service.ts`
- Vector store: `src/lib/vector-store.ts` (can switch to Pinecone, Supabase)
- Embeddings model: `src/lib/embeddings.ts`
- UI theme: Component Tailwind classes and `tailwind.config.ts`

## Known Limitations & Future Work
- In-memory vector store (not persistent)
- No user authentication
- No rate limiting
- Server-side PDF parsing requires pdf-parse dependency
- Single API request streaming is basic

## For Future Enhancement
1. Add persistent vector database (Pinecone, Supabase)
2. Implement user authentication
3. Add document management dashboard
4. Support additional file types (.docx, .txt)
5. Implement proper streaming responses
6. Add analytics and usage metrics

## Helpful Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [LangChain Documentation](https://python.langchain.com)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
