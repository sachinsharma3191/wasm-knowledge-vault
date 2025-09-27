# 🧠 Knowledge Vault

A local-first AI knowledge vault that runs entirely in your browser.  
Ingest text, PDFs, images, and videos → search, tag, and run Q&A with WebAssembly + Transformers.  
All data stays private on your device using IndexedDB.

---

## ✨ Features

- Document ingest — drag & drop PDFs or paste text  
- Semantic search — embeddings powered by Rust/WASM + ONNX Runtime Web  
- Image support — extract inline images and page thumbnails from PDFs  
- Video ingest — sample frames, poster images, and (future) audio captions  
- Local Q&A (RAG) — ask natural-language questions across your vault  
- History & events — uploads, searches, Q&A sessions are logged  
- Tags & collections — organize documents flexibly  
- Vault import/export — backup or transfer your knowledge vault  
- Preferences — boost or exclude tags, saved searches  
- 100% local, no server required  

---

## 🏗️ Tech Stack

- Frontend: React + Vite + TypeScript  
- AI runtime: onnxruntime-web, @xenova/transformers  
- WASM backend: Rust (embeddings + indexing) compiled via wasm-pack  
- Storage: IndexedDB (via idb)  
- Docs/Media: pdfjs-dist, Canvas API, FileReader  
- Build tooling: Vite, esbuild, TypeScript  

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+  
- Rust + Cargo  
- wasm-pack (install using `cargo install wasm-pack`)  

### Clone and install

```bash
git clone git@github.com:sachinsharma3191/knowledge-vault.git
cd knowledge-vault
npm install
```

### Build the Rust → WASM module

```bash
npm run wasm:build
```

This compiles the Rust embedding/indexing backend and outputs JS glue into `src/wasm/kv_index`.

### Start the development server

```bash
npm run dev
```

Open the following URL in your browser:  
http://localhost:5173

---

## 📦 Build for production

```bash
npm run build
npm run preview
```

The build artifacts will be in the `dist/` folder.

---

## 🧪 Development scripts

```bash
npm run wasm:build   # build the Rust WASM backend
npm run wasm:clean   # clean the wasm build artifacts
npm run lint         # lint with ESLint
npm run dev          # run local development server
npm run build        # build for production
npm run preview      # preview production build
```

---

## 🗄️ Project Structure

```text
knowledge-vault/
├── src/
│   ├── components/         # React UI components
│   ├── hooks/              # React hooks (e.g., video ingest queue)
│   ├── ingest/             # Ingest pipelines (docs, media, video)
│   ├── lib/
│   │   ├── helpers.ts      # Utility helpers
│   │   └── storage/        # IndexedDB wrapper (store.ts)
│   ├── wasm/kv_index/      # Rust → WASM embedding index
│   └── App.tsx             # Main app entry
├── wasm/kv_index/          # Rust source for embeddings
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🔮 Roadmap

- Audio transcription (Whisper WASM) for video → searchable captions  
- UI polish (toasts, better history view, tag manager)  
- Export/import vaults with media sharing  
- Full offline multimodal search demo (text + image + video + audio)  

---

## 🤝 Contributing

Contributions are welcome.  
Please open issues or pull requests with ideas, fixes, or improvements.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👤 Author

Built by [Sachin Sharma](https://github.com/sachinsharma3191)
