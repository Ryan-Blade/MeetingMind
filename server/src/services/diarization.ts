/**
 * Speaker Diarization Service
 *
 * What this does:
 * - Tracks named speakers across a live session by explicit name assignment
 * - The frontend LiveStreamModal lets users name each speaker slot
 * - When a speaker name is provided (via rawSpeakerTag), it's used directly
 *
 * What this does NOT do (and won't pretend to):
 * - Automatic voice fingerprinting from raw audio (requires a model like Pyannote or AWS Transcribe)
 * - Automatic screen OCR of Zoom/Teams tiles (requires a vision API integration)
 *
 * For automatic multi-speaker separation, integrate one of:
 * - Google Cloud Speech-to-Text v2 with speaker_diarization_config
 * - AWS Transcribe with EnableSpeakerDiarization
 * - AssemblyAI real-time streaming with speaker_labels
 * - Pyannote.audio (open-source, self-hosted)
 */

export interface SpeakerProfile {
  speakerId: string;
  displayName: string;
  utteranceCount: number;
}

export class SpeakerTracker {
  private knownSpeakers: Map<string, SpeakerProfile> = new Map();

  /**
   * Register or retrieve a speaker by name.
   * In live mode, speakerName comes directly from the user's speaker slot selection in the UI.
   */
  public trackSpeaker(speakerName: string): SpeakerProfile {
    const key = speakerName.trim().toLowerCase();

    if (!this.knownSpeakers.has(key)) {
      this.knownSpeakers.set(key, {
        speakerId: `spk_${key.replace(/\s+/g, "_")}`,
        displayName: speakerName.trim(),
        utteranceCount: 0,
      });
    }

    const profile = this.knownSpeakers.get(key)!;
    profile.utteranceCount += 1;
    return profile;
  }

  /** Return all speakers seen in this session */
  public getAllSpeakers(): SpeakerProfile[] {
    return Array.from(this.knownSpeakers.values());
  }

  /** Reset for a new session */
  public reset(): void {
    this.knownSpeakers.clear();
  }
}

export const speakerTracker = new SpeakerTracker();
