import { YoutubeTranscript } from 'youtube-transcript';

const videoId = '3WrZMzqpFTc';

async function main() {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(JSON.stringify(transcript, null, 2));
  } catch (err) {
    console.error('Error fetching transcript:', err.message);
  }
}

main();
