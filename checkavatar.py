import requests
import os

# Set your HeyGen API key here
API_KEY = os.getenv("VITE_HEYGEN_API_KEY", "your-api-key-here")

def fetch_avatars():
    url = "https://api.heygen.com/v2/avatars"
    headers = {
        "Accept": "application/json",
        "X-Api-Key": API_KEY
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        avatars = response.json().get("avatars", [])
        return avatars
    else:
        print(f"Error fetching avatars: {response.status_code} - {response.text}")
        return None

def check_avatar_exists(avatar_id):
    avatars = fetch_avatars()
    if avatars is None:
        print("Failed to fetch avatars.")
        return False
    
    for avatar in avatars:
        if avatar["id"] == avatar_id:
            print(f"Avatar ID {avatar_id} found: {avatar['name']}")
            return True

    print(f"Avatar ID {avatar_id} not found.")
    return False

if __name__ == "__main__":
    # Replace with the avatar ID you want to verify
    avatar_id_to_check = "1721951594"
    
    if check_avatar_exists(avatar_id_to_check):
        print("Avatar is accessible!")
    else:
        print("Avatar is not accessible or does not exist.")
