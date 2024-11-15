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
  console.log("Using API Key:", apiKey);

  if (!apiKey) {
    console.error("API key is missing. Please check your environment variables.");
    return "";
  }

  try {
    const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: { "x-api-key": apiKey },
    });

    if (!response.ok) {
      console.error("Failed to fetch token:", response.statusText);
      return "";
    }

    const { data } = await response.json();
    console.log("Fetched Access Token Data:", data);
    return data.token;
  } catch (error) {
    console.error("Error fetching access token:", error.message || error);
    return "";
  }
}

// Choose a specific non-default avatar ID
// const AVATAR_ID = "Eric_public_pro2_20230608"; // Replace this with any valid avatar ID


// Initialize streaming avatar session
async function initializeAvatarSession() {
  try {
    // Step 1: Fetch the access token
    const token = await fetchAccessToken();
    console.log("Fetched Token:", token);

    if (!token) {
      console.error("Failed to fetch a valid token");
      return;
    }

    // Step 2: Initialize the StreamingAvatar instance with the token
    avatar = new StreamingAvatar({ token });

    // Step 3: Use a non-default avatar ID here (change this as needed)
    const avatarId = "Eric_public_pro2_20230608"; // Replace this with any valid avatar ID

    // Step 4: Start the avatar session with the specified avatar ID
    sessionData = await avatar.createStartAvatar({
      quality: AvatarQuality.High,
      avatarName: avatarId,
      knowledgeBase: "Your avatar will respond using the content I provide.",
    });

    console.log("Full Session Data:", sessionData);

    // Step 5: Check if the session was successfully created
    const sessionId = sessionData?.session_id;
    if (!sessionId) {
      console.error("Failed to retrieve a valid sessionId");
      return;
    }
    console.log("Extracted sessionId:", sessionId);

    // Step 6: Set up event listeners for streaming
    avatar.on(StreamingEvents.STREAM_READY, handleStreamReady);
    avatar.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);

    // Enable end button and disable start button
    endButton.disabled = false;
    startButton.disabled = true;

    // Start the user's camera feed
    startCameraFeed();
  } catch (error) {
    console.error("Error initializing avatar session:", error.message || error);
  }
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
// Send audio for transcription and response
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

    console.log("Transcribed Text:", transcribedText);
    console.log("Generated Response from GPT:", generatedResponse);

    transcribedTextElement.innerText = `You: ${transcribedText}\n\nAvatar: ${generatedResponse}`;

    // Validate the avatar instance and sessionId before speaking
    if (!avatar) {
      console.error("Avatar instance is not initialized");
      return;
    }
    
    if (!sessionData || !sessionData.session_id) {
      console.error("Invalid session data:", sessionData);
      return;
    }

    const sessionId = sessionData.session_id;
    console.log("Sending to avatar with sessionId:", sessionId);
    console.log("Text to speak:", generatedResponse);

    // Ensure generated response from knowledge base is spoken by avatar
    const speakResult = await avatar.speak({
      text: generatedResponse,
      taskType: "chat",
      sessionId: sessionId,
    });

    console.log("Speak Result:", speakResult);

    if (!speakResult || !speakResult.task_id) {
      console.error("Failed to send text to avatar for speaking");
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
