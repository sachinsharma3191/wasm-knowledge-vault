use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct KVIndex {
    inverted: HashMap<String, Posting>, // term -> posting
    doc_lens: HashMap<String, usize>,   // doc_id -> token length
    ndocs: usize,
    stored: HashMap<String, String>,    // optional: original text for preview
}

#[derive(Default)]
struct Posting {
    df: usize,                          // document frequency
    tfs: HashMap<String, usize>,        // doc_id -> term frequency
}

#[wasm_bindgen]
impl KVIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> KVIndex {
        console_error_panic_hook::set_once();
        KVIndex {
            inverted: HashMap::new(),
            doc_lens: HashMap::new(),
            ndocs: 0,
            stored: HashMap::new(),
        }
    }

    /// Add/ingest a chunk or document by unique id
    #[wasm_bindgen]
    pub fn add_doc(&mut self, doc_id: String, text: String) {
        if self.doc_lens.contains_key(&doc_id) {
            return; // ignore duplicates for MVP
        }
        let tokens = tokenize(&text);
        let len = tokens.len();
        self.doc_lens.insert(doc_id.clone(), len);
        self.ndocs += 1;
        self.stored.insert(doc_id.clone(), text);

        let mut tf: HashMap<String, usize> = HashMap::new();
        for t in tokens {
            *tf.entry(t).or_insert(0) += 1;
        }
        for (term, freq) in tf {
            let posting = self.inverted.entry(term).or_default();
            posting.df += 1;
            posting.tfs.insert(doc_id.clone(), freq);
        }
    }

    /// BM25-ish search; returns JSON `[ { "doc_id": "...", "score": 1.23 } ]`
    #[wasm_bindgen]
    pub fn search(&self, query: String, k: usize) -> String {
        let q_terms = tokenize(&query);

        let mut candidate_docs: HashSet<String> = HashSet::new();
        for t in &q_terms {
            if let Some(p) = self.inverted.get(t) {
                for doc_id in p.tfs.keys() {
                    candidate_docs.insert(doc_id.clone());
                }
            }
        }

        let avg_dl = if self.ndocs > 0 {
            self.doc_lens.values().sum::<usize>() as f32 / self.ndocs as f32
        } else { 0.0 };

        let mut scored: Vec<(String, f32)> = Vec::new();
        for doc_id in candidate_docs {
            let mut score = 0.0f32;
            let dl = *self.doc_lens.get(&doc_id).unwrap_or(&1) as f32;

            for t in &q_terms {
                if let Some(p) = self.inverted.get(t) {
                    let tf = *p.tfs.get(&doc_id).unwrap_or(&0) as f32;
                    if tf == 0.0 { continue; }

                    // IDF with smoothing
                    let df = p.df as f32;
                    let nd = self.ndocs as f32;
                    let idf = ((nd - df + 0.5) / (df + 0.5) + 1.0).ln();

                    // BM25 parameters
                    let k1 = 1.5f32;
                    let b = 0.75f32;
                    let denom = tf + k1 * (1.0 - b + b * (dl / (avg_dl + 1e-6)));

                    score += idf * (tf * (k1 + 1.0)) / (denom + 1e-6);
                }
            }
            scored.push((doc_id, score));
        }

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        let k = k.min(scored.len());
        let result: Vec<_> = scored.into_iter().take(k)
            .map(|(id, s)| serde_json::json!({ "doc_id": id, "score": s }))
            .collect();
        serde_json::to_string(&result).unwrap_or("[]".into())
    }

    /// Get stored text by doc_id (for previews/snippets)
    #[wasm_bindgen]
    pub fn get_doc(&self, doc_id: String) -> Option<String> {
        self.stored.get(&doc_id).cloned()
    }

    /// Clear index
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.inverted.clear();
        self.doc_lens.clear();
        self.stored.clear();
        self.ndocs = 0;
    }
}

/// Very simple tokenizer: lowercase, keep a-z0-9, split by non-word
fn tokenize(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut cur = String::new();
    for ch in text.chars() {
        let c = ch.to_ascii_lowercase();
        if c.is_ascii_alphanumeric() {
            cur.push(c);
        } else if !cur.is_empty() {
            out.push(std::mem::take(&mut cur));
        }
    }
    if !cur.is_empty() { out.push(cur); }
    out
}