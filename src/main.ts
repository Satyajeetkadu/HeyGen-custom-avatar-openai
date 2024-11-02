import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
} from "@heygen/streaming-avatar";

// DOM elements
const avatarVideo = document.getElementById("avatarVideo") as HTMLVideoElement;
const userCamera = document.getElementById("userCamera") as HTMLVideoElement;
const startButton = document.getElementById("startSession") as HTMLButtonElement;
const endButton = document.getElementById("endSession") as HTMLButtonElement;
const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
const stopButton = document.getElementById("stopButton") as HTMLButtonElement;
const transcribedTextElement = document.getElementById("transcribedText") as HTMLElement;

let avatar: StreamingAvatar | null = null;
let sessionData: any = null;
let mediaRecorder: MediaRecorder;
let audioChunks: BlobPart[] = [];

// Helper function to fetch access token
async function fetchAccessToken(): Promise<string> {
  const apiKey = import.meta.env.VITE_HEYGEN_API_KEY;
  const response = await fetch(
    "https://api.heygen.com/v1/streaming.create_token",
    {
      method: "POST",
      headers: { "x-api-key": apiKey },
    }
  );

  const { data } = await response.json();
  return data.token;
}

// Initialize streaming avatar session
async function initializeAvatarSession() {
  const token = await fetchAccessToken();
  avatar = new StreamingAvatar({ token });

  sessionData = await avatar.createStartAvatar({
    quality: AvatarQuality.High,
    avatarName: "default",
    knowledgeBase: "Your avatar will respond using the content I give it.", // Knowledge base prompt
  });


  // Enable end button and disable start button
  endButton.disabled = false;
  startButton.disabled = true;

  avatar.on(StreamingEvents.STREAM_READY, handleStreamReady);
  avatar.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);

  // Start the user's camera feed
  startCameraFeed();
}

// Handle when avatar stream is ready
function handleStreamReady(event: any) {
  if (event.detail && avatarVideo) {
    avatarVideo.srcObject = event.detail;
    avatarVideo.onloadedmetadata = () => {
      avatarVideo.play().catch(console.error);
    };
  } else {
    console.error("Stream is not available");
  }
}

// Handle stream disconnection
function handleStreamDisconnected() {
  if (avatarVideo) {
    avatarVideo.srcObject = null;
  }

  // Enable start button and disable end button
  startButton.disabled = false;
  endButton.disabled = true;
}

// Start the camera feed
async function startCameraFeed() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    userCamera.srcObject = stream;
    userCamera.onloadedmetadata = () => {
      userCamera.play();
    };
  } catch (error) {
    console.error("Error accessing the camera:", error);
  }
}

// End the avatar session
async function terminateAvatarSession() {
  if (!avatar || !sessionData) return;

  await avatar.stopAvatar();
  avatarVideo.srcObject = null;
  avatar = null;
  userCamera.srcObject = null; // Stop the user's camera feed
}

// Start audio recording
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", sendAudioForProcessing);

    mediaRecorder.start();

    recordButton.disabled = true;
    stopButton.disabled = false;
  } catch (error) {
    console.error("Error accessing microphone:", error);
  }
}

// Stop audio recording
function stopRecording() {
  mediaRecorder.stop();
  recordButton.disabled = false;
  stopButton.disabled = true;
}

// Send audio for transcription and response
async function sendAudioForProcessing() {
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  audioChunks = [];

  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  try {
    const response = await fetch("http://localhost:3000/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    const transcribedText = data.transcription;
    const generatedResponse = data.response;
    transcribedTextElement.innerText = `You: ${transcribedText}\n\nAvatar: ${generatedResponse}`;

    // Ensure generated response from knowledge base is spoken by avatar
    if (avatar) {
      await avatar.speak({
        text: generatedResponse,
        taskType: "chat", // Set taskType to "chat" for generated response
        sessionId: sessionData.sessionId, // Ensure the session is maintained
      });
    }
  } catch (error) {
    console.error("Error during processing:", error);
  }
}

// Event listeners for buttons
startButton.addEventListener("click", initializeAvatarSession);
endButton.addEventListener("click", terminateAvatarSession);
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
