/**
 * ElevenLabs Text-to-Speech (REST). Returns an MP3 audio buffer.
 * If the key/quota is unavailable, callers should fall back to the
 * browser's SpeechSynthesis API on the client.
 */

const API_KEY = process.env.ELEVENLABS_API_KEY as string;
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

export async function textToSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE
): Promise<Buffer> {
  if (!API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
