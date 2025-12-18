import pandas as pd
import requests
import base64
import time
import math
import os
import kagglehub

# Partie Lyes Extract
def extract_dataset():
    path = kagglehub.dataset_download("maharshipandya/-spotify-tracks-dataset")
    files = os.listdir(path)
    for f in files:
        if f.endswith(".csv"):
            return pd.read_csv(os.path.join(path, f))
# Partie Lyes Extract


# --- CONFIGURATION ---
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
OUTPUT_FILE = 'dataset_final.json'

# --- CARTOGRAPHIE DES RÉGIONS (Pour regrouper les pays) ---
def get_region_from_code(code):
    """Transforme un code pays (2 lettres) en Région globale."""
    if not code or len(code) != 2: return "Inconnu"
    
    code = code.upper()
    
    # Amérique du Nord
    if code in ['US', 'CA', 'MX']: return "Amérique du Nord"
    
    # Europe 
    if code in ['GB', 'FR', 'DE', 'SE', 'IT', 'ES', 'NL', 'NO', 'DK', 'IE', 'BE', 'CH']: return "Europe"
    
    # Asie 
    if code in ['KR', 'JP', 'CN', 'IN', 'TW']: return "Asie"
    
    # Amérique Latine
    if code in ['BR', 'AR', 'CO', 'PR', 'CL']: return "Amérique Latine/ Amérique du Sud"
    
    # Océanie
    if code in ['AU', 'NZ']: return "Océanie"
    
    return "Reste du Monde" # Afrique, etc. ou codes rares

def get_spotify_token():
    auth_url = "https://accounts.spotify.com/api/token"
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_base64 = str(base64.b64encode(auth_string.encode("utf-8")), "utf-8")

    headers = {
        "Authorization": "Basic " + auth_base64,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    
    try:
        response = requests.post(auth_url, headers=headers, data=data, timeout=10)
        return response.json().get("access_token")
    except Exception as e:
        print(f"Erreur Token : {e}")
        return None

def fetch_tracks_metadata(track_ids, token):
    ids_string = ",".join(track_ids)
    api_url = f"https://api.spotify.com/v1/tracks?ids={ids_string}"
    headers = {"Authorization": "Bearer " + token}
    metadata_map = {}
    
    try:
        response = requests.get(api_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            tracks_data = response.json().get('tracks', [])
            
            for track in tracks_data:
                if track and 'album' in track:
                    track_id = track['id']
                    
                    # 1. Année
                    release_date = track['album']['release_date']
                    year = release_date[:4] if release_date else None
                    
                    # 2. Image
                    images = track['album']['images']
                    image_url = images[0]['url'] if images else None
                    
                    # 3. Preview Audio
                    preview_url = track.get('preview_url')
                    
                    # 4. PAYS & RÉGION (Via ISRC)
                    # L'ISRC est dans external_ids (ex: "USUM71204425")
                    external_ids = track.get('external_ids', {})
                    isrc = external_ids.get('isrc', '')
                    
                    country_code = "XX"
                    region = "Inconnu"
                    
                    if isrc and len(isrc) >= 2:
                        country_code = isrc[:2] # Les 2 premières lettres = Pays
                        region = get_region_from_code(country_code)

                    metadata_map[track_id] = {
                        'year': year,
                        'image': image_url,
                        'preview': preview_url,
                        'country': country_code,
                        'region': region
                    }
                    
        elif response.status_code == 429:
            time.sleep(5)
            
    except Exception as e:
        print(f"Erreur Batch : {e}")
    
    return metadata_map

def format_duration(ms):
    if pd.isna(ms): return "0:00"
    seconds = int((ms / 1000) % 60)
    minutes = int((ms / (1000 * 60)) % 60)
    return f"{minutes}:{seconds:02d}"

def main():
    print("Lecture du fichier CSV...")
    df = extract_dataset()
    
    # On garde les Hits (>30 popularité) pour avoir des stats pertinentes
    df_hits = df[df['popularity'] >= 30].copy()
    df_hits = df_hits.drop_duplicates(subset=['track_id'])
    
    print(f" Traitement de {len(df_hits)} chansons...")

    token = get_spotify_token()
    if not token: return

    track_ids_list = df_hits['track_id'].tolist()
    batch_size = 50
    total_batches = math.ceil(len(track_ids_list) / batch_size)
    full_metadata = {}

    print(" Récupération des données *...")

    for i in range(total_batches):
        start = i * batch_size
        end = (i + 1) * batch_size
        batch = track_ids_list[start:end]
        
        results = fetch_tracks_metadata(batch, token)
        full_metadata.update(results)
        
        if i % 10 == 0: print(f" Lot {i + 1}/{total_batches}...")
        time.sleep(0.5) # Pause API

    print(" Transformation terminé. Fusion...")

    def apply_enrichment(row):
        tid = row['track_id']
        if tid in full_metadata:
            data = full_metadata[tid]
            row['year'] = data['year']
            row['image'] = data['image']
            row['preview'] = data['preview']
            row['country_code'] = data['country'] # Ex: US, FR, GB
            row['region'] = data['region']        # Ex: Amérique du Nord, Europe
        else:
            row['year'] = None
        
        row['duration_fmt'] = format_duration(row['duration_ms'])
        return row

    df_final = df_hits.apply(apply_enrichment, axis=1)
    df_final = df_final.dropna(subset=['year'])

    # Colonnes finales
    cols = [
        'track_name', 'artists', 'year', 'region', 'country_code', # <-- Nouvelles colonnes
        'image', 'preview', 'duration_fmt', 'popularity', 
        'danceability', 'energy', 'tempo', 'track_genre'
    ]
    
    existing_cols = [c for c in cols if c in df_final.columns]
    df_final = df_final[existing_cols]

    df_final.to_json(OUTPUT_FILE, orient='records', indent=4)
    print(f" Terminé ! Fichier '{OUTPUT_FILE}' prêt avec les Régions.")

if __name__ == "__main__":
    main()
