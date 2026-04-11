# Podcast Ad Detection & Skipping — Research Notes

> Researched 2026-04-11 via Perplexity deep research. Full analysis of dynamic ad insertion (DAI), detection approaches, and legal considerations.

## The Problem

Dynamic ad insertion (DAI) stitches ads into podcast audio **server-side** before delivery. By the time the audio reaches our player, ads are baked into a single continuous audio stream — no metadata, no markers, no separate network requests to block. The ads vary by geography (VPN location), device, and time of request.

## Detection Approaches

### 1. CNN-Based Classification (Adetector)
- **Repo:** [github.com/ohadmich/Adetector](https://github.com/ohadmich/Adetector)
- Cascaded CNN: first model separates speech/music (96% accuracy), second distinguishes ads from speech (86% accuracy)
- Operates on 3-second MFCC clips → probability graph → moving average filter → threshold
- Fast (fraction of real-time), suitable for backend preprocessing
- Trained on Veritonic ad collection + GITZAN music dataset + ~88K podcast episodes

### 2. Speaker Diarization + LSTM (Podcast-Ad-Detection)
- **Repo:** [github.com/amsterg/Podcast-Ad-Detection](https://github.com/amsterg/Podcast-Ad-Detection)
- Speaker diarization identifies "who spoke when" — ads typically introduce new speakers
- Speaker embeddings → clustering → LSTM classification for ad probability
- Works well for interview/dialogue podcasts, struggles with music-heavy content

### 3. Whisper + LLM Semantic Analysis (MinusPod / Podly)
- **Repo:** [github.com/ttlequals0/minuspod](https://github.com/ttlequals0/minuspod)
- Whisper ASR → full transcript with word-level timestamps → LLM (Claude/Ollama) identifies ad language patterns
- Catches promotional language, discount codes, sponsor mentions, CTAs
- Semantic understanding > acoustic pattern matching
- Most flexible but highest compute cost (Whisper + LLM inference)

### 4. Audio Fingerprinting (Fluendo)
- **Info:** [fluendo.com/blog/ai-ad-detector](https://fluendo.com/blog/ai-ad-detector/)
- Generate compact acoustic signatures → compare against database of known ads
- Preprocessing: noise filtering, spectral subtraction, VAD, equalization
- Robust to compression/volume changes, scales to millions of known ads
- **Limitation:** only detects previously-fingerprinted ads — can't catch novel ones

### 5. Silence Detection (Simple Heuristic)
- Ads often have distinctive silence patterns at boundaries
- Detect silence gaps → infer ad boundaries
- Low compute, moderate accuracy
- Best as a preprocessing step combined with other methods

### 6. Community Crowdsourcing (SponsorBlock-style)
- SponsorBlock for YouTube has explored podcast support ([AntennaPod issue #4159](https://github.com/AntennaPod/AntennaPod/issues/4159))
- Users submit ad start/end timestamps, aggregated via API
- Challenge: DAI means different listeners hear different ads for same episode (geographic variation)
- Not production-ready for podcasts as of early 2026

### 7. Commercial: ZeroAds
- [zeroads.ai](https://zeroads.ai/blog/2025-09-22-remove-podcast-ads-guide/)
- AI-powered ad detection → generates cleaned RSS feeds
- ~90% removal effectiveness
- Works with Apple Podcasts, Overcast, Pocket Casts (not Spotify/YouTube Music)

## Implementation Architecture Options

### Backend Preprocessing (Recommended for Podda)
1. On episode fetch/cache, run ad detection pipeline
2. Store detected ad segment boundaries in database (keyed by episode URL/hash)
3. Frontend displays skip markers or auto-skips detected segments
4. Cache results across users — same episode = same detection results

### Client-Side Real-Time
- Web Audio API `AnalyserNode` for spectral analysis in browser
- Limited to simple heuristics (silence, energy patterns) — ML models too heavy for browser
- WebAssembly could help but deployment is complex

### Hybrid with Crowdsource
- Backend ML detection + user "Mark Ad" button for manual corrections
- Aggregate user reports → improve detection over time
- Weight contributions by historical accuracy

## Recommended Phased Roadmap

| Phase | What | Effort |
|-------|------|--------|
| 1 | Parse RSS chapter metadata + Podcasting 2.0 ad tags | Low |
| 2 | Backend silence detection + simple heuristics via FFmpeg | Medium |
| 3 | User "Mark Ad" UI + crowd-collected ad boundaries DB | Medium |
| 4 | SponsorBlock API integration (when available for podcasts) | Low |
| 5 | Full ML pipeline: Whisper + LLM or CNN-based detection | High |

## Legal & Ethical Notes

- **DMCA:** Server-side ad stitching isn't really an "access control" — skipping ads in legally downloaded audio likely falls within fair use, but untested in court
- **Fair use argument:** Transformative (personal listening optimization), small portion affected, debatable market impact
- **ToS risk:** Some hosting platforms prohibit automated content manipulation — enforcement is impractical for client-side detection
- **Ethical middle ground:** Detect and offer skip (user choice), don't silently remove. Consider still reporting ad presence to podcasters for analytics transparency
- **Precedent:** DVR/VCR ad-skipping has been legally permissible for decades — podcast ad-skipping is the audio equivalent

## Key Technical Challenges

- **Server-side stitching** = no client-side markers to intercept
- **Geographic variation** = crowdsourced timestamps may not match across regions
- **False positives** are worse than false negatives (skipping real content > missing an ad)
- **Long-form episodes** (60-180+ min) need streaming/chunked processing
- **Variable production quality** across podcast ecosystem
- **Music-heavy podcasts** confuse speaker-based detection

## Useful Libraries

| Library | Purpose |
|---------|---------|
| [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) | Audio processing in Node.js |
| [Silero VAD](https://github.com/snakers4/silero-vad) | Voice activity detection |
| [ricky0123/vad](https://github.com/ricky0123/vad) | Browser-compatible VAD |
| [Whisper](https://github.com/openai/whisper) | Speech-to-text with timestamps |
| [AssemblyAI](https://www.assemblyai.com/) | Cloud ASR + speaker diarization |
| [ACRCloud](https://www.acrcloud.com/) | Audio fingerprinting service |
